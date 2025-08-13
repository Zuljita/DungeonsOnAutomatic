import { ModuleSchema } from './types';
import { genericSchema } from './generic';
import { dfrpgSchema } from './dfrpg';

export * from './types';

export const moduleSchemas: Record<string, ModuleSchema> = {
  generic: genericSchema,
  dfrpg: dfrpgSchema
};

export function getModuleSchema(moduleId: string): ModuleSchema | undefined {
  return moduleSchemas[moduleId];
}

export function getAvailableModules(): ModuleSchema[] {
  return Object.values(moduleSchemas);
}

export function getDataTypesForModule(moduleId: string): string[] {
  const schema = getModuleSchema(moduleId);
  return schema ? Object.keys(schema.dataTypes) : [];
}