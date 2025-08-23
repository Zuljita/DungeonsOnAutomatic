import { Command } from "commander";
import { buildDungeon } from "../../services/assembler";
import { loadSystemModule } from "../../services/system-loader";
import type { SystemModule } from "../../core/types";
import { renderAscii } from "../../services/render";
import { exportFoundry } from "../../services/foundry";
import { createDefaultPluginLoader } from "../../services/plugin-loader";
import { isExportPlugin } from "../../core/plugin-types";
import crypto from "node:crypto";

interface VariationConfig {
  name: string;
  options: Record<string, any>;
}

export function createVariationsCommand(): Command {
  return new Command("variations")
    .description("Generate multiple variations of the same dungeon concept")
    .option("--seed <seed>", "base random seed for all variations")
    .option("--count <n>", "number of variations to generate", (v) => parseInt(v, 10), 3)
    .option("--vary <parameter>", "parameter to vary (layout, rooms, size, corridors, shapes)")
    .option("--rooms <rooms...>", "specific room counts to compare (e.g., 5,8,12)")
    .option("--layouts <layouts...>", "specific layouts to compare (e.g., rectangle,hexagon,cavernous)")  
    .option("--sizes <sizes...>", "specific map sizes to compare (e.g., 30x30,50x50,80x80)")
    .option("--corridors <corridors...>", "specific corridor types to compare (e.g., straight,winding,maze)")
    .option("--shapes <shapes...>", "specific room shapes to compare (e.g., rectangular,circular,diverse)")
    .option("--system <name>", "system module to use (generic|dfrpg)", "generic")
    .option("--ascii", "output ASCII maps for all variations")
    .option("--svg", "output SVG maps for all variations")
    .option("--foundry", "output FoundryVTT JSON for all variations")
    .option("--output-dir <dir>", "directory to save variations (creates files)")
    .option("--prefix <prefix>", "filename prefix for saved variations", "dungeon")
    .action(async (opts) => {
      try {
        await handleVariations(opts);
      } catch (err) {
        console.error("Error generating variations:", (err as Error).message);
        process.exitCode = 1;
      }
    });
}

async function handleVariations(opts: any): Promise<void> {
  const baseSeed = opts.seed || generateRandomSeed();
  const system = await loadSystemModule(opts.system);
  
  console.log(`🎲 Generating ${opts.count || 3} dungeon variations`);
  console.log(`📍 Base seed: ${baseSeed}`);
  console.log(`⚙️  System: ${opts.system}`);
  console.log();

  // Determine what to vary
  const variations = await generateVariationConfigs(opts, baseSeed);
  
  // Generate each variation
  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const variationNumber = i + 1;
    
    console.log(`🏰 Variation ${variationNumber}: ${variation.name}`);
    console.log("─".repeat(50));
    
    try {
      // Build the dungeon with variation-specific options
      const dungeon = buildDungeon({
        seed: variation.options.seed,
        ...variation.options,
      });

      // Enrich with system content
      if (system && system.enrich) {
        await system.enrich(dungeon, variation.options);
      }

      // Output the variation
      await outputVariation(dungeon, variation, variationNumber, opts);
      
    } catch (error) {
      console.error(`❌ Failed to generate variation ${variationNumber}: ${(error as Error).message}`);
    }
    
    console.log(); // Blank line between variations
  }
  
  console.log("✅ All variations generated successfully!");
}

