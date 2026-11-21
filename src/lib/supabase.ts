import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) {
    return 'Invalid credentials. Please double-check your email and password.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Email not confirmed. Please check your inbox and confirm your email before signing in.';
  }
  if (normalized.includes('user already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (normalized.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (normalized.includes('unable to validate email')) {
    return 'Please enter a valid email address.';
  }

  return message || 'Authentication failed. Please try again.';
}
