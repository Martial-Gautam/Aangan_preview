import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: suggestion, error: fetchError } = await supabaseAdmin
      .from('suggested_relationships')
      .select('*')
      .eq('id', suggestion_id)
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: 'Suggestion not found or already processed' }, { status: 404 });
    }

    if (action === 'accept') {
      // Create the relationship
      await supabaseAdmin.from('relationships').insert({
        owner_id: user.id,
        person_id: suggestion.from_person_id,
        related_person_id: suggestion.to_person_id,
        relationship_type: suggestion.suggested_type,
      });
    }

    // Update suggestion status
    await supabaseAdmin
      .from('suggested_relationships')
      .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .eq('id', suggestion_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Process suggestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
