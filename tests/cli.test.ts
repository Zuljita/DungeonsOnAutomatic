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

  it('generates using advanced layout type when provided', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', cliPath, 'generate', '--rooms', '1', '--layout-type', 'square', '--seed', 'cli'],
      { encoding: 'utf-8' }
    );
    expect(result.status).toBe(0);
    const d = JSON.parse(result.stdout) as Dungeon;
    expect(Array.isArray(d.rooms)).toBe(true);
    expect(d.rooms.length).toBeGreaterThan(0);
  });

  it('accepts advanced map configuration options', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        cliPath,
        'generate',
        '--rooms',
        '1',
        '--room-layout',
        'dense',
        '--room-shape',
        'circular-preference',
        '--corridor-type',
        'maze',
        '--corridor-width',
        '2',
        '--seed',
        'cli',
      ],
      { encoding: 'utf-8' },
    );
    expect(result.status).toBe(0);
    const d = JSON.parse(result.stdout) as Dungeon;
    expect(Array.isArray(d.rooms)).toBe(true);
  });

  it('falls back to generic system when unknown system specified', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'generate', '--rooms', '1', '--system', 'bogus'], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Unknown system');
    const d = JSON.parse(result.stdout) as Dungeon;
    // ensure dungeon structure is still returned
    expect(Array.isArray(d.rooms)).toBe(true);
  });

  it('applies theme and tag filters', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        cliPath,
        'generate',
        '--rooms',
        '1',
        '--seed',
        'seed1',
        '--theme',
        'generic-undead',
        '--monster-tag',
        'undead',
        '--trap-tag',
        'mechanical',
        '--treasure-tag',
        'coins',
      ],
      { encoding: 'utf-8' },
    );
    expect(result.status).toBe(0);
    const d = JSON.parse(result.stdout) as Dungeon;
    const room = d.rooms[0];
    expect(room.tags).toContain('undead');
    const enc = d.encounters?.[room.id];
    expect(enc?.monsters.every((m) => m.tags?.includes('undead'))).toBe(true);
    expect(enc?.traps.every((t) => t.tags?.includes('mechanical'))).toBe(true);
    expect(enc?.treasure.every((t) => t.tags?.includes('coins'))).toBe(true);
  });

  it('allows controlling lock generation via CLI', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        cliPath,
        'generate',
        '--rooms',
        '2',
        '--seed',
        'cli',
        '--system',
        'dfrpg',
        '--lock-percentage',
        '1',
      ],
      { encoding: 'utf-8' },
    );
    expect(result.status).toBe(0);
    const d = JSON.parse(result.stdout) as Dungeon;
    // With 100% lock percentage, all lockable doors should be locked
    // (arches can't be locked, so we filter them out)
    const lockableDoors = d.doors.filter(door => door.type !== 'arch');
    expect(lockableDoors.every((door) => door.status === 'locked')).toBe(true);
    expect(lockableDoors.length).toBeGreaterThan(0); // Ensure we have at least one lockable door
  });

  it('supports hand-drawn svg output', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        cliPath,
        'generate',
        '--rooms',
        '1',
        '--seed',
        'cli',
        '--svg',
        '--map-style',
        'hand-drawn',
        '--palette',
        'sepia',
        '--texture',
        'paper',
      ],
      { encoding: 'utf-8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/font-family="cursive"/);
  });

  it('supports hex SVG map style', async () => {
    const result = spawnSync(
      'pnpm',
      [
        'tsx',
        cliPath,
        'generate',
        '--rooms',
        '1',
        '--seed',
        'cli',
        '--svg',
        '--map-style',
        'hex',
      ],
      { encoding: 'utf-8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/class="hex-cell"/);
  });
});

