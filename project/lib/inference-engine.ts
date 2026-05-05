import { SupabaseClient } from '@supabase/supabase-js';

type Relationship = {
  person_id: string;
  related_person_id: string;
  relationship_type: string;
};

export async function runInferenceEngine(supabaseAdmin: SupabaseClient, ownerId: string, selfPersonId: string) {
  // 1. Fetch all relationships for this owner
  const { data: rels, error } = await supabaseAdmin
    .from('relationships')
    .select('person_id, related_person_id, relationship_type')
    .eq('owner_id', ownerId);

  if (error || !rels) {
    console.error('Inference Engine: Failed to fetch relationships', error);
    return;
  }

  // Build adjacency list
  const relMap = new Map<string, Relationship[]>();
  rels.forEach(r => {
    if (!relMap.has(r.person_id)) relMap.set(r.person_id, []);
    relMap.get(r.person_id)!.push(r);
  });

  const suggestions: Array<{from: string, to: string, type: string}> = [];
  const selfRels = relMap.get(selfPersonId) || [];

  // Rules
  selfRels.forEach(selfRel => {
    const relatedPersonId = selfRel.related_person_id;
    const theirRels = relMap.get(relatedPersonId) || [];

    // Rule 1: If self -> father AND father -> person = child => person is sibling of self
    if (selfRel.relationship_type === 'father' || selfRel.relationship_type === 'mother') {
      theirRels.forEach(theirRel => {
        if (theirRel.relationship_type === 'child' && theirRel.related_person_id !== selfPersonId) {
          suggestions.push({
            from: selfPersonId,
            to: theirRel.related_person_id,
            type: 'sibling'
          });
        }
        // Rule 2: If self -> father AND father -> person = spouse => person is step-mother of self (suggesting mother for simplicity)
        if (theirRel.relationship_type === 'spouse') {
          // If self->father, suggest mother. If self->mother, suggest father
          const suggestedParent = selfRel.relationship_type === 'father' ? 'mother' : 'father';
          suggestions.push({
            from: selfPersonId,
            to: theirRel.related_person_id,
            type: suggestedParent
          });
        }
      });
    }

    // Rule 3: If self -> sibling AND sibling -> person = child => person is nephew/niece (suggesting relative for simplicity or we can add new type)
    // For now, let's stick to core types: 'relative'
    if (selfRel.relationship_type === 'sibling') {
      theirRels.forEach(theirRel => {
        if (theirRel.relationship_type === 'child') {
          suggestions.push({
            from: selfPersonId,
            to: theirRel.related_person_id,
            type: 'relative' // Nephew/Niece
          });
        }
      });
    }

    // Rule 4: If self -> child AND self -> spouse => spouse is parent of child too
    // This is tricky: we want to say the child has another parent (the spouse)
    // Actually, the relation is from child to spouse as parent. But we model from self's perspective usually.
    // If we want to add child -> mother, it's person_id=child, related=spouse, type=mother.
    if (selfRel.relationship_type === 'child') {
      const spouses = selfRels.filter(r => r.relationship_type === 'spouse');
      spouses.forEach(spouseRel => {
        suggestions.push({
          from: selfRel.related_person_id, // The child
          to: spouseRel.related_person_id, // The spouse
          type: 'parent' // We don't know gender easily here without joining people table, so maybe just 'relative' or 'parent'
        });
      });
    }
  });

  // 2. Filter out suggestions that already exist as relationships
  const validSuggestions = suggestions.filter(s => {
    // Avoid self loops
    if (s.from === s.to) return false;
    // Check if relationship already exists
    const existing = rels.find(r => r.person_id === s.from && r.related_person_id === s.to);
    return !existing;
  });

  // 3. Insert into suggested_relationships
  for (const s of validSuggestions) {
    // Check if already suggested
    const { data: existingSuggestion } = await supabaseAdmin
      .from('suggested_relationships')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('from_person_id', s.from)
      .eq('to_person_id', s.to)
      .maybeSingle();

    if (!existingSuggestion) {
      await supabaseAdmin.from('suggested_relationships').insert({
        owner_id: ownerId,
        from_person_id: s.from,
        to_person_id: s.to,
        suggested_type: s.type,
      });
    }
  }
}
