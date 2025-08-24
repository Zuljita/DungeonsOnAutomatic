import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('CLI Variations Command', () => {
  let testOutputDir: string;

  beforeEach(async () => {
    // Create a unique test directory for each test
    testOutputDir = join(tmpdir(), `dungeon-variations-test-${Date.now()}`);
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  it('should show help for variations command', () => {
    const output = execSync('pnpm doa variations --help', { encoding: 'utf-8' });
    expect(output).toContain('Generate multiple variations of the same dungeon concept');
    expect(output).toContain('--seed <seed>');
    expect(output).toContain('--vary <parameter>');
    expect(output).toContain('--rooms <rooms...>');
    expect(output).toContain('--layouts <layouts...>');
  });

  it('should generate default layout variations', () => {
    const output = execSync('pnpm doa variations --seed test123 --count 2', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    expect(output).toContain('🎲 Generating 2 dungeon variations');
    expect(output).toContain('📍 Base seed: test123');
    expect(output).toContain('🏰 Variation 1: rectangle layout');
    expect(output).toContain('🏰 Variation 2: hexagon layout');
    expect(output).toContain('✅ All variations generated successfully!');
  });

  it('should generate specific room count variations', () => {
    const output = execSync('pnpm doa variations --seed test456 --rooms 5,8 --ascii', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    // Check for key patterns that should be in the output regardless of pnpm prefix
    expect(output).toMatch(/Generating \d+ dungeon variations/);
    expect(output).toContain('Variation 1: 5 rooms');
    expect(output).toContain('Variation 2: 8 rooms');
    expect(output).toContain('ASCII Map:');
  });

  it('should generate specific layout variations', () => {
    const output = execSync('pnpm doa variations --seed test789 --layouts rectangle,cavernous', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    expect(output).toContain('🏰 Variation 1: rectangle layout');
    expect(output).toContain('🏰 Variation 2: cavernous layout');
  });

  it('should save variations to files', async () => {
    execSync(`pnpm doa variations --seed testfiles --count 2 --output-dir "${testOutputDir}" --prefix test-dungeon`, { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    // Check that files were created
    const files = await fs.readdir(testOutputDir);
    expect(files).toContain('test-dungeon-1.json');
    expect(files).toContain('test-dungeon-1.txt');
    expect(files).toContain('test-dungeon-2.json');
    expect(files).toContain('test-dungeon-2.txt');
    
    // Check file contents
    const asciiContent = await fs.readFile(join(testOutputDir, 'test-dungeon-1.txt'), 'utf-8');
    expect(asciiContent).toContain('#'); // Should contain room walls
    expect(asciiContent).toContain('+'); // Should contain corridors
    
    const jsonContent = await fs.readFile(join(testOutputDir, 'test-dungeon-1.json'), 'utf-8');
    const dungeon = JSON.parse(jsonContent);
    expect(dungeon).toHaveProperty('rooms');
    expect(dungeon).toHaveProperty('doors');
    expect(dungeon).toHaveProperty('corridors');
  });

  it('should generate size variations', () => {
    const output = execSync('pnpm doa variations --seed testsizes --sizes 30x30,50x50', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    expect(output).toContain('🏰 Variation 1: 30x30 size');
    expect(output).toContain('🏰 Variation 2: 50x50 size');
  });

  it('should generate corridor type variations', () => {
    const output = execSync('pnpm doa variations --seed testcorridors --corridors straight,winding', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    expect(output).toContain('🏰 Variation 1: straight corridors');
    expect(output).toContain('🏰 Variation 2: winding corridors');
  });

  it('should generate room shape variations', () => {
    const output = execSync('pnpm doa variations --seed testshapes --shapes rectangular,diverse', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    expect(output).toContain('🏰 Variation 1: rectangular room shapes');
    expect(output).toContain('🏰 Variation 2: diverse room shapes');
  });

  it('should handle various --vary parameter types', () => {
    const varyTypes = ['layout', 'rooms', 'size', 'corridors', 'shapes'];
    
    for (const varyType of varyTypes) {
      const output = execSync(`pnpm doa variations --seed test-${varyType} --vary ${varyType} --count 2`, { 
        encoding: 'utf-8',
        timeout: 30000 
      });
      
      expect(output).toContain('🎲 Generating 2 dungeon variations');
      expect(output).toContain(`📍 Base seed: test-${varyType}`);
      expect(output).toContain('✅ All variations generated successfully!');
    }
  });

  it('should use deterministic seed derivation', () => {
    // Generate the same variations twice
    const output1 = execSync('pnpm doa variations --seed deterministic --rooms 5,8', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    const output2 = execSync('pnpm doa variations --seed deterministic --rooms 5,8', { 
      encoding: 'utf-8',
      timeout: 30000 
    });
    
    // The room/door/corridor counts should be identical for same derived seeds
    const extractStats = (output: string) => {
      const roomMatches = output.match(/📊 Rooms: (\d+)/g);
      const doorMatches = output.match(/🚪 Doors: (\d+)/g);
      return { rooms: roomMatches, doors: doorMatches };
    };
    
    const stats1 = extractStats(output1);
    const stats2 = extractStats(output2);
    
    expect(stats1.rooms).toEqual(stats2.rooms);
    expect(stats1.doors).toEqual(stats2.doors);
  });

  it('should handle invalid variation parameter', () => {
    expect(() => {
      execSync('pnpm doa variations --vary invalid', { 
        encoding: 'utf-8',
        timeout: 10000 
      });
    }).toThrow(); // Should error with unknown parameter
  });
});