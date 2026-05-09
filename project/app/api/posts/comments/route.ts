import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
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

    const postId = req.nextUrl.searchParams.get('post_id');
    if (!postId) {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // Get author profiles
    const authorIds = Array.from(new Set((comments || []).map(c => c.author_id)));
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, photo_url').in('id', authorIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const enrichedComments = (comments || []).map(c => ({
      ...c,
      author: profileMap.get(c.author_id) || { full_name: 'Unknown', photo_url: null },
    }));

    return NextResponse.json({ comments: enrichedComments });
  } catch (err) {
    console.error('Get comments error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch comments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const { post_id, content } = await req.json();
    if (!post_id || !content?.trim()) {
      return NextResponse.json({ error: 'post_id and content required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        author_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    // Increment comments_count
    const { data: post } = await supabase.from('posts').select('comments_count').eq('id', post_id).single();
    if (post) {
      await supabase.from('posts').update({ comments_count: (post.comments_count || 0) + 1 }).eq('id', post_id);
    }

    return NextResponse.json({ comment: data });
  } catch (err) {
    console.error('Add comment error:', err);
    const message = err instanceof Error ? err.message : 'Failed to add comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
