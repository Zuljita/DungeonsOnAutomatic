import { Command } from "commander";
import { createDefaultPluginLoader } from "../../services/plugin-loader";
import pc from "picocolors";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export function createPluginsCommand(): Command {
  const plugins = new Command("plugins")
    .description("Plugin discovery and management");

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

  return plugins;
}