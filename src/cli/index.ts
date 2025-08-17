#!/usr/bin/env node
import { Command } from "commander";
import { buildDungeon } from "../services/assembler";
import { loadSystemModule } from "../services/system-loader";
import type { SystemModule } from "../core/types";
import { renderAscii, renderSvg } from "../services/render";
import { exportFoundry } from "../services/foundry";

const program = new Command();
program
  .name("doa")
  .description("DungeonsOnAutomatic – modular dungeon generator")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate a dungeon")
  .option("--rooms <n>", "number of rooms", (v) => parseInt(v, 10))
  .option("--width <n>", "map width", (v) => parseInt(v, 10))
  .option("--height <n>", "map height", (v) => parseInt(v, 10))
  .option("--seed <seed>", "random seed")
  .option(
    "--layout-type <type>",
    "advanced layout type (rectangle, square, box, cross, etc.)",
  )
  .option(
    "--room-layout <layout>",
    "room layout (sparse|scattered|dense|symmetric)",
  )
  .option(
    "--room-size <size>",
    "room size (small|medium|large|mixed)",
  )
  .option(
    "--room-shape <shape>",
    "room shape (rectangular|round|hexagonal|mixed)",
  )
  .option(
    "--corridor-type <type>",
    "corridor type (maze|winding|straight|mixed)",
  )
  .option(
    "--no-allow-deadends",
    "disallow deadends when generating corridors",
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
      layoutType: opts.layoutType,
      roomLayout: opts.roomLayout,
      roomSize: opts.roomSize,
      roomShape: opts.roomShape,
      corridorType: opts.corridorType,
      allowDeadends: opts.allowDeadends,
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

program.parseAsync(process.argv);

