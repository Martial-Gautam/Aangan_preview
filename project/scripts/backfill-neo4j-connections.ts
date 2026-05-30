/**
 * Backfill Neo4j CONNECTED_TO edges from existing Supabase user_connections.
 *
 * Run once after deploying the Neo4j cross-tree support:
 *   npx ts-node --skip-project scripts/backfill-neo4j-connections.ts
 *
 * Or with tsx:
 *   npx tsx scripts/backfill-neo4j-connections.ts
 *
 * Requires .env to be loaded with NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD,
 * NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import neo4j from 'neo4j-driver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPass = process.env.NEO4J_PASSWORD;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}
if (!neo4jUri || !neo4jUser || !neo4jPass) {
  console.error('Missing NEO4J env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPass));

async function backfill() {
  console.log('🔄 Fetching user_connections from Supabase...');

  const { data: connections, error } = await supabase
    .from('user_connections')
    .select('user_id_1, user_id_2')
    .eq('status', 'active');

  if (error) {
    console.error('Failed to fetch user_connections:', error);
    process.exit(1);
  }

  console.log(`Found ${connections?.length || 0} active user_connections.`);

  if (!connections || connections.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const session = driver.session();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const conn of connections) {
    try {
      const result = await session.executeWrite((tx) =>
        tx.run(
          `MATCH (a:Person {ownerId: $userId1, isSelf: true})
           MATCH (b:Person {ownerId: $userId2, isSelf: true})
           MERGE (a)-[:CONNECTED_TO]->(b)
           MERGE (b)-[:CONNECTED_TO]->(a)
           RETURN a.id AS aid, b.id AS bid`,
          { userId1: conn.user_id_1, userId2: conn.user_id_2 }
        )
      );

      if (result.records.length > 0) {
        created++;
        console.log(`  ✅ Connected ${conn.user_id_1} <-> ${conn.user_id_2}`);
      } else {
        skipped++;
        console.log(`  ⏭️  Skipped ${conn.user_id_1} <-> ${conn.user_id_2} (root nodes not found in Neo4j)`);
      }
    } catch (e: any) {
      failed++;
      console.error(`  ❌ Failed ${conn.user_id_1} <-> ${conn.user_id_2}:`, e.message);
    }
  }

  await session.close();

  console.log('\n📊 Backfill Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped} (root nodes not in Neo4j)`);
  console.log(`  Failed:  ${failed}`);
}

// Also backfill claimed person nodes
async function backfillClaims() {
  console.log('\n🔄 Backfilling claimed person nodes...');

  const { data: claimed, error } = await supabase
    .from('people')
    .select('id, user_id')
    .not('user_id', 'is', null);

  if (error) {
    console.error('Failed to fetch claimed people:', error);
    return;
  }

  console.log(`Found ${claimed?.length || 0} claimed person nodes.`);

  if (!claimed || claimed.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const session = driver.session();
  let updated = 0;
  let skipped = 0;

  for (const person of claimed) {
    try {
      const result = await session.executeWrite((tx) =>
        tx.run(
          `MATCH (p:Person {id: $personId})
           SET p.userId = $userId
           RETURN p.id AS id`,
          { personId: person.id, userId: person.user_id }
        )
      );

      if (result.records.length > 0) {
        updated++;
      } else {
        skipped++;
      }
    } catch (e: any) {
      console.error(`  ❌ Failed to update person ${person.id}:`, e.message);
    }
  }

  await session.close();

  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped} (not found in Neo4j)`);
}

async function main() {
  try {
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected.\n');

    await backfill();
    await backfillClaims();

    console.log('\n✅ Backfill complete!');
  } catch (e) {
    console.error('Backfill failed:', e);
  } finally {
    await driver.close();
  }
}

main();