async function generateVariationConfigs(opts: any, baseSeed: string): Promise<VariationConfig[]> {
  const variations: VariationConfig[] = [];
  
  // Handle specific parameter lists
  if (opts.rooms) {
    const roomCounts = parseCommaList(opts.rooms);
    return roomCounts.map((rooms, i) => ({
      name: `${rooms} rooms`,
      options: {
        seed: deriveSeed(baseSeed, `rooms-${rooms}`),
        rooms: parseInt(rooms, 10),
      }
    }));
  }
  
  if (opts.layouts) {
    const layouts = parseCommaList(opts.layouts);
    return layouts.map((layout, i) => ({
      name: `${layout} layout`,
      options: {
        seed: deriveSeed(baseSeed, `layout-${layout}`),
        layoutType: layout,
      }
    }));
  }
  
  if (opts.sizes) {
    const sizes = parseCommaList(opts.sizes);
    return sizes.map((size, i) => {
      const [width, height] = size.split('x').map(n => parseInt(n, 10));
      return {
        name: `${width}x${height} size`,
        options: {
          seed: deriveSeed(baseSeed, `size-${size}`),
          width,
          height,
        }
      };
    });
  }
  
  if (opts.corridors) {
    const corridorTypes = parseCommaList(opts.corridors);
    return corridorTypes.map((type, i) => ({
      name: `${type} corridors`,
      options: {
        seed: deriveSeed(baseSeed, `corridors-${type}`),
        corridorType: type,
      }
    }));
  }
  
  if (opts.shapes) {
    const shapes = parseCommaList(opts.shapes);
    return shapes.map((shape, i) => ({
      name: `${shape} room shapes`,
      options: {
        seed: deriveSeed(baseSeed, `shapes-${shape}`),
        roomShape: shape,
      }
    }));
  }
  
  // Handle automatic variations based on --vary parameter
  const count = opts.count || 3;
  const varyParam = opts.vary || 'layout';
  
  switch (varyParam) {
    case 'layout':
      const layouts = ['rectangle', 'hexagon', 'cavernous', 'cross', 'keep'];
      return layouts.slice(0, count).map((layout, i) => ({
        name: `${layout} layout`,
        options: {
          seed: deriveSeed(baseSeed, `layout-${layout}`),
          layoutType: layout,
        }
      }));
      
    case 'rooms':
      const roomCounts = [5, 8, 12, 16, 20];
      return roomCounts.slice(0, count).map((rooms, i) => ({
        name: `${rooms} rooms`,
        options: {
          seed: deriveSeed(baseSeed, `rooms-${rooms}`),
          rooms,
        }
      }));
      
    case 'size':
      const sizes = [
        { width: 30, height: 30, name: '30x30' },
        { width: 50, height: 50, name: '50x50' },
        { width: 80, height: 80, name: '80x80' },
      ];
      return sizes.slice(0, count).map((size, i) => ({
        name: `${size.name} size`,
        options: {
          seed: deriveSeed(baseSeed, `size-${size.name}`),
          width: size.width,
          height: size.height,
        }
      }));
      
    case 'corridors':
      const corridorTypes = ['straight', 'winding', 'maze'];
      return corridorTypes.slice(0, count).map((type, i) => ({
        name: `${type} corridors`,
        options: {
          seed: deriveSeed(baseSeed, `corridors-${type}`),
          corridorType: type,
        }
      }));
      
    case 'shapes':
      const shapes = ['rectangular', 'diverse', 'circular-preference'];
      return shapes.slice(0, count).map((shape, i) => ({
        name: `${shape} room shapes`,
        options: {
          seed: deriveSeed(baseSeed, `shapes-${shape}`),
          roomShape: shape,
        }
      }));
      
    default:
      throw new Error(`Unknown variation parameter: ${varyParam}. Use: layout, rooms, size, corridors, or shapes`);
  }
}

async function outputVariation(
  dungeon: any, 
  variation: VariationConfig, 
  variationNumber: number, 
  opts: any
): Promise<void> {
  
  // Console output
  if (opts.ascii) {
    console.log("ASCII Map:");
    try {
      const ascii = renderAscii(dungeon);
      console.log(ascii);
    } catch (error) {
      console.error("Failed to render ASCII:", (error as Error).message);
    }
  } else {
    // Default: show basic info
    console.log(`📊 Rooms: ${dungeon.rooms?.length || 0}`);
    console.log(`📐 Size: ${dungeon.width || 'default'}x${dungeon.height || 'default'}`);
    console.log(`🚪 Doors: ${dungeon.doors?.length || 0}`);
    console.log(`🛤️  Corridors: ${dungeon.corridors?.length || 0} segments`);
  }
  
  // File output
  if (opts.outputDir) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    
    await fs.mkdir(opts.outputDir, { recursive: true });
    
    const baseFilename = `${opts.prefix || 'dungeon'}-${variationNumber}`;
    
    if (opts.ascii || !opts.svg && !opts.foundry) {
      const ascii = renderAscii(dungeon);
      const filename = path.join(opts.outputDir, `${baseFilename}.txt`);
      await fs.writeFile(filename, ascii);
      console.log(`💾 Saved: ${filename}`);
    }
    
    if (opts.svg) {
      // Note: SVG rendering would need to be implemented
      console.log("⚠️  SVG output not yet implemented");
    }
    
    if (opts.foundry) {
      const foundryData = exportFoundry(dungeon);
      const filename = path.join(opts.outputDir, `${baseFilename}-foundry.json`);
      await fs.writeFile(filename, JSON.stringify(foundryData, null, 2));
      console.log(`💾 Saved: ${filename}`);
    }
    
    // Always save JSON
    const filename = path.join(opts.outputDir, `${baseFilename}.json`);
    await fs.writeFile(filename, JSON.stringify(dungeon, null, 2));
    console.log(`💾 Saved: ${filename}`);
  }
}

function generateRandomSeed(): string {
  return crypto.randomBytes(4).toString('hex');
}

function deriveSeed(baseSeed: string, suffix: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${baseSeed}-${suffix}`);
  return hash.digest('hex').substring(0, 8);
}

function parseCommaList(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.flatMap(item => item.split(','));
  }
  return input.split(',').map(item => item.trim());
}