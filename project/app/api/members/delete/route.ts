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

    const body = await req.json();
    const { person_id } = body as { person_id?: string };

    if (!person_id) {
      return NextResponse.json({ error: 'person_id is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: person } = await supabaseAdmin
      .from('people')
      .select('id, owner_id, is_self, user_id')
      .eq('id', person_id)
      .maybeSingle();

    if (!person || person.owner_id !== user.id || person.is_self) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (person.user_id) {
      return NextResponse.json({ error: 'Cannot delete a linked profile' }, { status: 409 });
    }

    await supabaseAdmin
      .from('relationships')
      .delete()
      .eq('owner_id', user.id)
      .or(`person_id.eq.${person_id},related_person_id.eq.${person_id}`);

    await supabaseAdmin
      .from('people')
      .delete()
      .eq('id', person_id)
      .eq('owner_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
