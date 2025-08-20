import { describe, it, expect } from 'vitest';
import { buildDungeon } from '../src/services/assembler.js';
import { renderAscii, renderSvg } from '../src/services/render.js';

describe('renderAscii', () => {
  it('draws rooms, corridors, and doors', () => {
    const d = buildDungeon({ rooms: 2, seed: 'test' });
    expect(d.doors.length).toBe(d.corridors.length * 2);
    const ascii = renderAscii(d);
    expect(ascii).toMatch(/#/); // room borders
    expect(ascii).toMatch(/[.+#]/); // some map characters
    expect(ascii).toMatch(/D/); // door symbols
  });
});

describe('renderSvg', () => {
  it('includes door lines', async () => {
    const d = buildDungeon({ rooms: 2, seed: 'svgDoor' });
    const svg = await renderSvg(d);
    expect(svg).toMatch(/<line/);
  });
});
