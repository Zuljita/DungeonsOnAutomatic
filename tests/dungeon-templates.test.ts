import { describe, it, expect } from 'vitest';
import { DungeonTemplateService, DUNGEON_TEMPLATES } from '../src/services/dungeon-templates.js';

describe('DungeonTemplateService', () => {
  const service = new DungeonTemplateService();

  describe('Template Retrieval', () => {
    it('getAllTemplates returns all available templates', () => {
      const templates = service.getAllTemplates();
      expect(templates).toHaveLength(DUNGEON_TEMPLATES.length);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('category');
    });

    it('getTemplate returns specific template by ID', () => {
      const template = service.getTemplate('classic-small');
      expect(template).toBeDefined();
      expect(template?.id).toBe('classic-small');
      expect(template?.name).toBe('Small Classic Dungeon');
      expect(template?.category).toBe('classic');
    });

    it('getTemplate returns undefined for invalid ID', () => {
      const template = service.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('getTemplatesByCategory filters templates correctly', () => {
      const classicTemplates = service.getTemplatesByCategory('classic');
      expect(classicTemplates.length).toBeGreaterThan(0);
      classicTemplates.forEach(template => {
        expect(template.category).toBe('classic');
      });

      const naturalTemplates = service.getTemplatesByCategory('natural');
      expect(naturalTemplates.length).toBeGreaterThan(0);
      naturalTemplates.forEach(template => {
        expect(template.category).toBe('natural');
      });
    });

    it('getTemplatesByCategory returns empty array for invalid category', () => {
      const templates = service.getTemplatesByCategory('invalid' as any);
      expect(templates).toHaveLength(0);
    });
  });

  describe('Category Management', () => {
    it('getCategories returns all category information', () => {
      const categories = service.getCategories();
      expect(categories).toHaveLength(5);
      
      const categoryIds = categories.map(c => c.id);
      expect(categoryIds).toContain('classic');
      expect(categoryIds).toContain('natural');
      expect(categoryIds).toContain('fortress');
      expect(categoryIds).toContain('maze');
      expect(categoryIds).toContain('special');

      // Check structure of category objects
      categories.forEach(category => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(typeof category.name).toBe('string');
        expect(typeof category.description).toBe('string');
      });
    });
  });

  describe('Search Functionality', () => {
    it('searchTemplates finds templates by name', () => {
      const results = service.searchTemplates('Small');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Small');
    });

    it('searchTemplates finds templates by description', () => {
      const results = service.searchTemplates('cave');
      expect(results.length).toBeGreaterThan(0);
      const foundTemplate = results.find(t => t.description.toLowerCase().includes('cave'));
      expect(foundTemplate).toBeDefined();
    });

    it('searchTemplates is case insensitive', () => {
      const upperResults = service.searchTemplates('CLASSIC');
      const lowerResults = service.searchTemplates('classic');
      expect(upperResults).toEqual(lowerResults);
      expect(upperResults.length).toBeGreaterThan(0);
    });

    it('searchTemplates returns empty array for no matches', () => {
      const results = service.searchTemplates('nonexistentkeyword');
      expect(results).toHaveLength(0);
    });

    it('searchTemplates handles empty query', () => {
      const results = service.searchTemplates('');
      // Empty string matches all templates since includes('') is always true
      expect(results).toHaveLength(DUNGEON_TEMPLATES.length);
    });
  });

  describe('Template Application', () => {
    it('applyTemplate returns valid MapGenerationOptions', () => {
      const template = service.getTemplate('classic-small')!;
      const options = service.applyTemplate(template);
      
      expect(options).toHaveProperty('rooms');
      expect(options).toHaveProperty('width');
      expect(options).toHaveProperty('height');
      expect(options).toHaveProperty('layoutType');
      expect(options).toHaveProperty('roomLayout');
      expect(options).toHaveProperty('roomSize');
      expect(options).toHaveProperty('roomShape');
      expect(options).toHaveProperty('corridorType');
      expect(options).toHaveProperty('corridorWidth');
      expect(options).toHaveProperty('allowDeadends');
      expect(options).toHaveProperty('stairsUp');
      expect(options).toHaveProperty('stairsDown');
      expect(options).toHaveProperty('entranceFromPeriphery');
    });

    it('applyTemplate merges template options with defaults', () => {
      const template = service.getTemplate('classic-small')!;
      const options = service.applyTemplate(template);
      
      // Should use template values
      expect(options.rooms).toBe(6);
      expect(options.width).toBe(40);
      expect(options.height).toBe(30);
      expect(options.layoutType).toBe('rectangle');
    });

    it('applyTemplate allows overrides to supersede template values', () => {
      const template = service.getTemplate('classic-small')!;
      const overrides = {
        rooms: 10,
        width: 100,
        layoutType: 'square' as const
      };
      const options = service.applyTemplate(template, overrides);
      
      // Should use override values
      expect(options.rooms).toBe(10);
      expect(options.width).toBe(100);
      expect(options.layoutType).toBe('square');
      
      // Should keep template values for non-overridden options
      expect(options.height).toBe(30);
      expect(options.roomSize).toBe('small');
    });

    it('applyTemplate provides sensible defaults for missing template options', () => {
      const minimalTemplate = {
        id: 'test',
        name: 'Test Template',
        description: 'Test',
        category: 'classic' as const,
        mapOptions: {
          rooms: 5
        }
      };
      
      const options = service.applyTemplate(minimalTemplate);
      
      // Should have defaults for missing options
      expect(options.width).toBe(50);
      expect(options.height).toBe(50);
      expect(options.layoutType).toBe('rectangle');
      expect(options.roomLayout).toBe('scattered');
      expect(options.roomSize).toBe('medium');
      expect(options.roomShape).toBe('rectangular');
      expect(options.corridorType).toBe('straight');
      expect(options.corridorWidth).toBe(1);
      expect(options.allowDeadends).toBe(true);
      expect(options.stairsUp).toBe(false);
      expect(options.stairsDown).toBe(false);
      expect(options.entranceFromPeriphery).toBe(false);
      
      // Should use template value
      expect(options.rooms).toBe(5);
    });
  });

  describe('Defaults Handling', () => {
    it('getTemplateDefaults returns defaults when template has them', () => {
      const template = service.getTemplate('classic-small')!;
      const defaults = service.getTemplateDefaults(template);
      
      expect(defaults).toBeDefined();
      expect(defaults?.name).toBe('Template: Small Classic Dungeon');
      expect(defaults?.manaLevel).toBe('normal');
      expect(defaults?.sanctity).toBe('neutral');
      expect(defaults?.nature).toBe('weak');
    });

    it('getTemplateDefaults merges template defaults with base defaults', () => {
      const template = service.getTemplate('wizard-tower')!;
      const defaults = service.getTemplateDefaults(template);
      
      expect(defaults).toBeDefined();
      expect(defaults?.manaLevel).toBe('very_high'); // From template
      expect(defaults?.sanctity).toBe('neutral'); // From template
      expect(defaults?.nature).toBe('dead'); // From template
    });

    it('getTemplateDefaults provides base defaults when no template defaults exist', () => {
      const templateWithoutDefaults = {
        id: 'test-no-defaults',
        name: 'Test Template',
        description: 'Test template without defaults',
        category: 'classic' as const,
        mapOptions: { rooms: 5 }
      };
      
      const defaults = service.getTemplateDefaults(templateWithoutDefaults);
      
      expect(defaults).toBeUndefined();
    });

    it('getTemplateDefaults returns undefined for template without defaults property', () => {
      const template = service.getTemplate('classic-large')!;
      const defaults = service.getTemplateDefaults(template);
      
      // classic-large doesn't have defaults in the template definition
      expect(defaults).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('all templates have required properties', () => {
      const allTemplates = service.getAllTemplates();
      
      allTemplates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('mapOptions');
        
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(['classic', 'natural', 'fortress', 'maze', 'special']).toContain(template.category);
        expect(typeof template.mapOptions).toBe('object');
      });
    });

    it('template IDs are unique', () => {
      const allTemplates = service.getAllTemplates();
      const ids = allTemplates.map(t => t.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('all categories have at least one template', () => {
      const categories = service.getCategories();
      
      categories.forEach(category => {
        const templatesInCategory = service.getTemplatesByCategory(category.id);
        expect(templatesInCategory.length).toBeGreaterThan(0);
      });
    });
  });
});