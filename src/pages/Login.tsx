import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { SupabaseConfigBanner } from '../components/SupabaseConfigBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { mapAuthError, supabase } from '../lib/supabase';

export function Login() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!supabase) {
      const msg = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const friendly = mapAuthError(error.message);
        setErrorMessage(friendly);
        showToast(friendly, 'error');
        return;
      }

      showToast('Signed in successfully.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? mapAuthError(err.message) : 'Sign in failed.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#090D16] px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8">
          <Link to="/login" className="font-display text-2xl font-bold tracking-tight text-white">
            PaisaPulse
          </Link>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to your account to watch ads, track daily milestones, and request payouts.
          </p>
        </div>

        <SupabaseConfigBanner />

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          <h1 className="font-display text-xl font-semibold text-white">Sign in</h1>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-200"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-700 bg-[#090D16] py-2.5 pl-3.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <p className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
              Create account
            </Link>
          </p>
        </div>
      </div>

      <footer className="mx-auto mt-8 flex w-full max-w-md items-center justify-between text-xs text-slate-500">
        <span>© {new Date().getFullYear()} PaisaPulse</span>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="hover:text-slate-300">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="hover:text-slate-300">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
