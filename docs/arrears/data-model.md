# Tutivex Arrears — Data Model & Ledger Primitives

**Status:** Draft v1 · **Owner:** TBD · **Date:** 2026-04-28
**Scope:** Firestore-only data model, ledger transitions, SafePay integration primitives, EUR/GBP support.
**Out of scope (this pass):** Aging UI, dunning email cadence, admin reporting screens, tutor-payout UX.

---

## 1. Requirements

### Functional

1. Record every lesson's gross earnings, platform commission, and tutor net at lesson completion.
2. Track each student's outstanding balance (what they owe Tutivex) and credit balance (prepaid lessons).
3. Issue invoices when a student's outstanding crosses a threshold (or per booking, depending on plan).
4. Drive a student's invoice through states: `pending → processing → completed | failed | manual_review | overdue | written_off`.
5. Apply credits to a student exactly once per successful SafePay payment (no double-credit on retry/poll).
6. Surface arrears state per student, per tutor, per cohort for admin reporting.
7. Support tutor payouts as a separate flow (SafePay is customer-pays-merchant only — payouts are out-of-band).

### Non-functional

| Concern | Requirement |
|---|---|
| Currency | EUR and GBP from day one. Amounts stored in **minor units** (cents/pence) as integers. Never floats. |
| Consistency | Money writes must be atomic. A payment cannot debit the order without crediting the student in the same transaction. |
| Idempotency | SafePay status polling will be retried by humans, schedulers, and clients. The **same successful payment must never apply credits twice**, even under concurrent polls. |
| Auditability | Every state change on a money document must be append-only or accompanied by an audit log entry (who/what/when, plus the SafePay raw response that triggered it). |
| Time | All timestamps stored as Firestore `Timestamp` (UTC). Aging buckets computed in UTC. Display layer converts to user TZ. |
| Latency | Lesson completion → ledger write: < 1s. Payment-status poll → student balance update: < 5s end-to-end. |
| Availability | Lesson completion writes must succeed even if SafePay is down (decoupled). |

### Constraints

- **Stack**: Firebase (Auth + Firestore + Functions). React 19 + Vite frontend. TypeScript.
- **Payment gateway**: SafePay (`safepayto.me`). Reference implementations:
  - `/Users/wysmyfree/Projects/luxuryui` — Firebase Functions + Supabase Postgres.
  - `/Users/wysmyfree/Projects/cloudbase` — Supabase Edge Functions + Postgres + **test suite** for the shared `payments/` library.
  - `/Users/wysmyfree/Projects/cookflow` — Cloudflare Worker + KV + **IPN webhook handler** + SMTP email notifications.
  - **IPN webhooks ARE supported** — cookflow's `/payment/ipn` validates `md5(invoice + merchantId + merchantSecret)` and updates state on receipt. Use webhooks as the primary state-transition path; polling as fallback.
  - **One-way only.** No payouts; no recurring billing; no saved cards.
  - **MD5-signed form-encoded requests.** Amounts in minor units.
  - **Status code interpretation is contested between reference projects** — see §3.6 below. **Resolve with SafePay support before going to production.**
- **Team size**: small. Bias toward fewer moving parts unless a guarantee is at stake.

---

## 2. High-Level Design

### Components

```
┌──────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  React frontend  │─────▶│ Firebase Functions   │─────▶│  SafePay        │
│  (tutor +        │      │ - createSafepay…     │      │                 │
│   student +      │      │ - refreshSafepay…    │◀──── │  IPN webhook    │
│   admin views)   │      │ - safepayIpn  ◀──────┼──────│  (primary path) │
└──────────────────┘      │ - completeLesson     │      │  + poll fallback│
         │                │ - sweepPayments      │      └─────────────────┘
         │                │ - computeAging       │
         │                └──────────┬───────────┘
         │                           │
         │                           ▼
         │                ┌──────────────────────┐
         └───────────────▶│  Firestore           │
              (read-only) │  ledger + projections│
                          └──────────────────────┘
                                     ▲
                                     │
                          ┌──────────┴───────────┐
                          │ Cloud Scheduler      │
                          │ - sweep stragglers   │
                          │ - daily aging        │
                          │ - daily reconcile    │
                          └──────────────────────┘
```

### Data flow — student top-up (SafePay)

