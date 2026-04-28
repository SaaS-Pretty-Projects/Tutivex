export type Currency = 'EUR' | 'GBP';

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

  return { status: 'manual_review', isTerminal: true, shouldCredit: false };
}
