import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function PrivacyPolicy() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <Link to={user ? '/dashboard' : '/login'} className="font-display text-lg font-bold text-slate-900">
            PaisaPulse
          </Link>
          <Link
            to={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{user ? 'Back to Dashboard' : 'Back to Sign In'}</span>
          </Link>
        </div>

        <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <header className="space-y-2 border-b border-slate-200 pb-5">
            <h1 className="font-display text-2xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Last updated: November 2026</p>
          </header>

          <section className="space-y-2">
            <h2 className="font-display text-base font-semibold text-slate-900">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              PaisaPulse collects only the account information required to authenticate your profile,
              track verified daily ad completions, and process requested JazzCash or Easypaisa payouts.
              This includes your email address, wallet balance, ad activity timestamps, and submitted
              withdrawal account numbers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-semibold text-slate-900">2. How We Use Your Data</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Account records are used strictly to enforce daily cooldown limits, calculate milestone
              rewards, prevent automated abuse, and verify payout disbursements. We do not sell
              personal account information to third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-base font-semibold text-slate-900">3. Data Storage &amp; Security</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Authentication and wallet records are stored in Supabase with encrypted transport and
              role-restricted access controls. You may request account deletion by contacting support.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