```
1. Student clicks "Pay €X" in checkout
2. Frontend → callable createSafepayPaymentSession({amount, currency, customer})
3. Function: validate amount → POST to SafePay with success_url + cancel_url +
   ipn_url (signed) → parse OK\n<url>
4. Function: write payment_orders/{invoice} with status=processing (atomic)
5. Function returns {invoice, checkoutUrl} → frontend redirects to SafePay
6. PRIMARY PATH: SafePay POSTs IPN to safepayIpn → handler validates
   md5(invoice+merchantId+merchantSecret) hash → applies the same
   transaction as a successful poll (idempotent — see §3.3)
7. FALLBACK PATH: Frontend polls refreshSafepayStatus on the cancel_url
   redirect (because not all SafePay channels send IPN reliably).
   Server-side sweep at 5/15/60 min picks up any IPN that was lost.
8. On status=completed: transaction { update order, append ledger entry,
   bump student balance } — keyed by invoice for idempotency
9. On status=failed/manual_review: terminal, no balance change
```

### Data flow — lesson completion (earnings)

```
1. Tutor or system marks lesson as completed (lessons/{lessonId}.status=completed)
2. onLessonCompleted trigger (Firestore trigger or callable):
   transaction {
     read lesson + tutor commission rate
     write tutor_earnings_ledger/{lessonId}  (deterministic ID = idempotent)
     bump tutor_earnings_summary/{tutorUid}.pending_minor
     debit student_balances/{studentUid}.credits_minor (if pre-paid model)
       OR bump outstanding_minor (if pay-after model)
   }
3. If outstanding crosses threshold → enqueue invoice creation
```

### API surface (callable Functions)

| Function | Auth | Purpose |
|---|---|---|
| `createSafepayPaymentSession` | Student | Mirror of luxuryui — creates SafePay order with `success_url`/`cancel_url`/`ipn_url`, writes `payment_orders/{invoice}`. |
| `safepayIpn` | Public (hash-validated) | Receive SafePay IPN. **Verify `md5(invoice+merchantId+merchantSecret)` before trusting payload.** Apply state transition atomically. Return `200 OK` always (even on duplicate) so SafePay doesn't retry forever. |
| `refreshSafepayStatus` | Student | Manual/fallback poll for one invoice — used by frontend after redirect. Idempotent credit application. |
| `sweepProcessingPayments` | Scheduler | Catch-all for missed IPNs. Iterate `payment_orders` where status=processing AND age < 24h. Call refresh. |
| `completeLesson` | Tutor/admin | Mark lesson done, write earnings ledger atomically. |
| `computeAgingBuckets` | Scheduler | Daily: stamp aging bucket onto every open invoice. |
| `dailyReconciliation` | Scheduler | Sum ledger vs. SafePay completed-payment totals (per currency). Alert on drift. |
| `requestTutorPayout` | Tutor | Tutor requests payout of `available_minor`. Creates `payout_requests` doc; finance settles out-of-band. |

---

## 3. Deep Dive — Firestore Data Model

### 3.1 Money primitives (TypeScript types — shared library)

```ts
// src/lib/money.ts
export type Currency = 'EUR' | 'GBP';

export interface Money {
  amountMinor: number;  // integer; cents (EUR) or pence (GBP)
  currency: Currency;
}

// Reuse luxuryui's catalog math:
//   amountMajorToMinor, formatMinorAmount, classifyPaymentState
// Copy /Users/wysmyfree/Projects/luxuryui/shared/payments/catalog.js
// into Tutivex unchanged. It is small, well-tested, and authoritative.
```

**Rule:** every money field on every document is the pair `(amountMinor: number, currency: Currency)`. Never store a single `amount` without its currency. Never aggregate across currencies without an explicit FX snapshot.

### 3.2 Collections

#### `payment_orders/{invoice}`

Document ID = invoice string (e.g. `TUT-{uidPrefix}-{uuid}`). Deterministic ID is the **primary idempotency mechanism** — `set()` with `{merge: false}` will fail loudly if SafePay returns the same invoice twice.

