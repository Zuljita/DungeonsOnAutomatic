export type FieldType = 'string' | 'number' | 'boolean' | 'enum';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  enumValues?: string[];
  defaultValue?: string | number | boolean;
}

export interface DataTypeSchema {
  name: string;
  fileName: string;
  description: string;
  fields: FieldDefinition[];
  examples: (string | number | boolean)[][];
}

export interface ModuleSchema {
  id: string;
  label: string;
  description: string;
  dataTypes: Record<string, DataTypeSchema>;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>[];
}