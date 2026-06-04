'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseConnectionNotificationsOptions {
  /** Current user ID */
  userId: string | null | undefined;
  /** User's email for matching receiver_email */
  userEmail: string | null | undefined;
  /** User's phone for matching receiver_phone */
  userPhone: string | null | undefined;
  /** Called when a new connection request targeting this user is received */
  onNewRequest?: () => void;
  /** Called when a request status changes (accepted/rejected) */
  onRequestUpdate?: () => void;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

/**
 * Subscribes to Supabase Realtime `postgres_changes` on the `connection_requests` table.
 * Fires callbacks when:
 *   - A new connection request is inserted targeting the current user
 *   - An existing connection request is updated (accepted/rejected)
 *
 * This provides **instant** notifications instead of relying on 15-second polling.
 * Polling is kept as a fallback but at a much longer interval (60s).
 */
export function useConnectionNotifications({
  userId,
  userEmail,
  userPhone,
  onNewRequest,
  onRequestUpdate,
  enabled = true,
}: UseConnectionNotificationsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Use refs for callbacks to avoid resubscribing on every render
  const onNewRequestRef = useRef(onNewRequest);
  const onRequestUpdateRef = useRef(onRequestUpdate);

  useEffect(() => {
    onNewRequestRef.current = onNewRequest;
  }, [onNewRequest]);

  useEffect(() => {
    onRequestUpdateRef.current = onRequestUpdate;
  }, [onRequestUpdate]);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const normalizedPhone = userPhone
      ? userPhone.replace(/\D/g, '').slice(-10)
      : null;

    const channel = supabase
      .channel(`connection-requests-${userId}`)
      // Listen for new connection requests (INSERTs)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
        },
        (payload) => {
          const row = payload.new as Record<string, any>;

          // Check if this request targets the current user
          const isTargeted =
            row.to_user_id === userId ||
            row.receiver_id === userId ||
            (userEmail && row.receiver_email?.toLowerCase() === userEmail.toLowerCase()) ||
            (normalizedPhone && row.receiver_phone && 
              row.receiver_phone.replace(/\D/g, '').slice(-10) === normalizedPhone);

          if (isTargeted) {
            onNewRequestRef.current?.();
          }
        }
      )
      // Listen for status updates (accept/reject)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_requests',
        },
        (payload) => {
          const row = payload.new as Record<string, any>;
          const oldRow = payload.old as Record<string, any>;

          // Check if this update is relevant to the current user
          const isRelevant =
            row.from_user_id === userId ||
            row.sender_id === userId ||
            row.to_user_id === userId ||
            row.receiver_id === userId;

          // Only fire callback if status actually changed
          if (isRelevant && oldRow.status !== row.status) {
            onRequestUpdateRef.current?.();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connection notifications channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Connection notifications channel error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, userEmail, userPhone, enabled]);
}
