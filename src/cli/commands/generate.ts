import { Command } from "commander";
import { buildDungeon } from "../../services/assembler";
import { loadSystemModule } from "../../services/system-loader";
import type { SystemModule } from "../../core/types";
import { renderAscii } from "../../services/render";
import { renderDebugAscii } from "../../services/debug-ascii-render";
import { exportFoundry } from "../../services/foundry";
import { createDefaultPluginLoader } from "../../services/plugin-loader";
import { isExportPlugin } from "../../core/plugin-types";

export function createGenerateCommand(): Command {
  return new Command("generate")
    .description("Generate a dungeon")
    .option("--list-systems", "List available systems including plugins")
    .option("--plugin-info <system>", "Show plugin-specific options for a system plugin")
    .option("--rooms <n>", "number of rooms", (v) => parseInt(v, 10))
    .option("--width <n>", "map width", (v) => parseInt(v, 10))
    .option("--height <n>", "map height", (v) => parseInt(v, 10))
    .option("--seed <seed>", "random seed")
    .option("--layout-type <type>", "advanced layout type (rectangle, square, box, cross, etc.)")
    .option("--corridor-type <type>", "corridor generation type (maze, winding, straight, mixed)")
    .option("--corridor-width <width>", "corridor width in tiles (1, 2, or 3)", (v) =>
      parseInt(v, 10),
    )
    .option("--room-layout <layout>", "room layout style (sparse, scattered, dense, symmetric)")
    .option(
      "--room-shape <shape>",
      "room shape preference (rectangular, diverse, hex-preference, circular-preference, mixed)",
    )
    .option(
      "--template <id>",
      "apply a dungeon template (use 'doa templates' to see available options)",
    )
    .option("--stairs-up", "include stairs up to upper level")
    .option("--stairs-down", "include stairs down to lower level")
    .option("--entrance-from-periphery", "include entrance from outside")
    .option("--system <name>", "system module to use (generic|dfrpg)", "generic")
    .option("--source <src...>", "sources to include (system-specific)")
    .option("--theme <id>", "theme id to apply to rooms and encounters")
    .option(
      "--monster-tag <tag>",
      "require monsters to include tag (repeatable)",
      (v, p) => [...p, v],
      [] as string[],
    )
    .option(
      "--trap-tag <tag>",
      "require traps to include tag (repeatable)",
      (v, p) => [...p, v],
      [] as string[],
    )
    .option(
      "--treasure-tag <tag>",
      "require treasure to include tag (repeatable)",
      (v, p) => [...p, v],
      [] as string[],
    )
    .option("--map-style <style>", "map rendering style (classic, hand-drawn, hex, gridless)", "classic")
    .option("--sketch-intensity <n>", "hand-drawn sketch intensity", (v) => parseFloat(v), 1)
    .option("--texture <name>", "background texture (none, paper)", "none")
    .option("--palette <name>", "color palette (light, dark, sepia)", "light")
    .option("--lock-percentage <n>", "fraction of doors to lock (0-1)", (v) => parseFloat(v))
    .option("--magical-locks", "allow magical locks")
    .option("--treasure-balance", "enable encounter-appropriate treasure balancing")
    .option("--wealth-level <level>", "campaign wealth level (conservative, standard, generous)", "standard")
    .option("--boss-room-minimum <n>", "minimum treasure value for boss rooms", (v) => parseInt(v), 1000)
    .option("--enhanced-treasure", "enable expanded treasure database with 200+ items")
    .option("--dfrpg-rules", "use DFRPG rules-compliant generation with Cost Factors and enchantments")
    .option("--treasure-theme <theme>", "treasure theme (default, warrior, wizard, thief, holy, nature, undead)", "default")
    .option("--treasure-wealth <level>", "treasure wealth level (poor, average, wealthy, rich)", "average")
    .option("--magic-frequency <n>", "magic item frequency multiplier", (v) => parseFloat(v), 1.0)
    .option("--ascii", "render an ASCII map instead of JSON output")
    .option("--debug-ascii", "render a high-resolution debug ASCII map with coordinates and corridor analysis")
    .option("--debug-scale <n>", "scale factor for debug ASCII (default: 10)", (v) => parseInt(v))
    .option("--svg", "render an SVG map instead of JSON output")
    .option("--foundry", "output FoundryVTT-compatible JSON")
    .option("--export-format <format>", "use an export plugin for the given format")
    .option("--donjon", "shorthand for --export-format donjon")
    .option("--export-page-size <size>", "PDF page size (a4|letter|legal)")
    .option("--export-layout <layout>", "PDF layout (map-only|with-keys|detailed)")
    .option("--export-color-mode <mode>", "PDF color mode (color|monochrome)")
    .action(async (opts) => {
      if (opts.listSystems) {
        await handleListSystems();
        return;
      }
      
      if (opts.pluginInfo) {
        await handlePluginInfo(opts.pluginInfo);
        return;
      }

      await handleGenerate(opts);
    });
}

