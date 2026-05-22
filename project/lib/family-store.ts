'use client';

import { create } from 'zustand';
import { supabase } from './supabase';
import type { Person, Relationship } from './tree-to-flow';

interface FamilyState {
  // Data
  people: Person[];
  relationships: Relationship[];
  selfPerson: Person | null;
  selfPersonId: string | null;
  familyCount: number;
  dataLoading: boolean;
  error: string | null;

  // UI
  selectedPersonId: string | null;
  searchQuery: string;
  quickAddTargetId: string | null;

  // Focus Mode
  centerPersonId: string | null;
  centerKey: number;                // incrementing key to force re-center
  focusHops: number;

  // Actions
  setSelectedPerson: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setQuickAddTarget: (id: string | null) => void;
  setCenterPerson: (id: string) => void;
  setFocusHops: (n: number) => void;
  fetchFamily: (userId: string, accessToken: string) => Promise<void>;
  fetchFamilyFallback: (userId: string) => Promise<void>;
  removeMember: (personId: string) => void;
  reset: () => void;
}

const initialState = {
  people: [] as Person[],
  relationships: [] as Relationship[],
  selfPerson: null as Person | null,
  selfPersonId: null as string | null,
  familyCount: 0,
  dataLoading: true,
  error: null as string | null,
  selectedPersonId: null as string | null,
  searchQuery: '',
  quickAddTargetId: null as string | null,
  centerPersonId: null as string | null,
  centerKey: 0,
  focusHops: 3,
};

export const useFamilyStore = create<FamilyState>((set, get) => ({
  ...initialState,

  setSelectedPerson: (id) => set({ selectedPersonId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setQuickAddTarget: (id) => set({ quickAddTargetId: id }),
  setCenterPerson: (id) => set((s) => ({ centerPersonId: id, centerKey: s.centerKey + 1 })),
  setFocusHops: (n) => set({ focusHops: Math.max(1, Math.min(5, n)) }),

  fetchFamily: async (userId, accessToken) => {
    const hasLoadedTree = get().people.length > 0 && Boolean(get().selfPerson);
    set({ dataLoading: hasLoadedTree ? false : true, error: null });
    try {
      let token = accessToken;

      let res = await fetch('/api/tree/full', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle token refresh race — wrapped in try-catch to prevent
      // "Failed to fetch" when Supabase is unreachable
      if (res.status === 401) {
        try {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshed.session?.access_token) {
            token = refreshed.session.access_token;
            res = await fetch('/api/tree/full', {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch {
          // Refresh failed (network error) — continue with fallback
          console.warn('Session refresh failed, using fallback.');
        }
      }

      if (!res.ok) {
        await get().fetchFamilyFallback(userId);
        return;
      }

      const data = await res.json();
      const nodes: Person[] = data.nodes || [];
      const edges: Relationship[] = data.edges || [];
      const selfId: string | null = data.self_person_id;
      const self = nodes.find((p) => p.id === selfId) || null;

      if (!self || nodes.length <= 1) {
        await get().fetchFamilyFallback(userId);
        return;
      }

      set((prev) => ({
        selfPerson: self,
        selfPersonId: self.id,
        people: nodes,
        relationships: edges,
        familyCount: Math.max(0, nodes.length - 1),
        dataLoading: false,
        // Initialize center to self on first load, keep it if already set
        centerPersonId: prev.centerPersonId || self.id,
      }));
    } catch (err) {
      console.warn('Family tree API unavailable, using fallback.', err);
      await get().fetchFamilyFallback(userId);
    }
  },

  fetchFamilyFallback: async (userId) => {
    try {
      const [{ data: self }, { data: nodes }, { data: edges }] = await Promise.all([
        supabase.from('people').select('*').eq('owner_id', userId).eq('is_self', true).maybeSingle(),
        supabase.from('people').select('*').eq('owner_id', userId),
        supabase.from('relationships').select('*').eq('owner_id', userId),
      ]);

      const peopleRows = (nodes || []) as Person[];
      const relationshipRows = (edges || []) as Relationship[];
      const selfRow = (self as Person | null) || peopleRows.find((p) => p.is_self) || null;

      const directFamilyCount = selfRow
        ? relationshipRows.filter((r) => r.person_id === selfRow.id).length
        : Math.max(0, peopleRows.length - 1);

      set((prev) => ({
        selfPerson: selfRow,
        selfPersonId: selfRow?.id || null,
        people: peopleRows,
        relationships: relationshipRows,
        familyCount: Math.max(0, directFamilyCount),
        dataLoading: false,
        centerPersonId: prev.centerPersonId || selfRow?.id || null,
      }));
    } catch (err) {
      console.error('Fallback family query failed:', err);
      set({
        selfPerson: null,
        selfPersonId: null,
        people: [],
        relationships: [],
        familyCount: 0,
        dataLoading: false,
        error: 'Failed to load family tree',
      });
    }
  },

  removeMember: (personId) => {
    set((state) => ({
      people: state.people.filter((p) => p.id !== personId),
      relationships: state.relationships.filter(
        (r) => r.person_id !== personId && r.related_person_id !== personId
      ),
      familyCount: Math.max(0, state.familyCount - 1),
    }));
  },

  reset: () => set(initialState),
}));
