import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const cliPath = fileURLToPath(new URL('../src/cli/index.ts', import.meta.url));
const fixturesDir = fileURLToPath(new URL('./fixtures', import.meta.url));

const spawnOpts = { encoding: 'utf-8', cwd: fixturesDir } as const;

describe('plugin cli', () => {
  it('lists plugins', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'plugins', 'list', '--json'], spawnOpts);
    expect(result.status).toBe(0);
    const arr = JSON.parse(result.stdout) as any[];
    const ids = arr.map((p) => p.metadata.id);
    expect(ids).toContain('test.valid');
  });

  it('shows plugin info', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'plugins', 'info', 'test.valid', '--json'], spawnOpts);
    expect(result.status).toBe(0);
    const info = JSON.parse(result.stdout);
    expect(info.metadata.id).toBe('test.valid');
  });

  it('validates plugin', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'plugins', 'validate', 'test.valid'], spawnOpts);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('valid');
  });

  it('doctor reports plugin issues', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', cliPath, 'plugins', 'doctor', '--json'], spawnOpts);
    expect(result.status).toBe(0);
    const arr = JSON.parse(result.stdout) as any[];
    const ok = arr.find((p) => p.id === 'test.valid');
    const bad = arr.find((p) => p.id === 'test.maliciousfs');
    expect(ok.status).toBe('ok');
    expect(bad.status).toBe('error');
  });
});
