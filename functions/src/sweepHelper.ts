/**
 * Thin wrapper used by the sweep scheduler to avoid circular imports.
 * Exports _sweepPollOne which delegates to the internal poll-and-apply helper.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';
import { fetchSafepayStatus } from './payments/safepayServer';
import { classifyPaymentState } from './money';
import { applyPaymentToStudentBalance } from './arrears';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export async function _sweepPollOne(invoice: string): Promise<void> {
  const merchantId = requireEnv('SAFEPAY_MERCHANT_ID');
  const merchantSecret = requireEnv('SAFEPAY_MERCHANT_SECRET');
  const safepayStatusUrl = requireEnv('SAFEPAY_STATUS_URL');

  const result = await fetchSafepayStatus({ invoice, merchantId, merchantSecret, safepayStatusUrl });
  const orderRef = db.doc(`payment_orders/${invoice}`);

  if (!result.ok) {
    await orderRef.update({ lastCheckedAt: FieldValue.serverTimestamp() });
    return;
  }

  const classified = classifyPaymentState({
    statusId: Number(result.raw.status_id),
    providerStatusText: String(result.raw.payment_system_status ?? ''),
  });

  if (classified.shouldCredit) {
    await orderRef.update({
      status: 'completed',
      providerStatusId: Number(result.raw.status_id),
      providerStatusText: String(result.raw.payment_system_status ?? ''),
      rawStatusResponse: result.raw,
      completedAt: FieldValue.serverTimestamp(),
      lastCheckedAt: FieldValue.serverTimestamp(),
    });
    await applyPaymentToStudentBalance(invoice);
  } else if (classified.isTerminal) {
    await orderRef.update({
      status: classified.status,
      providerStatusId: Number(result.raw.status_id),
      providerStatusText: String(result.raw.payment_system_status ?? ''),
      rawStatusResponse: result.raw,
      lastCheckedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await orderRef.update({
      providerStatusId: Number(result.raw.status_id),
      rawStatusResponse: result.raw,
      lastCheckedAt: FieldValue.serverTimestamp(),
    });
  }
}
