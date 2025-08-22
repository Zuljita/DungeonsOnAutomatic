#!/usr/bin/env node
import { Command } from "commander";
import { buildDungeon } from "../services/assembler";
import { loadSystemModule } from "../services/system-loader";
import type { SystemModule } from "../core/types";
import { renderAscii } from "../services/render";
import { renderDebugAscii } from "../services/debug-ascii-render";
import { exportFoundry } from "../services/foundry";
import { dungeonTemplateService } from "../services/dungeon-templates";
import { createDefaultPluginLoader } from "../services/plugin-loader";
import { isExportPlugin } from "../core/plugin-types";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const program = new Command();
program.name("doa").description("DungeonsOnAutomatic – modular dungeon generator").version("0.1.0");

program
  .command("generate")
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
  .option("--pathfinding-algorithm <algorithm>", "pathfinding algorithm (manhattan, astar, jumppoint, dijkstra)", "manhattan")
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
  .option("--map-style <style>", "map rendering style (classic, hand-drawn, hex)", "classic")
  .option("--sketch-intensity <n>", "hand-drawn sketch intensity", (v) => parseFloat(v), 1)
  .option("--texture <name>", "background texture (none, paper)", "none")
  .option("--palette <name>", "color palette (light, dark, sepia)", "light")
  .option("--lock-percentage <n>", "fraction of doors to lock (0-1)", (v) => parseFloat(v))
  .option("--magical-locks", "allow magical locks")
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
      const loader = createDefaultPluginLoader();
      let plugins: string[] = [];
      try {
        const infos = await loader.discover();
        plugins = infos.filter((p) => p.type === 'system').map((p) => p.metadata.id);
      } catch {}
      const systems = ['generic', 'dfrpg', ...plugins];
      process.stdout.write(JSON.stringify(systems, null, 2) + "\n");
      return;
    }
    if (opts.pluginInfo) {
      const loader = createDefaultPluginLoader();
      await loader.discover();
      try {
        const plugin: any = await loader.load(opts.pluginInfo, { sandbox: false });
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
      return;
    }

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
      pathfindingAlgorithm: opts.pathfindingAlgorithm,
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
    const enriched = await sys.enrich(d, {
      sources: opts.source,
      tags: tagOptions,
      ...(lockOptions || {}),
    });

    const exportFormat = opts.exportFormat || (opts.donjon ? 'donjon' : undefined);

    // Handle exports
    if (exportFormat) {
      const pluginLoader = createDefaultPluginLoader();
      await pluginLoader.discover();
      const infos = pluginLoader.getRegistry();
      let handled = false;
      for (const info of infos) {
        try {
          const plugin = await pluginLoader.load(info.metadata.id, { sandbox: false });
          if (isExportPlugin(plugin) && plugin.supportedFormats.includes(exportFormat)) {
            const exportOptions: any = {
              filename: `dungeon.${exportFormat}`,
            };

            // Add format-specific options
            if (exportFormat === 'svg') {
              exportOptions.theme = opts.palette || "light";
              exportOptions.style = opts.mapStyle;
              exportOptions.wobbleIntensity = opts.sketchIntensity || 1;
              exportOptions.wallThickness = 1;
              exportOptions.showGrid = false;
              exportOptions.cellSize = 20;
            } else {
              // For other formats (PDF, etc.)
              exportOptions.pageSize = opts.exportPageSize;
              exportOptions.layout = opts.exportLayout;
              exportOptions.colorMode = opts.exportColorMode;
            }

            const result = await plugin.export(enriched, exportFormat, exportOptions);
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
    } else if (opts.svg) {
      try {
        const pluginLoader = createDefaultPluginLoader();
        await pluginLoader.discover();
        const plugin = await pluginLoader.load("svg-export", { sandbox: false });
        if (isExportPlugin(plugin)) {
          const result = await plugin.export(enriched, "svg", {
            theme: opts.palette || "light", // light, dark, sepia
            style: opts.mapStyle,
            wobbleIntensity: opts.sketchIntensity || 1,
            wallThickness: 1,
            showGrid: false,
            cellSize: 20,
            filename: "dungeon.svg"
          });
          process.stdout.write(result.data + "\n");
        } else {
          throw new Error("svg-export plugin is not an export plugin");
        }
      } catch (err) {
        console.warn(`SVG plugin failed, using fallback: ${err}`);
        // Fallback to basic SVG rendering if plugin fails
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
          <text x="10" y="50" font-family="Arial" font-size="14" fill="red">
            SVG plugin not available. Run 'pnpm doa --export-format svg' to use plugin system.
          </text>
        </svg>`;
        process.stdout.write(svg + "\n");
      }
    } else if (opts.debugAscii) {
      // Use high-resolution debug ASCII renderer with corridor analysis
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
    } else if (opts.ascii) {
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
    } else if (opts.foundry) {
      process.stdout.write(JSON.stringify(exportFoundry(enriched), null, 2) + "\n");
    } else {
      process.stdout.write(JSON.stringify(enriched, null, 2) + "\n");
    }
  });

program
  .command("templates")
  .description("List available dungeon templates")
  .option("--category <cat>", "filter by category (classic, natural, fortress, maze, special)")
  .action((opts) => {
    const categories = dungeonTemplateService.getCategories();
    const templates = opts.category
      ? dungeonTemplateService.getTemplatesByCategory(opts.category)
      : dungeonTemplateService.getAllTemplates();

    if (opts.category) {
      const category = categories.find((c) => c.id === opts.category);
      console.log(`\n${category?.name || "Unknown Category"} Templates:\n`);
    } else {
      console.log("\nAvailable Dungeon Templates:\n");
      console.log("Categories:");
      categories.forEach((cat) => {
        const count = dungeonTemplateService.getTemplatesByCategory(cat.id).length;
        console.log(`  ${cat.id}: ${cat.name} (${count} templates)`);
      });
      console.log("\nTemplates:\n");
    }

    templates.forEach((template) => {
      console.log(`${template.id}:`);
      console.log(`  Name: ${template.name}`);
      console.log(`  Category: ${template.category}`);
      console.log(`  Description: ${template.description}`);
      console.log(`  Rooms: ${template.mapOptions.rooms || "default"}`);
      console.log(
        `  Size: ${template.mapOptions.width || "default"}x${
          template.mapOptions.height || "default"
        }`,
      );
      console.log(`  Layout: ${template.mapOptions.layoutType || "default"}`);
      if (template.recommendedSystem) {
        console.log(`  Recommended System: ${template.recommendedSystem}`);
      }
      console.log("");
    });

    if (templates.length === 0) {
      console.log("No templates found.");
    } else {
      console.log(`Use --template <id> with the generate command to apply a template.`);
      console.log(`Example: pnpm doa generate --template ${templates[0].id} --ascii`);
    }
  });

const plugins = program.command("plugins").description("Plugin discovery and management");

plugins
  .command("list")
  .description("Show all available plugins")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const loader = createDefaultPluginLoader();
    const infos = await loader.discover();
    if (opts.json) {
      process.stdout.write(JSON.stringify(infos, null, 2) + "\n");
      return;
    }
    for (const info of infos) {
      const status = info.enabled ? pc.green("enabled") : pc.red("disabled");
      console.log(`${info.metadata.id}\t${info.metadata.version}\t${info.type}\t${status}`);
    }
  });

plugins
  .command("search <term>")
  .description("Search plugins by name/description")
  .option("--json", "Output as JSON")
  .action(async (term, opts) => {
    const loader = createDefaultPluginLoader();
    const infos = await loader.discover();
    const found = infos.filter(
      (p) =>
        ((p.metadata as any).name || "").toLowerCase().includes(term.toLowerCase()) ||
        (p.metadata.description || "").toLowerCase().includes(term.toLowerCase()) ||
        p.metadata.id.includes(term),
    );
    if (opts.json) {
      process.stdout.write(JSON.stringify(found, null, 2) + "\n");
    } else {
      for (const info of found) {
        console.log(`${info.metadata.id}\t${info.metadata.version}\t${info.type}`);
      }
    }
  });

plugins
  .command("info <plugin>")
  .description("Show detailed plugin information")
  .option("--json", "Output as JSON")
  .action(async (id, opts) => {
    const loader = createDefaultPluginLoader();
    const infos = await loader.discover();
    const info = infos.find((p) => p.metadata.id === id);
    if (!info) {
      console.error(`Plugin not found: ${id}`);
      process.exitCode = 1;
      return;
    }
    if (opts.json) {
      process.stdout.write(JSON.stringify(info, null, 2) + "\n");
      return;
    }
    console.log(`ID: ${info.metadata.id}`);
    console.log(`Version: ${info.metadata.version}`);
    console.log(`Type: ${info.type}`);
    if (info.metadata.description) console.log(info.metadata.description);
    console.log(
      `Author: ${(info.metadata as any).author?.name || info.metadata.author || "Unknown"}`,
    );
    console.log(`License: ${(info.metadata as any).license || "Unknown"}`);
    console.log(`Compatibility: ${(info.metadata as any).compatibility || "Unknown"}`);
  });

plugins
  .command("install <src>")
  .description("Install plugin from npm or local path")
  .action(async (src) => {
    try {
      if (src.startsWith(".") || src.startsWith("/") || src.endsWith(".tgz")) {
        const abs = path.resolve(src);
        const destDir = path.resolve(process.cwd(), "plugins", path.basename(abs));
        await fs.mkdir(path.dirname(destDir), { recursive: true });
        await fs.cp(abs, destDir, { recursive: true });
        console.log(`Installed plugin from ${abs}`);
      } else {
        execSync(`pnpm add ${src}`, { stdio: "inherit" });
      }
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

plugins
  .command("uninstall <plugin>")
  .description("Remove installed plugin")
  .action(async (id) => {
    try {
      const dir = path.resolve(process.cwd(), "plugins", id);
      await fs.rm(dir, { recursive: true, force: true });
      try {
        execSync(`pnpm remove ${id}`, { stdio: "inherit" });
      } catch {}
      console.log(`Uninstalled ${id}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

plugins
  .command("update <plugin>")
  .description("Update plugin to latest version")
  .action(async (id) => {
    try {
      execSync(`pnpm update ${id}`, { stdio: "inherit" });
      console.log(`Updated ${id}`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

plugins
  .command("validate <plugin>")
  .description("Validate plugin without loading")
  .option("--json", "JSON output")
  .action(async (id, opts) => {
    const loader = createDefaultPluginLoader();
    await loader.discover();
    try {
      await loader.load(id, { sandbox: true });
      if (opts.json) {
        process.stdout.write(JSON.stringify({ id, valid: true }) + "\n");
      } else {
        console.log(pc.green(`Plugin ${id} valid`));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (opts.json) {
        process.stdout.write(JSON.stringify({ id, valid: false, error: msg }) + "\n");
      } else {
        console.error(pc.red(msg));
      }
      process.exitCode = 1;
    } finally {
      await loader.unload(id).catch(() => {});
    }
  });

plugins
  .command("doctor")
  .description("Check all plugins for issues")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const loader = createDefaultPluginLoader();
    const infos = await loader.discover();
    const results: any[] = [];
    for (const info of infos) {
      try {
        await loader.load(info.metadata.id, { sandbox: true });
        results.push({ id: info.metadata.id, status: "ok" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ id: info.metadata.id, status: "error", error: msg });
      } finally {
        await loader.unload(info.metadata.id).catch(() => {});
      }
    }
    if (opts.json) {
      process.stdout.write(JSON.stringify(results, null, 2) + "\n");
    } else {
      for (const r of results) {
        const color = r.status === "ok" ? pc.green : pc.red;
        console.log(color(`${r.id}: ${r.status}`));
        if (r.error && r.status !== "ok") console.log(`  ${r.error}`);
      }
    }
  });

plugins
  .command("versions")
  .description("Show version compatibility matrix")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const loader = createDefaultPluginLoader();
    const infos = await loader.discover();
    const rows = infos.map((i) => ({
      id: i.metadata.id,
      version: i.metadata.version,
      compatibility: (i.metadata as any).compatibility || "unknown",
    }));
    if (opts.json) {
      process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    } else {
      rows.forEach((r) => console.log(`${r.id}\t${r.version}\tcompatible with ${r.compatibility}`));
    }
  });

program.parseAsync(process.argv);