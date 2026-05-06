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

    const { confirmation } = await req.json();
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json({ error: 'Confirmation text required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Remove user_connections involving this user
    await supabaseAdmin
      .from('user_connections')
      .delete()
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    // 2. Remove connection_requests involving this user
    await supabaseAdmin
      .from('connection_requests')
      .delete()
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id},sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    // 3. Unclaim any person nodes claimed by this user (in other people's trees)
    await supabaseAdmin
      .from('people')
      .update({ user_id: null })
      .eq('user_id', user.id)
      .neq('owner_id', user.id);

    // 4. Delete relationships owned by this user
    await supabaseAdmin
      .from('relationships')
      .delete()
      .eq('owner_id', user.id);

    // 5. Delete people owned by this user
    await supabaseAdmin
      .from('people')
      .delete()
      .eq('owner_id', user.id);

    // 6. Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // 7. Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
