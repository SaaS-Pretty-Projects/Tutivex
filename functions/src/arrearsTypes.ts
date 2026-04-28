import type { Currency, PaymentStatus } from './money';

export interface FirestoreTimestampLike {
  toDate(): Date;
}

export type PaymentPurpose = 'invoice_payment' | 'credit_topup';

export interface SafepayCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  city: string;
}

export interface PaymentOrder {
  invoice: string;
  studentUid: string;
  providerTransactionId: string | null;
  amountMinor: number;
  currency: Currency;
  purpose: PaymentPurpose;
  invoiceId?: string;
  status: PaymentStatus;
  description: string;
  customer: SafepayCustomer;
  rawCreateResponse: string;
  rawStatusResponse: Record<string, unknown> | null;
  providerStatusId: number | null;
  providerStatusText: string | null;
  lastCheckedAt: FirestoreTimestampLike | null;
  completedAt: FirestoreTimestampLike | null;
  createdAt: FirestoreTimestampLike;
  creditAppliedAt: FirestoreTimestampLike | null;
}

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export interface ArrearsInvoice {
  id: string;
  studentUid: string;
  amountMinor: number;
  currency: Currency;
  dueDate: FirestoreTimestampLike;
  status: 'pending' | 'processing' | 'paid' | 'overdue' | 'written_off';
  agingBucket: AgingBucket;
  lessonIds: string[];
  paymentOrderInvoice: string | null;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
  paidAt: FirestoreTimestampLike | null;
  writtenOffAt: FirestoreTimestampLike | null;
  writtenOffReason: string | null;
  writtenOffByUid: string | null;
}

export interface BalanceByCurrency {
  creditsMinor: number;
  outstandingMinor: number;
}

export interface StudentBalance {
  studentUid: string;
  byCurrency: Partial<Record<Currency, BalanceByCurrency>>;
  updatedAt: FirestoreTimestampLike;
  lastLedgerCursor: string;
}

export interface TutorEarningEntry {
  lessonId: string;
  tutorUid: string;
  studentUid: string;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
  currency: Currency;
  commissionRate: number;
  lessonCompletedAt: FirestoreTimestampLike;
  recordedAt: FirestoreTimestampLike;
  payoutRequestId: string | null;
}

export interface EarningsByCurrency {
  pendingMinor: number;
  availableMinor: number;
  paidOutMinor: number;
}

export interface TutorEarningsSummary {
  tutorUid: string;
  byCurrency: Partial<Record<Currency, EarningsByCurrency>>;
  updatedAt: FirestoreTimestampLike;
}

export interface AuditEntry {
  at: FirestoreTimestampLike;
  actorUid: string;
  action: string;
  subject: { collection: string; id: string };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  context: Record<string, unknown>;
}
