import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

import neo4j from 'neo4j-driver';

const CONSTRAINTS_AND_INDEXES = [
  {
    name: 'person_id_unique',
    query: 'CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
  },
  {
    name: 'person_userId_index',
    query: 'CREATE INDEX person_userId IF NOT EXISTS FOR (p:Person) ON (p.userId)',
  },
  {
    name: 'family_id_unique',
    query: 'CREATE CONSTRAINT family_id_unique IF NOT EXISTS FOR (f:Family) REQUIRE f.id IS UNIQUE',
  },
  {
    name: 'family_name_index',
    query: 'CREATE INDEX family_name IF NOT EXISTS FOR (f:Family) ON (f.familyName)',
  },
];

async function runSetup() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    console.error('Missing Neo4j environment variables (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD).');
    process.exit(1);
  }

  console.log(`Connecting to Neo4j at ${uri}...`);
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

  try {
    // Verify connectivity first
    await driver.verifyConnectivity();
    console.log('Connected to Neo4j successfully.\n');
  } catch (err) {
    console.error('Failed to connect to Neo4j:', err);
    await driver.close();
    process.exit(1);
  }

  const session = driver.session();
  let hasError = false;

  try {
    for (const item of CONSTRAINTS_AND_INDEXES) {
      try {
        console.log(`Creating: ${item.name}...`);
        await session.run(item.query);
        console.log(`  ✓ ${item.name} created (or already exists).\n`);
      } catch (e: any) {
        // Some Aura plans may not support certain constraint types
        console.warn(`  ⚠ Failed to create ${item.name}: ${e.message}\n`);
      }
    }

    console.log('Neo4j setup complete!');
  } catch (e) {
    console.error('Fatal error during setup:', e);
    hasError = true;
  } finally {
    await session.close();
    await driver.close();
  }

  process.exit(hasError ? 1 : 0);
}

runSetup().catch((err) => {
  console.error('Unhandled setup error:', err);
  process.exit(1);
});
