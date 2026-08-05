import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Demo Family Tree: Sharma Family (3 generations, ~18 members) ────

interface DemoPerson {
  key: string;            // local reference key
  full_name: string;
  gender: 'male' | 'female';
  date_of_birth: string;  // YYYY-MM-DD
  is_self: boolean;
}

interface DemoRelationship {
  from: string;  // person key
  to: string;    // person key
  type: 'father' | 'mother' | 'spouse' | 'child' | 'sibling';
}

const DEMO_PEOPLE: DemoPerson[] = [
  // ─── Generation 1: Grandparents ─────────────────────
  { key: 'dada',     full_name: 'Rajendra Sharma',   gender: 'male',   date_of_birth: '1948-03-15', is_self: false },
  { key: 'dadi',     full_name: 'Savitri Sharma',    gender: 'female', date_of_birth: '1950-07-22', is_self: false },
  { key: 'nana',     full_name: 'Harish Gupta',      gender: 'male',   date_of_birth: '1949-11-08', is_self: false },
  { key: 'nani',     full_name: 'Kamla Gupta',       gender: 'female', date_of_birth: '1951-02-14', is_self: false },

  // ─── Generation 2: Parents, Uncles, Aunts ───────────
  { key: 'papa',     full_name: 'Anil Sharma',       gender: 'male',   date_of_birth: '1972-06-10', is_self: false },
  { key: 'maa',      full_name: 'Sunita Sharma',     gender: 'female', date_of_birth: '1975-09-03', is_self: false },
  { key: 'chacha',   full_name: 'Sunil Sharma',      gender: 'male',   date_of_birth: '1976-01-20', is_self: false },
  { key: 'chachi',   full_name: 'Priya Sharma',      gender: 'female', date_of_birth: '1978-04-12', is_self: false },
  { key: 'bua',      full_name: 'Meena Verma',       gender: 'female', date_of_birth: '1970-12-05', is_self: false },
  { key: 'fufa',     full_name: 'Rakesh Verma',      gender: 'male',   date_of_birth: '1968-08-19', is_self: false },
  { key: 'mama',     full_name: 'Vikas Gupta',       gender: 'male',   date_of_birth: '1974-05-30', is_self: false },
  { key: 'mami',     full_name: 'Neeta Gupta',       gender: 'female', date_of_birth: '1977-10-16', is_self: false },

  // ─── Generation 3: Self, Siblings, Cousins ──────────
  { key: 'self',     full_name: 'Demo User',         gender: 'male',   date_of_birth: '1998-04-25', is_self: true },
  { key: 'sister',   full_name: 'Ananya Sharma',     gender: 'female', date_of_birth: '2001-08-14', is_self: false },
  { key: 'cousin1',  full_name: 'Rohan Sharma',      gender: 'male',   date_of_birth: '2000-02-09', is_self: false },
  { key: 'cousin2',  full_name: 'Kriti Verma',       gender: 'female', date_of_birth: '1999-06-18', is_self: false },
  { key: 'cousin3',  full_name: 'Arjun Gupta',       gender: 'male',   date_of_birth: '2002-11-27', is_self: false },
  { key: 'spouse',   full_name: 'Kavya Sharma',      gender: 'female', date_of_birth: '1999-01-07', is_self: false },
];

const DEMO_RELATIONSHIPS: DemoRelationship[] = [
  // Grandparents → Parents
  { from: 'dada', to: 'papa',   type: 'father' },
  { from: 'dadi', to: 'papa',   type: 'mother' },
  { from: 'dada', to: 'chacha', type: 'father' },
  { from: 'dadi', to: 'chacha', type: 'mother' },
  { from: 'dada', to: 'bua',    type: 'father' },
  { from: 'dadi', to: 'bua',    type: 'mother' },

  { from: 'nana', to: 'maa',    type: 'father' },
  { from: 'nani', to: 'maa',    type: 'mother' },
  { from: 'nana', to: 'mama',   type: 'father' },
  { from: 'nani', to: 'mama',   type: 'mother' },

  // Spouses
  { from: 'papa',   to: 'maa',    type: 'spouse' },
  { from: 'chacha', to: 'chachi', type: 'spouse' },
  { from: 'bua',    to: 'fufa',   type: 'spouse' },
  { from: 'mama',   to: 'mami',   type: 'spouse' },
  { from: 'self',   to: 'spouse', type: 'spouse' },

  // Parents → Children
  { from: 'papa', to: 'self',    type: 'father' },
  { from: 'maa',  to: 'self',    type: 'mother' },
  { from: 'papa', to: 'sister',  type: 'father' },
  { from: 'maa',  to: 'sister',  type: 'mother' },

  { from: 'chacha', to: 'cousin1', type: 'father' },
  { from: 'chachi', to: 'cousin1', type: 'mother' },

  { from: 'bua',  to: 'cousin2', type: 'mother' },
  { from: 'fufa', to: 'cousin2', type: 'father' },

  { from: 'mama', to: 'cousin3', type: 'father' },
  { from: 'mami', to: 'cousin3', type: 'mother' },

  // Siblings
  { from: 'self',   to: 'sister', type: 'sibling' },
  { from: 'papa',   to: 'chacha', type: 'sibling' },
  { from: 'papa',   to: 'bua',    type: 'sibling' },
  { from: 'chacha', to: 'bua',    type: 'sibling' },
  { from: 'maa',    to: 'mama',   type: 'sibling' },
];

