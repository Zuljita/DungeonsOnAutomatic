import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const cliPath = fileURLToPath(new URL('../src/cli/index.ts', import.meta.url));

describe('cli', () => {
  it('accepts custom width and height', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'generate', '--rooms', '1', '--width', '30', '--height', '20', '--seed', 'cli'], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    const d = JSON.parse(result.stdout);
    const maxX = Math.max(...d.rooms.map((r: any) => r.x + r.w));
    const maxY = Math.max(...d.rooms.map((r: any) => r.y + r.h));
    expect(maxX).toBeLessThanOrEqual(30);
    expect(maxY).toBeLessThanOrEqual(20);
  });
});
