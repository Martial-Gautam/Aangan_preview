import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    // Validate auth
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

    // Fetch user profile to get phone
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    // Query pending requests for this user
    let orConditions = [`to_user_id.eq.${user.id}`, `receiver_id.eq.${user.id}`];
    if (user.email) orConditions.push(`receiver_email.eq.${user.email}`);
    if (profile?.phone) orConditions.push(`receiver_phone.eq.${profile.phone}`);

    const { data: requests, error: reqError } = await supabaseAdmin
      .from('connection_requests')
      .select(`
        id,
        status,
        created_at,
        person_id,
        linked_person_id,
        relationship_type,
        type,
        initiated_by,
        from_user_id,
        sender_id
      `)
      .eq('status', 'pending')
      .or(orConditions.join(','));

    if (reqError) {
      console.error('Fetch requests error:', reqError);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    // Enrich requests with sender and node details
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (req) => {
        // Get sender profile
        const senderId = req.from_user_id || req.sender_id;
        const { data: sender } = await supabaseAdmin
          .from('profiles')
          .select('full_name, photo_url')
          .eq('id', senderId)
          .single();

        let relationshipType = req.relationship_type || 'Connection';
        let addedAs = '';

        const linkedPersonId = req.person_id || req.linked_person_id;
        if (linkedPersonId) {
          // Get how the sender recorded the receiver in their tree
          const { data: node } = await supabaseAdmin
            .from('people')
            .select('full_name, gender')
            .eq('id', linkedPersonId)
            .single();
          
          if (node) {
            addedAs = node.full_name;
            relationshipType = 'Relative';
          }

          // Get relationship type
          const { data: senderSelf } = await supabaseAdmin
            .from('people')
            .select('id')
            .eq('owner_id', senderId)
            .eq('is_self', true)
            .maybeSingle();

          if (senderSelf) {
            const { data: rel } = await supabaseAdmin
              .from('relationships')
              .select('relationship_type')
              .eq('person_id', senderSelf.id)
              .eq('related_person_id', linkedPersonId)
              .maybeSingle();
            if (rel) {
              relationshipType = rel.relationship_type;
            } else {
               const { data: reverseRel } = await supabaseAdmin
                 .from('relationships')
                 .select('relationship_type')
                 .eq('person_id', linkedPersonId)
                 .eq('related_person_id', senderSelf.id)
                 .maybeSingle();
               if (reverseRel) {
                 relationshipType = reverseRel.relationship_type + ' (reverse)';
               }
            }
          }
        }

        return {
          id: req.id,
          sender: {
            full_name: sender?.full_name || 'Someone',
            photo_url: sender?.photo_url
          },
          added_as: addedAs,
          relationship: relationshipType,
          created_at: req.created_at,
          type: req.type,
          initiated_by: req.initiated_by
        };
      })
    );

    return NextResponse.json({ requests: enrichedRequests });

  } catch (error) {
    console.error('Pending connections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
