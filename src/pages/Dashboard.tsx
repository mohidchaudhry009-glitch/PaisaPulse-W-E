import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { AdWatchModal } from '../components/AdWatchModal';
import { useLayoutActions } from '../components/Layout';
import { SupabaseConfigBanner } from '../components/SupabaseConfigBanner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { parseAccountDetails } from '../lib/accountFormat';
import { supabase } from '../lib/supabase';
import type { Withdrawal } from '../types/database';

const DAILY_AD_TARGET = 10;
const MILESTONE_REWARD_PKR = 50;
const COOLDOWN_SECONDS = 60;

function getRemainingCooldownSeconds(lastAdTime: string | null | undefined): number {
  if (!lastAdTime) return 0;
  const lastMs = new Date(lastAdTime).getTime();
  if (Number.isNaN(lastMs)) return 0;
  const elapsedSeconds = Math.floor((Date.now() - lastMs) / 1000);
  return Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);
}

function runAdblockProbe(): boolean {
  if (typeof document === 'undefined') return false;
  const bait = document.createElement('div');
  bait.className = 'adsbox ad-banner pub_300x250';
  bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
  document.body.appendChild(bait);
  const blocked =
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    bait.offsetWidth === 0 ||
    window.getComputedStyle(bait).display === 'none';
  document.body.removeChild(bait);
  return blocked;
}

