import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Import existing treasure interfaces
import type { TreasureHoard, TreasureDisplayOptions } from '../systems/dfrpg/DFRPGTreasure';

// === Import/Export Data Interfaces ===

export interface TreasurePackMetadata {
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  compatibleWith: string; // DFRPG version
  created: Date;
  lastModified: Date;
}

export interface MagicItemTemplate {
  name: string;
  category: 'weapon' | 'armor' | 'potion' | 'scroll' | 'power_item' | 'accessory';
  powerLevel: 'minor' | 'major' | 'epic';
  value: number;
  weight: number;
  quirks?: string[];
  reference?: string;
  description?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
}

export interface MundaneValuableTemplate {
  name: string;
  category: 'trade_good' | 'art' | 'gem' | 'tool' | 'other';
  value: number;
  weight: number;
  description?: string;
  origin?: string;
  rarity?: 'common' | 'uncommon' | 'rare';
}

export interface QuirkCollection {
  weapon_quirks: string[];
  armor_quirks: string[];
  accessory_quirks: string[];
  general_quirks: string[];
}

export interface CoinTypeDefinition {
  name: string;
  value: number; // Value in copper pieces
  weight: number; // Weight in pounds
  material: string;
  description?: string;
  reference?: string;
}

export interface ImportableTreasureData {
  metadata: TreasurePackMetadata;
  data: {
    magicItems?: MagicItemTemplate[];
    mundaneItems?: MundaneValuableTemplate[];
    quirks?: QuirkCollection;
    coinTypes?: CoinTypeDefinition[];
  };
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'markdown' | 'handout';
  includeGenerated?: boolean; // Export actual generated treasures
  includeCustomData?: boolean; // Export custom treasure tables  
  playerFriendly?: boolean; // Remove GM-only information
  prettyPrint?: boolean; // Format JSON nicely
  groupByCategory?: boolean; // Group items by category
}

export interface ExportResult {
  format: string;
  filename: string;
  content: string;
  contentType: string;
  size: number;
}

export interface ImportResult {
  success: boolean;
  itemsImported: number;
  warnings: string[];
  errors: string[];
  metadata?: TreasurePackMetadata;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  itemCount: number;
}

// === Validation Schemas ===

const MagicItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.enum(['weapon', 'armor', 'potion', 'scroll', 'power_item', 'accessory']),
  powerLevel: z.enum(['minor', 'major', 'epic']),
  value: z.number().positive('Value must be positive'),
  weight: z.number().nonnegative('Weight cannot be negative'),
  quirks: z.array(z.string()).optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare', 'legendary']).optional()
});

const MundaneItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.enum(['trade_good', 'art', 'gem', 'tool', 'other']),
  value: z.number().positive('Value must be positive'),
  weight: z.number().nonnegative('Weight cannot be negative'),
  description: z.string().optional(),
  origin: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare']).optional()
});

const MetadataSchema = z.object({
  name: z.string().min(1, 'Pack name is required'),
  author: z.string().min(1, 'Author is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in x.y.z format'),
  description: z.string().min(1, 'Description is required'),
  tags: z.array(z.string()),
  compatibleWith: z.string().min(1, 'Compatible version is required'),
  created: z.date(),
  lastModified: z.date()
});

const ImportDataSchema = z.object({
  metadata: MetadataSchema,
  data: z.object({
    magicItems: z.array(MagicItemSchema).optional(),
    mundaneItems: z.array(MundaneItemSchema).optional(),
    quirks: z.object({
      weapon_quirks: z.array(z.string()),
      armor_quirks: z.array(z.string()),
      accessory_quirks: z.array(z.string()),
      general_quirks: z.array(z.string())
    }).optional(),
    coinTypes: z.array(z.object({
      name: z.string().min(1),
      value: z.number().positive(),
      weight: z.number().nonnegative(),
      material: z.string().min(1),
      description: z.string().optional(),
      reference: z.string().optional()
    })).optional()
  })
});

// === TreasureDataManager Service ===

