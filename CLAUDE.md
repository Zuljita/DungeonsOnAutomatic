# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Main commands:**
- `pnpm install` - Install dependencies
- `pnpm build` - Build TypeScript to dist/
- `pnpm dev` or `pnpm doa` - Run CLI in development mode with tsx
- `pnpm test` - Run test suite with vitest
- `pnpm lint` - Lint TypeScript files with ESLint
- `pnpm format` - Format code with Prettier

**GUI commands:**
- `pnpm gui` - Start GUI development server with HMR
- `pnpm gui:build` - Build GUI for production
- `pnpm gui:preview` - Preview built GUI on port 3000

**Testing commands:**
- `pnpm test` - Run unit tests with vitest
- `pnpm test:e2e` - Run browser tests with Playwright (headless)
- `pnpm test:e2e:headed` - Run browser tests with visible browser (debugging)
- `pnpm test:e2e:ui` - Interactive Playwright test runner

**CLI usage examples:**
```bash
pnpm doa generate --rooms=10 --system=dfrpg
pnpm doa generate --rooms=20 --svg > map.svg
pnpm doa generate --rooms=15 --foundry > foundry.json
pnpm doa generate --rooms=8 --ascii

# Multi-version dungeon generation
pnpm doa variations --seed mycastle --vary layout --ascii
pnpm doa variations --seed adventure --rooms 5,8,12 --output-dir ./dungeons
pnpm doa variations --seed compare --layouts rectangle,hexagon,cavernous
```

## Architecture Overview

**DungeonsOnAutomatic (DOA)** is a modular dungeon generation tool with a system-agnostic core and pluggable system modules.

**Core Architecture:**
- `/src/core/types.ts` - Central type definitions for Dungeon, Room, Corridor, Door, Monster, Trap, Treasure, SystemModule
- `/src/services/` - System-agnostic utilities (assembler, rooms, corridors, doors, pathfinder, render, foundry export)
- `/src/systems/` - System-specific modules (dfrpg, generic)
- `/src/cli/` - Command-line interface using Commander.js
- `/apps/gui/` - Separate Vite-based web GUI workspace

**Key Flow:**
1. `buildDungeon()` in assembler.ts generates base layout (rooms, corridors, doors)
2. System modules enrich dungeons with encounters via the `SystemModule.enrich()` interface
3. Output plugins render to ASCII, SVG, JSON, or FoundryVTT format via plugin system

**System Module Pattern:**
System modules implement the `SystemModule` interface with `id`, `label`, and `enrich()` method. The DFRPG module adds monsters, traps, and treasure to rooms using GURPS Dungeon Fantasy data.

**Workspace Structure:**
This is a pnpm workspace with the main package and GUI as separate workspaces. The GUI is a minimal Vite TypeScript app that imports from the main package.

**Key Services:**
- `assembler.ts` - Main dungeon builder orchestrating room generation, corridor connection, door placement
- `system-loader.ts` - Dynamic loading of system modules with fallback to generic
- `render.ts` - ASCII map rendering (SVG moved to plugin)
- `foundry.ts` - FoundryVTT export format
- `key-items.ts` & `room-key.ts` - Key/lock system for door access control

## Plugin System Architecture

**Plugin Types:**
- **Export Plugins** - ASCII, SVG, FoundryVTT export formats (`src/plugins/ascii-export/`, `src/plugins/svg-export/`)
- **Room Shape Plugins** - Generate 8 room shapes (rectangular, circular, hexagonal, etc.)
- **System Plugins** - Game system-specific enrichment (DFRPG, generic)

**Core Export Plugins:**
- `svg-export` - SVG rendering with theme support (light, dark, sepia), custom themes, hex style, shape-aware door rendering
- `ascii-export` - ASCII text rendering for terminal output
- Third-party plugins for PDF, Roll20, Foundry formats

**Plugin Loading:**
- **Node.js CLI**: Full plugin system with dynamic imports and sandbox security
- **Browser GUI**: Built-in algorithms with environment detection
- **Discovery**: Scans `src/plugins/`, `dist/plugins/`, `plugins/`, `node_modules/`
- **Security**: Validates plugin capabilities and sandboxes untrusted code

## Browser Testing & Compatibility Guidelines

**CRITICAL: Browser issues are a known blind spot for Claude Code. Always use Playwright testing for browser-related changes.**

### When to use browser testing:
- ANY changes to GUI code or services used by the GUI
- Plugin system modifications (browser vs Node.js compatibility)
- Adding new browser-dependent features
- Fixing race conditions or async initialization issues

### Browser testing commands:
- `pnpm test:e2e` - Run full browser test suite (USE THIS FOR GUI CHANGES)
- `pnpm test:e2e:headed` - Debug tests with visible browser
- `pnpm test:e2e:ui` - Interactive test development

