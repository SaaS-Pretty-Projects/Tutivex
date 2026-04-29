/**
 * Firestore document interfaces for the Teachenza arrears ledger.
 *
 * All amounts are in minor units (integer). Never floats. Never aggregate
 * across currencies without an explicit FX snapshot.
 *
 * See docs/arrears/data-model.md for the full design.
 */

import type { Currency } from './money';

export interface FirestoreTimestampLike {
  toDate(): Date;
}

// ---------------------------------------------------------------------------
// payment_orders/{invoice}
// ---------------------------------------------------------------------------

export type PaymentOrderStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'manual_review';

export type PaymentPurpose = 'invoice_payment' | 'credit_topup';

export interface SafepayCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  city: string;
}

/**
 * Document ID === invoice string (e.g. TUT-{uidPrefix}-{uuid}).
 * Deterministic ID is the primary idempotency mechanism — set() with
 * merge:false will loudly fail if SafePay somehow returns the same invoice
 * number twice.
 */
export interface PaymentOrder {
  invoice: string; // == doc ID
  studentUid: string;
  providerTransactionId: string | null;
  amountMinor: number;
  currency: Currency;
  /** Drives where credits / debits land after payment is applied. */
  purpose: PaymentPurpose;
  /** Populated when purpose === 'invoice_payment'. */
  invoiceId?: string;
  status: PaymentOrderStatus;
  description: string;
  customer: SafepayCustomer;
  rawCreateResponse: string;
  rawStatusResponse: Record<string, unknown> | null;
  providerStatusId: number | null;
  providerStatusText: string | null;
  lastCheckedAt: FirestoreTimestampLike | null;
  completedAt: FirestoreTimestampLike | null;
  createdAt: FirestoreTimestampLike;
  /**
   * Idempotency marker. Set inside the Firestore transaction that applies the
   * payment. Presence means the ledger credit already exists — any retry is a
   * guaranteed no-op.
   *
   * Must ONLY be written by the Functions service account (enforce via
   * Firestore security rules).
   */
  creditAppliedAt: FirestoreTimestampLike | null;
}

// ---------------------------------------------------------------------------
// arrears_invoices/{invoiceId}
// ---------------------------------------------------------------------------

export type ArrearsInvoiceStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'overdue'
  | 'written_off';

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export interface ArrearsInvoice {
  id: string; // == doc ID
  studentUid: string;
  amountMinor: number;
  currency: Currency;
  dueDate: FirestoreTimestampLike;
  status: ArrearsInvoiceStatus;
  /** Computed daily by the computeAgingBuckets Cloud Function. */
  agingBucket: AgingBucket;
  lessonIds: string[];
  /** FK to payment_orders.invoice once the invoice is paid. */
  paymentOrderInvoice: string | null;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
  paidAt: FirestoreTimestampLike | null;
  writtenOffAt: FirestoreTimestampLike | null;
  writtenOffReason: string | null;
  writtenOffByUid: string | null;
}

// ---------------------------------------------------------------------------
// student_balances/{studentUid}
// ---------------------------------------------------------------------------

export interface BalanceByCurrency {
  creditsMinor: number;
  outstandingMinor: number;
}

/**
 * Projection — derivable from the ledger but cached for fast reads. Always
 * updated inside the same Firestore transaction as the ledger entry that
 * changed it.
 */
export interface StudentBalance {
  studentUid: string; // == doc ID
  /**
   * Per-currency buckets. A student CAN hold EUR credit and owe GBP. We never
   * silently auto-convert between currencies.
   */
  byCurrency: Partial<Record<Currency, BalanceByCurrency>>;
  updatedAt: FirestoreTimestampLike;
  /**
   * Cursor of the last ledger entry applied. Cheap drift detector — recomputed
   * nightly and compared against the ledger projection.
   */
  lastLedgerCursor: string;
}

// ---------------------------------------------------------------------------
// tutor_earnings_ledger/{lessonId}
// ---------------------------------------------------------------------------

/**
 * Append-only. Doc ID === lessonId makes lesson-completion idempotent:
 * a redelivered Firestore trigger that calls set() with the same lessonId is
 * a no-op (use a transaction with getDoc + abort if already exists).
 */
export interface TutorEarningEntry {
  lessonId: string; // == doc ID
  tutorUid: string;
  studentUid: string;
  grossMinor: number;
  commissionMinor: number; // platform's cut
  netMinor: number; // tutor's take-home
  currency: Currency;
  /** Snapshot of the commission rate at the time of write — never re-read. */
  commissionRate: number; // e.g. 0.20
  lessonCompletedAt: FirestoreTimestampLike;
  recordedAt: FirestoreTimestampLike;
  /** Populated when this entry is included in an approved payout. */
  payoutRequestId: string | null;
}

// ---------------------------------------------------------------------------
// tutor_earnings_summary/{tutorUid}
// ---------------------------------------------------------------------------

export interface EarningsByCurrency {
  /**
   * Lesson completed; earnings not yet released (e.g. 7-day dispute window).
   */
  pendingMinor: number;
  /** Released and ready to withdraw. */
  availableMinor: number;
  /** Cumulative total paid out. */
  paidOutMinor: number;
}

/** Projection of tutor_earnings_ledger for fast dashboard reads. */
export interface TutorEarningsSummary {
  tutorUid: string; // == doc ID
  byCurrency: Partial<Record<Currency, EarningsByCurrency>>;
  updatedAt: FirestoreTimestampLike;
}

// ---------------------------------------------------------------------------
// payout_requests/{requestId}
// ---------------------------------------------------------------------------

export type PayoutRequestStatus =
  | 'requested'
  | 'approved'
  | 'paid'
  | 'rejected';

/**
 * Tutor-initiated payout request. Finance settles via bank transfer (SafePay
 * does not support payouts — outbound payments are entirely out-of-band).
 */
export interface PayoutRequest {
  id: string; // == doc ID
  tutorUid: string;
  amountMinor: number;
  currency: Currency;
  status: PayoutRequestStatus;
  /** IDs of tutor_earnings_ledger entries included in this payout. */
  ledgerEntryIds: string[];
  bankDetails: {
    iban?: string;
    sortCode?: string;
    accountNumber?: string;
  };
  requestedAt: FirestoreTimestampLike;
  approvedAt: FirestoreTimestampLike | null;
  paidAt: FirestoreTimestampLike | null;
  /** Bank/SWIFT transaction reference from finance. */
  externalReference: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// audit_log/{autoId}
// ---------------------------------------------------------------------------

export type AuditActor = string | 'system' | 'scheduler';

/**
 * Append-only audit trail for every money state transition.
 * Written outside the critical transaction (eventual consistency is fine for
 * audit; correctness lives in the ledger).
 */
export interface AuditEntry {
  at: FirestoreTimestampLike;
  actorUid: AuditActor;
  action: string; // e.g. 'payment.completed', 'invoice.written_off'
  subject: { collection: string; id: string };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** Raw SafePay response or other triggering context. */
  context: Record<string, unknown>;
}
