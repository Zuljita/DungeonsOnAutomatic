export interface Hex {
  q: number;
  r: number;
}

/** Convert axial hex coordinates to pixel coordinates (pointy-top orientation) */
export function axialToPixel(hex: Hex, size: number): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = size * 1.5 * hex.r;
  return { x, y };
}

/** Convert pixel coordinates to axial hex coordinates (pointy-top orientation) */
export function pixelToAxial(x: number, y: number, size: number): Hex {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = (2 / 3 * y) / size;
  return hexRound({ q, r });
}

/** Round fractional axial coordinates to nearest hex */
export function hexRound(h: Hex): Hex {
  let x = h.q;
  let z = h.r;
  let y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

/** Distance between two hexes */
export function hexDistance(a: Hex, b: Hex): number {
  return (
    Math.abs(a.q - b.q) +
    Math.abs(a.q + a.r - b.q - b.r) +
    Math.abs(a.r - b.r)
  ) / 2;
}

const DIRECTIONS: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Return neighbour in given direction (0-5) */
export function hexNeighbor(h: Hex, direction: number): Hex {
  const dir = DIRECTIONS[((direction % 6) + 6) % 6];
  return { q: h.q + dir.q, r: h.r + dir.r };
}

/** Return all neighbouring hexes */
export function hexNeighbors(h: Hex): Hex[] {
  return DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}
