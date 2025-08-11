# DungeonsOnAutomatic (DOA)

Modular dungeon generation tool. System-agnostic core with pluggable system modules (e.g., GURPS DFRPG).

## Quick Start

1) Install Node.js LTS and pnpm (or npm).
2) Install deps:
```bash
pnpm install
```
3) Run the CLI (examples):
```bash
pnpm doa generate --rooms=10 --system=dfrpg
pnpm doa generate --rooms=20
```
4) Run tests:
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
