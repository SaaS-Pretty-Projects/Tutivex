/**
 * SafePay server-side helpers for Teachenza Cloud Functions.
 *
 * Ported / reconstructed from:
 *   cloudbase/shared/payments/safepay-server.js (MD5 signing + response parsing)
 *   luxuryui Firebase callable wrappers
 *   cookflow IPN handler (hash validation pattern)
 *
 * ⚠️  MERCHANT_ID / MERCHANT_SECRET must be injected at call-time from
 * Firebase Secret Manager — never hard-code them here.
 */

import { createHash } from 'crypto';
import type { Currency } from '../money';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SafepayCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  city: string;
}

export interface CreatePaymentSessionParams {
  invoice: string;
  amountMinor: number;
  currency: Currency;
  description: string;
  customer: SafepayCustomerInput;
  successUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  merchantId: string;
  merchantSecret: string;
  safepayApiUrl: string; // e.g. "https://sandbox.safepay.pk/order/create"
}

export interface CreatePaymentSessionResult {
  ok: true;
  checkoutUrl: string;
  providerTransactionId: string;
  rawResponse: string;
}

export interface SafepayErrorResult {
  ok: false;
  error: string;
  rawResponse: string;
}

export interface RefreshStatusParams {
  invoice: string;
  merchantId: string;
  merchantSecret: string;
  safepayStatusUrl: string; // e.g. "https://sandbox.safepay.pk/order/status"
}

