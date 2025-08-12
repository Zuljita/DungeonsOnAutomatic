# DungeonsOnAutomatic (DOA)

Modular dungeon generation tool with a simple web GUI for configuring runs and viewing results. System-agnostic core with pluggable system modules (e.g., GURPS DFRPG).

The included `dfrpg` system module adds random monsters, traps, and treasure to each room when enriching a dungeon.

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
```

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
