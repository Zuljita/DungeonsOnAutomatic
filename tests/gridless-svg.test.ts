import { describe, it, expect } from 'vitest';
import type { Dungeon } from '../src/core/types';
import svgExportPlugin from '../src/plugins/svg-export';

describe('SVG Plugin - Gridless Rendering', () => {
  const mockDungeon: Dungeon = {
    rooms: [
      { id: 'r1', x: 5, y: 5, w: 4, h: 3, shape: 'rectangular' },
      { id: 'r2', x: 12, y: 8, w: 3, h: 4, shape: 'rectangular' },
    ],
    corridors: [
      {
        id: 'c1',
        from: 'r1',
        to: 'r2',
        path: [
          { x: 9, y: 6 },
          { x: 10, y: 6 },
          { x: 11, y: 6 },
          { x: 11, y: 7 },
          { x: 11, y: 8 },
          { x: 12, y: 8 },
        ],
        doorStart: { x: 9, y: 6 },
        doorEnd: { x: 12, y: 8 },
      },
    ],
    doors: [],
    keyItems: [],
  };

  it('should render gridless SVG with smooth corridor paths', async () => {
    const result = await svgExportPlugin.export(mockDungeon, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'light'
    });

    expect(result.format).toBe('svg');
    expect(result.contentType).toBe('image/svg+xml');
    expect(typeof result.data).toBe('string');
    
    const svgContent = result.data as string;
    
    // Should contain path elements for corridors instead of rect elements
    expect(svgContent).toContain('<path d=');
    expect(svgContent).toContain('stroke-linecap="round"');
    expect(svgContent).toContain('stroke-linejoin="round"');
    
    // Should not contain individual corridor rect elements for gridless style
    expect(svgContent).not.toMatch(/<rect[^>]*class="corridor"/);
  });

  it('should render rooms with thicker borders for gridless style', async () => {
    const result = await svgExportPlugin.export(mockDungeon, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'light'
    });
    
    const svgContent = result.data as string;
    
    // Rooms should have thicker stroke-width
    expect(svgContent).toContain('stroke-width="2"');
    // Should still contain room rectangles
    expect(svgContent).toContain('class="room-shape"');
  });

  it('should render door openings as background-colored lines', async () => {
    const result = await svgExportPlugin.export(mockDungeon, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'light'
    });
    
    const svgContent = result.data as string;
    
    // Should contain door openings with background color
    expect(svgContent).toContain('class="door-opening"');
    expect(svgContent).toContain('stroke="#ffffff"'); // Light theme background
    expect(svgContent).toContain('stroke-width="4"');
  });

  it('should work with different themes in gridless mode', async () => {
    const darkResult = await svgExportPlugin.export(mockDungeon, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'dark'
    });
    
    const darkSvg = darkResult.data as string;
    
    // Should use dark theme colors
    expect(darkSvg).toContain('fill="#000000"'); // Dark background
    expect(darkSvg).toContain('stroke="#000000"'); // Dark theme door openings
  });

  it('should handle empty dungeons gracefully in gridless mode', async () => {
    const emptyDungeon: Dungeon = {
      rooms: [],
      corridors: [],
      doors: [],
      keyItems: [],
    };

    const result = await svgExportPlugin.export(emptyDungeon, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'light'
    });

    expect(result.format).toBe('svg');
    expect(typeof result.data).toBe('string');
    
    const svgContent = result.data as string;
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
  });

  it('should support custom cell sizes in gridless mode', async () => {
    const result = await svgExportPlugin.export(mockDungeon, 'svg', {
      style: 'gridless',
      cellSize: 30,
      theme: 'light'
    });
    
    const svgContent = result.data as string;
    
    // Should scale elements with larger cell size
    expect(svgContent).toContain('stroke-width="24"'); // 30 * 0.8 for corridors
    expect(svgContent).toContain('width="120"'); // Room width scaled
  });

  it('should render key items in gridless mode', async () => {
    const dungeonWithKeys: Dungeon = {
      ...mockDungeon,
      keyItems: [
        { id: 'key1', locationId: 'r1' }
      ]
    };

    const result = await svgExportPlugin.export(dungeonWithKeys, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'light'
    });
    
    const svgContent = result.data as string;
    
    // Should contain key icon
    expect(svgContent).toContain('class="key-icon"');
    expect(svgContent).toContain('&#x1F511;'); // Unicode key symbol
  });

  it('should create smooth paths for complex corridor routes', async () => {
    const complexDungeon: Dungeon = {
      rooms: [
        { id: 'r1', x: 2, y: 2, w: 2, h: 2, shape: 'rectangular' },
        { id: 'r2', x: 10, y: 8, w: 2, h: 2, shape: 'rectangular' },
      ],
      corridors: [
        {
          id: 'c1',
          from: 'r1',
          to: 'r2',
          path: [
            { x: 4, y: 3 }, // Start from room 1
            { x: 5, y: 3 }, // Go right
            { x: 6, y: 3 },
            { x: 7, y: 3 },
            { x: 7, y: 4 }, // Turn down
            { x: 7, y: 5 },
            { x: 7, y: 6 },
            { x: 7, y: 7 },
            { x: 8, y: 7 }, // Turn right again  
            { x: 9, y: 7 },
            { x: 10, y: 7 },
            { x: 10, y: 8 }, // Turn down to room 2
          ],
        },
      ],
      doors: [],
      keyItems: [],
    };

    const result = await svgExportPlugin.export(complexDungeon, 'svg', {
      style: 'gridless',
      cellSize: 20,
      theme: 'light'
    });
    
    const svgContent = result.data as string;
    
    // Should contain a single smooth path element for the corridor
    const pathMatches = svgContent.match(/<path[^>]*d="[^"]*"/g);
    expect(pathMatches).toBeTruthy();
    expect(pathMatches!.length).toBe(1);
    
    // Path should contain multiple line-to commands
    const pathData = pathMatches![0].match(/d="([^"]*)"/)?.[1];
    expect(pathData).toContain('M '); // Move to start
    expect(pathData).toContain('L '); // Line to commands for turns
  });
});