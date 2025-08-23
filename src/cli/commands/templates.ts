import { Command } from "commander";
import { dungeonTemplateService } from "../../services/dungeon-templates";

export function createTemplatesCommand(): Command {
  return new Command("templates")
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
}