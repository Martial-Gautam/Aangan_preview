import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateDegree } from '@/lib/degree-calculator';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type RelationshipRow = {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: string;
};

function normalizeCity(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
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

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestedCity = normalizeCity(req.nextUrl.searchParams.get('city'));

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('location_city')
      .eq('id', user.id)
      .maybeSingle();

    const fallbackCity = normalizeCity(myProfile?.location_city);
    const cityFilter = requestedCity || fallbackCity;

    const connectedOwnerIds = new Set<string>();
    connectedOwnerIds.add(user.id);

    const visited = new Set<string>();
    const queue: string[] = [user.id];
    let index = 0;

    while (index < queue.length) {
      const chunk = queue.slice(index, index + 25);
      index += 25;

      chunk.forEach((id) => visited.add(id));
      const orFilter = `user_id_1.in.(${chunk.join(',')}),user_id_2.in.(${chunk.join(',')})`;

      const { data: connections } = await supabase
        .from('user_connections')
        .select('user_id_1, user_id_2')
        .or(orFilter);

      (connections || []).forEach((connection) => {
        if (connection.user_id_1 && !visited.has(connection.user_id_1)) queue.push(connection.user_id_1);
        if (connection.user_id_2 && !visited.has(connection.user_id_2)) queue.push(connection.user_id_2);
      });
    }

    visited.forEach((id) => connectedOwnerIds.add(id));

    const { data: claimedNodes } = await supabase
      .from('people')
      .select('owner_id')
      .eq('user_id', user.id)
      .neq('owner_id', user.id);

    (claimedNodes || []).forEach((node) => {
      if (node.owner_id) connectedOwnerIds.add(node.owner_id);
    });

    const { data: claimedInMyTree } = await supabase
      .from('people')
      .select('user_id')
      .eq('owner_id', user.id)
      .not('user_id', 'is', null)
      .neq('user_id', user.id);

    (claimedInMyTree || []).forEach((node) => {
      if (node.user_id) connectedOwnerIds.add(node.user_id);
    });

    const relativeOwnerIds = Array.from(connectedOwnerIds).filter((id) => id !== user.id);
    if (relativeOwnerIds.length === 0) {
      return NextResponse.json({ city: cityFilter || null, relatives: [] });
    }

    const { data: profiles, error: profileQueryError } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url, location_city, location_state, location_country')
      .in('id', relativeOwnerIds);

    if (profileQueryError && profileQueryError.message?.includes('location_city')) {
      return NextResponse.json({
        city: cityFilter || null,
        relatives: [],
        warning: 'location_fields_missing',
      });
    }

    if (profileQueryError) {
      throw profileQueryError;
    }

    const ownerIdsForGraph = Array.from(connectedOwnerIds);
    const { data: people } = await supabase
      .from('people')
      .select('id, owner_id, is_self')
      .in('owner_id', ownerIdsForGraph);

    const { data: relationships } = await supabase
      .from('relationships')
      .select('id, person_id, related_person_id, relationship_type')
      .in('owner_id', ownerIdsForGraph);

    const selfByOwner = new Map<string, string>();
    (people || []).forEach((person) => {
      if (person.is_self) {
        selfByOwner.set(person.owner_id, person.id);
      }
    });

    const mySelfId = selfByOwner.get(user.id);
    const graphRelationships = (relationships || []) as RelationshipRow[];

    const filteredProfiles = (profiles || []).filter((profile) => {
      if (!cityFilter) return true;
      const city = normalizeCity(profile.location_city);
      return city.includes(cityFilter);
    });

    const relatives = filteredProfiles
      .map((profile) => {
        const theirSelfId = selfByOwner.get(profile.id);
        const relation = mySelfId && theirSelfId
          ? calculateDegree(theirSelfId, mySelfId, graphRelationships)
          : { degree: -1, label: 'Relative' };

        return {
          user_id: profile.id,
          full_name: profile.full_name,
          photo_url: profile.photo_url,
          city: profile.location_city,
          state: profile.location_state,
          country: profile.location_country,
          relationship_label: relation.label || 'Relative',
          degree: relation.degree,
        };
      })
      .sort((a, b) => {
        const degreeA = a.degree < 0 ? 999 : a.degree;
        const degreeB = b.degree < 0 ? 999 : b.degree;
        if (degreeA !== degreeB) return degreeA - degreeB;
        return a.full_name.localeCompare(b.full_name);
      });

    return NextResponse.json({ city: cityFilter || null, relatives });
  } catch (error) {
    console.error('Relatives around me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
