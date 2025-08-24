# Repository Guidelines

## Project Structure & Module Organization
- `src/cli`: CLI entry (`doa`) and commands.
- `src/core`, `src/services`, `src/systems`, `src/plugins`, `src/utils`, `src/data`: core types, generation logic, loaders, and helpers.
- `tests`: unit tests (`*.test.ts`); `tests/e2e`: Playwright specs (`*.spec.ts`).
- `apps/gui`: Vite-based GUI workspace; dev server on `:5173`.
- `assets`, `examples`, `docs`: supporting files and samples.
- `dist`: compiled JS output (do not edit).

## Build, Test, and Development Commands
- `pnpm dev`: run CLI in watch mode (`tsx src/cli/index.ts`).
- `pnpm doa generate --ascii`: generate a dungeon to stdout (quick smoke check).
- `pnpm build`: compile TypeScript to `dist/`.
- `pnpm lint`: run ESLint on `.ts` sources.
- `pnpm format`: apply Prettier formatting.
- `pnpm test`: run unit tests with Vitest.
- `pnpm test:e2e`: run Playwright tests (auto-starts GUI via `pnpm gui`).
- `pnpm gui`: start the GUI (`apps/gui`), `pnpm gui:build` to build, `pnpm gui:preview` to preview.

## Coding Style & Naming Conventions
- Language: TypeScript (ESM, strict). Target: ES2022.
- Formatting: Prettier (`printWidth=100`, double quotes, semicolons). Use `pnpm format`.
- Linting: ESLint with `@typescript-eslint` (unused/any rules relaxed in `eslint.config.js`).
- Indentation: 2 spaces. Filenames: lowercase kebab-case (`foundry-export.ts`), tests `*.test.ts`/`*.spec.ts`.
- Naming: `PascalCase` for types/classes; `camelCase` for functions/vars; constants `UPPER_SNAKE_CASE` when global.

## Testing Guidelines
- Unit: place tests in `tests/` as `name.test.ts`; run with `pnpm test`.
- E2E: add specs in `tests/e2e` as `feature.spec.ts`; `pnpm test:e2e` or `pnpm test:e2e:ui`.
- GUI tests assume `http://localhost:5173` (Playwright config starts server via `pnpm gui`).
- Aim for meaningful coverage of generation logic and CLI options; no hard coverage threshold enforced.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`); include scope when useful.
- PRs: include a clear summary, linked issues (`closes #123`), CLI usage examples, and GUI screenshots when UI changes.
- Ensure `pnpm lint`, `pnpm test`, and (if applicable) `pnpm test:e2e` pass. Update README/docs when behavior changes.

## Security & Configuration Tips
- Plugins: prefer known sources. The loader supports sandboxing; avoid loading untrusted plugins without review.
- Use `pnpm` (workspace-enabled). Node 18+ recommended.
