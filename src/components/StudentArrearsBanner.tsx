/**
 * StudentArrearsBanner — shown at the top of the student's dashboard when
 * they have an outstanding balance or unpaid invoices.
 *
 * Behaviour:
 *  - Hidden when creditsMinor > 0 AND outstandingMinor === 0.
 *  - Warning (amber) when outstandingMinor > 0 but below the suspension threshold.
 *  - Blocking (red) when outstandingMinor > SUSPENSION_THRESHOLD — disables
 *    new lesson booking until resolved.
 *  - "Top up" button initiates a SafePay credit-top-up via the Cloud Function.
 */

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { AlertTriangle, CreditCard, XCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { formatMinorAmount, type Currency } from '../lib/money';
import type { BalanceByCurrency, StudentBalance } from '../lib/arrearsTypes';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Outstanding amount (minor units) above which booking new lessons is blocked. */
const SUSPENSION_THRESHOLD_EUR = 5000; // €50.00
const SUSPENSION_THRESHOLD_GBP = 4500; // £45.00

function suspensionThreshold(currency: Currency): number {
  return currency === 'GBP' ? SUSPENSION_THRESHOLD_GBP : SUSPENSION_THRESHOLD_EUR;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BalancePill({
  label,
  amount,
  currency,
  variant,
}: {
  label: string;
  amount: number;
  currency: Currency;
  variant: 'credit' | 'outstanding';
}) {
  const colorClass =
    variant === 'credit'
      ? 'text-emerald-400'
      : amount === 0
        ? 'text-white/60'
        : 'text-amber-400';

  return (
    <div className="flex flex-col items-end">
      <span className="text-white/40 text-xs">{label}</span>
      <span className={`tabular-nums font-semibold text-sm ${colorClass}`}>
        {variant === 'outstanding' && amount > 0 ? '−' : ''}
        {formatMinorAmount(amount, currency)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ArrearsBannerProps {
  /** Called when the student clicks "Top up" — receives the currency to top up. */
  onTopUp?: (currency: Currency) => void;
}

export default function StudentArrearsBanner({ onTopUp }: ArrearsBannerProps) {
  const user = auth.currentUser;
  const [balance, setBalance] = useState<StudentBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    getDoc(doc(db, 'student_balances', uid))
      .then((snap) => {
        if (snap.exists()) setBalance(snap.data() as StudentBalance);
      })
      .catch((err) => console.error('StudentArrearsBanner load error:', err))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // auth.currentUser is stable across the effect lifetime

  if (!user || loading) return null;
  if (!balance) return null;

  // Render a banner for each currency that has an outstanding balance or low credit.
  const entries = Object.entries(balance.byCurrency) as [
    Currency,
    BalanceByCurrency,
  ][];

  const banners = entries.filter(
    ([, b]) => b.outstandingMinor > 0 || b.creditsMinor < 1000,
  );

  if (banners.length === 0) return null;

  return (
    <div role="alert" className="space-y-2" aria-label="Account balance alerts">
      {banners.map(([currency, b]) => {
        const isBlocking = b.outstandingMinor >= suspensionThreshold(currency);
        const hasOutstanding = b.outstandingMinor > 0;
        const lowCredit = !hasOutstanding && b.creditsMinor < 1000;

        const bgClass = isBlocking
          ? 'bg-red-950/60 border border-red-500/40'
          : 'bg-amber-950/60 border border-amber-500/40';

        const Icon = isBlocking ? XCircle : AlertTriangle;
        const iconClass = isBlocking ? 'text-red-400' : 'text-amber-400';

        const message = isBlocking
          ? `Your account has been flagged. New lessons are paused until you clear the outstanding ${formatMinorAmount(b.outstandingMinor, currency)} balance.`
          : hasOutstanding
            ? `You have an outstanding balance of ${formatMinorAmount(b.outstandingMinor, currency)}. Please top up to continue booking.`
            : `Your ${currency} credit is running low (${formatMinorAmount(b.creditsMinor, currency)} remaining). Top up to avoid interruptions.`;

        return (
          <div
            key={currency}
            className={`${bgClass} rounded-2xl px-5 py-4 flex items-start gap-4`}
          >
            <Icon
              className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`}
              aria-hidden="true"
            />

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">
                {isBlocking ? 'Booking paused' : lowCredit ? 'Low credit' : 'Outstanding balance'}
              </p>
              <p className="text-white/60 text-xs mt-0.5">{message}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <BalancePill
                label="Credit"
                amount={b.creditsMinor}
                currency={currency}
                variant="credit"
              />
              {hasOutstanding && (
                <BalancePill
                  label="Owed"
                  amount={b.outstandingMinor}
                  currency={currency}
                  variant="outstanding"
                />
              )}

              <button
                type="button"
                onClick={() => onTopUp?.(currency)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors whitespace-nowrap"
                aria-label={`Top up ${currency} balance`}
              >
                <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                Top up
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: useStudentIsBlocked
// ---------------------------------------------------------------------------

/**
 * Returns true if the student has an outstanding balance in any currency that
 * exceeds the suspension threshold. Use this to gate the "Book lesson" button.
 */
export function useStudentIsBlocked(): boolean {
  const user = auth.currentUser;
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    getDoc(doc(db, 'student_balances', uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const bal = snap.data() as StudentBalance;
        const isBlocked = Object.entries(bal.byCurrency).some(
          ([cur, b]) => (b as BalanceByCurrency).outstandingMinor >= suspensionThreshold(cur as Currency),
        );
        setBlocked(isBlocked);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // auth.currentUser.uid is stable for the auth session

  return blocked;
}
