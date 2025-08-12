export function rng(seed: string): () => number {
  // Mulberry32 PRNG
  let h = 1779033703 ^ seed.split('').reduce((a,c) => (a*33) ^ c.charCodeAt(0), 5381);
  return function() {
    h |= 0; h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

export function id(prefix = 'id', r: () => number = Math.random): string {
  return `${prefix}-${r().toString(36).slice(2, 10)}`;
}
