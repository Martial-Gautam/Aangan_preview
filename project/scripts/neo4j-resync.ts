import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

import neo4j from 'neo4j-driver';
import { createClient } from '@supabase/supabase-js';

const uri = process.env.NEO4J_URI!;
const username = process.env.NEO4J_USERNAME!;
const password = process.env.NEO4J_PASSWORD!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resync() {
  console.log('🔄 Neo4j Re-Sync — Clearing graph and re-importing from Supabase.');
  console.log('');

  if (!process.argv.includes('--confirm')) {
    console.log('To proceed, run with --confirm flag:');
    console.log('  npx tsx scripts/neo4j-resync.ts --confirm');
    process.exit(0);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

  // Phase 1: Clear Neo4j
  console.log('Phase 1: Clearing Neo4j...');
  const clearSession = driver.session();
  try {
    let cleared = 0;
    while (true) {
      const result = await clearSession.executeWrite(tx => tx.run(
        'MATCH (n) WITH n LIMIT 500 DETACH DELETE n RETURN count(*) AS c'
      ));
      const c = result.records[0]?.get('c')?.toNumber?.() ?? 0;
      cleared += c;
      if (c < 500) break;
    }
    console.log(`  Cleared ${cleared} nodes.`);
  } finally {
    await clearSession.close();
  }

  // Phase 2: Create constraints/indexes
  console.log('Phase 2: Creating constraints and indexes...');
  const setupSession = driver.session();
  try {
    const statements = [
      'CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
      'CREATE INDEX person_userId IF NOT EXISTS FOR (p:Person) ON (p.userId)',
      'CREATE CONSTRAINT family_id_unique IF NOT EXISTS FOR (f:Family) REQUIRE f.id IS UNIQUE',
      'CREATE INDEX family_name IF NOT EXISTS FOR (f:Family) ON (f.familyName)',
    ];
    for (const stmt of statements) {
      try {
        await setupSession.run(stmt);
        console.log(`  ✅ ${stmt.substring(0, 60)}...`);
      } catch (e: any) {
        console.warn(`  ⚠️  Skipped: ${e.message?.substring(0, 80)}`);
      }
    }
  } finally {
    await setupSession.close();
  }

  // Phase 3: Import people
  console.log('Phase 3: Importing people from Supabase...');
  const { data: people, error: peopleError } = await supabaseAdmin.from('people').select('*');
  if (peopleError || !people) {
    console.error('Failed to fetch people:', peopleError);
    await driver.close();
    process.exit(1);
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < people.length; i += BATCH_SIZE) {
    const batch = people.slice(i, i + BATCH_SIZE);
    const personSession = driver.session();
    try {
      await personSession.executeWrite(async (tx) => {
        for (const person of batch) {
          await tx.run(
            `MERGE (p:Person {id: $id})
             SET p.userId = $userId, p.name = $name, p.gender = $gender,
                 p.birthDate = $birthDate, p.profileImage = $profileImage,
                 p.createdAt = $createdAt`,
            {
              id: person.id,
              userId: person.owner_id || null,
              name: person.full_name || 'Unknown',
              gender: person.gender || null,
              birthDate: person.date_of_birth || null,
              profileImage: person.photo_url || null,
              createdAt: person.created_at || new Date().toISOString(),
            }
          );
        }
      });
    } finally {
      await personSession.close();
    }
    console.log(`  People: ${Math.min(i + BATCH_SIZE, people.length)} / ${people.length}`);
  }

  // Phase 4: Import relationships
  console.log('Phase 4: Importing relationships from Supabase...');
  const { data: rels, error: relError } = await supabaseAdmin.from('relationships').select('*');
  if (relError || !rels) {
    console.error('Failed to fetch relationships:', relError);
    await driver.close();
    process.exit(1);
  }

  for (let i = 0; i < rels.length; i += BATCH_SIZE) {
    const batch = rels.slice(i, i + BATCH_SIZE);
    const relSession = driver.session();
    try {
      for (const rel of batch) {
        const relType = (rel.relationship_type || 'RELATED_TO').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        await relSession.executeWrite(tx => tx.run(
          `MATCH (a:Person {id: $from})
           MATCH (b:Person {id: $to})
           MERGE (a)-[:${relType}]->(b)`,
          { from: rel.person_id, to: rel.related_person_id }
        ));
      }
    } finally {
      await relSession.close();
    }
    console.log(`  Relationships: ${Math.min(i + BATCH_SIZE, rels.length)} / ${rels.length}`);
  }

  console.log(`\n✅ Re-sync complete!`);
  console.log(`   ${people.length} people and ${rels.length} relationships imported.`);

  await driver.close();
  process.exit(0);
}

resync().catch(err => {
  console.error('Unhandled resync error:', err);
  process.exit(1);
});
