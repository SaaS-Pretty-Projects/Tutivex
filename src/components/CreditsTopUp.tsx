import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {doc, getDoc} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {ArrowLeft, CheckCircle2, CreditCard, Loader2, RefreshCw, ShieldCheck} from 'lucide-react';
import {auth, db, functions} from '../lib/firebase';
import {amountMajorToMinor, formatMinorAmount, type Currency} from '../lib/money';
import type {StudentBalance} from '../lib/arrearsTypes';

const TOP_UP_AMOUNTS = [25, 50, 100, 250];

type CheckoutStatus = 'idle' | 'creating' | 'checking' | 'processing' | 'completed' | 'failed';

interface CreatePaymentSessionResponse {
  invoice: string;
  checkoutUrl: string;
}

interface RefreshStatusResponse {
  status: 'processing' | 'completed' | 'failed' | 'manual_review';
  creditAppliedAt: unknown | null;
}

function splitName(displayName: string | null | undefined) {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Tutivex',
    lastName: parts.slice(1).join(' ') || 'Learner',
  };
}

export default function CreditsTopUp() {
  const location = useLocation();
  const user = auth.currentUser;
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnedInvoice = query.get('invoice') || sessionStorage.getItem('tutivex.pendingSafepayInvoice') || '';
  const returnedFromCheckout = location.pathname.startsWith('/checkout/');
  const initialCurrency = query.get('currency') === 'GBP' ? 'GBP' : 'EUR';
  const defaultName = splitName(user?.displayName);

  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [amountMajor, setAmountMajor] = useState(50);
  const [balance, setBalance] = useState<StudentBalance | null>(null);
  const [invoice, setInvoice] = useState(returnedInvoice);
  const [status, setStatus] = useState<CheckoutStatus>(returnedFromCheckout ? 'checking' : 'idle');
  const [message, setMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    firstName: defaultName.firstName,
    lastName: defaultName.lastName,
    email: user?.email || '',
    phone: '',
    countryCode: 'GB',
    city: '',
  });

  const refreshInvoiceStatus = async (invoiceToRefresh: string) => {
    const refreshStatus = httpsCallable<{invoice: string}, RefreshStatusResponse>(functions, 'refreshSafepayStatus');

    setStatus('checking');
    setMessage('Checking SafePay status and applying credits when the payment is complete.');

    try {
      const result = await refreshStatus({invoice: invoiceToRefresh});

      if (result.data.status === 'completed' && result.data.creditAppliedAt) {
        sessionStorage.removeItem('tutivex.pendingSafepayInvoice');
        setStatus('completed');
        setMessage('Payment confirmed. Your credits have been added to your Tutivex balance.');
        return 'completed';
      }

      if (result.data.status === 'failed' || result.data.status === 'manual_review') {
        setStatus('failed');
        setMessage(
          result.data.status === 'manual_review'
            ? 'SafePay returned an ambiguous status. The payment has been held for manual review.'
            : 'SafePay marked this payment as failed.',
        );
        return result.data.status;
      }

      setStatus('processing');
      setMessage('SafePay is still processing this payment. This page will keep checking briefly.');
      return 'processing';
    } catch (error) {
      console.error('SafePay status refresh failed', error);
      setStatus('failed');
      setMessage('Could not refresh payment status. Try again in a moment.');
      return 'failed';
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    getDoc(doc(db, 'student_balances', user.uid))
      .then((snapshot) => {
        if (snapshot.exists()) {
          setBalance(snapshot.data() as StudentBalance);
        }
      })
      .catch((error) => {
        console.error('Failed to load credit balance', error);
      });
  }, [user]);

  useEffect(() => {
    if (!returnedFromCheckout || !invoice) {
      return;
    }

    let cancelled = false;
    async function poll() {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const nextStatus = await refreshInvoiceStatus(invoice);
        if (cancelled || nextStatus !== 'processing') {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [invoice, returnedFromCheckout]);

  const selectedMinorAmount = amountMajorToMinor(amountMajor, currency);
  const balanceForCurrency = balance?.byCurrency?.[currency];

  const startTopUp = async () => {
    if (!user || status === 'creating') {
      return;
    }

    if (!customer.email || !customer.phone || !customer.countryCode || !customer.city) {
      setStatus('failed');
      setMessage('Add email, phone, country code, and city before opening SafePay checkout.');
      return;
    }

    try {
      setStatus('creating');
      setMessage('Creating a signed SafePay checkout session.');

      const createSession = httpsCallable<
        {
          amountMinor: number;
          currency: Currency;
          description: string;
          customer: typeof customer;
        },
        CreatePaymentSessionResponse
      >(functions, 'createSafepayPaymentSession');

      const result = await createSession({
        amountMinor: selectedMinorAmount,
        currency,
        description: `${formatMinorAmount(selectedMinorAmount, currency)} Tutivex credit top-up`,
        customer,
      });

      sessionStorage.setItem('tutivex.pendingSafepayInvoice', result.data.invoice);
      window.location.assign(result.data.checkoutUrl);
    } catch (error) {
      console.error('SafePay checkout creation failed', error);
      setStatus('failed');
      setMessage('SafePay checkout could not be created. Check the payment connection and try again.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-white/55 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/45">Credits</span>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-6">
        <div className="liquid-glass rounded-[2rem] p-7 md:p-9 border border-white/10">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-4">Credit top-up</p>
          <h2 className="text-3xl md:text-5xl font-serif tracking-tight mb-4">Add lesson credits with SafePay</h2>
          <p className="max-w-2xl text-white/62 leading-relaxed mb-8">
            Credits are added only after SafePay confirms the payment through the secured backend ledger.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {(['EUR', 'GBP'] as Currency[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCurrency(option)}
                className={`rounded-2xl border px-5 py-4 text-left transition-colors ${
                  currency === option
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.03] border-white/10 text-white hover:border-white/25'
                }`}
              >
                <span className="text-sm font-medium">{option}</span>
                <span className={`block text-xs mt-1 ${currency === option ? 'text-black/55' : 'text-white/45'}`}>
                  Current credit: {formatMinorAmount(balance?.byCurrency?.[option]?.creditsMinor ?? 0, option)}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {TOP_UP_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setAmountMajor(amount)}
                className={`rounded-2xl px-4 py-4 text-sm font-medium border transition-colors ${
                  amountMajor === amount
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.03] border-white/10 text-white hover:border-white/25'
                }`}
              >
                {formatMinorAmount(amountMajorToMinor(amount, currency), currency)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['firstName', 'First name'],
              ['lastName', 'Last name'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['countryCode', 'Country code'],
              ['city', 'City'],
            ].map(([field, label]) => (
              <label key={field} className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</span>
                <input
                  value={customer[field as keyof typeof customer]}
                  onChange={(event) => setCustomer((current) => ({...current, [field]: event.target.value}))}
                  className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={startTopUp}
            disabled={status === 'creating'}
            className="mt-8 bg-white text-black rounded-full px-5 py-3 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
          >
            {status === 'creating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Pay {formatMinorAmount(selectedMinorAmount, currency)} with SafePay
          </button>
        </div>

        <div className="space-y-6">
          <div className="liquid-glass rounded-[2rem] p-7 border border-white/8">
            <div className="flex items-center gap-3 text-white/50 mb-4">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.24em]">Ledger status</span>
            </div>
            <p className="text-4xl font-serif mb-2">{formatMinorAmount(balanceForCurrency?.creditsMinor ?? 0, currency)}</p>
            <p className="text-sm text-white/45">Available {currency} credit before this top-up.</p>
          </div>

          <div className="liquid-glass rounded-[2rem] p-7 border border-white/8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40 mb-3">Payment state</p>
            <h3 className="text-2xl font-serif mb-4">
              {status === 'completed' ? 'Credits applied' : status === 'failed' ? 'Needs attention' : 'SafePay ready'}
            </h3>
            <p className="text-white/62 leading-relaxed mb-5">
              {message || 'Choose an amount, confirm your payment details, and continue to hosted checkout.'}
            </p>
            {invoice ? (
              <p className="text-xs text-white/40 break-all mb-5">Invoice: {invoice}</p>
            ) : null}
            {invoice && status !== 'creating' ? (
              <button
                type="button"
                onClick={() => refreshInvoiceStatus(invoice)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh status
              </button>
            ) : null}
            {status === 'completed' ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Top-up settled through the backend ledger.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
