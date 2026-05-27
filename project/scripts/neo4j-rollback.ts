import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI!;
const username = process.env.NEO4J_USERNAME!;
const password = process.env.NEO4J_PASSWORD!;

async function rollback() {
  console.log('⚠️  Neo4j Rollback — This will DELETE all nodes and relationships from Neo4j.');
  console.log('   Supabase data will NOT be affected.');
  console.log('');

  // Safety: require --confirm flag
  if (!process.argv.includes('--confirm')) {
    console.log('To proceed, run with --confirm flag:');
    console.log('  npx tsx scripts/neo4j-rollback.ts --confirm');
    process.exit(0);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  try {
    // Count before
    const countResult = await session.executeRead(tx => tx.run(
      'MATCH (n) RETURN count(n) AS nodeCount'
    ));
    const nodeCount = countResult.records[0]?.get('nodeCount')?.toNumber?.() ?? countResult.records[0]?.get('nodeCount') ?? 0;
    console.log(`Found ${nodeCount} nodes in Neo4j.`);

    if (nodeCount === 0) {
      console.log('Nothing to delete. Neo4j is already empty.');
      process.exit(0);
    }

    // Delete in batches to avoid memory issues on large graphs
    let deleted = 0;
    let batchSize = 500;
    while (true) {
      const result = await session.executeWrite(tx => tx.run(
        `MATCH (n)
         WITH n LIMIT $batchSize
         DETACH DELETE n
         RETURN count(*) AS deletedCount`,
        { batchSize: neo4j.int(batchSize) }
      ));
      const batchDeleted = result.records[0]?.get('deletedCount')?.toNumber?.() ?? 0;
      deleted += batchDeleted;
      console.log(`Deleted ${deleted} nodes so far...`);
      if (batchDeleted < batchSize) break;
    }

    console.log(`\n✅ Rollback complete. Deleted ${deleted} nodes (with all relationships).`);
    console.log('   Supabase data is untouched.');
    console.log('   To re-sync, run: npx tsx scripts/neo4j-migration.ts');
  } catch (err) {
    console.error('Rollback failed:', err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }

  process.exit(0);
}

rollback();
