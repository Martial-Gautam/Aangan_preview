'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track whether the initial session has been handled to prevent
  // the onAuthStateChange INITIAL_SESSION event from racing with getSession.
  const initializedRef = React.useRef(false);
  // Counter to discard stale fetchProfile results when multiple calls overlap.
  const profileFetchIdRef = React.useRef(0);

  const fetchProfile = async (userId: string) => {
    const fetchId = ++profileFetchIdRef.current;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    // Only apply if this is still the latest fetch
    if (fetchId === profileFetchIdRef.current) {
      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // 1. Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Guard: if onAuthStateChange already handled INITIAL_SESSION, skip
      if (initializedRef.current) return;
      initializedRef.current = true;

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      // Network error during session restoration — treat as logged out
      console.warn('Failed to restore session (network error).');
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    // 2. Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the INITIAL_SESSION event if getSession already handled it
      if (event === 'INITIAL_SESSION') {
        if (initializedRef.current) return;
        initializedRef.current = true;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear the persisted family store so stale data doesn't bleed across accounts
    try {
      localStorage.removeItem('familiar-family-cache');
    } catch {}
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
