import { describe, it, expect, beforeEach } from 'vitest';
import { TreasureDataManager } from '../src/services/treasure-data-manager';
import type { ImportableTreasureData } from '../src/services/treasure-data-manager';

describe('TreasureDataManager', () => {
  let manager: TreasureDataManager;
  
  beforeEach(() => {
    // Use a temporary directory for testing
    manager = new TreasureDataManager('/tmp/treasure-test');
  });

  describe('Data Validation', () => {
    it('should validate correct treasure data structure', async () => {
      const validData: ImportableTreasureData = {
        metadata: {
          name: "Test Pack",
          author: "Test Author",
          version: "1.0.0",
          description: "A test treasure pack",
          tags: ["test"],
          compatibleWith: "^0.1.0",
          created: new Date(),
          lastModified: new Date()
        },
        data: {
          magicItems: [
            {
              name: "Magic Sword",
              category: "weapon",
              powerLevel: "minor",
              value: 1000,
              weight: 3,
              quirks: ["Glows faintly"],
              description: "A magical sword"
            }
          ],
          mundaneItems: [
            {
              name: "Gold Ring",
              category: "art",
              value: 100,
              weight: 0.1,
              description: "A simple gold ring"
            }
          ]
        }
      };

      const result = await manager.validateImportData(validData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(2);
    });

    it('should reject data with missing required fields', async () => {
      const invalidData = {
        metadata: {
          name: "Test Pack",
          // Missing author, version, description
          tags: ["test"],
          compatibleWith: "^0.1.0",
          created: new Date(),
          lastModified: new Date()
        },
        data: {
          magicItems: [
            {
              name: "Magic Sword",
              category: "weapon",
              powerLevel: "minor",
              value: 1000,
              weight: 3
            }
          ]
        }
      };

      const result = await manager.validateImportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('author'))).toBe(true);
    });

    it('should reject invalid magic item categories', async () => {
      const invalidData = {
        metadata: {
          name: "Test Pack",
          author: "Test Author",
          version: "1.0.0",
          description: "A test treasure pack",
          tags: ["test"],
          compatibleWith: "^0.1.0",
          created: new Date(),
          lastModified: new Date()
        },
        data: {
          magicItems: [
            {
              name: "Invalid Item",
              category: "invalid_category", // Invalid category
              powerLevel: "minor",
              value: 1000,
              weight: 3
            }
          ]
        }
      };

      const result = await manager.validateImportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('category'))).toBe(true);
    });

    it('should reject negative values', async () => {
      const invalidData = {
        metadata: {
          name: "Test Pack",
          author: "Test Author",
          version: "1.0.0",
          description: "A test treasure pack",
          tags: ["test"],
          compatibleWith: "^0.1.0",
          created: new Date(),
          lastModified: new Date()
        },
        data: {
          magicItems: [
            {
              name: "Invalid Item",
              category: "weapon",
              powerLevel: "minor",
              value: -100, // Negative value
              weight: 3
            }
          ]
        }
      };

      const result = await manager.validateImportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('positive'))).toBe(true);
    });
  });

  describe('CSV Parsing', () => {
    it('should parse CSV lines correctly', () => {
      // Access private method for testing
      const parseLine = (manager as any).parseCsvLine.bind(manager);
      
      // Test basic parsing
      const result1 = parseLine('magic,Magic Sword,weapon,minor,1000,3');
      expect(result1).toEqual(['magic', 'Magic Sword', 'weapon', 'minor', '1000', '3']);
      
      // Test quoted values with commas
      const result2 = parseLine('magic,"Sword, Magic",weapon,"minor, powerful"');
      expect(result2).toEqual(['magic', 'Sword, Magic', 'weapon', 'minor, powerful']);
    });

    it('should parse magic items from CSV rows', () => {
      const parseMagicItem = (manager as any).parseMagicItemFromCsv.bind(manager);
      
      const csvRow = {
        name: 'Magic Sword',
        category: 'weapon',
        powerlevel: 'minor',
        value: '1000',
        weight: '3',
        quirks: 'Glows faintly|Sharp',
        description: 'A magical sword',
        reference: 'Test'
      };
      
      const result = parseMagicItem(csvRow);
      
      expect(result.name).toBe('Magic Sword');
      expect(result.category).toBe('weapon');
      expect(result.powerLevel).toBe('minor');
      expect(result.value).toBe(1000);
      expect(result.weight).toBe(3);
      expect(result.quirks).toEqual(['Glows faintly', 'Sharp']);
    });

    it('should parse mundane items from CSV rows', () => {
      const parseMundaneItem = (manager as any).parseMundaneItemFromCsv.bind(manager);
      
      const csvRow = {
        name: 'Gold Ring',
        category: 'art',
        value: '100',
        weight: '0.1',
        description: 'A simple gold ring',
        origin: 'Eastern kingdoms'
      };
      
      const result = parseMundaneItem(csvRow);
      
      expect(result.name).toBe('Gold Ring');
      expect(result.category).toBe('art');
      expect(result.value).toBe(100);
      expect(result.weight).toBe(0.1);
      expect(result.description).toBe('A simple gold ring');
      expect(result.origin).toBe('Eastern kingdoms');
    });
  });

  describe('JSON Import', () => {
    it('should validate JSON data structure properly', async () => {
      const jsonData = {
        metadata: {
          name: "JSON Test Pack",
          author: "Test Author",
          version: "1.0.0",
          description: "A JSON test treasure pack",
          tags: ["json", "test"],
          compatibleWith: "^0.1.0",
          created: new Date("2024-01-01T00:00:00.000Z"),
          lastModified: new Date("2024-01-01T00:00:00.000Z")
        },
        data: {
          magicItems: [
            {
              name: "JSON Sword",
              category: "weapon",
              powerLevel: "major",
              value: 2000,
              weight: 4,
              quirks: ["JSON powered"],
              description: "A sword created from JSON"
            }
          ]
        }
      };

      const validation = await manager.validateImportData(jsonData);
      
      expect(validation.valid).toBe(true);
      expect(validation.itemCount).toBe(1);
    });

    it('should reject malformed JSON', async () => {
      const malformedJson = '{"metadata": {"name": "Test"'; // Missing closing braces
      
      const result = await manager.importFromJson(malformedJson);
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('JSON parsing failed'))).toBe(true);
    });
  });

  describe('Export Functionality', () => {
    const sampleData: ImportableTreasureData[] = [{
      metadata: {
        name: "Export Test Pack",
        author: "Test Author",
        version: "1.0.0",
        description: "A test pack for export",
        tags: ["export", "test"],
        compatibleWith: "^0.1.0",
        created: new Date(),
        lastModified: new Date()
      },
      data: {
        magicItems: [
          {
            name: "Export Sword",
            category: "weapon",
            powerLevel: "minor",
            value: 1000,
            weight: 3,
            quirks: ["Test quirk"],
            description: "A sword for testing exports"
          }
        ],
        mundaneItems: [
          {
            name: "Export Ring",
            category: "art",
            value: 100,
            weight: 0.1,
            description: "A ring for testing exports"
          }
        ]
      }
    }];

    it('should export to JSON format', async () => {
      const result = await manager.exportTreasureData(sampleData, {
        format: 'json',
        prettyPrint: true
      });

      expect(result.format).toBe('json');
      expect(result.contentType).toBe('application/json');
      expect(result.content).toContain('Export Test Pack');
      expect(result.content).toContain('Export Sword');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should export to CSV format', async () => {
      const result = await manager.exportTreasureData(sampleData, {
        format: 'csv'
      });

      expect(result.format).toBe('csv');
      expect(result.contentType).toBe('text/csv');
      expect(result.content).toContain('Type,Name,Category,PowerLevel,Value,Weight');
      expect(result.content).toContain('Export Sword');
      expect(result.content).toContain('Export Ring');
    });

    it('should export to Markdown format', async () => {
      const result = await manager.exportTreasureData(sampleData, {
        format: 'markdown',
        groupByCategory: true
      });

      expect(result.format).toBe('markdown');
      expect(result.contentType).toBe('text/markdown');
      expect(result.content).toContain('# Treasure Export');
      expect(result.content).toContain('## Export Test Pack');
      expect(result.content).toContain('### Magic Items');
      expect(result.content).toContain('Export Sword');
    });

    it('should create player-friendly handouts', async () => {
      const result = await manager.exportTreasureData(sampleData, {
        format: 'handout',
        playerFriendly: true
      });

      expect(result.format).toBe('handout');
      expect(result.contentType).toBe('text/markdown');
      expect(result.content).toContain('# Treasure Handout');
      expect(result.content).toContain('Export Sword');
      // Should not contain value information (GM-only)
      expect(result.content).not.toContain('$1000');
    });
  });

  describe('File Sanitization', () => {
    it('should sanitize filenames properly', () => {
      // Access private method for testing
      const sanitize = (manager as any).sanitizeFilename.bind(manager);
      
      expect(sanitize('My Treasure Pack')).toBe('my-treasure-pack');
      expect(sanitize('Pack with Special!@#$%^&*()Characters')).toBe('pack-with-specialcharacters');
      expect(sanitize('Numbers123AndSpaces  Here')).toBe('numbers123andspaces-here');
      expect(sanitize('  Leading and Trailing  ')).toBe('leading-and-trailing');
    });
  });

  describe('CSV Line Parsing', () => {
    it('should parse CSV lines with quoted strings correctly', () => {
      // Access private method for testing
      const parseLine = (manager as any).parseCsvLine.bind(manager);
      
      const simpleResult = parseLine('magic,Sword,weapon,minor');
      expect(simpleResult).toEqual(['magic', 'Sword', 'weapon', 'minor']);
      
      const quotedResult = parseLine('magic,"Sword, Magic",weapon,"minor, powerful"');
      expect(quotedResult).toEqual(['magic', 'Sword, Magic', 'weapon', 'minor, powerful']);
      
      const mixedResult = parseLine('magic,"Quoted Item",unquoted,100');
      expect(mixedResult).toEqual(['magic', 'Quoted Item', 'unquoted', '100']);
    });
  });
});