```ts
interface PaymentOrder {
  invoice: string;                    // also the doc ID
  studentUid: string;
  providerTransactionId: string | null;
  amountMinor: number;
  currency: Currency;
  // What this payment is for — drives where credits/debits land:
  purpose: 'invoice_payment' | 'credit_topup';
  invoiceId?: string;                 // set when purpose=invoice_payment
  status: 'processing' | 'completed' | 'failed' | 'manual_review';
  description: string;
  customer: {
    firstName: string; lastName: string; email: string;
    phone: string; countryCode: string; city: string;
  };
  rawCreateResponse: string;
  rawStatusResponse: Record<string, unknown> | null;
  providerStatusId: number | null;
  providerStatusText: string | null;
  lastCheckedAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  // Idempotency marker — set inside the transaction that applies the payment.
  // Presence of creditAppliedAt means the matching ledger entry exists.
  creditAppliedAt: Timestamp | null;
}
```

Indexes:
- `(status, createdAt)` — for the sweep job.
- `(studentUid, createdAt desc)` — for student payment history.

#### `arrears_invoices/{invoiceId}`

```ts
interface ArrearsInvoice {
  id: string;                         // doc ID
  studentUid: string;
  amountMinor: number;
  currency: Currency;
  dueDate: Timestamp;
  status: 'pending' | 'processing' | 'paid' | 'overdue' | 'written_off';
  agingBucket: 'current' | '1-30' | '31-60' | '61-90' | '90+'; // computed daily
  lessonIds: string[];                // lessons this invoice covers
  paymentOrderInvoice: string | null; // FK to payment_orders.invoice once paid
  createdAt: Timestamp;
  updatedAt: Timestamp;
  paidAt: Timestamp | null;
  writtenOffAt: Timestamp | null;
  writtenOffReason: string | null;
  writtenOffByUid: string | null;
}
```

Indexes:
- `(studentUid, status)` — student-facing arrears list.
- `(status, dueDate)` — overdue sweep.
- `(currency, status, agingBucket)` — admin aging report.

#### `student_balances/{studentUid}`

A **projection** — derivable from the ledger, but cached for fast reads. Always updated inside the same transaction as the ledger entry that changed it.

```ts
interface StudentBalance {
  studentUid: string;                 // == doc ID
  // Per-currency buckets. A student CAN owe EUR and have GBP credit;
  // we never silently convert.
  byCurrency: {
    EUR?: { creditsMinor: number; outstandingMinor: number };
    GBP?: { creditsMinor: number; outstandingMinor: number };
  };
  updatedAt: Timestamp;
  // Hash of the last ledger entry applied — cheap drift detector
  // (recomputed nightly: hash(ledger projection) must == this).
  lastLedgerCursor: string;
}
```

#### `tutor_earnings_ledger/{lessonId}`

Append-only. Document ID = `lessonId` makes the lesson-completion trigger naturally idempotent: a redelivered Firestore trigger that calls `set()` with the same lessonId is a no-op (use a transaction with `getDoc` + abort if exists).

```ts
interface TutorEarningEntry {
  lessonId: string;                   // == doc ID
  tutorUid: string;
  studentUid: string;
  grossMinor: number;
  commissionMinor: number;            // platform's cut
  netMinor: number;                   // tutor's earnings
  currency: Currency;
  commissionRate: number;             // e.g. 0.20 — snapshot at time of write
  lessonCompletedAt: Timestamp;
  recordedAt: Timestamp;
  // Payout linkage filled in when this entry is included in a payout
  payoutRequestId: string | null;
}
```

Indexes:
- `(tutorUid, currency, payoutRequestId, recordedAt)` — "what's eligible for tutor's next payout in EUR?"
- `(currency, recordedAt)` — reconciliation.

#### `tutor_earnings_summary/{tutorUid}`

Projection of the above for fast dashboard reads. Per-currency.

```ts
interface TutorEarningsSummary {
  tutorUid: string;
  byCurrency: {
    EUR?: { pendingMinor: number; availableMinor: number; paidOutMinor: number };
    GBP?: { pendingMinor: number; availableMinor: number; paidOutMinor: number };
  };
  // pending: lesson completed, not yet released (e.g. 7-day refund window)
  // available: ready to request payout
  // paidOut: cumulative total paid out
  updatedAt: Timestamp;
}
```

#### `payout_requests/{requestId}`

Tutors request payouts; finance settles via bank transfer (SafePay does not do payouts). This collection is the audit trail.

