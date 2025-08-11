import { describe, it, expect } from 'vitest';
import { buildDungeon } from '../src/services/assembler.js';
import { renderAscii } from '../src/services/render.js';

describe('renderAscii', () => {
  it('draws rooms and corridors', () => {
    const d = buildDungeon({ rooms: 2, seed: 'test' });
    const ascii = renderAscii(d);
    expect(ascii).toMatch(/#/); // room borders
    expect(ascii).toMatch(/[.+#]/); // some map characters
  });
});
