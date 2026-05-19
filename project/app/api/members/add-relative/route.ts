import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Add a relative of ANY person in the tree (not just self).
 * Creates a new person node and a relationship from target_person → new person.
 */
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

    const body = await req.json();
    const {
      target_person_id,
      full_name,
      gender,
      photo_url,
      relationship_type,
      date_of_birth,
      email,
      phone_number,
    } = body;

    if (!target_person_id || !full_name?.trim() || !relationship_type) {
      return NextResponse.json(
        { error: 'target_person_id, full_name, and relationship_type are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify target person exists and belongs to this user's tree
    const { data: targetPerson, error: targetError } = await supabase
      .from('people')
      .select('id, owner_id')
      .eq('id', target_person_id)
      .single();

    if (targetError || !targetPerson) {
      return NextResponse.json({ error: 'Target person not found' }, { status: 404 });
    }

    // Ensure the caller owns this tree
    if (targetPerson.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this tree' }, { status: 403 });
    }

    // Create the new person
    const { data: newPerson, error: personError } = await supabase
      .from('people')
      .insert({
        owner_id: user.id,
        full_name: full_name.trim(),
        gender: gender || null,
        photo_url: photo_url || null,
        date_of_birth: date_of_birth || null,
        email: email?.trim() || null,
        phone_number: phone_number?.trim() || null,
        is_self: false,
      })
      .select()
      .single();

    if (personError) {
      console.error('Create person error:', personError);
      return NextResponse.json({ error: personError.message }, { status: 500 });
    }

    // Create the relationship: target_person → new_person
    const { error: relError } = await supabase
      .from('relationships')
      .insert({
        owner_id: user.id,
        person_id: target_person_id,
        related_person_id: newPerson.id,
        relationship_type,
      });

    if (relError) {
      console.error('Create relationship error:', relError);
      // Clean up the person we just created
      await supabase.from('people').delete().eq('id', newPerson.id);
      return NextResponse.json({ error: relError.message }, { status: 500 });
    }

    return NextResponse.json({ person: newPerson, success: true });
  } catch (err) {
    console.error('Add relative error:', err);
    const message = err instanceof Error ? err.message : 'Failed to add relative';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
