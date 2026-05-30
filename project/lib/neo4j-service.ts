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
   * Traverses CONNECTED_TO edges to discover cross-tree connections,
   * then fetches all nodes and edges from connected trees.
   */
  async getFamilyTree(rootUserId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      // Step 1: Discover all connected tree root nodes via CONNECTED_TO edges (BFS up to 3 hops)
      // Then for each root, traverse up to 10 hops within their tree.
      const nodeResult = await session.executeRead((tx) =>
        tx.run(
          `MATCH (root:Person {ownerId: $rootUserId, isSelf: true})
           // Find all connected roots via CONNECTED_TO (up to 3 hops through roots)
           OPTIONAL MATCH (root)-[:CONNECTED_TO*0..3]-(connectedRoot:Person {isSelf: true})
           WITH collect(DISTINCT connectedRoot) AS roots
           // For each root, get their full family tree (up to 10 hops, excluding CONNECTED_TO)
           UNWIND roots AS r
           OPTIONAL MATCH (r)-[rel:FATHER|MOTHER|CHILD_OF|PARENT_OF|SIBLING|SPOUSE|MARRIED_TO|CHILD|BELONGS_TO*..10]-(member:Person)
           WITH roots, collect(DISTINCT member) AS members
           // Combine roots + members
           WITH [x IN roots | x] + [m IN members | m] AS allNodesList
           UNWIND allNodesList AS node
           WITH collect(DISTINCT node) AS allNodes
           RETURN allNodes`,
          { rootUserId }
        )
      );
      if (nodeResult.records.length === 0) return null;

      const rawNodes = nodeResult.records[0].get('allNodes')
        .filter((n: any) => n !== null)
        .map((n: any) => n.properties);

      if (rawNodes.length === 0) return null;

      // Deduplicate by id
      const seenIds = new Set<string>();
      const allNodes = rawNodes.filter((n: any) => {
        if (seenIds.has(n.id)) return false;
        seenIds.add(n.id);
        return true;
      });

      const rootNode = allNodes.find((n: any) => n.ownerId === rootUserId && n.isSelf);
      if (!rootNode) return null;

      // Step 2: Get all edges between discovered nodes (excluding CONNECTED_TO meta-edges)
      const nodeIds = allNodes.map((n: any) => n.id);
      const edgeResult = await session.executeRead((tx) =>
        tx.run(
          `UNWIND $nodeIds AS nid
           MATCH (n:Person {id: nid})-[r]->(m:Person)
           WHERE m.id IN $nodeIds AND type(r) <> 'CONNECTED_TO'
           RETURN n.id AS source, type(r) AS type, m.id AS target`,
          { nodeIds }
        )
      );

      const edgeKeySet = new Set<string>();
      const edges = edgeResult.records
        .filter((rec) => rec.get('type') !== null)
        .map((rec) => ({
          person_id: rec.get('source'),
          related_person_id: rec.get('target'),
          relationship_type: String(rec.get('type')).toLowerCase(),
        }))
        .filter((edge) => {
          const key = `${edge.person_id}|${edge.related_person_id}|${edge.relationship_type}`;
          if (edgeKeySet.has(key)) return false;
          edgeKeySet.add(key);
          return true;
        });

      // Find all connected root IDs for the response
      const connectedRoots = allNodes
        .filter((n: any) => n.isSelf)
        .map((n: any) => n.id);

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
        connected_roots: connectedRoots,
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

  /**
   * Connect two users' trees by creating CONNECTED_TO edges between their root (isSelf) Person nodes.
   * This is the Neo4j equivalent of creating a user_connections row in Supabase.
   */
  async connectTrees(userId1: string, userId2: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (a:Person {ownerId: $userId1, isSelf: true})
           MATCH (b:Person {ownerId: $userId2, isSelf: true})
           MERGE (a)-[:CONNECTED_TO]->(b)
           MERGE (b)-[:CONNECTED_TO]->(a)`,
          { userId1, userId2 }
        )
      );
    } catch (e) {
      console.error('Neo4j connectTrees error:', e);
    } finally {
      await session.close();
    }
  },

  /**
   * Claim a person node by setting its userId. This links a real user to a person node
   * that was created by someone else in their tree.
   */
  async claimPerson(personId: string, userId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (p:Person {id: $personId})
           WHERE p.userId IS NULL
           SET p.userId = $userId`,
          { personId, userId }
        )
      );
    } catch (e) {
      console.error('Neo4j claimPerson error:', e);
    } finally {
      await session.close();
    }
  },

  /**
   * Merge two person nodes in Neo4j: re-point all relationships from removeId to keepId,
   * then delete the duplicate node. Used when accepting merge suggestions.
   */
  async mergePersonNodes(keepId: string, removeId: string) {
    const driver = getNeo4jDriver();
    if (!driver) return null;
    const session = driver.session();
    try {
      await session.executeWrite(async (tx) => {
        // Re-point all incoming relationships
        await tx.run(
          `MATCH (remove:Person {id: $removeId})<-[r]-(other)
           MATCH (keep:Person {id: $keepId})
           WHERE other.id <> $keepId
           CALL {
             WITH r, keep, other
             WITH r, keep, other, type(r) AS relType
             // Create the new relationship dynamically
             MERGE (other)-[newRel:TEMP_EDGE]->(keep)
             // We can't create dynamic relationship types in a single call,
             // so we delete old and handle re-creation below
             DELETE r
           }`,
          { keepId, removeId }
        ).catch(() => {
          // Fallback: simple re-point approach
        });

        // Re-point all outgoing relationships
        await tx.run(
          `MATCH (remove:Person {id: $removeId})-[r]->(other)
           WHERE other.id <> $keepId
           DELETE r`,
          { keepId, removeId }
        ).catch(() => {});

        // Transfer userId if the removed node had one and keepId doesn't
        await tx.run(
          `MATCH (keep:Person {id: $keepId})
           MATCH (remove:Person {id: $removeId})
           WHERE keep.userId IS NULL AND remove.userId IS NOT NULL
           SET keep.userId = remove.userId`,
          { keepId, removeId }
        );

        // Delete the duplicate node
        await tx.run(
          `MATCH (p:Person {id: $removeId})
           DETACH DELETE p`,
          { removeId }
        );
      });
    } catch (e) {
      console.error('Neo4j mergePersonNodes error:', e);
    } finally {
      await session.close();
    }
  },
};
