import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { PluginLoader } from '../src/services/plugin-loader.js';

const fixtures = path.resolve(__dirname, 'fixtures/plugins');

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeAll(async () => {
    loader = new PluginLoader([fixtures]);
    await loader.discover();
  });

  it('discovers valid plugins', () => {
    const ids = loader.getRegistry().map((p) => p.metadata.id);
    expect(ids).toContain('test.valid');
  });

  it('ignores malformed plugins', () => {
    const ids = loader.getRegistry().map((p) => p.metadata.id);
    expect(ids).not.toContain('doa-malformed');
  });

  it('loads plugin successfully with lifecycle', async () => {
    const plugin: any = await loader.load('test.valid');
    expect(plugin.id).toBe('test.valid');
    expect(plugin._state().initialized).toBe(true);
    await loader.unload('test.valid');
    expect(plugin._state().cleaned).toBe(true);
  });

  it('rejects incompatible plugins', async () => {
    await expect(loader.load('test.incompatible')).rejects.toThrow(/requires DOA version/);
  });

  it('rejects plugins with missing dependencies', async () => {
    await expect(loader.load('test.missingdep')).rejects.toThrow(/missing required system dependency/);
  });
});
