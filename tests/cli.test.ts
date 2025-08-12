import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { Dungeon } from '../src/core/types';

const cliPath = fileURLToPath(new URL('../src/cli/index.ts', import.meta.url));

describe('cli', () => {
  it('accepts custom width and height', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'generate', '--rooms', '1', '--width', '30', '--height', '20', '--seed', 'cli'], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    const d = JSON.parse(result.stdout) as Dungeon;
    const maxX = Math.max(...d.rooms.map((r) => r.x + r.w));
    const maxY = Math.max(...d.rooms.map((r) => r.y + r.h));
    expect(maxX).toBeLessThanOrEqual(30);
    expect(maxY).toBeLessThanOrEqual(20);
  });
});
