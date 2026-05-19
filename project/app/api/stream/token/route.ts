import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StreamChat } from 'stream-chat';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const streamApiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
const streamApiSecret = process.env.STREAM_API_SECRET!;

/**
 * POST /api/stream/token
 * Validates Supabase auth, upserts user in Stream, returns Stream token.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate Supabase auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Initialize Stream server client
    const serverClient = StreamChat.getInstance(streamApiKey, streamApiSecret);

    // 3. Upsert user in Stream (sync name + photo from Supabase metadata)
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const userImage = user.user_metadata?.avatar_url || undefined;

    await serverClient.upsertUser({
      id: user.id,
      name: userName,
      image: userImage,
      role: 'user',
    });

    // 4. Generate token
    const streamToken = serverClient.createToken(user.id);

    return NextResponse.json({
      token: streamToken,
      userId: user.id,
      userName,
      userImage: userImage || null,
    });
  } catch (err) {
    console.error('Stream token error:', err);
    return NextResponse.json(
      { error: 'Failed to generate stream token' },
      { status: 500 }
    );
  }
}
