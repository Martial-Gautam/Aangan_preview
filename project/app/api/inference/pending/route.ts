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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending suggestions with person details
    const { data: suggestions, error } = await supabaseAdmin
      .from('suggested_relationships')
      .select(`
        id,
        suggested_type,
        from_person:people!from_person_id (id, full_name, photo_url),
        to_person:people!to_person_id (id, full_name, photo_url)
      `)
      .eq('owner_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Fetch suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