```ts
interface PayoutRequest {
  id: string;
  tutorUid: string;
  amountMinor: number;
  currency: Currency;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  ledgerEntryIds: string[];           // earning entries included
  bankDetails: { iban?: string; sortCode?: string; accountNumber?: string };
  requestedAt: Timestamp;
  approvedAt: Timestamp | null;
  paidAt: Timestamp | null;
  externalReference: string | null;   // bank transaction ref
  notes: string | null;
}
```

#### `audit_log/{autoId}`

Append-only audit trail for every money state transition.

```ts
interface AuditEntry {
  at: Timestamp;
  actorUid: string | 'system' | 'scheduler';
  action: string;                     // e.g. 'payment.completed'
  subject: { collection: string; id: string };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  context: Record<string, unknown>;   // SafePay raw response, etc.
}
```

### 3.3 The single most important transaction — applying a successful payment

```ts
// runs inside refreshSafepayStatus
async function applyPaymentToInvoice(invoice: string) {
  await db.runTransaction(async (tx) => {
    const orderRef = db.doc(`payment_orders/${invoice}`);
    const order = (await tx.get(orderRef)).data() as PaymentOrder;

    // Idempotency gate — second poll after success is a no-op.
    if (order.creditAppliedAt) return;
    if (order.status !== 'completed') return;

    if (order.purpose === 'invoice_payment' && order.invoiceId) {
      const invRef = db.doc(`arrears_invoices/${order.invoiceId}`);
      const inv = (await tx.get(invRef)).data() as ArrearsInvoice;

      // Defend against currency mismatch — should be impossible but is cheap.
      if (inv.currency !== order.currency) {
        throw new Error('Currency mismatch — refusing to apply payment.');
      }

      tx.update(invRef, {
        status: 'paid',
        paidAt: FieldValue.serverTimestamp(),
        paymentOrderInvoice: order.invoice,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Decrement student outstanding in the same transaction.
      const balRef = db.doc(`student_balances/${order.studentUid}`);
      const bal = (await tx.get(balRef)).data() as StudentBalance | undefined;
      const cur = order.currency;
      const prev = bal?.byCurrency?.[cur] ?? { creditsMinor: 0, outstandingMinor: 0 };
      tx.set(balRef, {
        studentUid: order.studentUid,
        byCurrency: {
          ...bal?.byCurrency,
          [cur]: {
            creditsMinor: prev.creditsMinor,
            outstandingMinor: Math.max(0, prev.outstandingMinor - order.amountMinor),
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
        lastLedgerCursor: order.invoice,
      }, { merge: true });
    }

    // Mark idempotency — must be the LAST write so retries see it.
    tx.update(orderRef, { creditAppliedAt: FieldValue.serverTimestamp() });
  });

  // Audit log outside the transaction (eventual consistency is fine for audit).
  await db.collection('audit_log').add({ /* ... */ });
}
```

**Why deterministic doc IDs matter here:** Firestore has no `UNIQUE` constraint. The luxuryui Postgres design relies on `UNIQUE (payment_order_id)` on `credit_transactions` to make double-credit impossible at the DB layer. We can't get that. We approximate it two ways:

1. The invoice IS the doc ID of `payment_orders` — so SafePay can never create two orders for the same invoice number.
2. `creditAppliedAt` is checked-then-set inside the same transaction — Firestore transactions are serializable, so two concurrent polls will linearize and the second one will see `creditAppliedAt != null` and bail.

This is robust against concurrent polls but **not** against a developer who writes a non-transactional update. Mitigate with code review + a Firestore security rule that rejects `creditAppliedAt` flips outside the function service account.

### 3.4 Aging buckets

Computed daily by `computeAgingBuckets`:

```ts
function bucketFor(due: Date, now: Date): ArrearsInvoice['agingBucket'] {
  const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
```

Also flips `pending → overdue` when `dueDate < now AND status === 'pending'`.

### 3.5 IPN webhook handler

