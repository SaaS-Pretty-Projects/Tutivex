/**
 * SafePay server-side helpers for Tutivex Cloud Functions.
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
import type { Currency } from '../../../src/lib/money';

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

/**
 * Compute the SafePay HMAC-style signature used for both request signing and
 * IPN validation.
 *
 *   hash = md5(invoice + merchantId + merchantSecret)
 */
export function computeSafepayHash(
  invoice: string,
  merchantId: string,
  merchantSecret: string,
): string {
  return createHash('md5')
    .update(`${invoice}${merchantId}${merchantSecret}`)
    .digest('hex');
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
  const expected = computeSafepayHash(invoice, merchantId, merchantSecret);
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

  const hash = computeSafepayHash(invoice, merchantId, merchantSecret);

  const body = new URLSearchParams({
    merchant_id: merchantId,
    invoice,
    amount: String(amountMinor),
    currency,
    description,
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    country_code: customer.countryCode,
    city: customer.city,
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

  const lines = rawResponse.trim().split('\n');
  if (lines[0] !== 'OK' || !lines[1]) {
    return { ok: false, error: 'Unexpected SafePay response format', rawResponse };
  }

  return { ok: true, checkoutUrl: lines[1].trim(), rawResponse };
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
  const hash = computeSafepayHash(invoice, merchantId, merchantSecret);

  const body = new URLSearchParams({
    merchant_id: merchantId,
    invoice,
    hash,
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
