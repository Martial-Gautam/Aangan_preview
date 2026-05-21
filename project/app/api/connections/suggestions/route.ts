import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type MatchSignal = {
  key: string;
  label: string;
  score: number;
};

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeName(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return cleaned.length > 0 ? cleaned : null;
}

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
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: myNodes } = await supabaseAdmin
      .from('people')
      .select('id, owner_id, user_id, full_name, email, phone_number, date_of_birth, is_self')
      .eq('owner_id', user.id);

    if (!myNodes || myNodes.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const myNetworkSet = new Set<string>();
    const myClaimedUserIds = new Set<string>();
    const myEmailSet = new Set<string>();
    const myPhoneSet = new Set<string>();
    const myNameDobSet = new Set<string>();

    for (const node of myNodes) {
      if (node.user_id) {
        myNetworkSet.add(node.user_id);
        if (node.user_id !== user.id) {
          myClaimedUserIds.add(node.user_id);
        }
      }

      if (node.is_self) continue;

      const emailKey = normalizeEmail(node.email);
      if (emailKey) myEmailSet.add(emailKey);

      const phoneKey = normalizePhone(node.phone_number);
      if (phoneKey) myPhoneSet.add(phoneKey);

      const nameKey = normalizeName(node.full_name);
      const dobKey = typeof node.date_of_birth === 'string' ? node.date_of_birth : null;
      if (nameKey && dobKey) {
        myNameDobSet.add(`${nameKey}|${dobKey}`);
      }
    }

    const candidateSignals = new Map<string, Map<string, MatchSignal>>();

    const addSignal = (ownerId: string | null, signal: MatchSignal) => {
      if (!ownerId || ownerId === user.id) return;
      if (!candidateSignals.has(ownerId)) {
        candidateSignals.set(ownerId, new Map());
      }
      const bucket = candidateSignals.get(ownerId)!;
      const existing = bucket.get(signal.key);
      if (!existing || signal.score > existing.score) {
        bucket.set(signal.key, signal);
      }
    };

    if (myClaimedUserIds.size > 0) {
      const { data: sharedClaimedNodes } = await supabaseAdmin
        .from('people')
        .select('owner_id, user_id, full_name')
        .in('user_id', Array.from(myClaimedUserIds))
        .neq('owner_id', user.id);

      for (const row of sharedClaimedNodes || []) {
        if (!row.user_id) continue;
        addSignal(row.owner_id, {
          key: `claimed:${row.user_id}`,
          label: row.full_name || 'a shared relative',
          score: 100,
        });
      }
    }

    if (myEmailSet.size > 0) {
      const { data: emailMatches } = await supabaseAdmin
        .from('people')
        .select('owner_id, full_name, email')
        .in('email', Array.from(myEmailSet))
        .neq('owner_id', user.id);

      for (const row of emailMatches || []) {
        const emailKey = normalizeEmail(row.email);
        if (!emailKey || !myEmailSet.has(emailKey)) continue;
        addSignal(row.owner_id, {
          key: `email:${emailKey}`,
          label: row.full_name || 'a shared relative',
          score: 78,
        });
      }
    }

    if (myPhoneSet.size > 0) {
      const { data: phoneMatches } = await supabaseAdmin
        .from('people')
        .select('owner_id, full_name, phone_number')
        .neq('owner_id', user.id)
        .not('phone_number', 'is', null)
        .limit(3000);

      for (const row of phoneMatches || []) {
        const phoneKey = normalizePhone(row.phone_number);
        if (!phoneKey || !myPhoneSet.has(phoneKey)) continue;
        addSignal(row.owner_id, {
          key: `phone:${phoneKey}`,
          label: row.full_name || 'a shared relative',
          score: 72,
        });
      }
    }

    if (myNameDobSet.size > 0) {
      const myDobValues = Array.from(new Set(Array.from(myNameDobSet).map((entry) => entry.split('|')[1]).filter(Boolean)));
      if (myDobValues.length > 0) {
        const { data: nameDobMatches } = await supabaseAdmin
          .from('people')
          .select('owner_id, full_name, date_of_birth')
          .neq('owner_id', user.id)
          .in('date_of_birth', myDobValues)
          .limit(3000);

        for (const row of nameDobMatches || []) {
          const nameKey = normalizeName(row.full_name);
          const dobKey = typeof row.date_of_birth === 'string' ? row.date_of_birth : null;
          if (!nameKey || !dobKey) continue;
          const key = `${nameKey}|${dobKey}`;
          if (!myNameDobSet.has(key)) continue;
          addSignal(row.owner_id, {
            key: `namedob:${key}`,
            label: row.full_name || 'a shared relative',
            score: 62,
          });
        }
      }
    }

    const rawOwnerIds = Array.from(candidateSignals.keys());
    if (rawOwnerIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: connections } = await supabaseAdmin
      .from('user_connections')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const connectedIds = new Set<string>();
    for (const row of connections || []) {
      if (row.user_id_1 && row.user_id_1 !== user.id) connectedIds.add(row.user_id_1);
      if (row.user_id_2 && row.user_id_2 !== user.id) connectedIds.add(row.user_id_2);
    }

    const { data: existingRequests } = await supabaseAdmin
      .from('connection_requests')
      .select('from_user_id, to_user_id, status')
      .in('status', ['pending', 'accepted'])
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    const blockedByRequest = new Set<string>();
    for (const row of existingRequests || []) {
      if (row.from_user_id && row.from_user_id !== user.id) blockedByRequest.add(row.from_user_id);
      if (row.to_user_id && row.to_user_id !== user.id) blockedByRequest.add(row.to_user_id);
    }

    const candidateOwnerIds = rawOwnerIds.filter((ownerId) => {
      if (!ownerId || ownerId === user.id) return false;
      if (myNetworkSet.has(ownerId)) return false;
      if (connectedIds.has(ownerId)) return false;
      if (blockedByRequest.has(ownerId)) return false;
      return true;
    });

    if (candidateOwnerIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, photo_url')
      .in('id', candidateOwnerIds);

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

    const suggestions = candidateOwnerIds
      .map((ownerId) => {
        const profile = profileMap.get(ownerId);
        if (!profile) return null;

        const signals = Array.from(candidateSignals.get(ownerId)?.values() || []);
        if (signals.length === 0) return null;

        signals.sort((a, b) => b.score - a.score);
        const totalScore = signals.reduce((sum, signal) => sum + signal.score, 0);
        const topSignal = signals[0];

        return {
          user_id: profile.id,
          full_name: profile.full_name,
          photo_url: profile.photo_url,
          mutual_connection: topSignal.label,
          mutual_count: signals.length,
          score: totalScore,
          reason:
            signals.length > 1
              ? `You both appear connected through ${topSignal.label} and ${signals.length - 1} more relatives.`
              : `You both appear connected through ${topSignal.label}.`,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 20);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
