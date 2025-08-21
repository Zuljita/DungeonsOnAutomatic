/**
 * Union-Find (Disjoint Set) data structure
 * Consolidates duplicate Union-Find algorithm implementations found in 4+ locations
 */

export class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array(size).fill(0);
  }

  /**
   * Find the root of the set containing x (with path compression)
   */
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  /**
   * Union two sets containing a and b (by rank)
   */
  union(a: number, b: number): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) {
      return false; // Already in the same set
    }

    // Union by rank
    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }

    return true; // Successfully united
  }

  /**
   * Check if two elements are in the same set
   */
  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  /**
   * Get the number of disjoint sets
   */
  getComponentCount(): number {
    const roots = new Set<number>();
    for (let i = 0; i < this.parent.length; i++) {
      roots.add(this.find(i));
    }
    return roots.size;
  }

  /**
   * Get all elements in the same set as the given element
   */
  getComponent(element: number): number[] {
    const root = this.find(element);
    const component: number[] = [];
    
    for (let i = 0; i < this.parent.length; i++) {
      if (this.find(i) === root) {
        component.push(i);
      }
    }
    
    return component;
  }
}

/**
 * Convenience functions for the simple Union-Find pattern used in existing code
 * These maintain compatibility with the existing inline implementations
 */

export interface SimpleUnionFind {
  find: (x: number) => number;
  union: (a: number, b: number) => void;
  connected: (a: number, b: number) => boolean;
}

/**
 * Create simple Union-Find functions matching the existing inline pattern
 * This allows for easy migration from the existing code
 */
export function createSimpleUnionFind(size: number): SimpleUnionFind {
  const parent = Array.from({ length: size }, (_, i) => i);
  
  const find = (x: number): number => {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]); // Path compression
    }
    return parent[x];
  };

  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };

  const connected = (a: number, b: number): boolean => {
    return find(a) === find(b);
  };

  return { find, union, connected };
}