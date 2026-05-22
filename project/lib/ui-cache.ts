'use client';

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

const PREFIX = 'familiar-ui-cache:';

export function readSessionCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.ts || Date.now() - parsed.ts > maxAgeMs) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = { ts: Date.now(), data };
    sessionStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Ignore quota errors in UI cache.
  }
}
