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

    const type = req.nextUrl.searchParams.get('type') || 'post';
    const category = req.nextUrl.searchParams.get('category');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from('posts')
      .select('*')
      .eq('type', type);

    if (category) {
      query = query.eq('category', category);
    } else if (type === 'post') {
      // Keep memory gallery content out of the general post feed unless explicitly requested.
      query = query.neq('category', 'memories');
    }

    const { data: posts, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Get author profiles
    const authorIds = Array.from(new Set((posts || []).map(p => p.author_id)));
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, photo_url').in('id', authorIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get current user's likes
    const postIds = (posts || []).map(p => p.id);
    const { data: userLikes } = postIds.length > 0
      ? await supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
      : { data: [] };
    const likedSet = new Set((userLikes || []).map(l => l.post_id));

    const enrichedPosts = (posts || []).map(post => ({
      ...post,
      author: profileMap.get(post.author_id) || { full_name: 'Unknown', photo_url: null },
      liked_by_me: likedSet.has(post.id),
    }));

    return NextResponse.json({ posts: enrichedPosts });
  } catch (err) {
    console.error('List posts error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
