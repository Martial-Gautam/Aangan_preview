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

    const { searchParams } = new URL(req.url);
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');

    if (!fromId || !toId) {
      return NextResponse.json({ error: 'Missing from or to parameters' }, { status: 400 });
    }

    const degree = await Neo4jService.getDegree(fromId, toId);

    return NextResponse.json({ degree });
  } catch (error: any) {
    console.error('Neo4j Degree API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