```ts
// Public endpoint (Cloud Function HTTPS, NOT a callable).
// SafePay POSTs application/x-www-form-urlencoded.
async function safepayIpn(req: Request): Promise<Response> {
  const body = await req.formData();
  const invoice = String(body.get('invoice') || '');
  const statusId = String(body.get('status_id') || '');
  const receivedHash = String(body.get('hash') || '');

  if (!invoice || !statusId || !receivedHash) {
    return new Response('Missing fields', { status: 400 });
  }

  const expected = md5(`${invoice}${MERCHANT_ID}${MERCHANT_SECRET}`);
  if (receivedHash !== expected) {
    // Do NOT leak which field is wrong.
    return new Response('Forbidden', { status: 403 });
  }

  const orderRef = db.doc(`payment_orders/${invoice}`);
  const snap = await orderRef.get();
  if (!snap.exists) {
    // Unknown invoice — could be replay. Acknowledge so SafePay stops retrying.
    return new Response('OK', { status: 200 });
  }

  // Reuse classifyPaymentState (see §3.6) — do NOT inline status checks.
  const classified = classifyPaymentState({
    statusId: Number(statusId),
    providerStatusText: String(body.get('payment_system_status') || ''),
  });

  if (classified.shouldCredit) {
    await applyPaymentToInvoice(invoice); // §3.3 — handles idempotency
  } else if (classified.isTerminal) {
    await orderRef.update({
      status: classified.status,
      providerStatusId: Number(statusId),
      lastCheckedAt: FieldValue.serverTimestamp(),
    });
  }

  // Always 200 — duplicates are normal.
  return new Response('OK', { status: 200 });
}
```

**Key rules:**
1. **Hash validation first.** No data is trusted before MD5 matches.
2. **Always return 200** even on no-op / unknown invoice / duplicate, so SafePay's retry policy doesn't keep hammering.
3. **Reuse the same `applyPaymentToInvoice` transaction** as the polling path. Both webhooks and polls converge on one idempotent code path.
4. **Configure `ipn_url`** in the create-payment payload (cookflow does this implicitly; verify with SafePay merchant settings whether IPN URL is per-request or per-merchant-account).

### 3.6 Status code interpretation — UNRESOLVED CONTRADICTION

The three reference projects disagree on which `status_id` values mean "completed":

| Project | "Completed" `status_id` | "Processing" `status_id` |
|---|---|---|
| `luxuryui/shared/payments/catalog.js` | `1` | `0`, `10`, `11` |
| `cloudbase/shared/payments/catalog.js` (test-confirmed) | `1` | `0`, `10`, `11` |
| `cookflow/worker/src/index.ts` | **`10` or `11`** | (anything else not `<0`) |

Two of three (with a passing test suite in cloudbase) say `status_id === 1` is the canonical "completed" code. cookflow may either:

- Be using a different SafePay product variant or merchant account configuration.
- Have a bug that's been masked because the dev/test invoices coincidentally returned 10/11.

