import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

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

  const fetchOrCreateProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    if (!supabase) return null;

    setProfileError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, balance, ads_watched_today, last_ad_time, is_admin, is_banned, created_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
      return null;
    }

    if (data) {
      const normalized: Profile = {
        ...data,
        balance: Number(data.balance ?? 0),
        ads_watched_today: Number(data.ads_watched_today ?? 0),
        is_admin: Boolean(data.is_admin),
        is_banned: Boolean(data.is_banned),
      };
      setProfile(normalized);
      return normalized;
    }

    // Fallback if Supabase DB does not auto-create profiles on auth signup
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email ?? '',
        balance: 0,
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

    const created: Profile = {
      ...inserted,
      balance: Number(inserted.balance ?? 0),
      ads_watched_today: Number(inserted.ads_watched_today ?? 0),
      is_admin: Boolean(inserted.is_admin),
      is_banned: Boolean(inserted.is_banned),
    };
    setProfile(created);
    return created;
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
