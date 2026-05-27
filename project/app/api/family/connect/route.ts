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
    const { fromPersonId, toPersonId, relationshipType } = body;

    if (!fromPersonId || !toPersonId || !relationshipType) {
      return NextResponse.json(
        { error: 'fromPersonId, toPersonId, and relationshipType are required' },
        { status: 400 }
      );
    }

    if (fromPersonId === toPersonId) {
      return NextResponse.json(
        { error: 'Cannot create a relationship to self' },
        { status: 400 }
      );
    }

    await Neo4jService.syncRelationship(fromPersonId, toPersonId, relationshipType);

    return NextResponse.json({ success: true, fromPersonId, toPersonId, relationshipType });
  } catch (error: any) {
    console.error('Neo4j Connect API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
