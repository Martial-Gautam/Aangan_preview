import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runInferenceEngine } from '@/lib/inference-engine';

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

    const { members } = await req.json();
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'No members provided' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get self person
    const { data: selfPerson } = await supabaseAdmin
      .from('people')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_self', true)
      .maybeSingle();

    if (!selfPerson) {
      return NextResponse.json({ error: 'Could not find your profile' }, { status: 400 });
    }

    // Process all members
    const addedPeople = [];
    
    for (const member of members) {
      if (!member.relationshipType) continue;

      // 1. Insert person node
      const { data: person, error: personError } = await supabaseAdmin
        .from('people')
        .insert({
          owner_id: user.id,
          full_name: member.name,
          phone_number: member.phone || null,
          email: member.email || null,
          is_self: false,
        })
        .select()
        .single();

      if (personError || !person) continue;
      addedPeople.push(person);

      // 2. Insert relationship
      await supabaseAdmin.from('relationships').insert({
        owner_id: user.id,
        person_id: selfPerson.id,
        related_person_id: person.id,
        relationship_type: member.relationshipType,
      });

      // 3. Create connection request if matched
      if (member.isExistingAanganUser && member.matchedUserId) {
        const { data: existingRequest } = await supabaseAdmin
          .from('connection_requests')
          .select('id')
          .eq('from_user_id', user.id)
          .eq('person_id', person.id)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();

        if (!existingRequest) {
          await supabaseAdmin.from('connection_requests').insert({
            from_user_id: user.id,
            to_user_id: member.matchedUserId,
            receiver_email: member.email || null,
            receiver_phone: member.phone || null,
            person_id: person.id,
            relationship_type: member.relationshipType,
            status: 'pending',
            type: 'direct',
            initiated_by: 'adder'
          });
        }
      }
    }

    if (addedPeople.length > 0) {
      // Run inference
      runInferenceEngine(supabaseAdmin, user.id, selfPerson.id).catch(console.error);
    }

    return NextResponse.json({ success: true, count: addedPeople.length });
  } catch (err) {
    console.error('Batch add error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
