import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { Neo4jService } from '../lib/neo4j-service';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('Starting Neo4j Migration...');

  const { data: people, error: peopleError } = await supabaseAdmin.from('people').select('*');
  
  if (peopleError) {
    console.error('Error fetching people:', peopleError);
    process.exit(1);
  }

  console.log(`Found ${people.length} people. Syncing to Neo4j...`);
  let syncedPeople = 0;
  for (const person of people) {
    await Neo4jService.syncPerson({
      id: person.id,
      userId: person.user_id,
      ownerId: person.owner_id,
      isSelf: person.is_self || false,
      name: person.full_name || 'Unknown',
      gender: person.gender,
      birthDate: person.date_of_birth,
      profileImage: person.photo_url,
      createdAt: person.created_at,
    });
    
    syncedPeople++;
    if (syncedPeople % 10 === 0) {
      console.log(`Synced ${syncedPeople} / ${people.length} people...`);
    }
  }

  const { data: rels, error: relError } = await supabaseAdmin.from('relationships').select('*');

  if (relError) {
    console.error('Error fetching relationships:', relError);
    process.exit(1);
  }

  console.log(`Found ${rels.length} relationships. Syncing to Neo4j...`);
  let syncedRels = 0;
  for (const rel of rels) {
    await Neo4jService.syncRelationship(rel.person_id, rel.related_person_id, rel.relationship_type);
    syncedRels++;
    if (syncedRels % 10 === 0) {
      console.log(`Synced ${syncedRels} / ${rels.length} relationships...`);
    }
  }

  console.log('Migration complete!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Unhandled migration error:', err);
  process.exit(1);
});
