'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from './supabase';

// ─── Offline Cache Keys ──────────────────────────────────────
const AUTH_CACHE_KEY = 'familiar-auth-cache';
const PROFILE_CACHE_KEY = 'familiar-profile-cache';

interface CachedAuth {
  user: User;
  session: Session;
  ts: number;
}

function readCachedAuth(): CachedAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAuth;
  } catch {
    return null;
  }
}

function writeCachedAuth(user: User, session: Session) {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CachedAuth = { user, session, ts: Date.now() };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(envelope));
  } catch {}
}

function clearCachedAuth() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

function readCachedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: Profile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {}
}

// ─── Context ─────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isOffline: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isOffline: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Track whether the initial session has been handled to prevent
  // the onAuthStateChange INITIAL_SESSION event from racing with getSession.
  const initializedRef = React.useRef(false);
  // Counter to discard stale fetchProfile results when multiple calls overlap.
  const profileFetchIdRef = React.useRef(0);

  // ─── Online/Offline tracking ────────────────────────
  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const fetchId = ++profileFetchIdRef.current;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      // Only apply if this is still the latest fetch
      if (fetchId === profileFetchIdRef.current) {
        setProfile(data);
        if (data) writeCachedProfile(data);
      }
    } catch {
      // Network error — fall back to cached profile
      if (fetchId === profileFetchIdRef.current) {
        const cached = readCachedProfile();
        if (cached && cached.id === userId) {
          setProfile(cached);
        }
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // 0. Immediately hydrate from localStorage cache for instant offline rendering
    const cached = readCachedAuth();
    const cachedProfile = readCachedProfile();
    if (cached?.user && cached?.session) {
      setUser(cached.user);
      setSession(cached.session);
      if (cachedProfile) setProfile(cachedProfile);
    }

    // 1. Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Guard: if onAuthStateChange already handled INITIAL_SESSION, skip
      if (initializedRef.current) return;
      initializedRef.current = true;

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        writeCachedAuth(session.user, session);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      // Network error during session restoration — use cached auth
      console.warn('Failed to restore session (network error). Using cached auth.');
      if (!initializedRef.current) {
        initializedRef.current = true;
        // Keep the cached user/session/profile that was hydrated above
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
        writeCachedAuth(session.user, session);
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        if (event === 'SIGNED_OUT') clearCachedAuth();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear all offline caches so stale data doesn't bleed across accounts
    try {
      localStorage.removeItem('familiar-family-cache');
      clearCachedAuth();
    } catch {}
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isOffline, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
