export type PaymentMethod = 'JazzCash' | 'Easypaisa';

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  balance: number;
  ads_watched_today: number;
  last_ad_time: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  account_number: string;
  status: WithdrawalStatus;
  created_at: string;
  user_email?: string;
}
