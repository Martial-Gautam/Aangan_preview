import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runInferenceEngine } from '@/lib/inference-engine';

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

    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, gender, date_of_birth, photo_url, email, phone_number, is_self, relationship_type } = body;

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 });
    }

    if (!is_self && !relationship_type) {
      return NextResponse.json({ error: 'relationship_type is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: selfPerson } = await supabaseAdmin
      .from('people')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_self', true)
      .maybeSingle();

    if (!selfPerson) {
      return NextResponse.json({ error: 'Could not find your profile' }, { status: 400 });
    }

    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .insert({
        owner_id: user.id,
        full_name: full_name.trim(),
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        photo_url: photo_url || null,
        email: email || null,
        phone_number: phone_number || null,
        is_self: is_self ?? false,
      })
      .select()
      .single();

    if (personError || !person) {
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    if (!is_self) {
      await supabaseAdmin.from('relationships').insert({
        owner_id: user.id,
        person_id: selfPerson.id,
        related_person_id: person.id,
        relationship_type,
      });
    }

    let requestCreated = false;
    if (!is_self && (email || phone_number)) {
      let matchedUserId: string | null = null;

      if (phone_number) {
        const { data: phoneProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('phone', phone_number)
          .maybeSingle();
        matchedUserId = phoneProfile?.id || null;
      }

      const { data: existingRequest } = await supabaseAdmin
        .from('connection_requests')
        .select('id')
        .eq('from_user_id', user.id)
        .eq('person_id', person.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (!existingRequest) {
        const { error: reqError } = await supabaseAdmin
          .from('connection_requests')
          .insert({
            from_user_id: user.id,
            to_user_id: matchedUserId,
            receiver_email: email || null,
            receiver_phone: phone_number || null,
            person_id: person.id,
            relationship_type,
            status: 'pending',
            type: 'direct',
            initiated_by: 'adder'
          });
        if (!reqError) requestCreated = true;
      }
    }

    // Run Inference Engine asynchronously (don't await it to block the response)
    runInferenceEngine(supabaseAdmin, user.id, selfPerson.id).catch(console.error);

    return NextResponse.json({ person, request_created: requestCreated });
  } catch (err) {
    console.error('Add member API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
