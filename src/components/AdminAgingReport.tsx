/**
 * AdminAgingReport — admin view of all outstanding invoices grouped by aging
 * bucket with CSV export and bulk write-off action.
 *
 * Reads: arrears_invoices (admin only — enforced by Firestore rules +
 *        requires request.auth.token.admin === true custom claim)
 *
 * Accessibility:
 *   - Status badges use icon + text label, not colour alone.
 *   - Table uses <th scope="col"> / <th scope="row">.
 *   - Live region for action feedback.
 */

import { type ComponentType, type RefObject, useEffect, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { formatMinorAmount, type Currency } from '../lib/money';
import type {
  AgingBucket,
  ArrearsInvoice,
  ArrearsInvoiceStatus,
} from '../lib/arrearsTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGING_BUCKETS: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+'];

const BUCKET_LABELS: Record<AgingBucket, string> = {
  'current': 'Current',
  '1-30': '1–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
};

const BUCKET_COLOR: Record<AgingBucket, string> = {
  'current': 'text-emerald-400',
  '1-30': 'text-amber-300',
  '31-60': 'text-amber-400',
  '61-90': 'text-orange-400',
  '90+': 'text-red-400',
};

// ---------------------------------------------------------------------------
// Status badge (icon + text — not colour-only)
// ---------------------------------------------------------------------------

const STATUS_META: Record<
  ArrearsInvoiceStatus,
  { label: string; Icon: ComponentType<{ className?: string }>; color: string }
> = {
  pending: { label: 'Pending', Icon: Clock, color: 'text-white/60' },
  processing: { label: 'Processing', Icon: RotateCcw, color: 'text-blue-400' },
  paid: { label: 'Paid', Icon: CheckCircle2, color: 'text-emerald-400' },
  overdue: { label: 'Overdue', Icon: AlertTriangle, color: 'text-amber-400' },
  written_off: { label: 'Written off', Icon: XCircle, color: 'text-white/30' },
};