**Recommendation for Tutivex:**
1. Adopt the **luxuryui + cloudbase** mapping as the default (it's test-covered).
2. **Email SafePay merchant support** before going live to confirm the canonical `status_id` table for your specific merchant account.
3. Until confirmed, treat `status_id === 1` as the only success signal AND log every observed `(status_id, payment_system_status)` pair to the audit log so we can build an empirical mapping from real production data.
4. Wrap the classification in a single function (`classifyPaymentState`) so the mapping is changeable in one place.

The `classifyPaymentState` function from luxuryui/cloudbase already does this conservatively:

```js
// from cloudbase/shared/payments/catalog.js
const PROCESSING_STATUS_IDS = new Set([0, 10, 11]);
const FAILURE_HINTS = /(fail|declin|cancel|reject|error|chargeback|refund|void|expire)/i;

export function classifyPaymentState({ statusId, providerStatusText }) {
  if (Number(statusId) === 1) return { status: 'completed', isTerminal: true,  shouldCredit: true };
  if (PROCESSING_STATUS_IDS.has(Number(statusId)))
                                return { status: 'processing', isTerminal: false, shouldCredit: false };
  if (FAILURE_HINTS.test(String(providerStatusText || '')))
                                return { status: 'failed', isTerminal: true,  shouldCredit: false };
  return { status: 'manual_review', isTerminal: true, shouldCredit: false };
}
```

The **fail-safe default is `manual_review`** — anything ambiguous triggers human review rather than auto-crediting. This is the right posture for money.

### 3.7 Multi-currency rules

- A student MAY simultaneously hold EUR credit and a GBP outstanding balance. We do **not** auto-FX between them.
- Aggregate reports (admin dashboard) are presented per-currency, not summed across.
- If you need a single-currency rollup for finance, snapshot the FX rate at report-generation time and store it alongside the report. Never persist a derived single-currency total back into a money document.

---

## 4. Scale & Reliability

### Polling cost (with IPN as primary)

With IPN handling 95%+ of state transitions, polling becomes a fallback for missed/lost webhooks. Worst case shrinks dramatically.

- **IPN handles the happy path** within seconds of payment completion.
- **Frontend polls** `refreshSafepayStatus` immediately after the SafePay redirect-back (3–5 attempts at 2s intervals) — covers cases where IPN hasn't arrived by the time the user lands back on the success page.
- **Sweep job runs every 5 minutes** for orders still `processing` after 5 min, then every 15 min after 1h, then hourly until 24h. After 24h → flip to `manual_review` for finance.
- At 1,000 daily checkouts with IPN working, the sweep handles maybe 10–50 stragglers/day = a few hundred polls/day total instead of >1M.

### Reconciliation

Daily, per currency:
1. Sum `payment_orders` where `status=completed AND completedAt in [yesterday]` → expected.
2. Sum `arrears_invoices` flipped to `paid` yesterday + `student_balances` credit deltas → applied.
3. Difference != 0 → page on-call.

### Backups

Enable Firestore **Point-in-Time Recovery** (PITR) — required for any system that handles money. Default 7 days; consider 30 for finance data.

### Observability

| Metric | Source | Alert if |
|---|---|---|
| `payment_apply_latency_p99` | Function trace | > 10s |
| `payment_status_poll_failures` | Function logs | > 1% over 15m |
| `ledger_drift_minor_eur` | Reconciliation job | != 0 |
| `ledger_drift_minor_gbp` | Reconciliation job | != 0 |
| `processing_orders_aged_24h` | Scheduled query | > 0 |

---

## 5. Trade-offs

### Firestore vs. Postgres for the ledger

| | Firestore (chosen) | Postgres (luxuryui chose this) |
|---|---|---|
| Time to ship | Faster — already in stack | Slower — need to add Supabase/Cloud SQL |
| ACID across multi-doc | Yes, in transactions (within DB) | Yes |
| `UNIQUE` constraint | **No** — emulated via doc ID | Yes — guarantees idempotency at DB layer |
| Aggregations (sums, joins) | Painful — need projections + scheduled rollups | Easy — SQL `SUM(...) GROUP BY` |
| Audit reports | Cloud Functions + denormalized projections | SQL views, ad-hoc queries |
| Cost at scale | Per-read pricing — projections become essential | Predictable per-instance |
| Drift detection | Manual (we wrote a reconciliation job) | Same |

**Recommendation:** Firestore is fine for **v1** with disciplined use of deterministic doc IDs and transactions. **If** Tutivex grows past ~10k paying students or finance asks for any non-trivial reporting, expect to migrate the ledger to Postgres. Design the projection layer (`student_balances`, `tutor_earnings_summary`) as **derived state** so a future migration replaces the source-of-truth without rewriting the UI.

### IPN webhook + polling fallback (vs. polling-only)

SafePay supports IPN webhooks (cookflow proves this). We use both:

- **IPN** = primary, low-latency state transitions (<5s typical).
- **Polling sweep** = fallback for lost/missed IPNs.
- **Frontend poll on redirect-back** = good UX when IPN is in-flight at the moment the user lands.

The cost of running both is small: one extra HTTPS endpoint + the same idempotency machinery serves both paths via `applyPaymentToInvoice`. **Don't skip the polling fallback** — IPN delivery is best-effort, not guaranteed, and missing one means a paid student stays in arrears.

### Per-currency balances vs. canonical-currency rollup

Per-currency adds complexity to UI ("you owe €40 and have £12 credit") but avoids embedding stale FX rates in user-visible balances. For a tutoring marketplace where most tutor↔student pairs settle in one currency, this is the right call. Revisit if cross-currency relationships become common.

---

## 6. What I'd revisit as the system grows

| Trigger | Action |
|---|---|
| > 10k active paying students | Move source-of-truth ledger to Postgres; Firestore becomes the read projection. |
| Finance asks for ad-hoc SQL reporting | Same — Postgres or BigQuery export. |
| Tutor count grows enough to make manual payouts painful | Integrate Stripe Connect (or Wise) for payouts; SafePay stays for inbound. |
| SafePay outage during peak | Add a queued retry table; surface "payment pending" in UI. Currently the design tolerates SafePay being slow but assumes it's reachable for `createPaymentSession`. |
| Disputes/chargebacks become common | Add `disputes` collection + reverse-ledger entries. Out of scope for v1. |
| EU VAT compliance required | Add `tax` fields to `payment_orders` and `arrears_invoices`; integrate with a tax engine. |

---

## 7. Open questions for you

1. **Pre-paid (credits) or pay-after (invoiced) model?** The schema supports both via `payment_orders.purpose`. Pick one for v1; the other can come later.
2. **Commission rate** — chosen for v1: fixed platform-wide. Default `PLATFORM_COMMISSION_RATE=0.20`; store the snapshot on every `tutor_earnings_ledger` row so a future per-tutor or tiered model does not rewrite history.
3. **Refund window** before tutor earnings move from `pending → available` — 7 days is the placeholder.
4. **Threshold for auto-issuing an invoice** in pay-after mode — per-lesson, per-week, or when outstanding crosses an amount?
5. **Who can write off an invoice** — admin only, or tutor for their own students?

---

## Appendix A — Reuse from the reference projects

### From cloudbase (best-tested copies)

`cloudbase` has the **same** `shared/payments/*` library as `luxuryui` PLUS a passing test suite. Prefer cloudbase as the source:

- `shared/payments/catalog.js` — currency configs, minor-unit math, `classifyPaymentState`.
- `shared/payments/catalog.test.js` — port these tests; they encode the canonical behavior.
- `shared/payments/safepay-server.js` — MD5 signing, response parsing, invoice builder.
- `shared/payments/safepay-server.test.js` — confirms exact MD5 outputs and `trans_id=invoice,txn` parsing.
- `shared/payments/customer.js` — customer normalization.
- `shared/payments/customer.test.js`
- `shared/payments/reconciliation.js` — `summarizeRefreshResult`.
- `shared/payments/reconciliation.test.js`

### From cookflow

- IPN webhook handler shape — see `cookflow/worker/src/index.ts → handleIpn`. Port the hash-validation pattern to a Firebase HTTPS function.
- `success_url` / `cancel_url` parameters in the create-payment payload — adopt these.
- SMTP-from-Cloudflare-Worker email pattern — interesting but not needed for arrears v1; Firestore Functions can use Firebase Email Extensions or SendGrid more simply.

### From luxuryui

- The Firebase callable wrappers (`createSafepayPaymentSession`, `refreshSafepayStatus`) port directly — replace the Supabase admin client with Firestore admin SDK and adapt the ledger writes to the schema above.
- The `sessionStorage` pending-checkout helper in `services/safepayService.ts`.

## Appendix B — Differences across reference projects (and Tutivex's choice)

| Concern | luxuryui | cloudbase | cookflow | Tutivex (chosen) |
|---|---|---|---|---|
| Storage | Supabase Postgres | Supabase Postgres | Cloudflare KV (TTL) | **Firestore** |
| Backend runtime | Firebase Functions | Supabase Edge Functions (Deno) | Cloudflare Workers | **Firebase Functions** |
| Webhooks (IPN) | Not implemented | Not implemented | **Implemented** ✓ | **Implemented** (port from cookflow) |
| Idempotency mechanism | `UNIQUE (payment_order_id)` | `UNIQUE (payment_order_id)` | KV TTL + status check | `creditAppliedAt` + transaction + deterministic doc ID |
| Status code interpretation | `1=completed`, `0/10/11=processing` | `1=completed`, `0/10/11=processing` | **`10/11=completed`** ⚠ | luxuryui+cloudbase mapping (see §3.6) |
| Tests for shared payments lib | No | **Yes** ✓ | No | Port from cloudbase |
| `success_url`/`cancel_url` | Not set | Not set | **Set** | Adopt from cookflow |
| Purpose of payments | Credit top-up only | Credit top-up only | Credit top-up only | **Invoice payment + credit top-up** |
| Currency mapping to in-app credits | `creditsPerMajorUnit` (EUR=100, GBP=117) | Same | Same | N/A — Tutivex bills in real money |
| `sessionStorage` pending-checkout helper | Yes | Yes (similar) | No | Adopt from luxuryui |
