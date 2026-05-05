import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    // Auth check
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Use pg_trgm similarity to find cross-owner duplicates
    // Falls back gracefully if extension isn't enabled
    const { data: matches, error: matchError } = await supabaseAdmin.rpc('find_merge_candidates');

    if (matchError) {
      // Fallback: if RPC doesn't exist, do a basic exact-name + DOB match
      console.warn('RPC find_merge_candidates not found, using fallback query:', matchError.message);

      const { data: people } = await supabaseAdmin
        .from('people')
        .select('id, full_name, date_of_birth, owner_id, user_id')
        .not('date_of_birth', 'is', null)
        .is('user_id', null);

      const candidates: Array<{
        person1_id: string; name1: string; owner1: string;
        person2_id: string; name2: string; owner2: string;
        confidence: number;
      }> = [];

      if (people && people.length > 1) {
        for (let i = 0; i < people.length; i++) {
          for (let j = i + 1; j < people.length; j++) {
            const p1 = people[i];
            const p2 = people[j];
            if (
              p1.owner_id !== p2.owner_id &&
              p1.date_of_birth === p2.date_of_birth
            ) {
              // Simple name similarity: compare lowercase names
              const n1 = p1.full_name.toLowerCase().trim();
              const n2 = p2.full_name.toLowerCase().trim();
              const sim = jaroWinkler(n1, n2);
              if (sim > 0.6) {
                candidates.push({
                  person1_id: p1.id,
                  name1: p1.full_name,
                  owner1: p1.owner_id,
                  person2_id: p2.id,
                  name2: p2.full_name,
                  owner2: p2.owner_id,
                  confidence: Math.round(sim * 100) / 100,
                });
              }
            }
          }
        }
      }

      // Insert into merge_suggestions (skip duplicates)
      const inserted: any[] = [];
      for (const c of candidates) {
        const { data } = await supabaseAdmin
          .from('merge_suggestions')
          .upsert(
            {
              person_id_1: c.person1_id < c.person2_id ? c.person1_id : c.person2_id,
              person_id_2: c.person1_id < c.person2_id ? c.person2_id : c.person1_id,
              confidence: c.confidence,
              status: 'pending',
            },
            { onConflict: 'person_id_1,person_id_2', ignoreDuplicates: true }
          )
          .select();

        if (data && data.length > 0) inserted.push(...data);
      }

      return NextResponse.json({
        suggestions: inserted,
        total_candidates: candidates.length,
        method: 'fallback',
      });
    }

    // RPC exists — insert results
    const inserted: any[] = [];
    for (const m of (matches || [])) {
      const { data } = await supabaseAdmin
        .from('merge_suggestions')
        .upsert(
          {
            person_id_1: m.person1_id < m.person2_id ? m.person1_id : m.person2_id,
            person_id_2: m.person1_id < m.person2_id ? m.person2_id : m.person1_id,
            confidence: m.confidence || 0.7,
            status: 'pending',
          },
          { onConflict: 'person_id_1,person_id_2', ignoreDuplicates: true }
        )
        .select();
      if (data && data.length > 0) inserted.push(...data);
    }

    return NextResponse.json({
      suggestions: inserted,
      total_candidates: (matches || []).length,
      method: 'pg_trgm',
    });
  } catch (error) {
    console.error('Smart suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Jaro-Winkler similarity — a well-known fuzzy string matching algorithm.
 * Returns a value between 0 (no match) and 1 (exact match).
 */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler boost for common prefix (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