export class TreasureDataManager {
  private dataDir: string;
  private customDir: string;
  private communityDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(process.cwd(), 'data/treasure');
    this.customDir = path.join(this.dataDir, 'custom');
    this.communityDir = path.join(this.dataDir, 'community');
  }

  // === Import Operations ===

  /**
   * Import treasure data from a file
   */
  async importFromFile(filePath: string, format?: 'json' | 'csv'): Promise<ImportResult> {
    try {
      // Ensure directories exist
      await this.ensureDirectories();

      // Detect format if not provided
      if (!format) {
        format = path.extname(filePath).toLowerCase() === '.csv' ? 'csv' : 'json';
      }

      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      if (format === 'csv') {
        return this.importFromCsv(fileContent);
      } else {
        return this.importFromJson(fileContent);
      }
    } catch (error) {
      return {
        success: false,
        itemsImported: 0,
        warnings: [],
        errors: [`Failed to read file: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Import treasure data from JSON string
   */
  async importFromJson(jsonContent: string): Promise<ImportResult> {
    try {
      const rawData = JSON.parse(jsonContent);
      
      // Convert date strings to Date objects if needed
      if (rawData.metadata) {
        if (typeof rawData.metadata.created === 'string') {
          rawData.metadata.created = new Date(rawData.metadata.created);
        }
        if (typeof rawData.metadata.lastModified === 'string') {
          rawData.metadata.lastModified = new Date(rawData.metadata.lastModified);
        }
      }

      const validation = await this.validateImportData(rawData);
      
      if (!validation.valid) {
        return {
          success: false,
          itemsImported: 0,
          warnings: validation.warnings,
          errors: validation.errors
        };
      }

      const importData = rawData as ImportableTreasureData;
      
      // Save to custom directory
      const filename = this.sanitizeFilename(importData.metadata.name) + '.json';
      const savePath = path.join(this.customDir, filename);
      
      await fs.writeFile(savePath, JSON.stringify(importData, null, 2), 'utf-8');

      return {
        success: true,
        itemsImported: validation.itemCount,
        warnings: validation.warnings,
        errors: [],
        metadata: importData.metadata
      };
    } catch (error) {
      return {
        success: false,
        itemsImported: 0,
        warnings: [],
        errors: [`JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Import treasure data from CSV string
   */
  async importFromCsv(csvContent: string): Promise<ImportResult> {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return {
          success: false,
          itemsImported: 0,
          warnings: [],
          errors: ['CSV must have at least a header row and one data row']
        };
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const magicItems: MagicItemTemplate[] = [];
      const mundaneItems: MundaneValuableTemplate[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i]);
        if (values.length !== headers.length) {
          warnings.push(`Line ${i + 1}: Column count mismatch, skipping`);
          continue;
        }

        const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));

        try {
          if (row.type?.toLowerCase() === 'magic') {
            const item = this.parseMagicItemFromCsv(row);
            magicItems.push(item);
          } else if (row.type?.toLowerCase() === 'mundane') {
            const item = this.parseMundaneItemFromCsv(row);
            mundaneItems.push(item);
          } else {
            warnings.push(`Line ${i + 1}: Unknown type '${row.type}', skipping`);
          }
        } catch (error) {
          errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (magicItems.length === 0 && mundaneItems.length === 0) {
        return {
          success: false,
          itemsImported: 0,
          warnings,
          errors: ['No valid items found in CSV']
        };
      }

      // Create import data structure
      const metadata: TreasurePackMetadata = {
        name: 'CSV Import',
        author: 'CSV Import',
        version: '1.0.0',
        description: 'Items imported from CSV file',
        tags: ['csv', 'import'],
        compatibleWith: '^0.1.0',
        created: new Date(),
        lastModified: new Date()
      };

      const importData: ImportableTreasureData = {
        metadata,
        data: {
          ...(magicItems.length > 0 && { magicItems }),
          ...(mundaneItems.length > 0 && { mundaneItems })
        }
      };

      // Save to custom directory
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `csv-import-${timestamp}.json`;
      const savePath = path.join(this.customDir, filename);
      
      await fs.writeFile(savePath, JSON.stringify(importData, null, 2), 'utf-8');

      return {
        success: true,
        itemsImported: magicItems.length + mundaneItems.length,
        warnings,
        errors,
        metadata
      };
    } catch (error) {
      return {
        success: false,
        itemsImported: 0,
        warnings: [],
        errors: [`CSV parsing failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Validate imported treasure data
   */
  async validateImportData(data: unknown): Promise<ValidationResult> {
    try {
      const result = ImportDataSchema.parse(data);
      
      const itemCount = (result.data.magicItems?.length || 0) + 
                       (result.data.mundaneItems?.length || 0) + 
                       (result.data.coinTypes?.length || 0);

      return {
        valid: true,
        errors: [],
        warnings: [],
        itemCount
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          warnings: [],
          itemCount: 0
        };
      }
      
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        itemCount: 0
      };
    }
  }

  // === Export Operations ===

  /**
   * Export treasure data in specified format
   */
  async exportTreasureData(
    treasures: ImportableTreasureData[], 
    options: ExportOptions
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let filename: string;
    let content: string;
    let contentType: string;

    switch (options.format) {
      case 'json':
        filename = `treasure-export-${timestamp}.json`;
        content = this.exportToJson(treasures, options);
        contentType = 'application/json';
        break;
        
      case 'csv':
        filename = `treasure-export-${timestamp}.csv`;
        content = this.exportToCsv(treasures, options);
        contentType = 'text/csv';
        break;
        
      case 'markdown':
        filename = `treasure-export-${timestamp}.md`;
        content = this.exportToMarkdown(treasures, options);
        contentType = 'text/markdown';
        break;
        
      case 'handout':
        filename = `treasure-handout-${timestamp}.md`;
        content = this.exportToHandout(treasures, options);
        contentType = 'text/markdown';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return {
      format: options.format,
      filename,
      content,
      contentType,
      size: Buffer.byteLength(content, 'utf8')
    };
  }

  // === Private Helper Methods ===

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.customDir, { recursive: true });
    await fs.mkdir(this.communityDir, { recursive: true });
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9-_\s]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/-+/g, '-') // Replace multiple consecutive dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private parseMagicItemFromCsv(row: Record<string, string>): MagicItemTemplate {
    return {
      name: row.name || 'Unnamed Item',
      category: (row.category as any) || 'accessory',
      powerLevel: (row.powerlevel as any) || 'minor',
      value: parseInt(row.value || '0', 10),
      weight: parseFloat(row.weight || '0'),
      quirks: row.quirks ? row.quirks.split('|') : undefined,
      description: row.description || undefined,
      reference: row.reference || undefined
    };
  }

  private parseMundaneItemFromCsv(row: Record<string, string>): MundaneValuableTemplate {
    return {
      name: row.name || 'Unnamed Item',
      category: (row.category as any) || 'other',
      value: parseInt(row.value || '0', 10),
      weight: parseFloat(row.weight || '0'),
      description: row.description || undefined,
      origin: row.origin || undefined
    };
  }

  private exportToJson(data: any, options: ExportOptions): string {
    if (options.prettyPrint !== false) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  private exportToCsv(data: ImportableTreasureData[], options: ExportOptions): string {
    const rows: string[] = [];
    
    // CSV Header
    rows.push('Type,Name,Category,PowerLevel,Value,Weight,Quirks,Description,Reference,Pack');
    
    for (const pack of data) {
      const packName = pack.metadata.name;
      
      // Export magic items
      if (pack.data.magicItems) {
        for (const item of pack.data.magicItems) {
          const quirks = item.quirks ? item.quirks.join('|') : '';
          const row = [
            'magic',
            `"${item.name}"`,
            item.category,
            item.powerLevel,
            item.value.toString(),
            item.weight.toString(),
            `"${quirks}"`,
            `"${item.description || ''}"`,
            `"${item.reference || ''}"`,
            `"${packName}"`
          ];
          rows.push(row.join(','));
        }
      }
      
      // Export mundane items
      if (pack.data.mundaneItems) {
        for (const item of pack.data.mundaneItems) {
          const row = [
            'mundane',
            `"${item.name}"`,
            item.category,
            '', // No power level for mundane items
            item.value.toString(),
            item.weight.toString(),
            '', // No quirks for mundane items
            `"${item.description || ''}"`,
            '', // No reference typically
            `"${packName}"`
          ];
          rows.push(row.join(','));
        }
      }
    }
    
    return rows.join('\n');
  }

  private exportToMarkdown(data: ImportableTreasureData[], options: ExportOptions): string {
    const lines: string[] = [];
    
    lines.push('# Treasure Export');
    lines.push('');
    lines.push(`Generated on: ${new Date().toLocaleString()}`);
    lines.push('');
    
    for (const pack of data) {
      lines.push(`## ${pack.metadata.name} v${pack.metadata.version}`);
      lines.push('');
      lines.push(`**Author:** ${pack.metadata.author}`);
      lines.push(`**Description:** ${pack.metadata.description}`);
      
      if (pack.metadata.tags.length > 0) {
        lines.push(`**Tags:** ${pack.metadata.tags.join(', ')}`);
      }
      
      lines.push('');
      
      // Magic Items
      if (pack.data.magicItems && pack.data.magicItems.length > 0) {
        lines.push('### Magic Items');
        lines.push('');
        
        if (options.groupByCategory) {
          const grouped = pack.data.magicItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
          }, {} as Record<string, MagicItemTemplate[]>);
          
          for (const [category, items] of Object.entries(grouped)) {
            lines.push(`#### ${category.charAt(0).toUpperCase() + category.slice(1)}s`);
            lines.push('');
            
            for (const item of items) {
              lines.push(`**${item.name}** *(${item.powerLevel})*`);
              lines.push(`- Value: $${item.value}, Weight: ${item.weight} lbs`);
              if (item.description) {
                lines.push(`- ${item.description}`);
              }
              if (item.quirks && item.quirks.length > 0) {
                lines.push(`- Quirks: ${item.quirks.join(', ')}`);
              }
              if (!options.playerFriendly && item.reference) {
                lines.push(`- Reference: ${item.reference}`);
              }
              lines.push('');
            }
          }
        } else {
          for (const item of pack.data.magicItems) {
            lines.push(`- **${item.name}** *(${item.category}, ${item.powerLevel})*`);
            lines.push(`  - Value: $${item.value}, Weight: ${item.weight} lbs`);
            if (item.description) {
              lines.push(`  - ${item.description}`);
            }
            if (item.quirks && item.quirks.length > 0) {
              lines.push(`  - Quirks: ${item.quirks.join(', ')}`);
            }
            if (!options.playerFriendly && item.reference) {
              lines.push(`  - Reference: ${item.reference}`);
            }
          }
        }
        lines.push('');
      }
      
      // Mundane Items
      if (pack.data.mundaneItems && pack.data.mundaneItems.length > 0) {
        lines.push('### Mundane Valuables');
        lines.push('');
        
        if (options.groupByCategory) {
          const grouped = pack.data.mundaneItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
          }, {} as Record<string, MundaneValuableTemplate[]>);
          
          for (const [category, items] of Object.entries(grouped)) {
            lines.push(`#### ${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}`);
            lines.push('');
            
            for (const item of items) {
              lines.push(`**${item.name}**`);
              lines.push(`- Value: $${item.value}, Weight: ${item.weight} lbs`);
              if (item.description) {
                lines.push(`- ${item.description}`);
              }
              if (item.origin) {
                lines.push(`- Origin: ${item.origin}`);
              }
              lines.push('');
            }
          }
        } else {
          for (const item of pack.data.mundaneItems) {
            lines.push(`- **${item.name}** *(${item.category})*`);
            lines.push(`  - Value: $${item.value}, Weight: ${item.weight} lbs`);
            if (item.description) {
              lines.push(`  - ${item.description}`);
            }
            if (item.origin) {
              lines.push(`  - Origin: ${item.origin}`);
            }
          }
        }
        lines.push('');
      }
      
      lines.push('---');
      lines.push('');
    }
    
    return lines.join('\n');
  }

  private exportToHandout(data: ImportableTreasureData[], options: ExportOptions): string {
    const lines: string[] = [];
    
    lines.push('# Treasure Handout');
    lines.push('');
    
    // Player-friendly format with minimal GM information
    for (const pack of data) {
      // Magic Items
      if (pack.data.magicItems && pack.data.magicItems.length > 0) {
        lines.push('## Magic Items');
        lines.push('');
        
        for (const item of pack.data.magicItems) {
          lines.push(`### ${item.name}`);
          if (item.description) {
            lines.push(`${item.description}`);
            lines.push('');
          }
          
          // Show basic properties in player-friendly way
          const properties: string[] = [];
          if (item.category === 'weapon') properties.push('Weapon');
          else if (item.category === 'armor') properties.push('Armor');
          else if (item.category === 'potion') properties.push('Potion');
          else if (item.category === 'scroll') properties.push('Scroll');
          else if (item.category === 'accessory') properties.push('Accessory');
          
          if (properties.length > 0) {
            lines.push(`*Type:* ${properties.join(', ')}`);
          }
          
          if (item.quirks && item.quirks.length > 0) {
            lines.push(`*Properties:* ${item.quirks.join(', ')}`);
          }
          
          // Only show weight, not value (GM information)
          if (item.weight > 0) {
            lines.push(`*Weight:* ${item.weight} lbs`);
          }
          
          lines.push('');
        }
      }
      
      // Mundane Items (simplified for players)
      if (pack.data.mundaneItems && pack.data.mundaneItems.length > 0) {
        lines.push('## Valuable Items');
        lines.push('');
        
        for (const item of pack.data.mundaneItems) {
          if (item.description) {
            lines.push(`**${item.name}:** ${item.description}`);
          } else {
            lines.push(`**${item.name}**`);
          }
          
          if (item.origin) {
            lines.push(`  *(Origin: ${item.origin})*`);
          }
          
          lines.push('');
        }
      }
    }
    
    lines.push('---');
    lines.push('*Generated by DungeonsOnAutomatic*');
    
    return lines.join('\n');
  }
}