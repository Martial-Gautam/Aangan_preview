import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: myPeople } = await supabaseAdmin
      .from('people')
      .select('id')
      .eq('owner_id', user.id);

    const myPersonIds = (myPeople || []).map(p => p.id);
    if (myPersonIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: suggestions } = await supabaseAdmin
      .from('merge_suggestions')
      .select('*')
      .eq('status', 'pending')
      .or(`person_id_1.in.(${myPersonIds.join(',')}),person_id_2.in.(${myPersonIds.join(',')})`)
      .order('confidence', { ascending: false });

    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const allPersonIds = new Set<string>();
    suggestions.forEach(s => { allPersonIds.add(s.person_id_1); allPersonIds.add(s.person_id_2); });

    const { data: people } = await supabaseAdmin
      .from('people')
      .select('id, full_name, gender, date_of_birth, photo_url, owner_id, user_id, is_self')
      .in('id', Array.from(allPersonIds));

    const peopleMap = new Map((people || []).map(p => [p.id, p]));

    const ownerIds = new Set<string>();
    (people || []).forEach(p => ownerIds.add(p.owner_id));

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(ownerIds));

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const enriched = suggestions.map(s => {
      const p1 = peopleMap.get(s.person_id_1);
      const p2 = peopleMap.get(s.person_id_2);
      return {
        ...s,
        person1: p1 ? { ...p1, owner_name: profileMap.get(p1.owner_id)?.full_name || 'Unknown' } : null,
        person2: p2 ? { ...p2, owner_name: profileMap.get(p2.owner_id)?.full_name || 'Unknown' } : null,
      };
    });

    return NextResponse.json({ suggestions: enriched });
  } catch (error) {
    console.error('Merge suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
