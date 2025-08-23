#!/usr/bin/env node
import { Command } from "commander";
import { createGenerateCommand } from "./commands/generate";
import { createTemplatesCommand } from "./commands/templates";
import { createPluginsCommand } from "./commands/plugins";

const program = new Command();
program
  .name("doa")
  .description("DungeonsOnAutomatic – modular dungeon generator")
  .version("0.1.0");

// Register command modules
program.addCommand(createGenerateCommand());
program.addCommand(createTemplatesCommand());
program.addCommand(createPluginsCommand());

program.parseAsync(process.argv);