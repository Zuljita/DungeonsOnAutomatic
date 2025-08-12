#!/usr/bin/env node
import { Command } from 'commander';
import { buildDungeon } from '../services/assembler';
import { loadSystemModule } from '../services/system-loader';
import { renderAscii } from '../services/render';

const program = new Command();
program
  .name('doa')
  .description('DungeonsOnAutomatic – modular dungeon generator')
  .version('0.1.0');

program.command('generate')
  .description('Generate a dungeon')
  .option('--rooms <n>', 'number of rooms', (v) => parseInt(v, 10))
  .option('--seed <seed>', 'random seed')
  .option('--system <name>', 'system module to use (generic|dfrpg)', 'generic')
  .option('--ascii', 'render an ASCII map instead of JSON output')
  .action(async (opts) => {
    const d = buildDungeon({ rooms: opts.rooms, seed: opts.seed });
    const sys = await loadSystemModule(opts.system);
    const enriched = await sys.enrich(d);
    if (opts.ascii) {
      process.stdout.write(renderAscii(enriched) + '\n');
    } else {
      process.stdout.write(JSON.stringify(enriched, null, 2) + '\n');
    }
  });

program.parseAsync(process.argv);
