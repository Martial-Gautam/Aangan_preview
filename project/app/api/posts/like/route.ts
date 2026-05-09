import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id } = await req.json();
    if (!post_id) {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already liked
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Unlike: remove like and decrement count
      await supabase.from('post_likes').delete().eq('id', existing.id);

      const { data: post } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', post_id)
        .single();

      if (post) {
        await supabase
          .from('posts')
          .update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) })
          .eq('id', post_id);
      }

      return NextResponse.json({ liked: false });
    } else {
      // Like: insert like and increment count
      await supabase.from('post_likes').insert({ post_id, user_id: user.id });

      const { data: post } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', post_id)
        .single();

      if (post) {
        await supabase
          .from('posts')
          .update({ likes_count: (post.likes_count || 0) + 1 })
          .eq('id', post_id);
      }

      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle like';
    console.error('Like error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
