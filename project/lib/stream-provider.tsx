'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { StreamChat } from 'stream-chat';
import { useAuth } from '@/lib/auth-context';

interface StreamContextValue {
  chatClient: StreamChat | null;
  connecting: boolean;
  error: string | null;
}

const StreamContext = createContext<StreamContextValue>({
  chatClient: null,
  connecting: true,
  error: null,
});

export function useStream() {
  return useContext(StreamContext);
}

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

export function StreamProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!user?.id || !session?.access_token || !apiKey) {
      setConnecting(false);
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      // Get Stream token from our API
      const res = await fetch('/api/stream/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to get Stream token');
      }

      const { token, userId, userName, userImage } = await res.json();

      // Initialize Stream client
      const client = StreamChat.getInstance(apiKey);

      // Connect user
      await client.connectUser(
        {
          id: userId,
          name: userName,
          image: userImage || undefined,
        },
        token
      );

      setChatClient(client);
    } catch (err) {
      console.error('Stream connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setChatClient(null);
    } finally {
      setConnecting(false);
    }
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    connect();

    return () => {
      // Disconnect on unmount
      if (chatClient) {
        chatClient.disconnectUser().catch(() => {});
        setChatClient(null);
      }
    };
  }, [connect]);

  return (
    <StreamContext.Provider value={{ chatClient, connecting, error }}>
      {children}
    </StreamContext.Provider>
  );
}
