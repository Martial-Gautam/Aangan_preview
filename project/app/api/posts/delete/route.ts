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

    // Verify ownership
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', post_id)
      .single();

    if (!post || post.author_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }

    const { error } = await supabase.from('posts').delete().eq('id', post_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete post error:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
