import { promises as fs } from 'node:fs';
import { Script, createContext } from 'node:vm';
import path from 'node:path';
import type { BasePlugin, PluginType } from '../core/plugin-types';

/** Static analysis for forbidden patterns in plugin code */
export async function analyzePluginCode(filePath: string, maxFileSize = 1024 * 1024): Promise<void> {
  const stat = await fs.stat(filePath);
  if (stat.size > maxFileSize) {
    throw new Error(`Plugin file ${filePath} exceeds max size of ${maxFileSize} bytes`);
  }
  const code = await fs.readFile(filePath, 'utf-8');
  const forbidden: RegExp[] = [
    /\bimport\s+.*['"]node:fs['"]/,
    /\brequire\(['"]fs['"]\)/,
    /\bimport\s+.*['"]node:child_process['"]/,
    /\brequire\(['"]child_process['"]\)/,
    /process\./,
    /eval\(/,
    /Function\(/,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(code)) {
      throw new Error(`Forbidden API usage detected in ${path.basename(filePath)}`);
    }
  }
  if (/\bimport\s+.+\s+from\s+['"].+['"]/.test(code)) {
    throw new Error(`Imports are not allowed in plugin files: ${path.basename(filePath)}`);
  }
}

export interface SandboxOptions {
  timeout?: number;
}

/** Load plugin code into sandboxed context using CommonJS-style transformation */
export async function loadPluginSandboxed(filePath: string, options: SandboxOptions = {}): Promise<BasePlugin> {
  const code = await fs.readFile(filePath, 'utf-8');
  const transformed = code.replace(/export\s+default/, 'module.exports =');
  const contextObj = {
    module: { exports: {} as any },
    exports: {},
    console: { log: console.log, warn: console.warn, error: console.error },
    setTimeout,
    clearTimeout,
    Math,
  } as Record<string, any>;
  const context = createContext(contextObj);
  const script = new Script(transformed, { filename: filePath });
  script.runInContext(context, { timeout: options.timeout ?? 3000 });
  const exported = context.module.exports;
  if (!exported) {
    throw new Error('Plugin did not export a default module');
  }
  (exported as any).__context = context;
  return exported as BasePlugin;
}

/** Validate plugin capabilities against declared type */
export function validatePluginCapabilities(plugin: BasePlugin, type: PluginType): void {
  switch (type) {
    case 'system':
      if (typeof (plugin as any).enrich !== 'function') {
        throw new Error(`Plugin ${plugin.metadata?.id} missing required capability "enrich" for type system`);
      }
      break;
    case 'export':
      if (!Array.isArray((plugin as any).supportedFormats) || typeof (plugin as any).export !== 'function') {
        throw new Error(`Plugin ${plugin.metadata?.id} missing required export capabilities`);
      }
      break;
    case 'room-generator':
      if (typeof (plugin as any).generateRooms !== 'function') {
        throw new Error(`Plugin ${plugin.metadata?.id} missing required capability "generateRooms"`);
      }
      break;
    case 'encounter':
      if (typeof (plugin as any).generateEncounter !== 'function') {
        throw new Error(`Plugin ${plugin.metadata?.id} missing required capability "generateEncounter"`);
      }
      break;
    case 'room-shape':
      if (typeof (plugin as any).generateShape !== 'function' || typeof (plugin as any).generateShapePoints !== 'function') {
        throw new Error(`Plugin ${plugin.metadata?.id} missing required room-shape capabilities`);
      }
      break;
    case 'render':
      if (typeof (plugin as any).render !== 'function') {
        throw new Error(`Plugin ${plugin.metadata?.id} missing required capability "render" for type render`);
      }
      break;
    default:
      throw new Error(`Unknown plugin type: ${type}`);
  }
}

export async function runWithTimeout<T>(fn: () => Promise<T> | T, timeoutMs = 3000): Promise<T> {
  return await Promise.race([
    Promise.resolve().then(fn),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Plugin execution timed out')), timeoutMs);
    }),
  ]);
}

export async function executePluginFunction(
  plugin: BasePlugin,
  fnName: string,
  args: any[] = [],
  timeoutMs = 3000
): Promise<any> {
  const context = (plugin as any).__context;
  if (!context) {
    return runWithTimeout(() => (plugin as any)[fnName](...args), timeoutMs);
  }
  context.plugin = plugin;
  context.__args = args;
  const script = new Script(`plugin.${fnName}(...__args)`);
  return script.runInContext(context, { timeout: timeoutMs });
}
