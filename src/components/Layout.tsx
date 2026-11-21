import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WithdrawModal } from './WithdrawModal';

export interface LayoutOutletContext {
  openWithdrawModal: () => void;
  withdrawalVersion: number;
}

export function useLayoutActions() {
  return useOutletContext<LayoutOutletContext>();
}

export function Layout() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawalVersion, setWithdrawalVersion] = useState(0);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const openWithdrawModal = () => {
    setMobileMenuOpen(false);
    setWithdrawOpen(true);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'text-slate-300 border border-transparent hover:bg-slate-800/70 hover:text-white'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0D1320] px-4 py-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            PaisaPulse
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1.5">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={navLinkClass}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>

          <button
            type="button"
            onClick={openWithdrawModal}
            className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              withdrawOpen
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Withdraw</span>
          </button>

          {profile?.is_admin === true && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={navLinkClass}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
      </div>

      <div className="space-y-4 border-t border-slate-800 pt-4">
        <div className="px-2">
          <p className="truncate text-xs font-medium text-slate-200">
            {profile?.email ?? user?.email ?? 'Member'}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-emerald-400">
            Balance: Rs. {(profile?.balance ?? 0).toLocaleString()}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white whitespace-nowrap shrink-0"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>

        <div className="flex items-center gap-3 px-2 text-xs text-slate-500">
          <Link to="/privacy" className="hover:text-slate-300 transition-colors whitespace-nowrap">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="hover:text-slate-300 transition-colors whitespace-nowrap">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-[#0D1320]/95 px-4 backdrop-blur-sm lg:hidden">
        <Link
          to="/dashboard"
          className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          PaisaPulse
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold tabular-nums text-emerald-400">
            Rs. {(profile?.balance ?? 0).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full w-64 border-r border-slate-800">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet
            context={{
              openWithdrawModal,
              withdrawalVersion,
            }}
          />
        </main>

        <footer className="border-t border-slate-800/80 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} PaisaPulse</span>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="transition-colors hover:text-slate-300">
                Privacy Policy
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms" className="transition-colors hover:text-slate-300">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </div>

      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={() => setWithdrawalVersion((v) => v + 1)}
      />
    </div>
  );
}
