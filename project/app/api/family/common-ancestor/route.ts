import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Neo4jService } from '@/lib/neo4j-service';

export const dynamic = 'force-dynamic';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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

    if (process.env.NEXT_PUBLIC_ENABLE_NEO4J_COSMOS === 'false') {
      return NextResponse.json({ error: 'Neo4j disabled' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const personAId = searchParams.get('personA');
    const personBId = searchParams.get('personB');

    if (!personAId || !personBId) {
      return NextResponse.json({ error: 'Missing personA or personB parameters' }, { status: 400 });
    }

    const ancestors = await Neo4jService.getCommonAncestors(personAId, personBId);

    return NextResponse.json({ ancestors: ancestors || [] });
  } catch (error: any) {
    console.error('Neo4j Common Ancestor API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
