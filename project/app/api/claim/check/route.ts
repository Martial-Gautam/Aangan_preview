import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // Validate auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Create user-scoped client to verify token
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse input
    const body = await req.json();
    const { email, phone } = body as { email?: string; phone?: string };

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
    }

    // Use admin client to search across all owners (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Build query: match on email OR phone, exclude already-claimed and self-owned
    let query = supabaseAdmin
      .from('people')
      .select('id, full_name, gender, email, phone_number, owner_id')
      .is('user_id', null) // not yet claimed
      .neq('owner_id', user.id); // not owned by requesting user

    // Build OR filter for email/phone
    const orConditions: string[] = [];
    if (email) orConditions.push(`email.eq.${email}`);
    if (phone) orConditions.push(`phone_number.eq.${phone}`);
    query = query.or(orConditions.join(','));

    const { data: matches, error: queryError } = await query;

    if (queryError) {
      console.error('Claim check query error:', queryError);
      return NextResponse.json({ error: 'Failed to search profiles' }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // For each match, fetch relationship context (who added them and as what)
    const enrichedMatches = await Promise.all(
      matches.map(async (person) => {
        const { data: rels } = await supabaseAdmin
          .from('relationships')
          .select('relationship_type, person_id')
          .eq('related_person_id', person.id);

        // Get the owner's name (the person who added this node)
        const { data: ownerProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', person.owner_id)
          .maybeSingle();

        const connections = (rels || []).map((r) => ({
          relationship_type: r.relationship_type,
          added_by: ownerProfile?.full_name || 'Someone',
        }));

        return {
          id: person.id,
          full_name: person.full_name,
          gender: person.gender,
          email: person.email,
          phone_number: person.phone_number,
          connections,
        };
      })
    );

    return NextResponse.json({ matches: enrichedMatches });
  } catch (err) {
    console.error('Claim check error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
