import { Command } from "commander";
import { TreasureDataManager } from "../../services/treasure-data-manager";
import { promises as fs } from "node:fs";
import path from "node:path";
import pc from "picocolors";

export function createTreasureCommand(): Command {
  const treasure = new Command("treasure")
    .description("Treasure data import/export and management");

  // Import commands
  treasure
    .command("import <file>")
    .description("Import treasure data from JSON or CSV file")
    .option("--format <format>", "File format (json|csv), auto-detected if not specified")
    .option("--validate-only", "Only validate the file without importing")
    .option("--output-dir <dir>", "Directory to save imported data", "data/treasure/custom")
    .action(async (filePath, opts) => {
      try {
        const manager = new TreasureDataManager();
        
        console.log(pc.blue(`Importing treasure data from: ${filePath}`));
        
        if (opts.validateOnly) {
          console.log(pc.yellow("Validation mode - file will not be imported"));
          const content = await fs.readFile(filePath, 'utf-8');
          let data;
          
          try {
            data = JSON.parse(content);
          } catch (error) {
            console.error(pc.red("✗ Invalid JSON format"));
            process.exitCode = 1;
            return;
          }
          
          // Convert date strings to Date objects if needed (same logic as importFromJson)
          if (data.metadata) {
            if (typeof data.metadata.created === 'string') {
              data.metadata.created = new Date(data.metadata.created);
            }
            if (typeof data.metadata.lastModified === 'string') {
              data.metadata.lastModified = new Date(data.metadata.lastModified);
            }
          }
          
          const validation = await manager.validateImportData(data);
          
          if (validation.valid) {
            console.log(pc.green(`✓ Validation successful`));
            console.log(pc.cyan(`  Items found: ${validation.itemCount}`));
            if (validation.warnings.length > 0) {
              console.log(pc.yellow(`  Warnings: ${validation.warnings.length}`));
              validation.warnings.forEach(w => console.log(pc.yellow(`    • ${w}`)));
            }
          } else {
            console.log(pc.red(`✗ Validation failed`));
            console.log(pc.red(`  Errors: ${validation.errors.length}`));
            validation.errors.forEach(e => console.log(pc.red(`    • ${e}`)));
            process.exitCode = 1;
          }
          return;
        }

        const result = await manager.importFromFile(filePath, opts.format);
        
        if (result.success) {
          console.log(pc.green(`✓ Import successful`));
          console.log(pc.cyan(`  Items imported: ${result.itemsImported}`));
          
          if (result.metadata) {
            console.log(pc.gray(`  Pack: ${result.metadata.name} v${result.metadata.version}`));
            console.log(pc.gray(`  Author: ${result.metadata.author}`));
            console.log(pc.gray(`  Description: ${result.metadata.description}`));
            if (result.metadata.tags.length > 0) {
              console.log(pc.gray(`  Tags: ${result.metadata.tags.join(', ')}`));
            }
          }
          
          if (result.warnings.length > 0) {
            console.log(pc.yellow(`  Warnings: ${result.warnings.length}`));
            result.warnings.forEach(w => console.log(pc.yellow(`    • ${w}`)));
          }
        } else {
          console.log(pc.red(`✗ Import failed`));
          result.errors.forEach(e => console.log(pc.red(`  ${e}`)));
          process.exitCode = 1;
        }
      } catch (error) {
        console.error(pc.red(`Import failed: ${error instanceof Error ? error.message : String(error)}`));
        process.exitCode = 1;
      }
    });

  // Export commands
  treasure
    .command("export")
    .description("Export treasure data in various formats")
    .option("--format <format>", "Export format (json|csv|markdown|handout)", "json")
    .option("--source <source>", "Source to export (generated|custom|all)", "all")
    .option("--output <file>", "Output file path (default: auto-generated)")
    .option("--player-friendly", "Remove GM-only information")
    .option("--group-by-category", "Group items by category")
    .option("--pretty", "Pretty-print JSON output")
    .action(async (opts) => {
      try {
        const manager = new TreasureDataManager();
        
        console.log(pc.blue(`Preparing treasure export...`));
        
        // For now, export empty data as a template/example
        // In full implementation, this would load actual treasure data
        const sampleData = [{
          metadata: {
            name: "Sample Treasure Pack",
            author: "DungeonsOnAutomatic",
            version: "1.0.0",
            description: "Sample treasure pack for demonstration",
            tags: ["sample", "demo"],
            compatibleWith: "^0.1.0",
            created: new Date(),
            lastModified: new Date()
          },
          data: {
            magicItems: [
              {
                name: "Sample Magic Sword",
                category: "weapon" as const,
                powerLevel: "minor" as const,
                value: 1000,
                weight: 3,
                quirks: ["Glows when orcs are near"],
                description: "A finely crafted sword with minor magical properties"
              }
            ],
            mundaneItems: [
              {
                name: "Gold Chalice",
                category: "art" as const,
                value: 200,
                weight: 2,
                description: "An ornate golden chalice with intricate engravings"
              }
            ]
          }
        }];
        
        const exportOptions = {
          format: opts.format as 'json' | 'csv' | 'markdown' | 'handout',
          playerFriendly: opts.playerFriendly || false,
          groupByCategory: opts.groupByCategory || false,
          prettyPrint: opts.pretty || false
        };
        
        const result = await manager.exportTreasureData(sampleData, exportOptions);
        
        const outputPath = opts.output || path.join(process.cwd(), result.filename);
        await fs.writeFile(outputPath, result.content, 'utf-8');
        
        console.log(pc.green(`✓ Export successful`));
        console.log(pc.cyan(`  Format: ${result.format}`));
        console.log(pc.cyan(`  File: ${outputPath}`));
        console.log(pc.cyan(`  Size: ${result.size} bytes`));
        
        if (opts.format === 'json' && opts.pretty !== false) {
          console.log(pc.gray(`  Pretty-printed JSON with 2-space indentation`));
        }
      } catch (error) {
        console.error(pc.red(`Export failed: ${error instanceof Error ? error.message : String(error)}`));
        process.exitCode = 1;
      }
    });

  // List command
  treasure
    .command("list")
    .description("List available treasure packs")
    .option("--source <source>", "Source to list (custom|community|all)", "all")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const manager = new TreasureDataManager();
        
        // For now, just show what would be available
        // In full implementation, this would scan directories
        console.log(pc.bold("Available Treasure Packs:"));
        console.log(pc.gray("(Feature under development - directory scanning coming soon)"));
        console.log();
        
        // Example output
        const samplePacks = [
          {
            name: "Default DFRPG Treasures",
            author: "DungeonsOnAutomatic",
            version: "0.1.0",
            source: "built-in",
            description: "Core DFRPG treasure tables",
            items: 247
          }
        ];
        
        if (opts.json) {
          process.stdout.write(JSON.stringify(samplePacks, null, 2) + "\n");
        } else {
          samplePacks.forEach(pack => {
            console.log(`${pc.cyan(pack.name)} ${pc.gray(`v${pack.version}`)}`);
            console.log(`  ${pack.description}`);
            console.log(`  ${pc.gray(`Author: ${pack.author} | Source: ${pack.source} | Items: ${pack.items}`)}`);
            console.log();
          });
        }
      } catch (error) {
        console.error(pc.red(`List failed: ${error instanceof Error ? error.message : String(error)}`));
        process.exitCode = 1;
      }
    });

  // Validate command
  treasure
    .command("validate <file>")
    .description("Validate treasure data file format")
    .option("--json", "Output validation result as JSON")
    .action(async (filePath, opts) => {
      try {
        const manager = new TreasureDataManager();
        
        console.log(pc.blue(`Validating treasure data: ${filePath}`));
        
        const content = await fs.readFile(filePath, 'utf-8');
        let data;
        
        try {
          data = JSON.parse(content);
        } catch (error) {
          const result = { valid: false, errors: ['Invalid JSON format'], warnings: [], itemCount: 0 };
          
          if (opts.json) {
            process.stdout.write(JSON.stringify(result, null, 2) + "\n");
          } else {
            console.error(pc.red("✗ Invalid JSON format"));
          }
          process.exitCode = 1;
          return;
        }
        
        // Convert date strings to Date objects if needed (same logic as importFromJson)
        if (data.metadata) {
          if (typeof data.metadata.created === 'string') {
            data.metadata.created = new Date(data.metadata.created);
          }
          if (typeof data.metadata.lastModified === 'string') {
            data.metadata.lastModified = new Date(data.metadata.lastModified);
          }
        }
        
        const validation = await manager.validateImportData(data);
        
        if (opts.json) {
          process.stdout.write(JSON.stringify(validation, null, 2) + "\n");
        } else {
          if (validation.valid) {
            console.log(pc.green(`✓ Validation successful`));
            console.log(pc.cyan(`  Items found: ${validation.itemCount}`));
            
            if (validation.warnings.length > 0) {
              console.log(pc.yellow(`  Warnings:`));
              validation.warnings.forEach(w => console.log(pc.yellow(`    • ${w}`)));
            }
          } else {
            console.log(pc.red(`✗ Validation failed`));
            console.log(pc.red(`  Errors:`));
            validation.errors.forEach(e => console.log(pc.red(`    • ${e}`)));
            
            if (validation.warnings.length > 0) {
              console.log(pc.yellow(`  Warnings:`));
              validation.warnings.forEach(w => console.log(pc.yellow(`    • ${w}`)));
            }
          }
        }
        
        process.exitCode = validation.valid ? 0 : 1;
      } catch (error) {
        const result = { 
          valid: false, 
          errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`], 
          warnings: [], 
          itemCount: 0 
        };
        
        if (opts.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        } else {
          console.error(pc.red(`Validation failed: ${error instanceof Error ? error.message : String(error)}`));
        }
        process.exitCode = 1;
      }
    });

  // Create template command
  treasure
    .command("create-template")
    .description("Create a template treasure pack file")
    .option("--output <file>", "Output file path", "treasure-template.json")
    .option("--format <format>", "Template format (json|csv)", "json")
    .action(async (opts) => {
      try {
        const template = {
          metadata: {
            name: "My Treasure Pack",
            author: "Your Name",
            version: "1.0.0",
            description: "Custom treasure pack for my campaign",
            tags: ["custom", "campaign"],
            compatibleWith: "^0.1.0",
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
          },
          data: {
            magicItems: [
              {
                name: "Example Magic Sword",
                category: "weapon",
                powerLevel: "minor",
                value: 1000,
                weight: 3,
                quirks: ["Glows when enemies approach", "Never needs sharpening"],
                description: "A beautifully crafted sword with minor enchantments",
                reference: "Custom item"
              }
            ],
            mundaneItems: [
              {
                name: "Ornate Vase",
                category: "art",
                value: 150,
                weight: 5,
                description: "A ceramic vase with intricate floral patterns",
                origin: "Eastern kingdoms"
              }
            ],
            quirks: {
              weapon_quirks: [
                "Glows when orcs are near",
                "Makes a musical tone when drawn",
                "Never needs cleaning"
              ],
              armor_quirks: [
                "Self-repairing minor damage",
                "Changes color with weather",
                "Provides comfort in any climate"
              ],
              accessory_quirks: [
                "Tingles when magic is used nearby",
                "Shows true emotions of the wearer",
                "Grants vivid dreams"
              ],
              general_quirks: [
                "Once belonged to a famous hero",
                "Has a mysterious inscription",
                "Emits a faint magical aura"
              ]
            }
          }
        };
        
        let content: string;
        let filename = opts.output;
        
        if (opts.format === 'csv') {
          // Create CSV template
          content = [
            'Type,Name,Category,PowerLevel,Value,Weight,Quirks,Description,Reference',
            'magic,Example Magic Sword,weapon,minor,1000,3,"Glows when enemies approach|Never needs sharpening","A beautifully crafted sword",Custom item',
            'mundane,Ornate Vase,art,,150,5,,"A ceramic vase with intricate patterns",',
            '# Add more items here following the same format',
            '# Type: magic or mundane',
            '# Category for magic: weapon, armor, potion, scroll, power_item, accessory',
            '# Category for mundane: trade_good, art, gem, tool, other',
            '# PowerLevel (magic only): minor, major, epic',
            '# Quirks: separate multiple quirks with | character'
          ].join('\n');
          
          if (!filename.endsWith('.csv')) {
            filename = filename.replace(/\.[^.]*$/, '.csv');
          }
        } else {
          content = JSON.stringify(template, null, 2);
          if (!filename.endsWith('.json')) {
            filename = filename.replace(/\.[^.]*$/, '.json');
          }
        }
        
        await fs.writeFile(filename, content, 'utf-8');
        
        console.log(pc.green(`✓ Template created: ${filename}`));
        console.log(pc.cyan(`  Format: ${opts.format.toUpperCase()}`));
        console.log(pc.gray(`  Edit this file to add your custom treasure items`));
        
        if (opts.format === 'json') {
          console.log(pc.gray(`  Then import with: pnpm doa treasure import ${filename}`));
        } else {
          console.log(pc.gray(`  Then import with: pnpm doa treasure import ${filename} --format csv`));
        }
      } catch (error) {
        console.error(pc.red(`Template creation failed: ${error instanceof Error ? error.message : String(error)}`));
        process.exitCode = 1;
      }
    });

  return treasure;
}