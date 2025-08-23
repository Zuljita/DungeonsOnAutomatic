import { describe, it, expect } from 'vitest';
import foundryExportPlugin from '../src/plugins/foundry-export/index';
import { buildDungeon } from '../src/services/assembler';
import { exportFoundry } from '../src/services/foundry';
import type { Dungeon } from '../src/core/types';

describe('Foundry Export Plugin', () => {
  const testDungeon = buildDungeon({
    rooms: 3,
    seed: 'test-foundry',
    width: 30,
    height: 30
  });

  describe('Plugin Metadata', () => {
    it('has correct metadata', () => {
      expect(foundryExportPlugin.metadata.id).toBe('foundry-export');
      expect(foundryExportPlugin.metadata.version).toBe('1.0.0');
      expect(foundryExportPlugin.metadata.description).toContain('FoundryVTT');
      expect(foundryExportPlugin.metadata.author).toBe('Dungeons On Automatic');
    });

    it('supports foundry format', () => {
      expect(foundryExportPlugin.supportedFormats).toContain('foundry');
    });
  });

  describe('Export Functionality', () => {
    it('exports dungeon to Foundry format', () => {
      const result = foundryExportPlugin.export(testDungeon, 'foundry');
      
      expect(result.format).toBe('foundry');
      expect(result.contentType).toBe('application/json');
      expect(result.filename).toBe('dungeon.json');
      
      // Parse the JSON data
      const foundryScene = JSON.parse(result.data as string);
      expect(foundryScene).toHaveProperty('name');
      expect(foundryScene).toHaveProperty('walls');
      expect(foundryScene).toHaveProperty('doors');
      expect(foundryScene).toHaveProperty('width');
      expect(foundryScene).toHaveProperty('height');
      expect(foundryScene).toHaveProperty('grid');
    });

    it('accepts custom grid size via options', () => {
      const result = foundryExportPlugin.export(testDungeon, 'foundry', { grid: 50 });
      
      const foundryScene = JSON.parse(result.data as string);
      expect(foundryScene.grid).toBe(50);
      
      // Verify metadata includes grid size
      expect(result.metadata?.grid).toBe(50);
    });

    it('uses default grid size when not specified', () => {
      const result = foundryExportPlugin.export(testDungeon, 'foundry');
      
      const foundryScene = JSON.parse(result.data as string);
      expect(foundryScene.grid).toBe(100); // Default grid size
    });

    it('includes metadata about the dungeon', () => {
      const result = foundryExportPlugin.export(testDungeon, 'foundry');
      
      expect(result.metadata).toHaveProperty('rooms');
      expect(result.metadata).toHaveProperty('corridors');
      expect(result.metadata).toHaveProperty('doors');
      expect(result.metadata).toHaveProperty('walls');
      expect(result.metadata?.rooms).toBe(testDungeon.rooms.length);
      expect(result.metadata?.corridors).toBe(testDungeon.corridors.length);
    });

    it('accepts custom filename via options', () => {
      const result = foundryExportPlugin.export(testDungeon, 'foundry', { 
        filename: 'custom-dungeon.json' 
      });
      
      expect(result.filename).toBe('custom-dungeon.json');
    });

    it('throws error for unsupported format', () => {
      expect(() => {
        foundryExportPlugin.export(testDungeon, 'unsupported');
      }).toThrow('Unsupported export format: unsupported');
    });
  });

  describe('Output Compatibility', () => {
    it('produces identical output to original foundry service', () => {
      const pluginResult = foundryExportPlugin.export(testDungeon, 'foundry');
      const serviceResult = exportFoundry(testDungeon);
      
      const pluginScene = JSON.parse(pluginResult.data as string);
      
      // Compare core structure
      expect(pluginScene.name).toBe(serviceResult.name);
      expect(pluginScene.width).toBe(serviceResult.width);
      expect(pluginScene.height).toBe(serviceResult.height);
      expect(pluginScene.grid).toBe(serviceResult.grid);
      expect(pluginScene.walls).toEqual(serviceResult.walls);
      expect(pluginScene.doors).toEqual(serviceResult.doors);
    });

    it('maintains wall and door coordinates with grid scaling', () => {
      const grid = 150;
      const result = foundryExportPlugin.export(testDungeon, 'foundry', { grid });
      const foundryScene = JSON.parse(result.data as string);
      
      // Check that coordinates are scaled by the grid factor
      // Walls should be multiples of grid since they're integer-based
      foundryScene.walls.forEach((wall: any) => {
        wall.c.forEach((coord: number) => {
          expect(coord % grid === 0 || coord === 0).toBe(true);
        });
      });
      
      // Doors can have fractional coordinates after scaling for shaped rooms
      foundryScene.doors.forEach((door: any) => {
        door.c.forEach((coord: number) => {
          expect(typeof coord).toBe('number');
          expect(coord).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('handles rooms and corridors correctly', () => {
      const result = foundryExportPlugin.export(testDungeon, 'foundry');
      const foundryScene = JSON.parse(result.data as string);
      
      // Should have walls (room boundaries and corridor walls)
      expect(foundryScene.walls.length).toBeGreaterThan(0);
      
      // Should have doors (room connections)
      expect(foundryScene.doors.length).toBeGreaterThan(0);
      
      // Each wall should have 4 coordinates [x1, y1, x2, y2]
      foundryScene.walls.forEach((wall: any) => {
        expect(wall.c).toHaveLength(4);
        expect(wall.c.every((coord: any) => typeof coord === 'number')).toBe(true);
      });
      
      // Each door should have 4 coordinates [x1, y1, x2, y2]
      foundryScene.doors.forEach((door: any) => {
        expect(door.c).toHaveLength(4);
        expect(door.c.every((coord: any) => typeof coord === 'number')).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single room dungeon', () => {
      const singleRoomDungeon = buildDungeon({
        rooms: 1,
        seed: 'single-room',
        width: 20,
        height: 20
      });
      
      const result = foundryExportPlugin.export(singleRoomDungeon, 'foundry');
      const foundryScene = JSON.parse(result.data as string);
      
      expect(foundryScene.walls.length).toBeGreaterThan(0);
      expect(foundryScene.doors.length).toBe(0); // No corridors = no doors
    });

    it('handles complex multi-room dungeon', () => {
      const complexDungeon = buildDungeon({
        rooms: 10,
        seed: 'complex-test',
        width: 60,
        height: 60
      });
      
      const result = foundryExportPlugin.export(complexDungeon, 'foundry');
      const foundryScene = JSON.parse(result.data as string);
      
      expect(foundryScene.walls.length).toBeGreaterThan(0);
      expect(foundryScene.doors.length).toBeGreaterThan(0);
      expect(result.metadata?.rooms).toBe(10);
    });

    it('handles dungeons with no corridors gracefully', () => {
      // Create a dungeon with isolated rooms (no corridors)
      const isolatedDungeon: Dungeon = {
        ...testDungeon,
        corridors: [],
        doors: []
      };
      
      const result = foundryExportPlugin.export(isolatedDungeon, 'foundry');
      const foundryScene = JSON.parse(result.data as string);
      
      expect(foundryScene.doors.length).toBe(0);
      expect(foundryScene.walls.length).toBeGreaterThan(0); // Still has room walls
    });
  });
});