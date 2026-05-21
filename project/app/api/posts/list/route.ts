import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateDegree } from '@/lib/degree-calculator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type PersonRow = {
  id: string;
  user_id: string | null;
  owner_id: string;
  is_self: boolean;
};

type RelationshipRow = {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: string;
};

function normalizeAudienceText(value: unknown, fallback: string[] = ['all']) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
    .filter(Boolean);
  return normalized.length ? normalized : fallback;
}

function normalizeAudienceUsers(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function inferSideFromPath(path: string[]): 'maternal' | 'paternal' | 'in-laws' | 'spouse' | null {
  if (!path.length) return null;
  const first = (path[0] || '').toLowerCase();
  if (first === 'mother') return 'maternal';
  if (first === 'father') return 'paternal';
  if (first === 'spouse') return path.length === 1 ? 'spouse' : 'in-laws';
  return null;
}

function degreeMatchesAudience(degree: number, audienceDegrees: string[]) {
  if (degree < 0) return false;
  if (audienceDegrees.includes('all')) return true;
  if (degree === 0) return false;
  if (degree === 1 && audienceDegrees.includes('1st degree')) return true;
  if (degree === 2 && audienceDegrees.includes('2nd degree')) return true;
  if (degree >= 3 && audienceDegrees.includes('3rd+ degree')) return true;
  return false;
}

function sideMatchesAudience(
  side: 'maternal' | 'paternal' | 'in-laws' | 'spouse' | null,
  audienceSides: string[]
) {
  if (audienceSides.includes('all')) return true;
  if (!side) return false;
  return audienceSides.includes(side);
}

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
    const page = parseInt(req.nextUrl.searchParams.get('page') || '0', 10);
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 50);
    const offset = page * limit;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fetchLimit = Math.min(limit * 8, 200);
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('type', type);

    if (category) {
      query = query.eq('category', category);
    } else if (type === 'post') {
      // Keep memory gallery content out of the general post feed unless explicitly requested.
      query = query.neq('category', 'memories');
    }

    const { data: posts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + fetchLimit - 1);

    if (error) throw error;

    const rawPostList = posts || [];

    // Build visibility context from the viewer's connected graph
    const connectedOwnerIds = new Set<string>([user.id]);

    const visited = new Set<string>();
    const queue: string[] = [user.id];
    let qIndex = 0;
    while (qIndex < queue.length) {
      const chunk = queue.slice(qIndex, qIndex + 25);
      qIndex += 25;
      chunk.forEach((id) => visited.add(id));
      const orFilter = `user_id_1.in.(${chunk.join(',')}),user_id_2.in.(${chunk.join(',')})`;
      const { data: connections } = await supabase
        .from('user_connections')
        .select('user_id_1, user_id_2')
        .or(orFilter);

      (connections || []).forEach((conn) => {
        if (conn.user_id_1 && !visited.has(conn.user_id_1)) queue.push(conn.user_id_1);
        if (conn.user_id_2 && !visited.has(conn.user_id_2)) queue.push(conn.user_id_2);
      });
    }
    visited.forEach((id) => connectedOwnerIds.add(id));

    const { data: claimedNodes } = await supabase
      .from('people')
      .select('owner_id')
      .eq('user_id', user.id)
      .neq('owner_id', user.id);
    (claimedNodes || []).forEach((n) => n.owner_id && connectedOwnerIds.add(n.owner_id));

    const { data: claimedInMyTree } = await supabase
      .from('people')
      .select('user_id')
      .eq('owner_id', user.id)
      .not('user_id', 'is', null)
      .neq('user_id', user.id);
    (claimedInMyTree || []).forEach((n) => n.user_id && connectedOwnerIds.add(n.user_id));

    const ownerIds = Array.from(connectedOwnerIds);
    const { data: rawPeople } = ownerIds.length
      ? await supabase.from('people').select('id,user_id,owner_id,is_self').in('owner_id', ownerIds)
      : { data: [] };
    const { data: rawRelationships } = ownerIds.length
      ? await supabase.from('relationships').select('id,person_id,related_person_id,relationship_type').in('owner_id', ownerIds)
      : { data: [] };

    const people = (rawPeople || []) as PersonRow[];
    let relationships = (rawRelationships || []) as RelationshipRow[];

    const selfByOwner = new Map<string, string>();
    people.forEach((p) => {
      if (p.is_self) selfByOwner.set(p.owner_id, p.id);
    });

    const idRemap = new Map<string, string>();
    const nodesToRemove = new Set<string>();
    people.forEach((p) => {
      if (p.user_id && p.user_id !== p.owner_id && !p.is_self) {
        const canonical = selfByOwner.get(p.user_id);
        if (canonical && canonical !== p.id) {
          idRemap.set(p.id, canonical);
          nodesToRemove.add(p.id);
        }
      }
    });

    if (idRemap.size > 0) {
      relationships = relationships
        .map((r) => ({
          ...r,
          person_id: idRemap.get(r.person_id) || r.person_id,
          related_person_id: idRemap.get(r.related_person_id) || r.related_person_id,
        }))
        .filter((r) => r.person_id !== r.related_person_id);
    }

    const dedupKey = new Set<string>();
    relationships = relationships.filter((r) => {
      const key = `${r.person_id}|${r.related_person_id}|${r.relationship_type}`;
      if (dedupKey.has(key)) return false;
      dedupKey.add(key);
      return true;
    });

    const viewerSelfId = selfByOwner.get(user.id) || null;
    const relationByAuthor = new Map<string, { degree: number; side: 'maternal' | 'paternal' | 'in-laws' | 'spouse' | null }>();
    const authorIdsFromPosts = Array.from(new Set(rawPostList.map((p) => p.author_id)));

    for (const authorId of authorIdsFromPosts) {
      if (authorId === user.id) {
        relationByAuthor.set(authorId, { degree: 0, side: null });
        continue;
      }
      const authorSelfId = selfByOwner.get(authorId);
      if (!authorSelfId || !viewerSelfId) {
        relationByAuthor.set(authorId, { degree: -1, side: null });
        continue;
      }
      const result = calculateDegree(authorSelfId, viewerSelfId, relationships);
      relationByAuthor.set(authorId, {
        degree: result.degree,
        side: inferSideFromPath(result.relationshipPath || []),
      });
    }

    const postList = rawPostList.filter((post) => {
      if (post.author_id === user.id) return true;

      const includeUsers = normalizeAudienceUsers(post.include_user_ids);
      const excludeUsers = normalizeAudienceUsers(post.exclude_user_ids);
      if (excludeUsers.includes(user.id)) return false;
      if (includeUsers.includes(user.id)) return true;

      const audienceDegrees = normalizeAudienceText(post.audience_degrees, ['all']);
      const audienceSides = normalizeAudienceText(post.audience_sides, ['all']);
      const relation = relationByAuthor.get(post.author_id) || { degree: -1, side: null };

      return degreeMatchesAudience(relation.degree, audienceDegrees) &&
        sideMatchesAudience(relation.side, audienceSides);
    }).slice(0, limit);

    // Get author profiles
    const authorIds = Array.from(new Set(postList.map(p => p.author_id)));
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, photo_url').in('id', authorIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get current user's likes
    const postIds = postList.map(p => p.id);
    const { data: userLikes } = postIds.length > 0
      ? await supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
      : { data: [] };
    const likedSet = new Set((userLikes || []).map(l => l.post_id));

    // Get media attachments for posts with media
    const postsWithMedia = postList.filter(p => (p.media_count || 0) > 0).map(p => p.id);
    let mediaMap = new Map<string, Array<{ media_url: string; media_type: string; thumbnail_url: string | null; sort_order: number }>>();

    if (postsWithMedia.length > 0) {
      const { data: mediaData } = await supabase
        .from('media_attachments')
        .select('post_id, media_url, media_type, thumbnail_url, sort_order')
        .in('post_id', postsWithMedia)
        .order('sort_order', { ascending: true });

      if (mediaData) {
        for (const m of mediaData) {
          if (!mediaMap.has(m.post_id)) {
            mediaMap.set(m.post_id, []);
          }
          mediaMap.get(m.post_id)!.push(m);
        }
      }
    }

    const enrichedPosts = postList.map(post => ({
      ...post,
      author: profileMap.get(post.author_id) || { full_name: 'Unknown', photo_url: null },
      liked_by_me: likedSet.has(post.id),
      media: mediaMap.get(post.id) || [],
    }));

    const totalCount = count || 0;
    const hasMore = rawPostList.length > postList.length || offset + fetchLimit < totalCount;

    return NextResponse.json({
      posts: enrichedPosts,
      has_more: hasMore,
      total: totalCount,
      page,
    });
  } catch (err) {
    console.error('List posts error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