// ─── Demo Posts (richer content) ─────────────────────────────

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

const DEMO_POSTS: DemoPost[] = [
  {
    type: 'post',
    title: 'Welcome to your Family Feed',
    content: 'This is your family\'s private space. Share updates, memories, photos, and stories that bring everyone closer. Only your connected family members can see your posts.',
    category: 'general',
  },
  {
    type: 'post',
    title: '🎉 Dadi\'s 75th Birthday Celebration',
    content: 'What a beautiful evening! Three generations came together to celebrate Dadi\'s 75th birthday. The kids performed a dance, Chacha made his famous dal makhani, and Bua flew in from Delhi. Moments like these remind us why family is everything. ❤️',
    category: 'memories',
  },
  {
    type: 'post',
    title: 'Throwback: Summer at Nana\'s House',
    content: 'Remember those summers at Nana-Nani\'s house in Jaipur? Mango trees, rooftop games, and Nani\'s legendary aloo paratha. Those were the best days. Who else has fond memories of visiting grandparents during summer vacations?',
    category: 'memories',
  },
  {
    type: 'discussion',
    title: '📅 Planning Diwali Get-Together 2026',
    content: 'This year let\'s celebrate Diwali together! Suggesting we meet at Papa\'s place. Please share:\n• Which dates work for you?\n• Any dietary preferences for the feast?\n• Who\'s handling the rangoli this year? 😄\n\nLet\'s make it special!',
    category: 'family-news',
  },
  {
    type: 'post',
    title: 'Family Recipe: Nani\'s Secret Chai Masala',
    content: 'Finally got Nani to share her chai masala recipe that everyone loves:\n\n• 2 tbsp cardamom powder\n• 1 tbsp ginger powder\n• 1 tsp cinnamon\n• ½ tsp black pepper\n• ¼ tsp clove powder\n\nMix well, store in airtight container. Use ¼ tsp per cup. Trust me, no café chai beats this. ☕',
    category: 'general',
  },
  {
    type: 'discussion',
    title: 'Cousin Reunion Road Trip Ideas',
    content: 'Rohan, Kriti, and Arjun — let\'s plan a cousins-only trip this winter! Options:\n\n1. Rishikesh (adventure + rafting)\n2. Udaipur (heritage + chill)\n3. Goa (beach + fun)\n\nVote in the comments! We deserve a break. 🚗✨',
    category: 'family-news',
  },
];

const DEMO_COMMENTS: DemoComment[] = [
  { postTitle: 'Welcome to your Family Feed', content: 'This is amazing! Finally a place just for our family. 🙌' },
  { postTitle: 'Welcome to your Family Feed', content: 'Love that we can all stay connected here. Adding my parents next!' },
  { postTitle: '🎉 Dadi\'s 75th Birthday Celebration', content: 'Dadi looked so happy! Best family event this year. 🎂' },
  { postTitle: '🎉 Dadi\'s 75th Birthday Celebration', content: 'That group photo with all three generations is my new wallpaper! ❤️' },
  { postTitle: 'Throwback: Summer at Nana\'s House', content: 'Those mango-picking competitions were legendary 🥭😂' },
  { postTitle: '📅 Planning Diwali Get-Together 2026', content: 'Saturday works best for us. We\'ll bring the mithai!' },
  { postTitle: '📅 Planning Diwali Get-Together 2026', content: 'Count me in for rangoli duty! 🎨' },
  { postTitle: 'Family Recipe: Nani\'s Secret Chai Masala', content: 'Made it yesterday — tastes exactly like Nani\'s! Game changer ☕' },
  { postTitle: 'Cousin Reunion Road Trip Ideas', content: 'Rishikesh gets my vote! Let\'s do bungee jumping 🏔️' },
  { postTitle: 'Cousin Reunion Road Trip Ideas', content: 'Udaipur please! Heritage > adrenaline 😄' },
];

const DEMO_MESSAGES = [
  'Hey! Welcome to Familiar 👋 This is your family messaging space.',
  'Once your relatives join and link their accounts, you\'ll see real conversations here.',
  'Tip: You can message any family member directly from their profile node in the Family Cosmos!',
  'Install the app on your home screen for the best experience — tap the download icon in the top bar.',
];