function StatusBadge({ status }: { status: ArrearsInvoiceStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${meta.color}`}>
      <meta.Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportToCsv(rows: ArrearsInvoice[]) {
  const headers = [
    'Invoice ID',
    'Student UID',
    'Amount',
    'Currency',
    'Status',
    'Aging Bucket',
    'Due Date',
    'Created At',
  ];

  function toDate(ts: unknown): string {
    if (!ts) return '';
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
      return (ts as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
    }
    return '';
  }

  const csvRows = rows.map((inv) =>
    [
      inv.id,
      inv.studentUid,
      (inv.amountMinor / 100).toFixed(2),
      inv.currency,
      inv.status,
      inv.agingBucket,
      toDate(inv.dueDate),
      toDate(inv.createdAt),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );

  const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arrears-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Totals by currency
// ---------------------------------------------------------------------------

function totalsFor(rows: ArrearsInvoice[], currencies: Currency[]) {
  return currencies.map((cur) => {
    const matching = rows.filter((r) => r.currency === cur);
    const total = matching.reduce((sum, r) => sum + r.amountMinor, 0);
    return { currency: cur, total, count: matching.length };
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminAgingReport() {
  const [invoices, setInvoices] = useState<ArrearsInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBucket, setFilterBucket] = useState<AgingBucket | 'all'>('all');
  const [filterCurrency, setFilterCurrency] = useState<Currency | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const openStatuses: ArrearsInvoiceStatus[] = ['pending', 'processing', 'overdue'];
        const snap = await getDocs(
          query(
            collection(db, 'arrears_invoices'),
            where('status', 'in', openStatuses),
            orderBy('dueDate', 'asc'),
            limit(500),
          ),
        );
        setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArrearsInvoice)));
      } catch (err) {
        console.error('AdminAgingReport load error:', err);
        setError('Failed to load invoices. Ensure you have admin access.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Apply filters.
  const filtered = invoices.filter((inv) => {
    if (filterBucket !== 'all' && inv.agingBucket !== filterBucket) return false;
    if (filterCurrency !== 'all' && inv.currency !== filterCurrency) return false;
    return true;
  });

  const currencies = [...new Set(invoices.map((i) => i.currency))] as Currency[];
  const summaryTotals = totalsFor(filtered, currencies);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  }

  function showFeedback(msg: string) {
    setFeedback(msg);
    feedbackRef.current?.focus();
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleBulkWriteOff() {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Write off ${selectedIds.size} invoice(s)? This action is logged and cannot be undone.`,
    );
    if (!confirmed) return;

    // TODO: wire to a Cloud Function (writeOffInvoices) that validates admin
    // claim, writes the write-off atomically, and appends to audit_log.
    showFeedback(
      `${selectedIds.size} invoice(s) queued for write-off (Cloud Function integration pending).`,
    );
    setSelectedIds(new Set());
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="w-6 h-6 text-white/40 animate-spin"
          aria-label="Loading aging report"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="liquid-glass rounded-2xl p-6 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <section aria-labelledby="aging-heading" className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            Finance
          </p>
          <h2 id="aging-heading" className="text-white text-2xl font-semibold">
            Aging report
          </h2>
        </div>

        <button
          type="button"
          onClick={() => exportToCsv(filtered)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          aria-label="Export filtered invoices to CSV"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export CSV
        </button>
      </header>

      {/* Summary totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {AGING_BUCKETS.map((bucket) => {
          const bucketInvs = filtered.filter((i) => i.agingBucket === bucket);
          if (bucketInvs.length === 0) return null;
          const total = bucketInvs.reduce((s, i) => s + i.amountMinor, 0);
          const displayCur: Currency =
            bucketInvs[0]?.currency ?? 'EUR';
          return (
            <button
              key={bucket}
              type="button"
              onClick={() =>
                setFilterBucket((prev) => (prev === bucket ? 'all' : bucket))
              }
              className={`liquid-glass rounded-xl p-4 text-left transition-colors ${
                filterBucket === bucket ? 'ring-1 ring-white/30' : ''
              }`}
              aria-label={`Filter by ${BUCKET_LABELS[bucket]}${filterBucket === bucket ? ' (active)' : ''}`}
            >
              <p className={`text-xs font-medium mb-1 ${BUCKET_COLOR[bucket]}`}>
                {BUCKET_LABELS[bucket]}
              </p>
              <p className="text-white text-lg font-semibold tabular-nums">
                {formatMinorAmount(total, displayCur)}
              </p>
              <p className="text-white/40 text-xs">
                {bucketInvs.length} invoice{bucketInvs.length !== 1 ? 's' : ''}
              </p>
            </button>
          );
        })}
      </div>

      {/* Summary totals by currency */}
      <div className="flex gap-6">
        {summaryTotals.map(({ currency, total, count }) => (
          <div key={currency} className="text-sm">
            <span className="text-white/40">{currency} total: </span>
            <span className="text-white font-semibold tabular-nums">
              {formatMinorAmount(total, currency)}
            </span>
            <span className="text-white/30"> ({count})</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <fieldset className="flex flex-wrap gap-3"><legend className="sr-only">Filters</legend>
        <select
          value={filterBucket}
          onChange={(e) => setFilterBucket(e.target.value as AgingBucket | 'all')}
          className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border-0 focus:ring-1 focus:ring-white/30 outline-none"
          aria-label="Filter by aging bucket"
        >
          <option value="all">All buckets</option>
          {AGING_BUCKETS.map((b) => (
            <option key={b} value={b}>
              {BUCKET_LABELS[b]}
            </option>
          ))}
        </select>

        <select
          value={filterCurrency}
          onChange={(e) => setFilterCurrency(e.target.value as Currency | 'all')}
          className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 border-0 focus:ring-1 focus:ring-white/30 outline-none"
          aria-label="Filter by currency"
        >
          <option value="all">All currencies</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </fieldset>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 text-sm">
          <span className="text-white/60">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={handleBulkWriteOff}
            className="text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Write off selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-white/40 hover:text-white/60 transition-colors ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Live feedback region */}
      <output
        ref={feedbackRef as RefObject<HTMLOutputElement>}
        aria-live="polite"
        className="sr-only"
        tabIndex={-1}
      >
        {feedback}
      </output>

      {/* Table */}
      <div className="liquid-glass rounded-2xl overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-10">
            No open invoices matching the current filters.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10">
                <th scope="col" className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filtered.length && filtered.length > 0
                    }
                    onChange={toggleSelectAll}
                    aria-label="Select all invoices"
                    className="accent-white"
                  />
                </th>
                <th
                  scope="col"
                  className="text-left px-4 py-3 text-white/40 font-medium"
                >
                  Invoice
                </th>
                <th
                  scope="col"
                  className="text-left px-4 py-3 text-white/40 font-medium"
                >
                  Student
                </th>
                <th
                  scope="col"
                  className="text-right px-4 py-3 text-white/40 font-medium"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="text-left px-4 py-3 text-white/40 font-medium"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="text-left px-4 py-3 text-white/40 font-medium"
                >
                  Age
                </th>
                <th
                  scope="col"
                  className="text-left px-4 py-3 text-white/40 font-medium"
                >
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const dueDateObj =
                  inv.dueDate &&
                  typeof (inv.dueDate as { toDate?: unknown }).toDate === 'function'
                    ? (inv.dueDate as { toDate: () => Date }).toDate()
                    : null;
                const dueDate = dueDateObj
                    ? dueDateObj.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        aria-label={`Select invoice ${inv.id}`}
                        className="accent-white"
                      />
                    </td>
                    <th
                      scope="row"
                      className="px-4 py-3 text-left text-white/60 font-mono text-xs"
                    >
                      {inv.id.slice(0, 20)}…
                    </th>
                    <td className="px-4 py-3 text-white/50 font-mono text-xs">
                      {inv.studentUid.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-white text-right tabular-nums font-medium">
                      {formatMinorAmount(inv.amountMinor, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td
                      className={`px-4 py-3 text-xs ${BUCKET_COLOR[inv.agingBucket]}`}
                    >
                      {BUCKET_LABELS[inv.agingBucket]}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs tabular-nums">
                      {dueDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
