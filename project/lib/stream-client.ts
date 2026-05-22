'use client';

import { StreamChat } from 'stream-chat';

type StreamConnection = {
  client: StreamChat;
  userId: string;
};

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY || '';

let connectionPromise: Promise<StreamConnection> | null = null;

export async function getConnectedStreamClient(accessToken: string): Promise<StreamConnection> {
  if (!apiKey) {
    throw new Error('No Stream API key configured');
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const res = await fetch('/api/stream/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Stream token failed: ${res.status}`);
    }

    const { token, userId, userName, userImage } = await res.json();
    const client = StreamChat.getInstance(apiKey);
    const activeUserId = (client as unknown as { userID?: string }).userID;

    if (!activeUserId) {
      await client.connectUser(
        { id: userId, name: userName, image: userImage || undefined },
        token
      );
    } else if (activeUserId !== userId) {
      await client.disconnectUser();
      await client.connectUser(
        { id: userId, name: userName, image: userImage || undefined },
        token
      );
    }

    return { client, userId };
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

export function warmStreamConnection(accessToken: string) {
  void getConnectedStreamClient(accessToken).catch(() => {
    // Non-blocking warm-up; ignore transient errors.
  });
}
