import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { SupabaseConfigBanner } from '../components/SupabaseConfigBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { mapAuthError, supabase } from '../lib/supabase';

export function Signup() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

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
      setErrorMessage('Please enter an email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const friendly = mapAuthError(error.message);
        setErrorMessage(friendly);
        showToast(friendly, 'error');
        return;
      }

      if (data.session) {
        showToast('Account created! Welcome to PaisaPulse.', 'success');
        navigate('/dashboard');
      } else {
        setConfirmationSent(true);
        showToast('Confirmation email sent. Please verify your inbox.', 'info');
      }
    } catch (err) {
      const msg = err instanceof Error ? mapAuthError(err.message) : 'Sign up failed.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8">
          <Link to="/login" className="font-display text-2xl font-bold tracking-tight text-slate-900">
            PaisaPulse
          </Link>
          <p className="mt-2 text-sm text-slate-600">
            Create your account to start earning rewards on daily ad milestones.
          </p>
        </div>

        <SupabaseConfigBanner />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          {confirmationSent ? (
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="font-display text-xl font-semibold text-slate-900">Check your inbox</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                We sent a confirmation link to <span className="font-medium text-slate-900">{email}</span>.
                Confirm your email address before signing in.
              </p>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-slate-900">Create account</h1>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
                >
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="block text-sm font-medium text-slate-800">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="block text-sm font-medium text-slate-800">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-confirm" className="block text-sm font-medium text-slate-800">
                    Confirm password
                  </label>
                  <input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
                </button>
              </form>

              <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-600">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="mx-auto mt-8 flex w-full max-w-md items-center justify-between text-xs text-slate-500">
        <span>© {new Date().getFullYear()} PaisaPulse</span>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="hover:text-slate-800">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="hover:text-slate-800">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
