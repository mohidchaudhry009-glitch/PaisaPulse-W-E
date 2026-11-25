import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export const SIGNUP_BONUS_PKR = 50;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  isConfigured: boolean;
  refreshProfile: () => Promise<Profile | null>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [profileError, setProfileError] = useState<string | null>(null);
  const inFlightProfileFetch = useRef<Map<string, Promise<Profile | null>>>(new Map());

  const fetchOrCreateProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    const client = supabase;
    if (!client) return null;

    const existingPromise = inFlightProfileFetch.current.get(authUser.id);
    if (existingPromise) {
      return existingPromise;
    }

    const task = (async (): Promise<Profile | null> => {
      setProfileError(null);
      const { data, error } = await client
        .from('profiles')
        .select('id, email, balance, ads_watched_today, last_ad_time, is_admin, is_banned, created_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        setProfileError(error.message);
        return null;
      }

      const hasPendingBonus =
        authUser.user_metadata?.pending_signup_bonus === SIGNUP_BONUS_PKR &&
        authUser.user_metadata?.signup_bonus_claimed !== true;

      if (data) {
        let currentBalance = Number(data.balance ?? 0);

        // If a DB trigger auto-created the profile with balance 0 for a new signup, apply the Rs. 50 welcome bonus once
        if (hasPendingBonus && currentBalance === 0) {
          const bonusBalance = SIGNUP_BONUS_PKR;
          const { data: updated, error: bonusError } = await client
            .from('profiles')
            .update({ balance: bonusBalance })
            .eq('id', authUser.id)
            .eq('balance', 0)
            .select('balance')
            .maybeSingle();

          if (!bonusError && updated) {
            currentBalance = Number(updated.balance ?? bonusBalance);
          }

          await client.auth.updateUser({
            data: { pending_signup_bonus: 0, signup_bonus_claimed: true },
          });
        } else if (hasPendingBonus) {
          await client.auth.updateUser({
            data: { pending_signup_bonus: 0, signup_bonus_claimed: true },
          });
        }

        const normalized: Profile = {
          ...data,
          balance: currentBalance,
          ads_watched_today: Number(data.ads_watched_today ?? 0),
          is_admin: Boolean(data.is_admin),
          is_banned: Boolean(data.is_banned),
        };
        setProfile(normalized);
        return normalized;
      }

      // Fallback if Supabase DB does not auto-create profiles on auth signup: credit Rs. 50 welcome bonus
      const { data: inserted, error: insertError } = await client
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email ?? '',
          balance: SIGNUP_BONUS_PKR,
          ads_watched_today: 0,
          last_ad_time: null,
          is_admin: false,
          is_banned: false,
        })
        .select('id, email, balance, ads_watched_today, last_ad_time, is_admin, is_banned, created_at')
        .single();

      if (insertError) {
        setProfileError(insertError.message);
        return null;
      }

      if (hasPendingBonus) {
        await client.auth.updateUser({
          data: { pending_signup_bonus: 0, signup_bonus_claimed: true },
        });
      }

      const created: Profile = {
        ...inserted,
        balance: Number(inserted.balance ?? SIGNUP_BONUS_PKR),
        ads_watched_today: Number(inserted.ads_watched_today ?? 0),
        is_admin: Boolean(inserted.is_admin),
        is_banned: Boolean(inserted.is_banned),
      };
      setProfile(created);
      return created;
    })();

    inFlightProfileFetch.current.set(authUser.id, task);
    try {
      return await task;
    } finally {
      inFlightProfileFetch.current.delete(authUser.id);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) return null;
    return fetchOrCreateProfile(user);
  }, [fetchOrCreateProfile, user]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const { data } = await client.auth.getSession();
        if (!mounted) return;

        const currentSession = data.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchOrCreateProfile(currentSession.user);
        } else {
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: subscription } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await fetchOrCreateProfile(nextSession.user);
      } else {
        setProfile(null);
        setProfileError(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        profileError,
        isConfigured: isSupabaseConfigured,
        refreshProfile,
        setProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
