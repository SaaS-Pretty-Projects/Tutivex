/**
 * TutorEarningsDashboard — earnings summary + payout request flow.
 *
 * Reads: tutor_earnings_summary/{uid}, tutor_earnings_ledger (recent entries)
 * Writes: payout_requests (via Cloud Function — not direct Firestore)
 */

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowDownToLine,
  BadgeCheck,
  Clock,
  CreditCard,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { formatMinorAmount, type Currency } from '../lib/money';
import type {
  EarningsByCurrency,
  TutorEarningEntry,
  TutorEarningsSummary,
} from '../lib/arrearsTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EarningRow {
  lessonId: string;
  grossMinor: number;
  netMinor: number;
  commissionMinor: number;
  currency: Currency;
  lessonCompletedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function CurrencyCard({
  currency,
  earnings,
}: {
  currency: Currency;
  earnings: EarningsByCurrency;
}) {
  const flag = currency === 'EUR' ? '🇪🇺' : '🇬🇧';
  return (
    <div className="liquid-glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">{flag}</span>
        <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
          {currency}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>Pending</span>
          </p>
          <p className="text-white text-lg font-semibold tabular-nums">
            {formatMinorAmount(earnings.pendingMinor, currency)}
          </p>
          <p className="text-white/30 text-xs mt-0.5">dispute window</p>
        </div>

        <div>
          <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" aria-hidden="true" />
            <span>Available</span>
          </p>
          <p className="text-emerald-400 text-lg font-semibold tabular-nums">
            {formatMinorAmount(earnings.availableMinor, currency)}
          </p>
          <p className="text-white/30 text-xs mt-0.5">ready to withdraw</p>
        </div>

        <div>
          <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" aria-hidden="true" />
            <span>Paid out</span>
          </p>
          <p className="text-white/70 text-lg font-semibold tabular-nums">
            {formatMinorAmount(earnings.paidOutMinor, currency)}
          </p>
          <p className="text-white/30 text-xs mt-0.5">cumulative</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TutorEarningsDashboard() {
  const user = auth.currentUser;
  const [summary, setSummary] = useState<TutorEarningsSummary | null>(null);
  const [recentLessons, setRecentLessons] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    async function load() {
      try {
        // Load earnings summary.
        const summarySnap = await getDoc(
          doc(db, 'tutor_earnings_summary', uid),
        );
        if (summarySnap.exists()) {
          setSummary(summarySnap.data() as TutorEarningsSummary);
        }

        // Load recent lesson earnings (last 20).
        const ledgerSnap = await getDocs(
          query(
            collection(db, 'tutor_earnings_ledger'),
            where('tutorUid', '==', uid),
            orderBy('recordedAt', 'desc'),
            limit(20),
          ),
        );
        setRecentLessons(
          ledgerSnap.docs.map((d) => {
            const e = d.data() as TutorEarningEntry;
            return {
              lessonId: e.lessonId,
              grossMinor: e.grossMinor,
              netMinor: e.netMinor,
              commissionMinor: e.commissionMinor,
              currency: e.currency,
              lessonCompletedAt: toDate(e.lessonCompletedAt) ?? new Date(0),
            };
          }),
        );
      } catch (err) {
        console.error('TutorEarningsDashboard load error:', err);
        setError('Failed to load earnings. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // uid captured in closure; runs once on mount (user is already resolved)

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" aria-label="Loading earnings" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="liquid-glass rounded-2xl p-6 text-red-400 text-sm"
      >
        {error}
      </div>
    );
  }

  const currencies = Object.keys(summary?.byCurrency ?? {}) as Currency[];

  return (
    <section aria-labelledby="earnings-heading" className="space-y-8">
      <header>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
          Earnings
        </p>
        <h2 id="earnings-heading" className="text-white text-2xl font-semibold">
          Your payouts
        </h2>
      </header>

      {currencies.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-8 text-center text-white/40 text-sm">
          No earnings recorded yet. Complete your first lesson to see your
          balance here.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {currencies.map((cur) => {
            const earnings = summary?.byCurrency[cur];
            if (!earnings) return null;
            return (
              <div key={cur}>
                <CurrencyCard
                  currency={cur}
                  earnings={earnings}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Request payout CTA — placeholder for the callable wiring */}
      {currencies.some(
        (cur) => (summary?.byCurrency[cur]?.availableMinor ?? 0) > 0,
      ) && (
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            onClick={() => {
              // TODO: wire to requestTutorPayout Cloud Function + bank details form
              alert('Payout request flow coming soon.');
            }}
          >
            <ArrowDownToLine className="w-4 h-4" aria-hidden="true" />
            Request payout
          </button>
        </div>
      )}

      {/* Recent lesson earnings */}
      {recentLessons.length > 0 && (
        <div>
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">
            Recent lessons
          </h3>
          <div className="liquid-glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-white/40 font-medium"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-white/40 font-medium"
                  >
                    Gross
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-white/40 font-medium"
                  >
                    Commission
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 text-white/40 font-medium"
                  >
                    Your net
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentLessons.map((row) => (
                  <tr
                    key={row.lessonId}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white/60 tabular-nums">
                      {row.lessonCompletedAt.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-white/80 text-right tabular-nums">
                      {formatMinorAmount(row.grossMinor, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-right tabular-nums">
                      −{formatMinorAmount(row.commissionMinor, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 text-right tabular-nums font-medium">
                      {formatMinorAmount(row.netMinor, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout history placeholder */}
      <div className="flex items-center gap-3 text-white/30 text-xs">
        <CreditCard className="w-4 h-4" aria-hidden="true" />
        <span>
          Payouts are settled via bank transfer. Finance confirms within 2–3
          business days.
        </span>
      </div>
    </section>
  );
}
