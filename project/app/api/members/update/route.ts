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

    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { person_id, full_name, gender, date_of_birth, photo_url, email, phone_number } = body;

    if (!person_id) {
      return NextResponse.json({ error: 'person_id is required' }, { status: 400 });
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the person exists and user owns it
    const { data: person, error: fetchError } = await supabaseAdmin
      .from('people')
      .select('id, owner_id, is_self, user_id')
      .eq('id', person_id)
      .maybeSingle();

    if (fetchError || !person) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (person.owner_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own family members' }, { status: 403 });
    }

    if (person.is_self) {
      return NextResponse.json({ error: 'Use the profile page to edit your own profile' }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, any> = {
      full_name: full_name.trim(),
      updated_at: new Date().toISOString(),
    };

    // Only include optional fields if they are explicitly provided
    if (gender !== undefined) updateData.gender = gender || null;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth || null;
    if (photo_url !== undefined) updateData.photo_url = photo_url || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone_number !== undefined) updateData.phone_number = phone_number || null;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('people')
      .update(updateData)
      .eq('id', person_id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('Update member error:', updateError);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }

    return NextResponse.json({ person: updated });
  } catch (error) {
    console.error('Update member API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
