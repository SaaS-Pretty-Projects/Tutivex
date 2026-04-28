import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  completeLesson as completeLessonImpl,
  createSafepayPaymentSession as createSafepayPaymentSessionImpl,
  refreshSafepayStatus as refreshSafepayStatusImpl,
  safepayIpn as safepayIpnImpl,
} from './arrears';
import {
  computeAgingBuckets,
  dailyReconciliation,
  sweepProcessingPayments,
} from './schedulers';

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

const safepayMerchantId = defineSecret('SAFEPAY_MERCHANT_ID');
const safepayMerchantSecret = defineSecret('SAFEPAY_MERCHANT_SECRET');
const safepayApiUrl = defineSecret('SAFEPAY_API_URL');
const safepayStatusUrl = defineSecret('SAFEPAY_STATUS_URL');
const safepayIpnUrl = defineSecret('SAFEPAY_IPN_URL');
const appBaseUrl = defineSecret('APP_BASE_URL');

function asCallableContext(request: { auth?: { uid: string; token?: Record<string, unknown> } }) {
  return {
    auth: request.auth ? { uid: request.auth.uid } : undefined,
    token: { admin: request.auth?.token?.admin === true },
  };
}

function toHttpsError(error: unknown): HttpsError {
  const message = error instanceof Error ? error.message : 'Unexpected function error';

  if (message === 'Unauthenticated') {
    return new HttpsError('unauthenticated', message);
  }
  if (message === 'Forbidden') {
    return new HttpsError('permission-denied', message);
  }
  if (/required|invalid|unsupported|must be/i.test(message)) {
    return new HttpsError('invalid-argument', message);
  }

  return new HttpsError('internal', message);
}

export const createSafepayPaymentSession = onCall(
  {
    secrets: [
      safepayMerchantId,
      safepayMerchantSecret,
      safepayApiUrl,
      safepayIpnUrl,
      appBaseUrl,
    ],
  },
  async (request) => {
    try {
      return await createSafepayPaymentSessionImpl(
        request.data,
        asCallableContext(request),
      );
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const refreshSafepayStatus = onCall(
  {
    secrets: [safepayMerchantId, safepayMerchantSecret, safepayStatusUrl],
  },
  async (request) => {
    try {
      return await refreshSafepayStatusImpl(request.data, asCallableContext(request));
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

export const completeLesson = onCall(async (request) => {
  try {
    return await completeLessonImpl(request.data, asCallableContext(request));
  } catch (error) {
    throw toHttpsError(error);
  }
});

export const safepayIpn = onRequest(
  {
    secrets: [safepayMerchantId, safepayMerchantSecret],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const body =
      typeof req.body === 'object' && req.body !== null
        ? req.body
        : Object.fromEntries(new URLSearchParams(req.rawBody?.toString('utf8') ?? ''));

    await safepayIpnImpl({ body, method: req.method }, res);
  },
);

export const sweepProcessingPaymentsJob = onSchedule(
  {
    schedule: 'every 5 minutes',
    secrets: [safepayMerchantId, safepayMerchantSecret, safepayStatusUrl],
  },
  async () => {
    await sweepProcessingPayments();
  },
);

export const computeAgingBucketsJob = onSchedule('0 1 * * *', async () => {
  await computeAgingBuckets();
});

export const dailyReconciliationJob = onSchedule('30 1 * * *', async () => {
  await dailyReconciliation();
});
