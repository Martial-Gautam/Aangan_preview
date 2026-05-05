import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

    const { suggestion_id, action } = await req.json();
    if (!suggestion_id || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the suggestion
    const { data: suggestion } = await supabaseAdmin
      .from('merge_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .single();

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: 'Suggestion already processed' }, { status: 400 });
    }

    // Reject — just update status
    if (action === 'reject') {
      await supabaseAdmin
        .from('merge_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestion_id);

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    // Accept — perform the merge
    const { data: person1 } = await supabaseAdmin
      .from('people')
      .select('*')
      .eq('id', suggestion.person_id_1)
      .single();

    const { data: person2 } = await supabaseAdmin
      .from('people')
      .select('*')
      .eq('id', suggestion.person_id_2)
      .single();

    if (!person1 || !person2) {
      await supabaseAdmin
        .from('merge_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestion_id);
      return NextResponse.json({ error: 'One or both people no longer exist' }, { status: 400 });
    }

    // Decide canonical node: prefer user_id set, else older created_at
    let canonical = person1;
    let duplicate = person2;

    if (person2.user_id && !person1.user_id) {
      canonical = person2;
      duplicate = person1;
    } else if (person1.user_id && !person2.user_id) {
      canonical = person1;
      duplicate = person2;
    } else if (new Date(person1.created_at) > new Date(person2.created_at)) {
      canonical = person2;
      duplicate = person1;
    }

    // Re-point all relationships from duplicate to canonical
    await supabaseAdmin
      .from('relationships')
      .update({ person_id: canonical.id })
      .eq('person_id', duplicate.id);

    await supabaseAdmin
      .from('relationships')
      .update({ related_person_id: canonical.id })
      .eq('related_person_id', duplicate.id);

    // Create user_connections between the two owners
    if (canonical.owner_id !== duplicate.owner_id) {
      const uid1 = canonical.owner_id < duplicate.owner_id ? canonical.owner_id : duplicate.owner_id;
      const uid2 = canonical.owner_id < duplicate.owner_id ? duplicate.owner_id : canonical.owner_id;

      await supabaseAdmin
        .from('user_connections')
        .upsert({ user_id_1: uid1, user_id_2: uid2 }, { onConflict: 'user_id_1,user_id_2', ignoreDuplicates: true });
    }

    // Delete the duplicate node
    await supabaseAdmin
      .from('people')
      .delete()
      .eq('id', duplicate.id);

    // Update suggestion status
    await supabaseAdmin
      .from('merge_suggestions')
      .update({ status: 'accepted' })
      .eq('id', suggestion_id);

    return NextResponse.json({
      success: true,
      action: 'accepted',
      canonical_id: canonical.id,
      deleted_id: duplicate.id,
    });
  } catch (error) {
    console.error('Merge confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
