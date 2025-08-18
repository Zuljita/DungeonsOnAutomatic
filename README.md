# DungeonsOnAutomatic (DOA)

Modular dungeon generation tool with a simple web GUI for configuring runs and viewing results. System-agnostic core with an included DFRPG module; other system modules are stretch goals.

The included `dfrpg` system module adds random monsters, traps, and treasure to each room when enriching a dungeon.

Support for additional RPG systems is currently a stretch goal.
 
## Quick Start

1. Install Node.js LTS and pnpm (or npm).
2. Install deps:

```bash
pnpm install
```

3. Run the CLI (examples):

```bash
pnpm doa generate --rooms=10 --system=dfrpg
pnpm doa generate --rooms=20 --svg > map.svg
pnpm doa generate --rooms=15 --foundry > foundry.json
pnpm doa generate --rooms=8 --ascii
pnpm doa generate --rooms=5 --width=40 --height=30
pnpm doa generate --rooms=5 --theme=generic-undead --monster-tag=undead --trap-tag=mechanical --treasure-tag=coins
pnpm doa generate --rooms=8 --room-shape=diverse --corridor-width=2
pnpm doa generate --rooms=6 --room-shape=hex-preference --corridor-type=winding
pnpm doa generate --rooms=4 --room-shape=circular-preference --layout-type=round
```

Use `--width` and `--height` to control the overall map dimensions.

Tag options allow more control over generated content:

* `--theme <id>` – apply a predefined theme to rooms and encounters
* `--monster-tag <tag>` – require monsters to include the tag (repeatable)
* `--trap-tag <tag>` – require traps to include the tag (repeatable)
* `--treasure-tag <tag>` – require treasure to include the tag (repeatable)

Room shape options control the variety and style of room layouts:

* `--room-shape diverse` – maximum variety with all 8 shape types (rectangular, circular, hexagonal, octagonal, irregular, L-shaped, T-shaped, cross)
* `--room-shape hex-preference` – emphasis on hexagonal and geometric shapes for structured dungeons
* `--room-shape circular-preference` – emphasis on circular and irregular shapes for natural cave systems
* `--room-shape small-preference` – preference for smaller, more complex shapes
* `--room-shape mixed` – balanced variety with slight rectangular preference
* `--room-shape rectangular` – primarily rectangular with occasional variety (default)

4. GUI:

```bash
pnpm gui         # dev server with HMR
pnpm gui:build   # production build
pnpm gui:preview # then open http://localhost:3000/
```

5. Run tests:

```bash
pnpm test
```

## Plugin Commands

The CLI includes helper commands for discovering and managing plugins. Examples:

```bash
pnpm doa plugins list --json          # list available plugins
pnpm doa plugins info test.valid      # show details for a plugin
pnpm doa plugins validate test.valid  # validate a plugin without loading
pnpm doa generate --list-systems      # list built-in and plugin systems
```

---

This repo follows a layered structure:

```
/src
  /core         → core logic, system-agnostic
  /systems      → system-specific modules
  /services     → utilities (map drawing, procedural gen)
  /cli          → command-line entry point
/tests
```

See `PROJECT_PLAN.md` for the roadmap.

## Contributing

Contributions are welcome! Please make sure to run the lint and test
scripts before submitting a pull request:

```bash
pnpm lint
pnpm test
```
