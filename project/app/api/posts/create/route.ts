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

    const { type, title, content, category } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (type === 'discussion' && !title?.trim()) {
      return NextResponse.json({ error: 'Title is required for discussions' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        type: type || 'post',
        title: title?.trim() || null,
        content: content.trim(),
        category: category || 'general',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post: data });
  } catch (err) {
    console.error('Create post error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