### Common browser compatibility issues to watch for:
1. **Node.js modules in browser**: Cannot use `node:fs`, `node:path`, etc. in browser code
2. **Dynamic imports**: Vite cannot analyze dynamic imports with variables
3. **Race conditions**: Async plugin loading vs synchronous GUI calls
4. **Console errors**: JavaScript errors that don't appear in CLI testing

### Plugin system browser compatibility:
- **Node.js Environment**: Uses full plugin loading with sandbox security
- **Browser Environment**: Uses built-in algorithms with environment detection
- **Key pattern**: `const isBrowser = typeof window !== 'undefined'`
- **Dynamic imports**: Conditional `await import()` only in Node.js environment

### Room Shape Service Architecture:
- Browser: Built-in shape algorithms (no plugin loading)
- Node.js: Plugin-based shape loading with fallbacks
- Race condition fix: GUI calls `await roomShapeService.initialize()` before generation

**ALWAYS run browser tests after:**
- Modifying services used by GUI
- Changing plugin loading logic
- Adding new GUI features
- Fixing async/await patterns

## Development Best Practices

### Library-First Development Philosophy

**ALWAYS prefer existing, well-maintained libraries over custom implementations:**

1. **Search existing ecosystem first**: Before writing custom algorithms or utilities, search for established libraries that solve the same problem
2. **Check package.json dependencies**: Review existing dependencies to see if functionality is already available
3. **Evaluate library maturity**: Prefer libraries with active maintenance, good documentation, and TypeScript support
4. **Consider bundle size**: For browser-facing features, evaluate the impact on bundle size

**Examples from this project:**
- ✅ **PathFinding.js** - Used for corridor pathfinding instead of custom A* implementation
- ✅ **panzoom.js** - Used for interactive map navigation instead of custom pan/zoom logic
- ✅ **Commander.js** - Used for CLI parsing instead of manual argument processing
- ❌ **Custom ASCII rendering** - Justified because it's core domain logic specific to dungeon generation

**When custom code is appropriate:**
- Core domain logic unique to dungeon generation (room placement, corridor generation)
- Integration glue between libraries
- Performance-critical algorithms where libraries don't meet specific needs
- When existing libraries don't support required features and can't be easily extended

**Before implementing custom solutions, ask:**
1. "Does an npm package already solve this problem?"
2. "Can existing project dependencies be extended to handle this use case?"
3. "Is this core domain logic that justifies custom implementation?"
4. "Would using a library significantly improve maintainability and reduce bugs?"

### Code Duplication Prevention

**ALWAYS eliminate duplicate code patterns by creating reusable utilities:**

1. **Identify duplication early**: When you see similar code in 2+ locations, consolidate it immediately
2. **Create utility modules**: Place reusable functions in `/src/utils/` with clear, descriptive names
3. **Look for common patterns**: Grid operations, data transformations, validation logic, algorithm implementations
4. **Maintain single source of truth**: Each piece of logic should exist in exactly one place

**Utility Organization:**
- `/src/utils/grid-utils.ts` - Grid bounds calculation, creation, coordinate transformation
- `/src/utils/room-utils.ts` - Room shape checking, border detection, point operations  
- `/src/utils/union-find.ts` - Disjoint set operations for graph algorithms
- Add new utilities as patterns emerge

**Examples of successfully consolidated patterns:**
- ✅ **Grid bounds calculation** - Eliminated from 7+ files using `calculateGridBounds()`
- ✅ **Room shape checking** - Eliminated from 15+ files using `isRectangularRoom()`
- ✅ **Union-Find algorithm** - Eliminated from 4+ files using `createSimpleUnionFind()`
- ✅ **Grid creation** - Eliminated from 5+ files using `createGrid()`

**Before writing new code, check:**
1. "Does this logic already exist somewhere in the codebase?"
2. "Could this pattern be useful in other parts of the system?"
3. "Is this similar enough to existing code that it should be consolidated?"
4. "Would extracting this to a utility improve testability and maintainability?"

**Red flags indicating duplication:**
- Copy-pasting code blocks between files
- Similar function names with slight variations (`connectRooms` vs `connectRoomsEnhanced`)
- Repeated patterns in loops, conditionals, or data processing
- Multiple implementations of the same algorithm or data structure

## GitHub Issue and PR Workflow

### Issue Linking Requirements
When working on GitHub issues, ALWAYS ensure proper linking between issues and PRs:

1. **PR Title**: Include issue number in title (e.g., "fix: prevent inappropriate door combinations (#184)")
2. **PR Description**: Include "Fixes #[issue-number]" or "Closes #[issue-number]" at the top of the description
   - This creates clickable links for easy navigation
   - Auto-closes the issue when PR is merged
   - Maintains clear traceability between problems and solutions

