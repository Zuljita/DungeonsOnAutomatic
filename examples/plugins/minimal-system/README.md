# Minimal System Plugin

This plugin illustrates the smallest possible system module for DOA. It
implements the required `enrich` function but leaves dungeon data unchanged.

## Usage

Copy the folder into your project's `plugins/` directory and run:

```bash
pnpm doa generate --system example.minimal-system
```

The plugin will load and behave like the built-in generic system.
