import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type DemoPost = {
  type: 'post' | 'discussion';
  title: string;
  content: string;
  category: string;
};

type DemoComment = {
  postTitle: string;
  content: string;
};

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const demoPosts: DemoPost[] = [
      {
        type: 'post',
        title: 'Welcome to your Family Feed',
        content: 'This is your demo space. Share updates, memories, and stories with your family.',
        category: 'general',
      },
      {
        type: 'post',
        title: 'Memory Prompt',
        content: 'Try posting one childhood memory this week to make your family feed come alive.',
        category: 'memories',
      },
      {
        type: 'discussion',
        title: 'Plan the next family gathering',
        content: 'Share date ideas, menu preferences, and who can help coordinate.',
        category: 'family-news',
      },
    ];

    const demoComments: DemoComment[] = [
      { postTitle: 'Welcome to your Family Feed', content: 'Looks great. Excited to start sharing here.' },
      { postTitle: 'Welcome to your Family Feed', content: 'This will help us stay connected every day.' },
      { postTitle: 'Plan the next family gathering', content: 'Saturday evening works best for us.' },
    ];

    const demoMessages = [
      'Hi! This is your demo conversation.',
      'Once your family members link their accounts, real messages will appear here.',
      'Install Aangan for an even smoother messaging experience.',
    ];

    let seededPosts = 0;
    let seededComments = 0;
    let seededMessages = 0;

    const postTitles = demoPosts.map((p) => p.title);
    const { data: existingPosts } = await supabase
      .from('posts')
      .select('id, title')
      .eq('author_id', user.id)
      .in('title', postTitles);

    const existingPostTitleSet = new Set((existingPosts || []).map((p) => p.title));
    const missingPosts = demoPosts.filter((p) => !existingPostTitleSet.has(p.title));

    if (missingPosts.length > 0) {
      const { data: insertedPosts, error: postInsertError } = await supabase
        .from('posts')
        .insert(
          missingPosts.map((p) => ({
            author_id: user.id,
            type: p.type,
            title: p.title,
            content: p.content,
            category: p.category,
            likes_count: 0,
            comments_count: 0,
          }))
        )
        .select('id');

      if (postInsertError) throw postInsertError;
      seededPosts = insertedPosts?.length || 0;
    }

    const { data: allDemoPosts } = await supabase
      .from('posts')
      .select('id, title, comments_count')
      .eq('author_id', user.id)
      .in('title', postTitles);

    const postByTitle = new Map((allDemoPosts || []).map((p) => [p.title, p]));
    const postIds = Array.from(postByTitle.values()).map((p) => p.id);

    if (postIds.length > 0) {
      const commentContents = demoComments.map((c) => c.content);
      const { data: existingComments } = await supabase
        .from('comments')
        .select('id, post_id, content')
        .eq('author_id', user.id)
        .in('post_id', postIds)
        .in('content', commentContents);

      const existingCommentKeySet = new Set((existingComments || []).map((c) => `${c.post_id}::${c.content}`));
      const commentsToInsert = demoComments
        .map((c) => {
          const post = postByTitle.get(c.postTitle);
          if (!post) return null;
          const key = `${post.id}::${c.content}`;
          if (existingCommentKeySet.has(key)) return null;
          return {
            post_id: post.id,
            author_id: user.id,
            content: c.content,
          };
        })
        .filter(Boolean) as Array<{ post_id: string; author_id: string; content: string }>;

      if (commentsToInsert.length > 0) {
        const { data: insertedComments, error: commentInsertError } = await supabase
          .from('comments')
          .insert(commentsToInsert)
          .select('id, post_id');

        if (commentInsertError) throw commentInsertError;
        seededComments = insertedComments?.length || 0;

        const incrementByPost = new Map<string, number>();
        (insertedComments || []).forEach((c) => {
          incrementByPost.set(c.post_id, (incrementByPost.get(c.post_id) || 0) + 1);
        });

        for (const post of allDemoPosts || []) {
          const inc = incrementByPost.get(post.id) || 0;
          if (!inc) continue;
          await supabase
            .from('posts')
            .update({ comments_count: (post.comments_count || 0) + inc })
            .eq('id', post.id);
        }
      }
    }

    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id, content')
      .eq('sender_id', user.id)
      .eq('receiver_id', user.id)
      .in('content', demoMessages);

    const existingMessageSet = new Set((existingMessages || []).map((m) => m.content));
    const missingMessages = demoMessages.filter((msg) => !existingMessageSet.has(msg));

    if (missingMessages.length > 0) {
      const { data: insertedMessages, error: messageInsertError } = await supabase
        .from('messages')
        .insert(
          missingMessages.map((content) => ({
            sender_id: user.id,
            receiver_id: user.id,
            content,
            read: true,
          }))
        )
        .select('id');

      if (messageInsertError) throw messageInsertError;
      seededMessages = insertedMessages?.length || 0;
    }

    const skipped = seededPosts === 0 && seededComments === 0 && seededMessages === 0;
    return NextResponse.json({
      success: true,
      seeded: {
        posts: seededPosts,
        comments: seededComments,
        messages: seededMessages,
      },
      skipped,
    });
  } catch (err) {
    console.error('Demo social seed error:', err);
    const message = err instanceof Error ? err.message : 'Failed to seed demo data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