3. **Issue Comments**: When creating a PR, add a comment to the original issue linking to the PR
   - Format: "✅ **Fixed in PR #[pr-number]** - [brief description]"
   - Provides immediate visibility that work is in progress
   - Allows issue reporters to track progress and review fixes

### PR Creation Timing
Create PRs immediately when you believe an issue is resolved:
- **Don't wait for approval**: Create the PR as soon as the fix is complete and tested
- **Link immediately**: Add issue linking in the PR description from the start
- **Comment on issue**: Notify issue reporters that a fix is available for review
- **Request review**: Tag appropriate reviewers or maintainers if needed

### Example Workflow
```bash
# 1. Work on issue in feature branch
git checkout -b fix/issue-description

# 2. Implement fix with tests
# ... make changes ...

# 3. Commit with descriptive message
git commit -m "fix: resolve issue description (#123)"

# 4. Push and create PR immediately
git push origin fix/issue-description
gh pr create --title "fix: resolve issue description (#123)" \
  --body "Fixes #123

[Detailed description of the fix]"

# 5. Comment on original issue
gh issue comment 123 --body "✅ **Fixed in PR #[pr-number]**"
```

This workflow ensures:
- Clear traceability between issues and fixes
- Immediate visibility for issue reporters  
- Automatic issue closure when fixes are merged
- Consistent documentation of problem-solution relationships

## Code Quality and Architecture Principles

### Fail-Fast Philosophy
**CRITICAL: Applications should fail with clear errors rather than fall back to legacy code.**

- **No silent fallbacks**: If new code doesn't work, the application should fail loudly
- **Purge legacy code**: Once replaced, old code paths must be removed completely
- **Force adoption**: Users and tests should encounter errors when new features break
- **Backwards compatibility**: ONLY for plugin APIs, never for internal code paths

### Examples of Anti-Patterns to Avoid:
- ❌ **Silent fallbacks**: `catch (err) { console.warn('Using legacy...'); return legacyFunction(); }`  
- ❌ **Unused new code**: Writing `corridors.ts` but GUI still uses "classic manhattan"
- ❌ **Dual code paths**: Both new and old implementations running in parallel
- ❌ **"Graceful degradation"**: Hiding broken features instead of fixing them

### Examples of Correct Patterns:
- ✅ **Fail loudly**: `throw new Error('New corridor system failed - fix required')`
- ✅ **Single code path**: Remove old code once new code is implemented
- ✅ **Force testing**: Broken features cause test failures, not silent switches
- ✅ **Plugin compatibility only**: Support old plugin APIs, not old internal logic

### Reusable Code Emphasis
**CRITICAL: Prioritize reusable, maintainable, and extensible code paths.**

- **Single source of truth**: Each feature implemented once, used everywhere
- **Shared utilities**: Create reusable functions instead of duplicating logic
- **Consistent interfaces**: Same patterns across similar functionality
- **Extensible architecture**: Design for future enhancement, not just current needs

### No Non-Functional Options
**CRITICAL: Every option, method, and feature must actually work or be removed.**

- **No placeholder options**: If `useWanderingPaths` doesn't change behavior, remove it
- **No incomplete features**: Don't expose options that aren't fully implemented
- **No ignored parameters**: Every parameter must affect the output or be deleted
- **No dead code**: Remove unused methods, options, and configuration immediately

### Examples of Anti-Patterns to Avoid:
- ❌ **Ignored options**: `{ useAdvancedMode: true }` that does nothing
- ❌ **Placeholder methods**: Functions that return hardcoded values
- ❌ **Incomplete features**: Options that only work in some scenarios
- ❌ **Silent no-ops**: `setCustomTheme()` that silently ignores the theme

### Examples of Correct Patterns:  
- ✅ **Remove non-working options**: Delete `useWanderingPaths` if it doesn't work
- ✅ **Implement or remove**: Either make the feature work or delete it entirely
- ✅ **Fail loudly**: `throw new Error('Advanced mode not yet implemented')`
- ✅ **Test all options**: Every configuration option must have working tests

### Implementation Guidelines
1. **Replace, don't add**: When implementing new features, replace old ones entirely
2. **Remove immediately**: Delete legacy code as soon as replacement is working
3. **Test the new path**: Ensure tests exercise the new code, not fallbacks
4. **Document breaking changes**: Be explicit about what changed and why
5. **Audit options regularly**: Verify every exposed option actually works
6. **Delete incomplete features**: Remove half-implemented functionality immediately

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

**BROWSER TESTING MANDATE**: For any GUI-related changes, ALWAYS run `pnpm test:e2e` to catch browser compatibility issues. Browser problems are a known blind spot - the tests will catch what manual inspection cannot.