import { getNeo4jDriver } from './neo4j';

export interface Neo4jPerson {
  id: string;
  userId?: string | null;
  ownerId: string;
  isSelf: boolean;
  name: string;
  gender?: string;
  birthDate?: string;
  profileImage?: string;
  createdAt: string;
}

export interface Neo4jRelationship {
  id: string; // The supbase relationship id
  type: string; // MARRIED_TO, CHILD_OF, PARENT_OF, etc.
}

/**
 * Service to execute graph relationships.
 * If Neo4j is disabled or fails, everything returns null to gracefully fallback.
 */
export const Neo4jService = {
  /**
   * Sync a person node to Neo4j. Non-destructive. Uses MERGE to prevent duplicates.
   */
  async syncPerson(person: Neo4jPerson) {
    const driver = getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `
        MERGE (p:Person {id: $id})
        SET p.userId = $userId,
            p.ownerId = $ownerId,
            p.isSelf = $isSelf,
            p.name = $name,
            p.gender = $gender,
            p.birthDate = $birthDate,
            p.profileImage = $profileImage,
            p.createdAt = $createdAt
        RETURN p
        `,
          {
            id: person.id,
            userId: person.userId || null,
            ownerId: person.ownerId,
            isSelf: person.isSelf,
            name: person.name,
            gender: person.gender || null,
            birthDate: person.birthDate || null,
            profileImage: person.profileImage || null,
            createdAt: person.createdAt || new Date().toISOString(),
          }
        )
      );
    } catch (e) {
      console.error('Neo4j syncPerson error:', e);
    } finally {
      await session.close();
    }
  },

  /**
   * Connect two persons in Neo4j.
   */
  async syncRelationship(fromPersonId: string, toPersonId: string, relType: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      const cypherRelType = relType.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      
      // Dynamic relationship types require raw string construction but we use valid sanitize above
      await session.executeWrite((tx) =>
        tx.run(
          `
        MATCH (a:Person {id: $fromPersonId})
        MATCH (b:Person {id: $toPersonId})
        MERGE (a)-[r:${cypherRelType}]->(b)
        RETURN r
        `,
          { fromPersonId, toPersonId }
        )
      );
    } catch (e) {
      console.error('Neo4j syncRelationship error:', e);
    } finally {
      await session.close();
    }
  },

  /**
   * Get the family connected to the given userId (or personId).
   * Used to generate the Cosmos Tree without depending on insertion order.
   */
  async getFamilyTree(rootUserId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      // Get all connected nodes
      const nodeResult = await session.executeRead((tx) =>
        tx.run(
          `MATCH (root:Person {ownerId: $rootUserId, isSelf: true})
           OPTIONAL MATCH (root)-[*..10]-(b:Person)
           WITH root, collect(DISTINCT b) AS connected
           RETURN root, connected`,
          { rootUserId }
        )
      );
      if (nodeResult.records.length === 0) return null;
      const rootNode = nodeResult.records[0].get('root').properties;
      const connectedNodes = nodeResult.records[0].get('connected')
        .filter((n: any) => n !== null)
        .map((n: any) => n.properties);
      const allNodes = [rootNode, ...connectedNodes.filter((n: any) => n.id !== rootNode.id)];

      // Get all edges between these nodes
      const edgeResult = await session.executeRead((tx) =>
        tx.run(
          `MATCH (root:Person {ownerId: $rootUserId, isSelf: true})
           OPTIONAL MATCH (root)-[*..10]-(b:Person)
           WITH collect(DISTINCT root) + collect(DISTINCT b) AS allNodes
           UNWIND allNodes AS n
           OPTIONAL MATCH (n)-[r]->(m:Person)
           WHERE m IN allNodes
           RETURN n.id AS source, type(r) AS type, m.id AS target`,
          { rootUserId }
        )
      );
      const edges = edgeResult.records
        .filter((rec) => rec.get('type') !== null)
        .map((rec) => ({
          person_id: rec.get('source'),
          related_person_id: rec.get('target'),
          relationship_type: String(rec.get('type')).toLowerCase(),
        }));

      return {
        self_person_id: rootNode.id,
        nodes: allNodes.map((n: any) => ({
          ...n,
          full_name: n.name,
          date_of_birth: n.birthDate,
          photo_url: n.profileImage,
          user_id: n.userId,
          owner_id: n.ownerId,
          created_at: n.createdAt,
          is_self: n.isSelf,
        })),
        edges,
      };
    } catch (e) {
      console.error('Neo4j getFamilyTree error:', e);
      return null;
    } finally {
      await session.close();
    }
  },

  /**
   * Find shortest path between two people in graph
   */
  async getRelationPath(fromId: string, toId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
          MATCH p = shortestPath((a:Person {id: $fromId})-[*..15]-(b:Person {id: $toId}))
          RETURN p
          `,
          { fromId, toId }
        )
      );
      if (result.records.length === 0) return null;
      return result.records[0].get('p');
    } catch (e) {
      console.error('Neo4j getRelationPath error:', e);
      return null;
    } finally {
      await session.close();
    }
  },

  /**
   * Get degrees of separation
   */
  async getDegree(fromId: string, toId: string) {
    const path = await this.getRelationPath(fromId, toId);
    if (!path) return -1;
    return path.segments ? path.segments.length : 0;
  },

  /**
   * Sync a family node to Neo4j.
   */
  async syncFamily(family: { id: string; familyName: string; createdAt?: string }) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MERGE (f:Family {id: $id})
           SET f.familyName = $familyName,
               f.createdAt = $createdAt
           RETURN f`,
          {
            id: family.id,
            familyName: family.familyName,
            createdAt: family.createdAt || new Date().toISOString(),
          }
        )
      );
    } catch (e) {
      console.error('Neo4j syncFamily error:', e);
    } finally {
      await session.close();
    }
  },

  /**
   * Link a person to a family.
   */
  async addPersonToFamily(personId: string, familyId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (p:Person {id: $personId})
           MATCH (f:Family {id: $familyId})
           MERGE (p)-[:BELONGS_TO]->(f)
           RETURN p, f`,
          { personId, familyId }
        )
      );
    } catch (e) {
      console.error('Neo4j addPersonToFamily error:', e);
    } finally {
      await session.close();
    }
  },

  /**
   * Find common ancestors between two people.
   */
  async getCommonAncestors(personAId: string, personBId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `MATCH (a:Person {id: $personAId})
           MATCH (b:Person {id: $personBId})
           MATCH pathA = (a)-[:CHILD_OF|FATHER|MOTHER|PARENT_OF*1..10]->(ancestor:Person)
           MATCH pathB = (b)-[:CHILD_OF|FATHER|MOTHER|PARENT_OF*1..10]->(ancestor)
           RETURN DISTINCT ancestor.id AS id, ancestor.name AS name,
                  ancestor.gender AS gender, ancestor.profileImage AS profileImage,
                  length(pathA) AS distanceFromA, length(pathB) AS distanceFromB
           ORDER BY distanceFromA + distanceFromB ASC
           LIMIT 5`,
          { personAId, personBId }
        )
      );
      return result.records.map((rec) => ({
        id: rec.get('id'),
        name: rec.get('name'),
        gender: rec.get('gender'),
        profileImage: rec.get('profileImage'),
        distanceFromA: (rec.get('distanceFromA') as any)?.toNumber?.() ?? rec.get('distanceFromA'),
        distanceFromB: (rec.get('distanceFromB') as any)?.toNumber?.() ?? rec.get('distanceFromB'),
      }));
    } catch (e) {
      console.error('Neo4j getCommonAncestors error:', e);
      return null;
    } finally {
      await session.close();
    }
  },

  /**
   * Delete a person node and all its relationships.
   */
  async deletePerson(personId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (p:Person {id: $personId})
           DETACH DELETE p`,
          { personId }
        )
      );
    } catch (e) {
      console.error('Neo4j deletePerson error:', e);
    } finally {
      await session.close();
    }
  },
};
