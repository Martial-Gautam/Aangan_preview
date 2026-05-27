import neo4j, { Driver } from 'neo4j-driver';

const uri = process.env.NEO4J_URI?.trim();
const username = process.env.NEO4J_USERNAME?.trim();
const password = process.env.NEO4J_PASSWORD?.trim();

let driver: Driver | undefined;
let connectivityCheck: Promise<void> | null = null;
let didLogMissingConfig = false;
let didLogConnectivityOk = false;
let didFailConnectivity = false;

function getMissingNeo4jConfig() {
  const missing: string[] = [];
  if (!uri) missing.push('NEO4J_URI');
  if (!username) missing.push('NEO4J_USERNAME');
  if (!password) missing.push('NEO4J_PASSWORD');
  return missing;
}

function verifyConnectivityOnce(currentDriver: Driver) {
  if (connectivityCheck) return;

  connectivityCheck = currentDriver
    .verifyConnectivity()
    .then(() => {
      didFailConnectivity = false;
      if (!didLogConnectivityOk) {
        console.info('[Neo4j] Connectivity verified.');
        didLogConnectivityOk = true;
      }
    })
    .catch(async (error: any) => {
      didFailConnectivity = true;
      const code = error?.code || 'UNKNOWN';
      const message = error?.message || 'No error message from driver';
      console.error(`[Neo4j] Connectivity check failed (${code}): ${message}`);

      if (driver === currentDriver) {
        try {
          await currentDriver.close();
        } catch {
          // noop
        }
        driver = undefined;
      }
    })
    .finally(() => {
      connectivityCheck = null;
    });
}

// Using a singleton to avoid exhausting connection pools in dev mode mappings
export function getNeo4jDriver(): Driver | null {
  // If neo4j is explicitly disabled or not configured, return null gracefully.
  if (process.env.NEXT_PUBLIC_ENABLE_NEO4J_COSMOS === 'false') {
    return null;
  }

  const missingConfig = getMissingNeo4jConfig();
  if (missingConfig.length > 0) {
    if (!didLogMissingConfig) {
      console.warn(
        `[Neo4j] Disabled: missing required env vars (${missingConfig.join(', ')}). Falling back to SQL APIs.`
      );
      didLogMissingConfig = true;
    }
    return null;
  }

  didLogMissingConfig = false;
  if (didFailConnectivity && !driver) {
    return null;
  }

  if (!driver) {
    try {
      driver = neo4j.driver(uri!, neo4j.auth.basic(username!, password!), {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      });
      verifyConnectivityOnce(driver);
    } catch (e) {
      console.warn('[Neo4j] Driver initialization failed:', e);
      return null;
    }
  }

  return driver;
}

export async function closeNeo4jDriver() {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}
