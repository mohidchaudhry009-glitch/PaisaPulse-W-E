import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import type { Profile, Withdrawal, WithdrawalStatus } from '../types/database';

type AdminTab = 'withdrawals' | 'users';
type WithdrawalFilter = 'pending' | 'paid' | 'rejected' | 'all';

export function AdminDashboard() {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('withdrawals');
  const [withdrawalFilter, setWithdrawalFilter] = useState<WithdrawalFilter>('pending');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Balance adjustment modal state
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [balanceInput, setBalanceInput] = useState<string>('');
  const [savingBalance, setSavingBalance] = useState(false);

  const fetchAdminData = useCallback(async () => {
    if (!supabase) {
      setLoadingWithdrawals(false);
      setLoadingUsers(false);
      return;
    }

    setLoadingWithdrawals(true);
    setLoadingUsers(true);

    try {
      const [withdrawalsRes, usersRes] = await Promise.all([
        supabase
          .from('withdrawals')
          .select('id, user_id, amount, payment_method, account_number, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, email, balance, ads_watched_today, last_ad_time, is_admin, is_banned, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (usersRes.error) {
        showToast(`Failed to load users: ${usersRes.error.message}`, 'error');
      }

      const normalizedUsers: Profile[] = (usersRes.data ?? []).map((u) => ({
        ...u,
        balance: Number(u.balance ?? 0),
        ads_watched_today: Number(u.ads_watched_today ?? 0),
        is_admin: Boolean(u.is_admin),
        is_banned: Boolean(u.is_banned),
      }));
      setUsers(normalizedUsers);

      const emailById = new Map<string, string>(normalizedUsers.map((u) => [u.id, u.email]));

      if (withdrawalsRes.error) {
        showToast(`Failed to load withdrawals: ${withdrawalsRes.error.message}`, 'error');
      }

      const normalizedWithdrawals: Withdrawal[] = (withdrawalsRes.data ?? []).map((w) => ({
        ...w,
        amount: Number(w.amount ?? 0),
        user_email: emailById.get(w.user_id) ?? 'Unknown user',
      })) as Withdrawal[];

      setWithdrawals(normalizedWithdrawals);
    } finally {
      setLoadingWithdrawals(false);
      setLoadingUsers(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (profile?.is_admin === true) {
      void fetchAdminData();
    }
  }, [profile?.is_admin, fetchAdminData]);

  const pendingWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.status === 'pending'),
    [withdrawals]
  );

  const visibleWithdrawals = useMemo(() => {
    if (withdrawalFilter === 'all') return withdrawals;
    return withdrawals.filter((w) => w.status === withdrawalFilter);
  }, [withdrawals, withdrawalFilter]);

  const totalPendingAmount = useMemo(
    () => pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0),
    [pendingWithdrawals]
  );

  const totalPaidAmount = useMemo(
    () =>
      withdrawals
        .filter((w) => w.status === 'paid')
        .reduce((sum, w) => sum + w.amount, 0),
    [withdrawals]
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => u.email.toLowerCase().includes(query));
  }, [users, userSearch]);

  if (!authLoading && profile && profile.is_admin !== true) {
    return <Navigate to="/dashboard" replace />;
  }

  const updateWithdrawalStatusLocal = (id: string, nextStatus: WithdrawalStatus) => {
    setWithdrawals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
  };

  const handleApproveWithdrawal = async (withdrawal: Withdrawal) => {
    if (!supabase) return;
    setProcessingId(withdrawal.id);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .update({ status: 'paid' })
        .eq('id', withdrawal.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('This withdrawal was already processed.');

      updateWithdrawalStatusLocal(withdrawal.id, 'paid');
      showToast(
        `Approved Rs. ${withdrawal.amount.toLocaleString()} payout to ${withdrawal.user_email}.`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to approve withdrawal.';
      showToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (withdrawal: Withdrawal) => {
    if (!supabase) return;
    setProcessingId(withdrawal.id);
    try {
      const { data: rejectedRow, error: rejectError } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', withdrawal.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (rejectError) throw new Error(rejectError.message);
      if (!rejectedRow) throw new Error('This withdrawal was already processed.');

      const { data: userProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', withdrawal.user_id)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      const refundedBalance = Number(
        (Number(userProfile.balance ?? 0) + withdrawal.amount).toFixed(2)
      );
      const { error: refundError } = await supabase
        .from('profiles')
        .update({ balance: refundedBalance })
        .eq('id', withdrawal.user_id);

      if (refundError) throw new Error(refundError.message);

      updateWithdrawalStatusLocal(withdrawal.id, 'rejected');
      setUsers((prev) =>
        prev.map((u) => (u.id === withdrawal.user_id ? { ...u, balance: refundedBalance } : u))
      );

      if (withdrawal.user_id === profile?.id) {
        await refreshProfile();
      }

      showToast(
        `Rejected withdrawal and refunded Rs. ${withdrawal.amount.toLocaleString()} to ${withdrawal.user_email}.`,
        'info'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reject withdrawal.';
      showToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleBan = async (targetUser: Profile) => {
    if (!supabase) return;
    if (targetUser.id === profile?.id) {
      showToast('You cannot ban your own administrator account.', 'error');
      return;
    }

    setProcessingId(targetUser.id);
    const nextBanned = !targetUser.is_banned;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: nextBanned })
        .eq('id', targetUser.id);

      if (error) throw new Error(error.message);

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_banned: nextBanned } : u))
      );

      showToast(
        nextBanned ? `Banned ${targetUser.email}.` : `Unbanned ${targetUser.email}.`,
        nextBanned ? 'info' : 'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update user status.';
      showToast(msg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const openEditBalance = (targetUser: Profile) => {
    setEditingUser(targetUser);
    setBalanceInput(String(targetUser.balance));
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !editingUser) return;

    const parsed = Number(balanceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      showToast('Enter a valid non-negative balance amount.', 'error');
      return;
    }

    const nextBalance = Number(parsed.toFixed(2));
    setSavingBalance(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: nextBalance })
        .eq('id', editingUser.id);

      if (error) throw new Error(error.message);

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, balance: nextBalance } : u))
      );

      if (editingUser.id === profile?.id) {
        await refreshProfile();
      }

      showToast(`Updated ${editingUser.email} balance to Rs. ${nextBalance.toLocaleString()}.`, 'success');
      setEditingUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update balance.';
      showToast(msg, 'error');
    } finally {
      setSavingBalance(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            PaisaPulse Admin Panel
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Approve or reject payouts, adjust member balances, and manage account access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchAdminData()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Pending Withdrawals</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-600">
            {pendingWithdrawals.length}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-slate-500">
            Rs. {totalPendingAmount.toLocaleString()} awaiting review
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Paid Out</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            Rs. {totalPaidAmount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Completed JazzCash &amp; Easypaisa payouts
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Registered Users</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {users.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Active member accounts
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Banned Accounts</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-red-600">
            {users.filter((u) => u.is_banned).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Restricted from earning &amp; payouts
          </p>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Admin sections"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'withdrawals'}
            onClick={() => setActiveTab('withdrawals')}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'withdrawals'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-4 w-4" aria-hidden="true" />
            <span>Withdrawals ({pendingWithdrawals.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Users ({users.length})</span>
          </button>
        </div>

        {activeTab === 'withdrawals' ? (
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['pending', 'paid', 'rejected', 'all'] as WithdrawalFilter[]).map((statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setWithdrawalFilter(statusKey)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  withdrawalFilter === statusKey
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {statusKey}
              </button>
            ))}
          </div>
        ) : (
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user email..."
              aria-label="Search users by email"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Withdrawals */}
      {activeTab === 'withdrawals' && (
        <section
          role="tabpanel"
          aria-label="Withdrawals management"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              {withdrawalFilter === 'pending'
                ? 'Pending Withdrawal Queue'
                : withdrawalFilter === 'all'
                ? 'All Withdrawal Requests'
                : `${withdrawalFilter.charAt(0).toUpperCase() + withdrawalFilter.slice(1)} Withdrawals`}
            </h2>
            <p className="text-xs text-slate-500">
              Approve marks a pending payout as paid; Reject returns the requested funds to the user&apos;s wallet.
            </p>
          </div>

          {loadingWithdrawals ? (
            <div className="space-y-3 p-6">
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ) : visibleWithdrawals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-800">
                No {withdrawalFilter === 'all' ? '' : withdrawalFilter} withdrawals found
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {withdrawalFilter === 'pending'
                  ? 'All withdrawal requests have been reviewed.'
                  : 'Try switching the status filter above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-6 py-3">User Email</th>
                    <th className="px-6 py-3">Method</th>
                    <th className="px-6 py-3">Account Number</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleWithdrawals.map((item) => {
                    const isBusy = processingId === item.id;
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{item.user_email}</div>
                          <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-500">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                          {item.payment_method}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                          {item.account_number}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                          Rs. {item.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {item.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleApproveWithdrawal(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleRejectWithdrawal(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : item.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Paid</span>
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <section
          role="tabpanel"
          aria-label="User management"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">Registered Users</h2>
            <p className="text-xs text-slate-500">
              Monitor balances, update wallet amounts, and toggle account access restrictions.
            </p>
          </div>

          {loadingUsers ? (
            <div className="space-y-3 p-6">
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-800">No matching users found</p>
              <p className="mt-1 text-xs text-slate-500">
                Try clearing or adjusting your email search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Access Status</th>
                    <th className="px-6 py-3 text-right">Ads Today</th>
                    <th className="px-6 py-3 text-right">Balance</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === profile?.id;
                    const isBusy = processingId === u.id;
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{u.email}</div>
                          {u.is_admin && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                              <span>Administrator</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.is_banned ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Banned</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                          {u.ads_watched_today} / 10
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                          Rs. {u.balance.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEditBalance(u)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Edit Balance</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy || isSelf}
                              onClick={() => void handleToggleBan(u)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                u.is_banned
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              {u.is_banned ? (
                                <>
                                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Unban</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Ban</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Edit Balance Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-balance-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 id="edit-balance-title" className="font-display text-base font-semibold text-slate-900">
                Adjust User Balance
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Close balance modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="space-y-4 p-6">
              <div>
                <p className="text-xs text-slate-500">Account</p>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                  {editingUser.email}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-balance-input" className="block text-sm font-medium text-slate-800">
                  New Balance (PKR)
                </label>
                <input
                  id="admin-balance-input"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={savingBalance}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingBalance ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
