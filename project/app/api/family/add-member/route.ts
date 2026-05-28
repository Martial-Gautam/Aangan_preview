import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Neo4jService } from '@/lib/neo4j-service';

export const dynamic = 'force-dynamic';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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

    if (process.env.NEXT_PUBLIC_ENABLE_NEO4J_COSMOS === 'false') {
      return NextResponse.json({ error: 'Neo4j disabled' }, { status: 503 });
    }

    const body = await req.json();
    const { personId, name, gender, birthDate, profileImage, familyId, isSelf } = body;

    if (!personId || !name) {
      return NextResponse.json({ error: 'personId and name are required' }, { status: 400 });
    }

    await Neo4jService.syncPerson({
      id: personId,
      userId: null,
      ownerId: user.id,
      isSelf: isSelf || false,
      name,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      profileImage: profileImage || undefined,
      createdAt: new Date().toISOString(),
    });

    if (familyId) {
      await Neo4jService.addPersonToFamily(personId, familyId);
    }

    return NextResponse.json({ success: true, personId });
  } catch (error: any) {
    console.error('Neo4j Add Member API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
