#!/usr/bin/env node
import { Command } from "commander";
import { buildDungeon } from "../services/assembler";
import { loadSystemModule } from "../services/system-loader";
import type { SystemModule } from "../core/types";
import { renderAscii, renderSvg } from "../services/render";
import { exportFoundry } from "../services/foundry";

const program = new Command();
program.name("doa").description("DungeonsOnAutomatic – modular dungeon generator").version("0.1.0");

program
  .command("generate")
  .description("Generate a dungeon")
  .option("--rooms <n>", "number of rooms", (v) => parseInt(v, 10))
  .option("--width <n>", "map width", (v) => parseInt(v, 10))
  .option("--height <n>", "map height", (v) => parseInt(v, 10))
  .option("--seed <seed>", "random seed")
  .option("--system <name>", "system module to use (generic|dfrpg)", "generic")
  .option("--source <src...>", "sources to include (system-specific)")
  .option("--ascii", "render an ASCII map instead of JSON output")
  .option("--svg", "render an SVG map instead of JSON output")
  .option("--foundry", "output FoundryVTT-compatible JSON")
    .action(async (opts) => {
      const d = buildDungeon({ rooms: opts.rooms, seed: opts.seed, width: opts.width, height: opts.height });
      let sys: SystemModule;
      try {
        sys = await loadSystemModule(opts.system, d.rng);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
        sys = await loadSystemModule('generic', d.rng);
      }
      const enriched = await sys.enrich(d, { sources: opts.source });
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
