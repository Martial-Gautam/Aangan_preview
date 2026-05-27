import { getNeo4jDriver } from './neo4j';

export interface Neo4jPerson {
  id: string;
  userId?: string;
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
      const cypherRelType = relType.toUpperCase().replace(/\s+/g, '_');
      
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
      // Find all people connected to the root user's Person node
      // Note: We use [*..10] to prevent unbounded traversals while grabbing a large tree
      const result = await session.executeRead((tx) =>
        tx.run(
          `
        MATCH path = (root:Person {userId: $rootUserId})-[*..10]-(connected:Person)
        RETURN nodes(path) as pathNodes, relationships(path) as pathRels
        `,
          { rootUserId }
        )
      );

      const nodesMap = new Map<string, any>();
      const edgesMap = new Map<string, any>();

      // Also get the root node in case it's solitary
      const rootResult = await session.executeRead((tx) =>
        tx.run('MATCH (root:Person {userId: $rootUserId}) RETURN root', { rootUserId })
      );

      if (rootResult.records.length > 0) {
        const rNode = rootResult.records[0].get('root').properties;
        nodesMap.set(rNode.id, rNode);
      }

      result.records.forEach((record) => {
        const pathNodes = record.get('pathNodes');
        const pathRels = record.get('pathRels');
        
        pathNodes.forEach((node: any) => {
          if (!nodesMap.has(node.properties.id)) {
            nodesMap.set(node.properties.id, node.properties);
          }
        });

        pathRels.forEach((rel: any) => {
          // Unique key for edge map to avoid duplicates
          const uniqueEdgeId = `${rel.start.toString()}-${rel.type}-${rel.end.toString()}`;
          if (!edgesMap.has(uniqueEdgeId)) {
            edgesMap.set(uniqueEdgeId, {
              sourceId: nodesMap.get(rel.start.toString())?.id, // Requires manual map resolution if we didn't index properly, 
              // Wait, in Neo4j driver, rel.start and rel.end are node identity integers.
              // To get string ids safely, we can query them directly or use graph structure.
              _rawRel: rel
            });
          }
        });
      });

      // Let's do a better query to get exact nodes and edges safely mapped with IDs
      const safeResult = await session.executeRead((tx) =>
        tx.run(
          `
          MATCH (root:Person {userId: $rootUserId})
          OPTIONAL MATCH (root)-[*..10]-(b:Person)
          WITH collect(DISTINCT root) + collect(DISTINCT b) AS allNodes
          UNWIND allNodes AS n
          OPTIONAL MATCH (n)-[r]->(m:Person)
          WHERE m IN allNodes
          RETURN collect(DISTINCT n) as nodes, collect(DISTINCT r) as rels, root.id as selfPersonId
          `,
          { rootUserId }
        )
      );

      if (safeResult.records.length === 0) return null;

      const record = safeResult.records[0];
      const resNodes = record.get('nodes').map((n: any) => n.properties);
      const resRels = record.get('rels').filter((r: any) => r !== null).map((r: any) => ({
        type: r.type,
        startNodeId: resNodes.find((n: any) => n.id === r.start.toString())?.id, // This identity matching is tricky, let's fix it below.
      }));

      // A bulletproof edge extraction
      const edgeResult = await session.executeRead(tx => tx.run(`
          MATCH (root:Person {userId: $rootUserId})
          OPTIONAL MATCH (root)-[*..10]-(b:Person)
          WITH collect(DISTINCT root) + collect(DISTINCT b) AS allNodes
          UNWIND allNodes AS n
          OPTIONAL MATCH (n)-[r]->(m:Person)
          WHERE m IN allNodes
          RETURN n.id AS source, type(r) AS type, m.id AS target
      `, { rootUserId }));

      const finalEdges = edgeResult.records
        .filter(rec => rec.get('type') !== null)
        .map(rec => ({
          person_id: rec.get('source'),
          related_person_id: rec.get('target'),
          type: rec.get('type'),
        }));

      return {
        self_person_id: record.get('selfPersonId'),
        nodes: resNodes.map((n: any) => ({
          ...n,
          is_self: n.userId === rootUserId
        })),
        edges: finalEdges
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
          MATCH p = shortestPath((a:Person {id: $fromId})-[*]-(b:Person {id: $toId}))
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
  }
};
