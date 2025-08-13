import { 
  getModuleSchema, 
  FieldDefinition, 
  ValidationResult, 
  ValidationError 
} from '../data/schemas';

export class ImportWizardService {
  /**
   * Generate a CSV template for a specific module and data type
   */
  generateTemplate(moduleId: string, dataType: string): string | null {
    const schema = getModuleSchema(moduleId);
    if (!schema || !schema.dataTypes[dataType]) {
      return null;
    }

    const dataTypeSchema = schema.dataTypes[dataType];
    const headers = dataTypeSchema.fields.map(field => field.name);
    const csvRows: string[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add example rows
    dataTypeSchema.examples.forEach(example => {
      const row = example.map(value => this.escapeCsvValue(String(value)));
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Create a downloadable blob for the CSV template
   */
  createTemplateBlob(moduleId: string, dataType: string): Blob | null {
    const csvContent = this.generateTemplate(moduleId, dataType);
    if (!csvContent) return null;

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Parse and validate uploaded CSV content
   */
  validateAndParse(moduleId: string, dataType: string, csvContent: string): ValidationResult {
    const schema = getModuleSchema(moduleId);
    if (!schema || !schema.dataTypes[dataType]) {
      return {
        isValid: false,
        errors: [{ row: 0, column: '', message: 'Invalid module or data type', value: '' }]
      };
    }

    const dataTypeSchema = schema.dataTypes[dataType];
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      return {
        isValid: false,
        errors: [{ row: 0, column: '', message: 'CSV must contain at least a header and one data row', value: '' }]
      };
    }

    const headers = this.parseCsvRow(lines[0]);
    const expectedHeaders = dataTypeSchema.fields.map(f => f.name);
    
    // Validate headers
    const headerErrors = this.validateHeaders(headers, expectedHeaders);
    if (headerErrors.length > 0) {
      return { isValid: false, errors: headerErrors };
    }

    // Validate data rows
    const errors: ValidationError[] = [];
    const data: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowData = this.parseCsvRow(lines[i]);
      const rowErrors = this.validateRow(rowData, headers, dataTypeSchema.fields, i + 1);
      
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        // Convert row to object
        const rowObject: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          const field = dataTypeSchema.fields.find(f => f.name === header);
          if (field && rowData[index] !== undefined) {
            rowObject[header] = this.convertValue(rowData[index], field);
          }
        });
        data.push(rowObject);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined
    };
  }

  /**
   * Convert validated data to the application's internal format
   */
  convertToInternalFormat(moduleId: string, dataType: string, data: Record<string, unknown>[]): unknown[] {
    const schema = getModuleSchema(moduleId);
    if (!schema || !schema.dataTypes[dataType]) {
      return [];
    }

    // For now, we'll use the data as-is, but this could be extended
    // to perform specific transformations for different modules
    if (moduleId === 'dfrpg' && dataType === 'monsters') {
      // Transform DFRPG monsters to match the RawMonster interface
      return data.map(item => ({
        Description: item.Description || item.name,
        Class: item.Class || item.cls,
        SM: item.SM || item.sm,
        Subclass: item.Subclass || item.subclass,
        Source1: item.Source1 || item.source,
        ...item
      }));
    }

    return data;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private validateHeaders(actual: string[], expected: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields = expected; // All expected headers should be present
    
    for (const required of requiredFields) {
      if (!actual.includes(required)) {
        errors.push({
          row: 1,
          column: required,
          message: `Missing required column: ${required}`,
          value: ''
        });
      }
    }

    return errors;
  }

  private validateRow(
    rowData: string[], 
    headers: string[], 
    fieldDefs: FieldDefinition[], 
    rowNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    fieldDefs.forEach((field) => {
      const headerIndex = headers.indexOf(field.name);
      if (headerIndex === -1) return; // Skip if column not found (already handled in header validation)

      const value = rowData[headerIndex] || '';
      
      // Check required fields
      if (field.required && (!value || value.trim() === '')) {
        errors.push({
          row: rowNumber,
          column: field.name,
          message: `Required field cannot be empty`,
          value
        });
        return;
      }

      // Skip validation if field is empty and not required
      if (!value || value.trim() === '') return;

      // Type validation
      const validationError = this.validateFieldType(value, field, rowNumber);
      if (validationError) {
        errors.push(validationError);
      }
    });

    return errors;
  }

  private validateFieldType(value: string, field: FieldDefinition, rowNumber: number): ValidationError | null {
    const trimmedValue = value.trim();

    switch (field.type) {
      case 'number':
        if (isNaN(Number(trimmedValue))) {
          return {
            row: rowNumber,
            column: field.name,
            message: `Must be a valid number`,
            value
          };
        }
        break;

      case 'boolean':
        const lowerValue = trimmedValue.toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lowerValue)) {
          return {
            row: rowNumber,
            column: field.name,
            message: `Must be a boolean value (true/false, yes/no, 1/0)`,
            value
          };
        }
        break;

      case 'enum':
        if (field.enumValues && !field.enumValues.includes(trimmedValue)) {
          return {
            row: rowNumber,
            column: field.name,
            message: `Must be one of: ${field.enumValues.join(', ')}`,
            value
          };
        }
        break;

      case 'string':
        // No additional validation needed for strings
        break;

      default:
        return {
          row: rowNumber,
          column: field.name,
          message: `Unknown field type: ${field.type}`,
          value
        };
    }

    return null;
  }

  private convertValue(value: string, field: FieldDefinition): unknown {
    const trimmedValue = value.trim();
    
    if (!trimmedValue && field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    switch (field.type) {
      case 'number':
        return Number(trimmedValue);
      
      case 'boolean':
        const lowerValue = trimmedValue.toLowerCase();
        return ['true', '1', 'yes'].includes(lowerValue);
      
      case 'enum':
      case 'string':
      default:
        return trimmedValue;
    }
  }
}

export const importWizardService = new ImportWizardService();