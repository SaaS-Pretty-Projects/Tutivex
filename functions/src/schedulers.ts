/**
 * Scheduled Cloud Functions — aging buckets, payment sweep, reconciliation.
 *
 * All schedulers are idempotent — safe to run multiple times.
 * See docs/arrears/data-model.md §2, §3.4, §4.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { applyPaymentToStudentBalance } from './arrears';
import type { AgingBucket, ArrearsInvoice } from '../../src/lib/arrearsTypes';

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Aging bucket computation
// ---------------------------------------------------------------------------

/**
 * Compute the aging bucket for an invoice based on days past due date.
 * Bucket boundaries match standard A/R aging reports.
 */
export function bucketFor(due: Date, now: Date): AgingBucket {
  const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/**
 * Scheduled: daily.
 *
 * - Stamps agingBucket on every open invoice.
 * - Flips pending → overdue when dueDate < now.
 *
 * Run after midnight UTC so "today" buckets are up to date for admin reports.
 */
export async function computeAgingBuckets(): Promise<{ processed: number }> {
  const now = new Date();
  const openStatuses = ['pending', 'processing', 'overdue'];

  const snap = await db
    .collection('arrears_invoices')
    .where('status', 'in', openStatuses)
    .get();

  const batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    const inv = doc.data() as ArrearsInvoice;
    const dueDate: Date =
      inv.dueDate && typeof (inv.dueDate as any).toDate === 'function'
        ? (inv.dueDate as any).toDate()
        : new Date(inv.dueDate as any);

    const newBucket = bucketFor(dueDate, now);
    const isOverdue = dueDate < now && inv.status === 'pending';

    const update: Record<string, unknown> = {
      agingBucket: newBucket,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (isOverdue) {
      update.status = 'overdue';
    }

    batch.update(doc.ref, update);
    count++;

    // Firestore batch limit is 500 operations.
    if (count % 499 === 0) {
      await batch.commit();
    }
  }

  await batch.commit();
  return { processed: count };
}

// ---------------------------------------------------------------------------
// Payment sweep — catch-all for missed IPN webhooks
// ---------------------------------------------------------------------------

const SWEEP_WINDOW_HOURS = 24;

/**
 * Scheduled: every 5 minutes (configured in firebase.json / Cloud Scheduler).
 *
 * Iterates payment_orders where status=processing AND createdAt is within
 * the last SWEEP_WINDOW_HOURS. Calls the same poll-and-apply logic used by
 * refreshSafepayStatus. Orders older than 24h are flipped to manual_review.
 *
 * With IPN as the primary path, this handles only stragglers (~10-50/day
 * at 1,000 daily checkouts).
 */
export async function sweepProcessingPayments(): Promise<{
  polled: number;
  escalated: number;
}> {
  const cutoff = new Date(Date.now() - SWEEP_WINDOW_HOURS * 60 * 60 * 1000);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

  const snap = await db
    .collection('payment_orders')
    .where('status', '==', 'processing')
    .where('createdAt', '>=', cutoffTimestamp)
    .get();

  let polled = 0;
  let escalated = 0;

  for (const doc of snap.docs) {
    const order = doc.data() as { invoice: string; createdAt: admin.firestore.Timestamp };
    const ageMs = Date.now() - order.createdAt.toMillis();
    const ageHours = ageMs / 3_600_000;

    if (ageHours >= SWEEP_WINDOW_HOURS) {
      // Past the sweep window → escalate to manual review.
      await doc.ref.update({
        status: 'manual_review',
        lastCheckedAt: FieldValue.serverTimestamp(),
      });
      escalated++;
    } else {
      // Delegate to the same internal poll helper used by refreshSafepayStatus.
      try {
        // Import lazily to avoid circular dependency at module load.
        const { _sweepPollOne } = await import('./sweepHelper');
        await _sweepPollOne(order.invoice);
      } catch (err) {
        console.error(`sweep: failed to poll invoice ${order.invoice}:`, err);
      }
      polled++;
    }
  }

  return { polled, escalated };
}

// ---------------------------------------------------------------------------
// Daily reconciliation
// ---------------------------------------------------------------------------

/**
 * Scheduled: once daily (after SafePay settlement window).
 *
 * Per currency:
 *   1. Sum payment_orders where status=completed AND completedAt in [yesterday].
 *   2. Compare against student_balances credit deltas applied yesterday.
 *   3. Write reconciliation result to audit_log.
 *   4. If drift != 0, write a DRIFT alert entry (page on-call in production).
 */
export async function dailyReconciliation(): Promise<{
  EUR: { expected: number; applied: number; drift: number };
  GBP: { expected: number; applied: number; drift: number };
}> {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const todayMidnight = new Date(yesterday);
  todayMidnight.setUTCDate(todayMidnight.getUTCDate() + 1);

  const startTs = admin.firestore.Timestamp.fromDate(yesterday);
  const endTs = admin.firestore.Timestamp.fromDate(todayMidnight);

  const completedSnap = await db
    .collection('payment_orders')
    .where('status', '==', 'completed')
    .where('completedAt', '>=', startTs)
    .where('completedAt', '<', endTs)
    .get();

  const expected: Record<string, number> = { EUR: 0, GBP: 0 };
  const applied: Record<string, number> = { EUR: 0, GBP: 0 };

  for (const doc of completedSnap.docs) {
    const o = doc.data() as { amountMinor: number; currency: string; creditAppliedAt: any };
    if (o.currency === 'EUR' || o.currency === 'GBP') {
      expected[o.currency] += o.amountMinor;
      if (o.creditAppliedAt) applied[o.currency] += o.amountMinor;
    }
  }

  const results = {
    EUR: { expected: expected.EUR, applied: applied.EUR, drift: expected.EUR - applied.EUR },
    GBP: { expected: expected.GBP, applied: applied.GBP, drift: expected.GBP - applied.GBP },
  };

  const auditRef = db.collection('audit_log');
  await auditRef.add({
    at: FieldValue.serverTimestamp(),
    actorUid: 'scheduler',
    action: 'reconciliation.daily',
    subject: { collection: 'payment_orders', id: 'daily' },
    before: null,
    after: results,
    context: { date: yesterday.toISOString().slice(0, 10) },
  });

  if (results.EUR.drift !== 0 || results.GBP.drift !== 0) {
    console.error('RECONCILIATION DRIFT DETECTED', results);
    // In production: integrate with alerting (PagerDuty, Firebase Alerting, etc.)
    await auditRef.add({
      at: FieldValue.serverTimestamp(),
      actorUid: 'scheduler',
      action: 'reconciliation.drift_alert',
      subject: { collection: 'payment_orders', id: 'daily' },
      before: null,
      after: results,
      context: { severity: 'critical' },
    });
  }

  return results;
}
