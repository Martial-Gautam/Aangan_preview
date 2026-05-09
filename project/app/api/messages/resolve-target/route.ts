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

    const personId = req.nextUrl.searchParams.get('person_id');
    if (!personId) {
      return NextResponse.json({ error: 'person_id is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('id, owner_id, user_id, email, phone_number')
      .eq('id', personId)
      .maybeSingle();

    if (personError || !person) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    let targetUserId: string | null = person.user_id || null;
    let source: 'people_user_id' | 'connection_request' | 'email_match' | 'phone_match' | null =
      targetUserId ? 'people_user_id' : null;

    // If this is my member and not directly linked yet, resolve via pending/direct match records.
    if (!targetUserId && person.owner_id === user.id) {
      const { data: requestMatch } = await supabaseAdmin
        .from('connection_requests')
        .select('to_user_id')
        .eq('from_user_id', user.id)
        .or(`person_id.eq.${personId},linked_person_id.eq.${personId}`)
        .not('to_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestMatch?.to_user_id) {
        targetUserId = requestMatch.to_user_id;
        source = 'connection_request';
      }
    }

    // Fallback email match against auth users.
    if (!targetUserId && person.email) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const matchedUser = (usersPage?.users || []).find(
        (u) =>
          u.id !== user.id &&
          u.email &&
          u.email.toLowerCase() === person.email!.trim().toLowerCase()
      );
      if (matchedUser?.id) {
        targetUserId = matchedUser.id;
        source = 'email_match';
      }
    }

    // Fallback phone match against profile records.
    if (!targetUserId && person.phone_number) {
      const { data: profileMatch } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', person.phone_number)
        .neq('id', user.id)
        .maybeSingle();

      if (profileMatch?.id) {
        targetUserId = profileMatch.id;
        source = 'phone_match';
      }
    }

    return NextResponse.json({
      target_user_id: targetUserId,
      source,
      linked: !!person.user_id,
    });
  } catch (err) {
    console.error('Resolve message target error:', err);
    const message = err instanceof Error ? err.message : 'Failed to resolve message target';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
