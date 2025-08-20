import { describe, it, expect } from 'vitest';
import { axialToPixel, pixelToAxial, hexDistance, hexNeighbor } from '../src/services/hex-grid';

describe('hex-grid utilities', () => {
  it('converts axial to pixel and back', () => {
    const h = { q: 2, r: -1 };
    const size = 10;
    const px = axialToPixel(h, size);
    const h2 = pixelToAxial(px.x, px.y, size);
    expect(h2.q).toBe(h.q);
    expect(h2.r).toBe(h.r);
  });

  it('computes hex distance', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 2, r: -1 };
    expect(hexDistance(a, b)).toBe(2);
  });

  it('finds neighboring hex', () => {
    const h = { q: 0, r: 0 };
    const n = hexNeighbor(h, 0);
    expect(n).toEqual({ q: 1, r: 0 });
  });
});
