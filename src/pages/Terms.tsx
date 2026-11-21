import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Terms() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#090D16] px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <Link to={user ? '/dashboard' : '/login'} className="font-display text-lg font-bold text-white">
            PaisaPulse
          </Link>
          <Link
            to={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{user ? 'Back to Dashboard' : 'Back to Sign In'}</span>
          </Link>
        </div>

        <article className="space-y-6 rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          <header className="space-y-2 border-b border-slate-800 pb-5">
            <h1 className="font-display text-2xl font-bold text-white">Terms of Service</h1>
            <p className="text-xs text-slate-400">Last updated: November 2026</p>
          </header>

          <section className="space-y-2">
            <h2 className="font-display text-base font-semibold text-white">1. Eligibility &amp; Fair Use</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Each member is permitted one PaisaPulse account. Automated scripts, adblock bypass
              manipulation, or multi-account farming are prohibited and may result in permanent
              account suspension.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-semibold text-white">2. Rewards &amp; Cooldowns</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Ad views are subject to a 60-second cooldown interval. Completing 10 verified ad views
              credits Rs. 100 to your PaisaPulse wallet balance and resets your cycle counter.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-semibold text-white">3. Withdrawals</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              The minimum withdrawal threshold is Rs. 500 via JazzCash or Easypaisa. Requests are
              reviewed by administrators; rejected requests automatically return the withdrawn amount
              to your PaisaPulse balance.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
