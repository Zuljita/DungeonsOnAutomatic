#!/usr/bin/env node
import { Command } from "commander";
import { buildDungeon } from "../services/assembler";
import { loadSystemModule } from "../services/system-loader";
import type { SystemModule } from "../core/types";
import { renderAscii, renderSvg } from "../services/render";
import { exportFoundry } from "../services/foundry";
import { dungeonTemplateService } from "../services/dungeon-templates";

const program = new Command();
program.name("doa").description("DungeonsOnAutomatic – modular dungeon generator").version("0.1.0");

program
  .command("generate")
  .description("Generate a dungeon")
  .option("--rooms <n>", "number of rooms", (v) => parseInt(v, 10))
  .option("--width <n>", "map width", (v) => parseInt(v, 10))
  .option("--height <n>", "map height", (v) => parseInt(v, 10))
  .option("--seed <seed>", "random seed")
  .option(
    "--layout-type <type>",
    "advanced layout type (rectangle, square, box, cross, etc.)"
  )
  .option(
    "--corridor-type <type>",
    "corridor generation type (maze, winding, straight, mixed)"
  )
  .option(
    "--corridor-width <width>",
    "corridor width in tiles (1, 2, or 3)",
    (v) => parseInt(v, 10)
  )
  .option(
    "--room-layout <layout>",
    "room layout style (sparse, scattered, dense, symmetric)"
  )
  .option(
    "--room-shape <shape>",
    "room shape preference (rectangular, diverse, hex-preference, circular-preference, mixed)"
  )
  .option(
    "--template <id>",
    "apply a dungeon template (use 'doa templates' to see available options)"
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
  .option("--ascii", "render an ASCII map instead of JSON output")
  .option("--svg", "render an SVG map instead of JSON output")
  .option("--foundry", "output FoundryVTT-compatible JSON")
    .action(async (opts) => {
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
        sys = await loadSystemModule('generic', d.rng);
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
      const enriched = await sys.enrich(d, { sources: opts.source, tags: tagOptions });
      if (opts.svg) {
        process.stdout.write(renderSvg(enriched) + "\n");
      } else if (opts.ascii) {
        process.stdout.write(renderAscii(enriched) + "\n");
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
      const category = categories.find(c => c.id === opts.category);
      console.log(`\n${category?.name || 'Unknown Category'} Templates:\n`);
    } else {
      console.log("\nAvailable Dungeon Templates:\n");
      
      // Show categories first
      console.log("Categories:");
      categories.forEach(cat => {
        const count = dungeonTemplateService.getTemplatesByCategory(cat.id).length;
        console.log(`  ${cat.id}: ${cat.name} (${count} templates)`);
      });
      console.log("\nTemplates:\n");
    }

    templates.forEach(template => {
      console.log(`${template.id}:`);
      console.log(`  Name: ${template.name}`);
      console.log(`  Category: ${template.category}`);
      console.log(`  Description: ${template.description}`);
      console.log(`  Rooms: ${template.mapOptions.rooms || 'default'}`);
      console.log(`  Size: ${template.mapOptions.width || 'default'}x${template.mapOptions.height || 'default'}`);
      console.log(`  Layout: ${template.mapOptions.layoutType || 'default'}`);
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

program.parseAsync(process.argv);
