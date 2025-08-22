import { describe, it, expect, beforeEach } from 'vitest';
import plugin from '../src/plugins/svg-export';
import { lightTheme, darkTheme, sepiaTheme } from '../src/plugins/svg-export';
import { buildDungeon } from '../src/services/assembler';
import type { Dungeon } from '../src/core/types';

describe('SVG Export Plugin', () => {
  let testDungeon: Dungeon;

  beforeEach(() => {
    testDungeon = buildDungeon({
      rooms: 3,
      width: 40,
      height: 30,
      seed: 'test-svg'
    });
  });

  it('should implement ExportPlugin interface correctly', () => {
    expect(plugin.metadata.id).toBe('svg-export');
    expect(plugin.supportedFormats).toContain('svg');
    expect(typeof plugin.export).toBe('function');
  });

  it('should export basic SVG with default options', async () => {
    const result = await plugin.export(testDungeon, 'svg', {});
    
    expect(result.format).toBe('svg');
    expect(result.contentType).toBe('image/svg+xml');
    expect(typeof result.data).toBe('string');
    expect(result.data).toContain('<svg');
    expect(result.data).toContain('</svg>');
    expect(result.data).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should support light theme', async () => {
    const result = await plugin.export(testDungeon, 'svg', {
      theme: 'light'
    });
    
    const svgContent = result.data as string;
    expect(svgContent).toContain(lightTheme.background);
    expect(svgContent).toContain(lightTheme.roomStroke);
  });

  it('should support dark theme', async () => {
    const result = await plugin.export(testDungeon, 'svg', {
      theme: 'dark'
    });
    
    const svgContent = result.data as string;
    expect(svgContent).toContain(darkTheme.background);
    expect(svgContent).toContain(darkTheme.roomStroke);
  });

  it('should support sepia theme', async () => {
    const result = await plugin.export(testDungeon, 'svg', {
      theme: 'sepia'
    });
    
    const svgContent = result.data as string;
    expect(svgContent).toContain(sepiaTheme.background);
    expect(svgContent).toContain(sepiaTheme.roomStroke);
  });

  it('should support custom themes', async () => {
    const customTheme = {
      background: '#123456',
      corridorFill: '#654321',
      roomFill: '#abcdef',
      roomStroke: '#fedcba',
      textFill: '#111111'
    };

    const result = await plugin.export(testDungeon, 'svg', {
      theme: customTheme
    });
    
    const svgContent = result.data as string;
    expect(svgContent).toContain(customTheme.background);
    expect(svgContent).toContain(customTheme.roomStroke);
  });

  it('should handle invalid custom themes gracefully', async () => {
    const invalidTheme = {
      background: '#123456',
      // Missing required properties
    };

    const result = await plugin.export(testDungeon, 'svg', {
      theme: invalidTheme
    });
    
    // Should fall back to light theme
    const svgContent = result.data as string;
    expect(svgContent).toContain(lightTheme.background);
  });

  it('should support custom cell size', async () => {
    const result = await plugin.export(testDungeon, 'svg', {
      cellSize: 30
    });
    
    const svgContent = result.data as string;
    expect(svgContent).toContain('<svg');
    
    // Should use custom cell size for calculations
    // (this would show up in the viewBox or element coordinates)
    expect(result.data).toBeDefined();
  });

  it('should render rooms with correct data attributes', async () => {
    const result = await plugin.export(testDungeon, 'svg', {});
    
    const svgContent = result.data as string;
    expect(svgContent).toContain('class="room-shape"');
    expect(svgContent).toContain('data-room="1"');
    expect(svgContent).toContain('class="room-number"');
  });

  it('should render doors with correct data attributes', async () => {
    const result = await plugin.export(testDungeon, 'svg', {});
    
    const svgContent = result.data as string;
    expect(svgContent).toContain('class="door-icon"');
    expect(svgContent).toMatch(/data-door="[^"]+"/);
  });

  it('should render key items when present', async () => {
    // Add a key item to test dungeon
    testDungeon.keyItems = [{
      id: 'test-key',
      name: 'Test Key',
      description: 'A test key',
      locationId: testDungeon.rooms[0].id
    }];

    const result = await plugin.export(testDungeon, 'svg', {});
    
    const svgContent = result.data as string;
    expect(svgContent).toContain('class="key-icon"');
    expect(svgContent).toContain('data-key="test-key"');
    expect(svgContent).toContain('&#x1F511;'); // Key emoji
  });

  it('should support hex style rendering', async () => {
    const result = await plugin.export(testDungeon, 'svg', {
      style: 'hex',
      hexSize: 25
    });
    
    const svgContent = result.data as string;
    expect(svgContent).toContain('<polygon');
    expect(svgContent).toContain('class="hex-cell"');
  });

  it('should reject unsupported formats', async () => {
    await expect(
      plugin.export(testDungeon, 'pdf', {})
    ).rejects.toThrow('Unsupported format: pdf');
  });

  it('should set proper filename', async () => {
    const result = await plugin.export(testDungeon, 'svg', {
      filename: 'my-dungeon.svg'
    });
    
    expect(result.filename).toBe('my-dungeon.svg');
  });

  it('should use default filename when not specified', async () => {
    const result = await plugin.export(testDungeon, 'svg', {});
    
    expect(result.filename).toBe('dungeon.svg');
  });
});

describe('SVG Theme Utilities', () => {
  it('should provide available themes', () => {
    const themes = plugin.getAvailableThemes();
    
    expect(themes.light).toEqual(lightTheme);
    expect(themes.dark).toEqual(darkTheme);
    expect(themes.sepia).toEqual(sepiaTheme);
  });

  it('should create custom themes by extending base themes', () => {
    const custom = plugin.createCustomTheme('dark', {
      background: '#ff0000'
    });
    
    expect(custom.background).toBe('#ff0000');
    expect(custom.roomStroke).toBe(darkTheme.roomStroke); // Should inherit other properties
    expect(custom.corridorFill).toBe(darkTheme.corridorFill);
  });
});