export function Dashboard() {
  const { user, profile, profileError, refreshProfile, setProfile } = useAuth();
  const { showToast } = useToast();
  const { openWithdrawModal, withdrawalVersion } = useLayoutActions();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [savingReward, setSavingReward] = useState(false);

  const [adBlockerDetected, setAdBlockerDetected] = useState(false);
  const [mockAdblockWarning, setMockAdblockWarning] = useState(false);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  const loadWithdrawals = useCallback(async () => {
    if (!supabase || !user) return;
    setLoadingWithdrawals(true);
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('id, user_id, amount, payment_method, account_number, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setWithdrawals(
          data.map((row) => ({
            ...row,
            amount: Number(row.amount ?? 0),
          })) as Withdrawal[]
        );
      }
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      await Promise.all([refreshProfile(), loadWithdrawals()]);
      if (active) {
        setLoadingInitial(false);
      }
    };
    void loadData();
    return () => {
      active = false;
    };
  }, [refreshProfile, loadWithdrawals]);

  useEffect(() => {
    if (withdrawalVersion > 0) {
      void loadWithdrawals();
    }
  }, [withdrawalVersion, loadWithdrawals]);

  useEffect(() => {
    setAdBlockerDetected(runAdblockProbe());
  }, []);

  useEffect(() => {
    const syncCooldown = () => {
      setCooldownLeft(getRemainingCooldownSeconds(profile?.last_ad_time));
    };

    syncCooldown();
    const interval = window.setInterval(syncCooldown, 1000);
    return () => window.clearInterval(interval);
  }, [profile?.last_ad_time]);

  const playDemoAd = () => {
    if (cooldownLeft > 0 || savingReward) return;
    if (adBlockerDetected || mockAdblockWarning) {
      showToast('Adblocker notice active — disable adblockers before watching ads.', 'info');
    }
    setAdModalOpen(true);
  };

  const handleAdComplete = useCallback(async () => {
    setAdModalOpen(false);
    if (!supabase || !profile) return;

    setSavingReward(true);
    try {
      const currentAds = Number(profile.ads_watched_today ?? 0);
      const currentBalance = Number(profile.balance ?? 0);
      const nextAdsCount = currentAds + 1;
      const reachedMilestone = nextAdsCount >= DAILY_AD_TARGET;
      const nowIso = new Date().toISOString();

      const updatedAdsWatched = reachedMilestone ? 0 : nextAdsCount;
      const updatedBalance = reachedMilestone
        ? Number((currentBalance + MILESTONE_REWARD_PKR).toFixed(2))
        : currentBalance;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ads_watched_today: updatedAdsWatched,
          balance: updatedBalance,
          last_ad_time: nowIso,
        })
        .eq('id', profile.id)
        .select('id, email, balance, ads_watched_today, last_ad_time, is_admin, is_banned, created_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setProfile({
        ...data,
        balance: Number(data.balance ?? updatedBalance),
        ads_watched_today: Number(data.ads_watched_today ?? updatedAdsWatched),
        is_admin: Boolean(data.is_admin),
        is_banned: Boolean(data.is_banned),
      });

      if (reachedMilestone) {
        showToast(
          `10/10 ads completed! Rs. ${MILESTONE_REWARD_PKR} credited to your balance.`,
          'success'
        );
      } else {
        showToast(
          `Ad verified (${updatedAdsWatched}/${DAILY_AD_TARGET}). Keep going for Rs. ${MILESTONE_REWARD_PKR}!`,
          'success'
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save ad reward.';
      showToast(msg, 'error');
    } finally {
      setSavingReward(false);
    }
  }, [profile, setProfile, showToast]);

  const handleAdCancel = useCallback(() => {
    setAdModalOpen(false);
    showToast('Ad view cancelled before completion. No reward credited.', 'info');
  }, [showToast]);

  const handleRecheckAdblock = () => {
    const blocked = runAdblockProbe();
    setAdBlockerDetected(blocked);
    if (!blocked && !mockAdblockWarning) {
      showToast('No adblocker detected. Ad delivery is ready.', 'success');
    } else {
      showToast('Adblocker warning is active.', 'info');
    }
  };

  const adsWatched = profile?.ads_watched_today ?? 0;
  const balance = profile?.balance ?? 0;
  const progressPercent = Math.min(100, Math.round((adsWatched / DAILY_AD_TARGET) * 100));
  const showAdblockWarning = adBlockerDetected || mockAdblockWarning;

  return (
    <div className="space-y-8">
      <SupabaseConfigBanner />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Watch &amp; Earn Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Complete 10 verified ad views to unlock Rs. {MILESTONE_REWARD_PKR} in your wallet.
          </p>
        </div>

        <button
          type="button"
          onClick={openWithdrawModal}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-500 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Wallet className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span>Withdraw Funds</span>
        </button>
      </div>

      {profileError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Unable to load your profile: {profileError}
        </div>
      )}

      {/* Adblocker Warning Check */}
      {showAdblockWarning ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-950"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-medium text-amber-900">Adblocker detected or simulated</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Please disable browser adblockers for CashView so ad impressions register properly.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {mockAdblockWarning && (
              <button
                type="button"
                onClick={() => setMockAdblockWarning(false)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/60"
              >
                Dismiss test warning
              </button>
            )}
            <button
              type="button"
              onClick={handleRecheckAdblock}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Re-check</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Adblocker check passed · Browser ready for ad playback</span>
          </div>
          <button
            type="button"
            onClick={() => setMockAdblockWarning(true)}
            className="text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline whitespace-nowrap"
          >
            Preview adblock warning
          </button>
        </div>
      )}

      {/* Key Metrics Row */}
      <section aria-label="Account summary" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium text-slate-500">Available Balance</p>
          {loadingInitial ? (
            <div className="mt-3 h-9 w-32 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900">
              Rs. {balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Minimum withdrawal Rs. 500 via JazzCash or Easypaisa
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium text-slate-500">Ads Watched Today</p>
          {loadingInitial ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-600">
              {adsWatched} <span className="text-lg font-medium text-slate-400">/ {DAILY_AD_TARGET}</span>
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {DAILY_AD_TARGET - adsWatched} more {DAILY_AD_TARGET - adsWatched === 1 ? 'ad' : 'ads'} until Rs. {MILESTONE_REWARD_PKR} reward
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium text-slate-500">Cooldown Status</p>
          {loadingInitial ? (
            <div className="mt-3 h-9 w-28 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900">
              {cooldownLeft > 0 ? `${cooldownLeft}s` : 'Ready'}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            60-second verification interval between ad views
          </p>
        </div>
      </section>

      {/* Primary Watch & Earn Action Area */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Daily Milestone Progress
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Each completed ad view adds 1 step toward your 10-ad milestone. Reaching 10/10
              automatically credits <span className="font-mono font-semibold text-emerald-700">Rs. {MILESTONE_REWARD_PKR}</span>{' '}
              and resets your counter for the next round.
            </p>
          </div>

          <button
            type="button"
            onClick={playDemoAd}
            disabled={cooldownLeft > 0 || savingReward || loadingInitial || !profile}
            className="inline-flex min-w-[200px] items-center justify-center gap-2.5 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0"
          >
            {cooldownLeft > 0 ? (
              <>
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums">Wait {cooldownLeft}s</span>
              </>
            ) : savingReward ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                <span>Crediting...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current shrink-0" aria-hidden="true" />
                <span>Watch Ad</span>
              </>
            )}
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-8 space-y-2.5 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              Cycle progress: <span className="font-mono tabular-nums text-emerald-700">{adsWatched}/{DAILY_AD_TARGET} ads watched</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-500">{progressPercent}%</span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={adsWatched}
            aria-valuemin={0}
            aria-valuemax={DAILY_AD_TARGET}
            aria-label="Ads watched progress"
            className="h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
          >
            <div
              className="h-full bg-emerald-600 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-10 gap-1.5 pt-1" aria-hidden="true">
            {Array.from({ length: DAILY_AD_TARGET }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-xs transition-colors ${
                  idx < adsWatched ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Recent Withdrawals Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Recent Withdrawals</h2>
            <p className="text-xs text-slate-500">Latest payout requests linked to your account</p>
          </div>
          <button
            type="button"
            onClick={() => void loadWithdrawals()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {loadingWithdrawals ? (
          <div className="space-y-3 p-6">
            <div className="h-9 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No withdrawal requests yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Once your balance reaches Rs. 500, you can withdraw directly to JazzCash or Easypaisa.
            </p>
            <button
              type="button"
              onClick={openWithdrawModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <Wallet className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>Request Withdrawal</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {withdrawals.map((item) => {
                  const parsed = parseAccountDetails(item.account_number);
                  return (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-slate-800 whitespace-nowrap">
                      {item.payment_method}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {parsed.accountName && (
                        <div className="text-xs font-medium text-slate-900">{parsed.accountName}</div>
                      )}
                      <div className="font-mono text-xs tabular-nums text-slate-600">
                        {parsed.accountNumber}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-medium tabular-nums text-slate-900 whitespace-nowrap">
                      Rs. {item.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {item.status === 'paid' ? (
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

      <AdWatchModal
        isOpen={adModalOpen}
        durationSeconds={20}
        onComplete={handleAdComplete}
        onCancel={handleAdCancel}
      />
    </div>
  );
}