// ─── Seed Family Tree ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedFamilyTree(
  supabase: any,
  userId: string,
  userName: string
) {
  // Check if user already has family members
  const { data: existingPeople } = await supabase
    .from('people')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);

  if (existingPeople && existingPeople.length > 0) {
    return { seededPeople: 0, seededRelationships: 0, skipped: true };
  }

  // Insert all people
  const keyToId = new Map<string, string>();
  const peopleToInsert = DEMO_PEOPLE.map((p) => ({
    owner_id: userId,
    user_id: p.is_self ? userId : null,
    full_name: p.is_self ? (userName || 'You') : p.full_name,
    gender: p.gender,
    date_of_birth: p.date_of_birth,
    is_self: p.is_self,
    photo_url: null,
    email: null,
    phone_number: null,
  }));

  const { data: insertedPeople, error: peopleError } = await supabase
    .from('people')
    .insert(peopleToInsert as any)
    .select('id, full_name, is_self');

  if (peopleError) throw peopleError;

  // Map keys to IDs by matching order
  (insertedPeople || []).forEach((p: { id: string; full_name: string; is_self: boolean }, i: number) => {
    keyToId.set(DEMO_PEOPLE[i].key, p.id);
  });

  // Insert relationships
  const relationshipsToInsert = DEMO_RELATIONSHIPS
    .map((r) => {
      const fromId = keyToId.get(r.from);
      const toId = keyToId.get(r.to);
      if (!fromId || !toId) return null;
      return {
        person_id: fromId,
        related_person_id: toId,
        relationship_type: r.type,
        owner_id: userId,
      };
    })
    .filter(Boolean) as Array<{
      person_id: string;
      related_person_id: string;
      relationship_type: string;
      owner_id: string;
    }>;

  const { data: insertedRels, error: relError } = await supabase
    .from('relationships')
    .insert(relationshipsToInsert as any)
    .select('id');

  if (relError) throw relError;

  return {
    seededPeople: insertedPeople?.length || 0,
    seededRelationships: insertedRels?.length || 0,
    skipped: false,
  };
}

// ─── Main Handler ────────────────────────────────────────────

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

    // ─── 1. Seed Family Tree ─────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const familyResult = await seedFamilyTree(
      supabase,
      user.id,
      profile?.full_name || user.email?.split('@')[0] || 'You'
    );

    // ─── 2. Seed Posts ───────────────────────────────────
    let seededPosts = 0;
    let seededComments = 0;
    let seededMessages = 0;

    const postTitles = DEMO_POSTS.map((p) => p.title);
    const { data: existingPosts } = await supabase
      .from('posts')
      .select('id, title')
      .eq('author_id', user.id)
      .in('title', postTitles);

    const existingPostTitleSet = new Set((existingPosts || []).map((p) => p.title));
    const missingPosts = DEMO_POSTS.filter((p) => !existingPostTitleSet.has(p.title));

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

    // ─── 3. Seed Comments ────────────────────────────────
    const { data: allDemoPosts } = await supabase
      .from('posts')
      .select('id, title, comments_count')
      .eq('author_id', user.id)
      .in('title', postTitles);

    const postByTitle = new Map((allDemoPosts || []).map((p) => [p.title, p]));
    const postIds = Array.from(postByTitle.values()).map((p) => p.id);

    if (postIds.length > 0) {
      const commentContents = DEMO_COMMENTS.map((c) => c.content);
      const { data: existingComments } = await supabase
        .from('comments')
        .select('id, post_id, content')
        .eq('author_id', user.id)
        .in('post_id', postIds)
        .in('content', commentContents);

      const existingCommentKeySet = new Set((existingComments || []).map((c) => `${c.post_id}::${c.content}`));
      const commentsToInsert = DEMO_COMMENTS
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

    // ─── 4. Seed Messages ────────────────────────────────
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id, content')
      .eq('sender_id', user.id)
      .eq('receiver_id', user.id)
      .in('content', DEMO_MESSAGES);

    const existingMessageSet = new Set((existingMessages || []).map((m) => m.content));
    const missingMessages = DEMO_MESSAGES.filter((msg) => !existingMessageSet.has(msg));

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

    // ─── Response ────────────────────────────────────────
    const socialSkipped = seededPosts === 0 && seededComments === 0 && seededMessages === 0;
    return NextResponse.json({
      success: true,
      seeded: {
        people: familyResult.seededPeople,
        relationships: familyResult.seededRelationships,
        posts: seededPosts,
        comments: seededComments,
        messages: seededMessages,
      },
      familyTreeSkipped: familyResult.skipped,
      socialSkipped,
    });
  } catch (err) {
    console.error('Demo social seed error:', err);
    const message = err instanceof Error ? err.message : 'Failed to seed demo data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
