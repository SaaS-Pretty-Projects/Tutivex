/**
 * Money primitives for Teachenza arrears.
 *
 * Amounts are ALWAYS stored as integers in minor units (cents / pence).
 * Never use floating-point for money.
 */

export type Currency = 'EUR' | 'GBP';

export interface Money {
  amountMinor: number; // integer — cents (EUR) or pence (GBP)
  currency: Currency;
}

// ---------------------------------------------------------------------------
// Minor-unit conversions
// ---------------------------------------------------------------------------

export function amountMajorToMinor(major: number, _currency: Currency): number {
  // Both EUR and GBP use 2 decimal places (100 minor units per major unit).
  return Math.round(major * 100);
}

export function amountMinorToMajor(minor: number, _currency: Currency): number {
  return minor / 100;
}

/** Format a minor-unit amount for display (e.g. 4999 EUR → "€49.99"). */
export function formatMinorAmount(minor: number, currency: Currency): string {
  const major = amountMinorToMajor(minor, currency);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(major);
}

// ---------------------------------------------------------------------------
// SafePay status classification (ported from cloudbase/shared/payments/catalog.js)
// Source-of-truth: status_id === 1 is completed (test-confirmed in cloudbase).
// See data-model.md §3.6 for the unresolved contradiction with cookflow.
// ---------------------------------------------------------------------------

export type PaymentStatus =
  | 'processing'
  | 'completed'
  | 'failed'
  | 'manual_review';

export interface ClassifiedPaymentState {
  status: PaymentStatus;
  isTerminal: boolean;
  shouldCredit: boolean;
}

const PROCESSING_STATUS_IDS = new Set([0, 10, 11]);
const FAILURE_HINTS =
  /(fail|declin|cancel|reject|error|chargeback|refund|void|expire)/i;

/**
 * Classify a SafePay status_id + payment_system_status text into our internal
 * payment state. Conservatively defaults to manual_review for anything ambiguous.
 *
 * ⚠️  Resolve the status_id mapping with SafePay merchant support before going
 * to production — see data-model.md §3.6.
 */
export function classifyPaymentState({
  statusId,
  providerStatusText,
}: {
  statusId: number;
  providerStatusText: string;
}): ClassifiedPaymentState {
  if (Number(statusId) === 1) {
    return { status: 'completed', isTerminal: true, shouldCredit: true };
  }
  if (PROCESSING_STATUS_IDS.has(Number(statusId))) {
    return { status: 'processing', isTerminal: false, shouldCredit: false };
  }
  if (FAILURE_HINTS.test(String(providerStatusText ?? ''))) {
    return { status: 'failed', isTerminal: true, shouldCredit: false };
  }
  // Fail-safe: anything ambiguous → human review, never auto-credit.
  return { status: 'manual_review', isTerminal: true, shouldCredit: false };
}
