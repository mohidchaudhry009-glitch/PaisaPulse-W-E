import React from 'react';
import { Navigate } from 'react-router-dom';
import { Ban, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090D16] px-4">
        <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-6">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800/80" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-800/60" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.is_banned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090D16] px-4">
        <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-[#111827] p-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/50 text-red-400">
            <Ban className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold text-slate-100">
            Account Suspended
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Your PaisaPulse account ({profile.email}) has been restricted by an administrator.
            Ad rewards and withdrawal requests are disabled while this restriction is active.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  if (requireAdmin) {
    if (!profile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#090D16] px-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        </div>
      );
    }

    if (profile.is_admin !== true) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
