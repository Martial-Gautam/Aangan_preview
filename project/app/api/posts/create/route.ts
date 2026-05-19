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

    const { type, title, content, category, media_urls } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (type === 'discussion' && !title?.trim()) {
      return NextResponse.json({ error: 'Title is required for discussions' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create the post (media_count may not exist if migration hasn't run)
    const mediaList: Array<{ url: string; type: string; thumbnail_url?: string }> = media_urls || [];
    
    let data: any = null;
    let insertError: any = null;

    // Try with media_count first
    const result1 = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        type: type || 'post',
        title: title?.trim() || null,
        content: content.trim(),
        category: category || 'general',
        media_count: mediaList.length,
      })
      .select()
      .single();

    if (result1.error && result1.error.message?.includes('media_count')) {
      // Fallback: insert without media_count
      const result2 = await supabase
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

      if (result2.error) throw result2.error;
      data = result2.data;
    } else if (result1.error) {
      throw result1.error;
    } else {
      data = result1.data;
    }

    // Create media_attachment records if media was provided
    if (mediaList.length > 0 && data) {
      const attachments = mediaList.map((m, i) => ({
        post_id: data.id,
        uploader_id: user.id,
        media_url: m.url,
        media_type: m.type || 'image',
        thumbnail_url: m.thumbnail_url || null,
        sort_order: i,
      }));

      const { error: attachError } = await supabase
        .from('media_attachments')
        .insert(attachments);

      if (attachError) {
        console.error('Failed to create media attachments:', attachError);
      }
    }

    return NextResponse.json({ post: { ...data, media: mediaList } });
  } catch (err) {
    console.error('Create post error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
