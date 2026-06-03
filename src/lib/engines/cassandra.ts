/**
 * Mini Cassandra simulator — cluster with a partition ring.
 * Ported from DBs/cassandra-engine.js (window.CassandraSim) to an ES module.
 * Behavior is intentionally identical; only types and exports were added.
 *
 * - N nodes in a ring (default 5)
 * - Each node "owns" a range of the hash space
 * - A partition key is hashed → falls into the owner node
 * - With replication factor RF, the row is also copied
 *   to the next RF-1 nodes clockwise
 * - Supports a simple table with (partition_key, clustering_key)
 */

export type CassandraValue = string | number | boolean | null;
export type CassandraRow = Record<string, CassandraValue>;

/** An internal stored row that always carries the two key columns. */
export interface StoredRow extends CassandraRow {
  _partition: string;
  _clustering: number;
}

export interface CassandraNode {
  id: string;
  label: string;
  /** [min, max] hash range (inclusive). */
  range: [number, number];
  /** Map<partitionKey, StoredRow[]> — rows ordered by clustering key. */
  partitions: Map<string, StoredRow[]>;
}

export type CassandraEventType = "insert" | "read";

export interface CassandraEvent {
  type: CassandraEventType;
  partitionKey: string;
  clusteringKey?: number;
  /** Replica node indices (only on insert). */
  replicas?: number[];
  /** Owner node index (only on read). */
  owner?: number;
  at: number;
}

export interface SelectOptions {
  limit?: number;
}

// ---------------------------------------------------------------------------
// Hash
// ---------------------------------------------------------------------------

/**
 * FNV-1a 32-bit hash — deterministic, same as the original JS implementation.
 * Returns a value in [0, 0xFFFFFFFF].
 */
export function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Cluster
// ---------------------------------------------------------------------------

export interface ClusterOptions {
  nodes?: number;
  rf?: number;
}

export class Cluster {
  readonly rf: number;
  readonly nodes: CassandraNode[];
  events: CassandraEvent[];

  constructor({ nodes = 5, rf = 3 }: ClusterOptions = {}) {
    this.rf = rf;
    this.events = [];
    this.nodes = Array.from({ length: nodes }, (_, i) => ({
      id: `node-${i + 1}`,
      label: `Node ${i + 1}`,
      range: [
        Math.floor((0xffffffff * i) / nodes),
        Math.floor((0xffffffff * (i + 1)) / nodes) - 1,
      ] as [number, number],
      partitions: new Map<string, StoredRow[]>(),
    }));
  }

  /** Returns the index of the node that owns the given partition key. */
  ownerIndex(partitionKey: string): number {
    const h = hash32(String(partitionKey));
    const idx = this.nodes.findIndex(
      (n) => h >= n.range[0] && h <= n.range[1],
    );
    return idx >= 0 ? idx : 0;
  }

  /**
   * Returns the RF replica node indices for the partition key.
   * Index 0 is always the owner; the rest are clockwise neighbours.
   */
  replicaIndices(partitionKey: string): number[] {
    const owner = this.ownerIndex(partitionKey);
    const out: number[] = [];
    for (let i = 0; i < this.rf; i++) {
      out.push((owner + i) % this.nodes.length);
    }
    return out;
  }

  /**
   * Inserts (or replaces) a row identified by `partitionKey` + `clusteringKey`.
   * Writes to all RF replicas and sorts each partition by clustering key.
   */
  insert(
    partitionKey: string,
    clusteringKey: number,
    row: CassandraRow,
  ): void {
    const replicas = this.replicaIndices(partitionKey);
    for (const idx of replicas) {
      const node = this.nodes[idx]!;
      if (!node.partitions.has(partitionKey)) {
        node.partitions.set(partitionKey, []);
      }
      const arr = node.partitions.get(partitionKey)!;
      const stored: StoredRow = {
        _partition: partitionKey,
        _clustering: clusteringKey,
        ...row,
      };
      const existing = arr.findIndex((r) => r._clustering === clusteringKey);
      if (existing >= 0) {
        arr[existing] = stored;
      } else {
        arr.push(stored);
      }
      // Keep sorted by clustering key
      arr.sort((a, b) =>
        a._clustering < b._clustering
          ? -1
          : a._clustering > b._clustering
            ? 1
            : 0,
      );
    }
    this.events.push({
      type: "insert",
      partitionKey,
      clusteringKey,
      replicas,
      at: Date.now(),
    });
  }

  /**
   * Reads all rows for a partition key from the owner node.
   * Applies an optional row limit.
   */
  selectPartition(
    partitionKey: string,
    { limit }: SelectOptions = {},
  ): StoredRow[] {
    const owner = this.ownerIndex(partitionKey);
    const node = this.nodes[owner]!;
    const rows = node.partitions.get(partitionKey) ?? [];
    this.events.push({ type: "read", partitionKey, owner, at: Date.now() });
    return limit ? rows.slice(0, limit) : [...rows];
  }

  /** Returns the total number of unique logical rows across all nodes. */
  totalRows(): number {
    let n = 0;
    const seen = new Set<string>();
    for (const node of this.nodes) {
      for (const [pk, rows] of node.partitions.entries()) {
        for (const r of rows) {
          const k = `${pk}|${r._clustering}`;
          if (!seen.has(k)) {
            seen.add(k);
            n++;
          }
        }
      }
    }
    return n;
  }

  /** Clears all data and events. */
  reset(): void {
    this.events = [];
    for (const node of this.nodes) {
      node.partitions.clear();
    }
  }
}