export interface RawSafepayStatusResponse {
  status_id: number | string;
  payment_system_status?: string;
  trans_id?: string; // "invoice,txn"
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// MD5 signing
// ---------------------------------------------------------------------------

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

export function computeSafepayPaymentHash(
  amountMinor: number,
  currency: Currency,
  merchantId: string,
  merchantSecret: string,
): string {
  return md5(`${amountMinor}${currency}${merchantId}${merchantSecret}`);
}

/**
 * Compute the SafePay status/IPN signature.
 *
 *   hash = md5(invoice + merchantId + merchantSecret)
 */
export function computeSafepayRequestHash(
  invoice: string,
  merchantId: string,
  merchantSecret: string,
): string {
  return md5(`${invoice}${merchantId}${merchantSecret}`);
}

/**
 * Constant-time comparison to prevent timing attacks when validating an
 * incoming IPN hash against the expected value.
 */
export function verifyIpnHash(
  receivedHash: string,
  invoice: string,
  merchantId: string,
  merchantSecret: string,
): boolean {
  const expected = computeSafepayRequestHash(invoice, merchantId, merchantSecret);
  // Pad to equal length before comparing to maintain constant-time behaviour.
  const a = Buffer.from(receivedHash.padEnd(expected.length, '\0'));
  const b = Buffer.from(expected.padEnd(receivedHash.length, '\0'));
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Pure JS timing-safe comparison (falls back gracefully when
 * crypto.timingSafeEqual is not available — e.g. in test runners).
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Invoice ID builder
// ---------------------------------------------------------------------------

import { randomUUID } from 'crypto';

/**
 * Build a deterministic invoice ID in the form TUT-{6-char uid prefix}-{uuid}.
 * The invoice IS the Firestore document ID — uniqueness is enforced at the
 * Firestore layer (merge:false on create).
 */
export function buildInvoiceId(studentUid: string): string {
  const prefix = studentUid.slice(0, 6).replace(/[^a-zA-Z0-9]/g, 'X');
  return `TUT-${prefix}-${randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Create payment session
// ---------------------------------------------------------------------------

/**
 * POST to SafePay to create a hosted payment session.
 *
 * SafePay returns a line-delimited response:
 *   OK\n<checkout_url>
 * or an error string.
 *
 * Amounts are sent in minor units as required by SafePay.
 */
export async function createSafepaySession(
  params: CreatePaymentSessionParams,
): Promise<CreatePaymentSessionResult | SafepayErrorResult> {
  const {
    invoice,
    amountMinor,
    currency,
    description,
    customer,
    successUrl,
    cancelUrl,
    ipnUrl,
    merchantId,
    merchantSecret,
    safepayApiUrl,
  } = params;

  const hash = computeSafepayPaymentHash(amountMinor, currency, merchantId, merchantSecret);

  const body = new URLSearchParams({
    _cmd: 'payment',
    merchant_id: merchantId,
    invoice,
    amount: String(amountMinor),
    currency,
    language: 'ENG',
    description,
    cl_fname: customer.firstName,
    cl_lname: customer.lastName,
    cl_email: customer.email,
    cl_phone: customer.phone,
    cl_country: customer.countryCode,
    cl_city: customer.city,
    psys: '',
    get_trans: '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
    ipn_url: ipnUrl,
    hash,
  });

  const res = await fetch(safepayApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const rawResponse = await res.text();

  if (!res.ok) {
    return { ok: false, error: `SafePay HTTP ${res.status}`, rawResponse };
  }

  const match = rawResponse.trim().match(/^OK\s+(.+)$/s);
  const checkoutUrl = match?.[1]?.trim();

  if (!checkoutUrl) {
    return { ok: false, error: 'Unexpected SafePay response format', rawResponse };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    return { ok: false, error: 'SafePay returned an invalid checkout URL', rawResponse };
  }
  const allowedHosts = new Set(['www.safepayto.me', 'safepayto.me', 'loyalty.safepayto.me']);
  if (parsedUrl.protocol !== 'https:' || !allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
    return { ok: false, error: 'Unexpected SafePay checkout host', rawResponse };
  }

  const transParam = parsedUrl.searchParams.get('trans_id') ?? '';
  const providerTransactionId = parseTransId(transParam)?.txn;
  if (!providerTransactionId) {
    return { ok: false, error: 'SafePay response did not include a transaction id', rawResponse };
  }

  return { ok: true, checkoutUrl, providerTransactionId, rawResponse };
}

// ---------------------------------------------------------------------------
// Refresh / poll payment status
// ---------------------------------------------------------------------------

/**
 * Poll SafePay for the current status of an invoice.
 *
 * Returns the raw status response for storage in payment_orders.rawStatusResponse
 * and the parsed providerStatusId / providerStatusText for classification.
 */
export async function fetchSafepayStatus(
  params: RefreshStatusParams,
): Promise<
  | { ok: true; raw: RawSafepayStatusResponse }
  | SafepayErrorResult
> {
  const { invoice, merchantId, merchantSecret, safepayStatusUrl } = params;
  const hash = computeSafepayRequestHash(invoice, merchantId, merchantSecret);

  const body = new URLSearchParams({
    _cmd: 'request',
    merchant_id: merchantId,
    invoice,
    hash,
    output: 'json',
  });

  const res = await fetch(safepayStatusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const rawText = await res.text();

  if (!res.ok) {
    return { ok: false, error: `SafePay HTTP ${res.status}`, rawResponse: rawText };
  }

  // SafePay returns form-encoded or JSON depending on endpoint — parse defensively.
  let parsed: RawSafepayStatusResponse;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Fall back to URLSearchParams parsing.
    const params = new URLSearchParams(rawText);
    parsed = Object.fromEntries(params.entries()) as unknown as RawSafepayStatusResponse;
  }

  return { ok: true, raw: parsed };
}

// ---------------------------------------------------------------------------
// Parse trans_id (invoice,txn format used by SafePay)
// ---------------------------------------------------------------------------

/**
 * SafePay encodes trans_id as "invoice,txn" in some responses.
 * Returns { invoice, txn } or null if the format is unexpected.
 */
export function parseTransId(
  transId: string | undefined | null,
): { invoice: string; txn: string } | null {
  if (!transId) return null;
  const idx = transId.indexOf(',');
  if (idx === -1) return null;
  return { invoice: transId.slice(0, idx), txn: transId.slice(idx + 1) };
}
