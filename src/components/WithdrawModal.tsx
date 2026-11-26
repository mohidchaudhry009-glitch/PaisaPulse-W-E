import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Wallet, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatAccountDetails } from '../lib/accountFormat';
import { supabase } from '../lib/supabase';
import type { PaymentMethod } from '../types/database';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MIN_WITHDRAWAL = 500;

export function WithdrawModal({ isOpen, onClose, onSuccess }: WithdrawModalProps) {
  const { profile, refreshProfile, setProfile } = useAuth();
  const { showToast } = useToast();

  const [amountInput, setAmountInput] = useState<string>('500');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('JazzCash');
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      const currentBalance = profile?.balance ?? 0;
      setAmountInput(currentBalance >= MIN_WITHDRAWAL ? String(Math.floor(currentBalance)) : '500');
    }
  }, [isOpen, profile?.balance]);

  if (!isOpen) return null;

  const currentBalance = profile?.balance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supabase || !profile) {
      const msg = 'Unable to connect to your account right now.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    if (profile.is_banned) {
      const msg = 'Suspended accounts cannot request withdrawals.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    const numericAmount = Number(amountInput);
    if (!Number.isFinite(numericAmount) || numericAmount < MIN_WITHDRAWAL) {
      const msg = `Minimum withdrawal amount is Rs. ${MIN_WITHDRAWAL}.`;
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    if (numericAmount > currentBalance) {
      const msg = 'Insufficient balance for this withdrawal request.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    const sanitizedName = accountName.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    if (sanitizedName.length < 2 || sanitizedName.length > 60) {
      const msg = 'Please enter the account holder name (2–60 characters).';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    const sanitizedNumber = accountNumber.trim();
    if (sanitizedNumber.length < 10 || sanitizedNumber.length > 20) {
      const msg = `Enter a valid ${paymentMethod} mobile number (10–20 characters).`;
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const nextBalance = Number((currentBalance - numericAmount).toFixed(2));

      const { data: updatedProfile, error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: nextBalance })
        .eq('id', profile.id)
        .gte('balance', numericAmount)
        .select('id, email, balance, ads_watched_today, last_ad_time, is_admin, is_banned, created_at')
        .maybeSingle();

      if (balanceError) {
        throw new Error(balanceError.message);
      }

      if (!updatedProfile) {
        throw new Error('Balance changed before submission. Please verify your available balance.');
      }

      const { error: insertError } = await supabase.from('withdrawals').insert({
        user_id: profile.id,
        amount: numericAmount,
        payment_method: paymentMethod,
        account_number: formatAccountDetails(sanitizedName, sanitizedNumber),
        status: 'pending',
      });

      if (insertError) {
        await supabase
          .from('profiles')
          .update({ balance: currentBalance })
          .eq('id', profile.id);
        throw new Error(insertError.message);
      }

      setProfile({
        ...updatedProfile,
        balance: Number(updatedProfile.balance ?? nextBalance),
        ads_watched_today: Number(updatedProfile.ads_watched_today ?? profile.ads_watched_today),
        is_admin: Boolean(updatedProfile.is_admin),
        is_banned: Boolean(updatedProfile.is_banned),
      });

      await refreshProfile();
      showToast(
        `Withdrawal of Rs. ${numericAmount.toLocaleString()} submitted for manual ${paymentMethod} payout.`,
        'success'
      );
      setAccountName('');
      setAccountNumber('');
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit withdrawal request.';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h2 id="withdraw-modal-title" className="font-display text-base font-semibold text-slate-900">
              Request Withdrawal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close withdrawal modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <span className="text-sm text-slate-600">Available balance</span>
            <span className="font-mono text-lg font-semibold tabular-nums text-emerald-700">
              Rs. {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
            >
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="withdraw-amount" className="text-sm font-medium text-slate-800">
                Amount (PKR)
              </label>
              <span className="text-xs text-slate-500">Minimum Rs. {MIN_WITHDRAWAL}</span>
            </div>
            <input
              id="withdraw-amount"
              type="number"
              min={MIN_WITHDRAWAL}
              step="1"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="500"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="withdraw-method" className="text-sm font-medium text-slate-800">
              Payment Method
            </label>
            <select
              id="withdraw-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="JazzCash">JazzCash</option>
              <option value="Easypaisa">Easypaisa</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="withdraw-name" className="text-sm font-medium text-slate-800">
              Account Holder Name
            </label>
            <input
              id="withdraw-name"
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Muhammad Ali"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="withdraw-account" className="text-sm font-medium text-slate-800">
              {paymentMethod} Number
            </label>
            <input
              id="withdraw-account"
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="03001234567"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <p className="text-xs text-slate-500">
              Payouts are sent manually to this {paymentMethod} name and number after verification.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || currentBalance < MIN_WITHDRAWAL}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