async function handleListSystems(): Promise<void> {
  const loader = createDefaultPluginLoader();
  let plugins: string[] = [];
  try {
    const infos = await loader.discover();
    plugins = infos.filter((p) => p.type === 'system').map((p) => p.metadata.id);
  } catch {}
  const systems = ['generic', 'dfrpg', ...plugins];
  process.stdout.write(JSON.stringify(systems, null, 2) + "\n");
}

async function handlePluginInfo(systemId: string): Promise<void> {
  const loader = createDefaultPluginLoader();
  await loader.discover();
  try {
    const plugin: any = await loader.load(systemId, { sandbox: false });
    const schema = plugin.getConfigSchema?.();
    if (schema?.cliOptions) {
      process.stdout.write(JSON.stringify(schema.cliOptions, null, 2) + "\n");
    } else {
      console.log('No plugin-specific options');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exitCode = 1;
  }
}

async function handleGenerate(opts: any): Promise<void> {
  const d = buildDungeon({
    rooms: opts.rooms,
    seed: opts.seed,
    width: opts.width,
    height: opts.height,
    template: opts.template,
    layoutType: opts.layoutType,
    roomLayout: opts.roomLayout,
    corridorType: opts.corridorType,
    corridorWidth: opts.corridorWidth,
    roomShape: opts.roomShape,
    stairsUp: opts.stairsUp,
    stairsDown: opts.stairsDown,
    entranceFromPeriphery: opts.entranceFromPeriphery,
  });
  
  let sys: SystemModule;
  try {
    sys = await loadSystemModule(opts.system, d.rng);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    sys = await loadSystemModule("generic", d.rng);
  }
  
  const tagOptions =
    opts.theme || opts.monsterTag.length || opts.trapTag.length || opts.treasureTag.length
      ? {
          theme: opts.theme,
          monsters: opts.monsterTag.length ? { requiredTags: opts.monsterTag } : undefined,
          traps: opts.trapTag.length ? { requiredTags: opts.trapTag } : undefined,
          treasure: opts.treasureTag.length ? { requiredTags: opts.treasureTag } : undefined,
        }
      : undefined;
      
  const lockOptions =
    opts.lockPercentage !== undefined || opts.magicalLocks
      ? {
          lockOptions: {
            ...(opts.lockPercentage !== undefined ? { lockPercentage: opts.lockPercentage } : {}),
            ...(opts.magicalLocks ? { allowMagicalLocks: true } : {}),
          },
        }
      : undefined;
      
  const treasureBalanceOptions =
    opts.treasureBalance
      ? {
          treasureBalance: {
            useEncounterBalancing: true,
            targetWealthLevel: opts.wealthLevel as 'conservative' | 'standard' | 'generous',
            minimumBossRoomValue: opts.bossRoomMinimum,
            guaranteedBossRoomMagicItems: true,
            specialRoomMultiplier: 1.5
          },
        }
      : undefined;
      
  const enhancedTreasureOptions =
    opts.enhancedTreasure || opts.dfrpgRules
      ? {
          enhancedTreasure: {
            useExpandedData: true,
            useDFRPGRules: opts.dfrpgRules || false,
            treasureTheme: opts.treasureTheme as 'default' | 'warrior' | 'wizard' | 'thief' | 'holy' | 'nature' | 'undead',
            wealthLevel: opts.treasureWealth as 'poor' | 'average' | 'wealthy' | 'rich',
            magicItemFrequency: opts.magicFrequency,
            minimumRarity: 'common' as const,
            maximumRarity: 'legendary' as const
          },
        }
      : undefined;
      
  const enriched = await sys.enrich(d, {
    sources: opts.source,
    tags: tagOptions,
    ...(lockOptions || {}),
    ...(treasureBalanceOptions || {}),
    ...(enhancedTreasureOptions || {}),
  });

  await handleOutput(enriched, opts);
}

async function handleOutput(enriched: any, opts: any): Promise<void> {
  const exportFormat = opts.exportFormat || (opts.donjon ? 'donjon' : undefined);

  // Handle exports
  if (exportFormat) {
    await handleExportPlugin(enriched, exportFormat, opts);
  } else if (opts.svg) {
    await handleSvgOutput(enriched, opts);
  } else if (opts.debugAscii) {
    handleDebugAsciiOutput(enriched, opts);
  } else if (opts.ascii) {
    await handleAsciiOutput(enriched);
  } else if (opts.foundry) {
    handleFoundryOutput(enriched);
  } else {
    handleJsonOutput(enriched);
  }
}

async function handleExportPlugin(enriched: any, exportFormat: string, opts: any): Promise<void> {
  const pluginLoader = createDefaultPluginLoader();
  await pluginLoader.discover();
  const infos = pluginLoader.getRegistry();
  let handled = false;
  
  for (const info of infos) {
    try {
      const plugin = await pluginLoader.load(info.metadata.id, { sandbox: false });
      if (isExportPlugin(plugin) && plugin.supportedFormats.includes(exportFormat)) {
        const result = await plugin.export(enriched, exportFormat, {
          pageSize: opts.exportPageSize,
          layout: opts.exportLayout,
          colorMode: opts.exportColorMode,
          filename: `dungeon.${exportFormat}`,
        });
        if (typeof result.data === 'string') {
          process.stdout.write(result.data + "\n");
        } else {
          process.stdout.write(result.data as any);
        }
        handled = true;
        break;
      }
    } catch (err) {
      console.error(`Error processing export plugin ${info.metadata.id}: ${err}`);
    }
  }
  
  if (!handled) {
    console.error(`No export plugin found for format: ${exportFormat}`);
  }
}

async function handleSvgOutput(enriched: any, opts: any): Promise<void> {
  // Use SVG export plugin
  try {
    const pluginLoader = createDefaultPluginLoader();
    const plugin = await pluginLoader.load("svg-export", { sandbox: false });
    if (isExportPlugin(plugin)) {
      const result = await plugin.export(enriched, "svg", {
        style: opts.mapStyle,
        theme: opts.palette || 'light',
        wobbleIntensity: opts.sketchIntensity || 1,
        wallThickness: 1,
        showGrid: false,
      });
      process.stdout.write(result.data + "\n");
    } else {
      throw new Error("svg-export plugin is not an export plugin");
    }
  } catch (err) {
    console.error("Error using SVG export plugin:", err);
    process.exit(1);
  }
}

function handleDebugAsciiOutput(enriched: any, opts: any): void {
  const scale = opts.debugScale || 10;  // Default to 10x resolution
  process.stdout.write(renderDebugAscii(enriched, {
    scale,
    showGrid: true,
    showRoomCenters: true,
    showDoors: true,
    showKeys: true,
    showCorridorConnections: true,
    showConnectionAnalysis: true
  }) + "\n");
}

async function handleAsciiOutput(enriched: any): Promise<void> {
  try {
    const pluginLoader = createDefaultPluginLoader();
    const plugin = await pluginLoader.load("ascii-export", { sandbox: false });
    if (isExportPlugin(plugin)) {
      const result = await plugin.export(enriched, "ascii");
      process.stdout.write(result.data + "\n");
    } else {
      throw new Error("ascii-export plugin is not an export plugin");
    }
  } catch (err) {
    console.error("Warning: ASCII plugin failed, using fallback:", err);
    process.stdout.write(renderAscii(enriched) + "\n");
  }
}

function handleFoundryOutput(enriched: any): void {
  process.stdout.write(JSON.stringify(exportFoundry(enriched), null, 2) + "\n");
}

function handleJsonOutput(enriched: any): void {
  process.stdout.write(JSON.stringify(enriched, null, 2) + "\n");
}