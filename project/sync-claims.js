const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function syncExistingClaims() {
  console.log('Starting backfill of existing claims...');

  // 1. Find all nodes that have been claimed by someone (user_id IS NOT NULL)
  // but are NOT self nodes (is_self = false)
  const { data: claimedNodes, error: fetchError } = await supabaseAdmin
    .from('people')
    .select('*')
    .not('user_id', 'is', null)
    .eq('is_self', false);

  if (fetchError) {
    console.error('Failed to fetch claimed nodes:', fetchError);
    return;
  }

  console.log(`Found ${claimedNodes.length} claimed profiles that might need syncing.`);

  for (const claimedNode of claimedNodes) {
    const claimerUserId = claimedNode.user_id;
    const originalOwnerId = claimedNode.owner_id;

    console.log(`\nProcessing claim: User ${claimerUserId} claimed profile ${claimedNode.id} in Owner ${originalOwnerId}'s tree.`);

    // 2. Check if the claimer already has relationships in their tree
    const { data: existingRels } = await supabaseAdmin
      .from('relationships')
      .select('id')
      .eq('owner_id', claimerUserId)
      .limit(1);

    if (existingRels && existingRels.length > 0) {
      console.log('  -> Claimer already has relationships in their tree. Skipping to avoid duplicates.');
      continue;
    }

    // 3. Apply the sync logic (similar to confirm API)
    
    // Get the claimer's self node
    const { data: claimerSelf } = await supabaseAdmin
      .from('people')
      .select('id')
      .eq('owner_id', claimerUserId)
      .eq('is_self', true)
      .single();

    if (!claimerSelf) {
      console.log('  -> Claimer does not have a self node. Skipping.');
      continue;
    }

    // Find the relationship where OriginalOwner added the ClaimedNode
    const { data: relToClaimedNode } = await supabaseAdmin
      .from('relationships')
      .select('*')
      .eq('related_person_id', claimedNode.id)
      .maybeSingle();

    if (!relToClaimedNode) {
      console.log('  -> Could not find the original relationship for this node. Skipping.');
      continue;
    }

    // Fetch OriginalOwner's self node
    const { data: originalOwnerSelf } = await supabaseAdmin
      .from('people')
      .select('*')
      .eq('id', relToClaimedNode.person_id)
      .single();

    if (!originalOwnerSelf) {
      console.log('  -> Could not find the original owner self node. Skipping.');
      continue;
    }

    let reciprocalType = 'sibling'; // fallback
    if (relToClaimedNode.relationship_type === 'father' || relToClaimedNode.relationship_type === 'mother') {
      reciprocalType = 'child';
    } else if (relToClaimedNode.relationship_type === 'child') {
      reciprocalType = originalOwnerSelf.gender === 'female' ? 'mother' : 'father';
    } else if (relToClaimedNode.relationship_type === 'spouse') {
      reciprocalType = 'spouse';
    }

    console.log(`  -> Syncing reciprocal connection: OriginalOwner is now ${reciprocalType}`);

    // Create OriginalOwner in Claimer's tree
    const { data: newOriginalOwner } = await supabaseAdmin
      .from('people')
      .insert({
        owner_id: claimerUserId,
        full_name: originalOwnerSelf.full_name,
        gender: originalOwnerSelf.gender,
        photo_url: originalOwnerSelf.photo_url,
        user_id: originalOwnerSelf.user_id,
        is_self: false,
      })
      .select()
      .single();

    if (newOriginalOwner) {
      await supabaseAdmin.from('relationships').insert({
        owner_id: claimerUserId,
        person_id: claimerSelf.id,
        related_person_id: newOriginalOwner.id,
        relationship_type: reciprocalType,
      });
      console.log(`  -> Added ${originalOwnerSelf.full_name} to tree.`);
    }

    // Sync siblings/parents based on relationship
    if (relToClaimedNode.relationship_type === 'child') {
      const { data: otherChildren } = await supabaseAdmin
        .from('relationships')
        .select('related_person_id')
        .eq('person_id', originalOwnerSelf.id)
        .eq('relationship_type', 'child')
        .neq('related_person_id', claimedNode.id);

      if (otherChildren && otherChildren.length > 0) {
        const childIds = otherChildren.map(c => c.related_person_id);
        const { data: siblings } = await supabaseAdmin.from('people').select('*').in('id', childIds);
        
        if (siblings) {
          for (const sib of siblings) {
            const { data: newSib } = await supabaseAdmin.from('people').insert({
              owner_id: claimerUserId,
              full_name: sib.full_name,
              gender: sib.gender,
              photo_url: sib.photo_url,
              user_id: sib.user_id,
              is_self: false,
            }).select().single();

            if (newSib) {
              await supabaseAdmin.from('relationships').insert({
                owner_id: claimerUserId,
                person_id: claimerSelf.id,
                related_person_id: newSib.id,
                relationship_type: 'sibling',
              });
              console.log(`  -> Synced sibling: ${sib.full_name}`);
            }
          }
        }
      }
    }
    
    if (relToClaimedNode.relationship_type === 'sibling') {
      const { data: aRels } = await supabaseAdmin
        .from('relationships')
        .select('related_person_id, relationship_type')
        .eq('person_id', originalOwnerSelf.id)
        .in('relationship_type', ['father', 'mother', 'sibling'])
        .neq('related_person_id', claimedNode.id);

      if (aRels && aRels.length > 0) {
        const relIds = aRels.map(r => r.related_person_id);
        const { data: aRelatives } = await supabaseAdmin.from('people').select('*').in('id', relIds);
        
        if (aRelatives) {
          for (const rel of aRelatives) {
            const originalRel = aRels.find(r => r.related_person_id === rel.id);
            if (!originalRel) continue;

            const { data: newRel } = await supabaseAdmin.from('people').insert({
              owner_id: claimerUserId,
              full_name: rel.full_name,
              gender: rel.gender,
              photo_url: rel.photo_url,
              user_id: rel.user_id,
              is_self: false,
            }).select().single();

            if (newRel) {
              await supabaseAdmin.from('relationships').insert({
                owner_id: claimerUserId,
                person_id: claimerSelf.id,
                related_person_id: newRel.id,
                relationship_type: originalRel.relationship_type,
              });
              console.log(`  -> Synced ${originalRel.relationship_type}: ${rel.full_name}`);
            }
          }
        }
      }
    }
    console.log('  -> Claim processing complete.');
  }
  
  console.log('\nAll done!');
}

syncExistingClaims().catch(console.error);
