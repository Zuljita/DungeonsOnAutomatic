# DungeonsOnAutomatic Project Plan

## Vision
Build a sleek, extensible dungeon generation toolkit. The first release will showcase deep support for the **Dungeon Fantasy Roleplaying Game (DFRPG)**, while every part of the engine remains replaceable so other systems (D&D 5e, GURPS, Savage Worlds, etc.) can slot in later.

## Guiding Principles
- System-agnostic core that never assumes a rule set.
- Optional modules influence genre, rule system, and map style.
- Runs locally with minimal prerequisites.

## Phase 1 – Foundation ✅ **COMPLETE**
**Objective:** establish a clean TypeScript project.

**Completed Tasks**
- ✅ Node.js LTS, TypeScript, ESLint, Prettier, Vitest
- ✅ pnpm for dependency management
- ✅ Project assets: `.gitignore`, `README.md`, `LICENSE`
- ✅ Folder structure implemented with core/, systems/, services/, cli/
- ✅ All interfaces defined: `Room`, `Corridor`, `Monster`, `Trap`, `Treasure`, `Dungeon`
- ✅ `SystemModule` interface for plug-ins
- ✅ CLI: `pnpm doa generate --rooms=10 --system=dfrpg` working

## Phase 2 – Dungeon Layout ✅ **COMPLETE**
**Objective:** create valid dungeon maps.

**Completed Tasks**
- ✅ Room generator with types, sizes, coordinates, multiple shapes
- ✅ Corridor generator with A* pathfinding via PathFinding.js library
- ✅ Dungeon assembler merging rooms and corridors
- ✅ Comprehensive tests for non-overlap and connectivity

## Phase 3 – DFRPG System Module ✅ **COMPLETE**
**Objective:** provide a polished default implementation.

**Completed Tasks**
- ✅ `systems/dfrpg` fully implements `SystemModule`
- ✅ Rich monster/trap/treasure population using GURPS data
- ✅ Enhanced treasure generation with balancing systems
- ✅ Generic fallback module implemented
- ✅ Custom data loading support for user-defined content

## Phase 4 – Output & Interface ✅ **COMPLETE**
**Objective:** make results easy to consume.

**Completed Tasks**
- ✅ Export formats: JSON, SVG, ASCII, Foundry VTT, DonJon TSV, Roll20, PDF
- ✅ Map rendering with room labels, doors, and visual themes
- ✅ Web GUI at `apps/gui/` with parameter controls and live preview
- ✅ Plugin-based export system for extensibility

## Phase 5 – Extensibility & Polish 🔄 **IN PROGRESS**
**Objective:** encourage community growth and system swaps.

**Completed Tasks**
- ✅ Plugin API for export, room shapes, and system plugins
- ✅ Plugin discovery and loading with security validation
- ✅ Documentation in `docs/` and `CLAUDE.md`
- ✅ Multiple working examples with CLI and GUI

**Remaining Tasks**
- ⏳ Procedural name generator and AI-assisted descriptions
- ⏳ Enhanced community contribution guidelines

## Stretch Ambitions
- Campaign generator linking multiple dungeons.
- Online marketplace for community modules.
- Advanced map styles (hex, gridless, hand-drawn).

## Current Initiative: DFRPG Plugin Migration

### Executive Summary
Migrate the DFRPG system module from hardcoded system (`src/systems/dfrpg/`) to discoverable plugin architecture. Maintains full backward compatibility while enabling dynamic loading and independent development/distribution.

### Migration Strategy

#### Phase 1: Plugin Wrapper Creation
**Risk**: Low

1. **Create Plugin Package Structure**
   ```
   src/plugins/dfrpg-system/
   ├── package.json          # Plugin metadata
   ├── index.ts              # Plugin wrapper
   └── system/               # Current DFRPG code (symlinked)
       ├── index.ts
       ├── data/
       └── [all current files]
   ```

2. **Plugin Metadata Definition**
   ```json
   {
     "name": "dfrpg-system",
     "doaPlugin": {
       "id": "dfrpg",
       "type": "system",
       "version": "1.0.0",
       "description": "GURPS Dungeon Fantasy RPG system",
       "author": "DOA Core",
       "tags": ["system", "dfrpg", "gurps"]
     }
   }
   ```

3. **Wrapper Implementation**
   - Create `SystemPlugin` wrapper around existing `SystemModule`
   - Use `wrapLegacySystemModule()` from plugin-types.ts
   - Maintain identical API surface

#### Phase 2: Dual Loading Support
**Risk**: Medium

1. **Update System Loader**
   - Modify `loadSystemModule()` to check plugin registry first
   - Fall back to hardcoded import if plugin not found
   - Maintain existing RNG injection logic

2. **Testing Infrastructure**
   - Ensure all existing tests continue to pass
   - Add plugin-specific loading tests
   - Verify both loading paths work identically

3. **Backward Compatibility**
   - Keep `import('../systems/dfrpg/index')` as fallback
   - Ensure CLI commands work with both loading methods
   - Maintain custom data loader integration

#### Phase 3: Code Migration
**Risk**: Medium

1. **File Organization**
   - Move DFRPG files to plugin directory structure
   - Update internal import paths
   - Preserve git history where possible

2. **Dependency Management**
   - Audit service imports for plugin compatibility
   - Ensure all dependencies are available to plugin context
   - Update relative import paths

3. **Data File Handling**
   - Migrate monster database and treasure data
   - Ensure custom data loader still works
   - Verify data file loading in plugin context

#### Phase 4: System Loader Migration
**Risk**: Low

1. **Remove Hardcoded Import**
   - Remove direct import of `../systems/dfrpg/index`
   - Update BUILTIN_SYSTEMS registry
   - Ensure plugin discovery handles DFRPG

2. **Error Handling**
   - Improve error messages for missing plugins
   - Provide clear migration guidance
   - Maintain graceful degradation

#### Phase 5: Cleanup & Validation
**Risk**: Low

1. **Remove Legacy Code**
   - Delete original `src/systems/dfrpg/` directory
   - Update documentation and CLAUDE.md
   - Clean up unused imports

2. **Final Testing**
   - Run complete test suite
   - Verify CLI functionality
   - Test browser compatibility (should gracefully degrade)

### Technical Considerations

#### Plugin Loading Compatibility
- **Node.js**: Full plugin loading with discovery
- **Browser**: Built-in fallback (DFRPG won't be available unless bundled)
- **Error Handling**: Clear messages when plugin unavailable

#### Service Dependencies
DFRPG currently imports 16 services - ensure all remain accessible:
- `custom-data-loader` - Critical for custom monster/trap data
- `tagged-selection` - Tag-based encounter selection
- `locks`, `key-items` - Lock/key generation
- Environment and treasure services

#### Data File Migration
- `monsters-complete.js` - Large monster database
- `expanded-treasure.json` - Enhanced treasure data
- Ensure plugin bundling includes data files

### Risk Mitigation

#### Backward Compatibility Risks
- **Mitigation**: Maintain dual loading during transition
- **Testing**: Comprehensive test coverage for both paths
- **Fallback**: Keep original code until plugin fully validated

#### Performance Risks
- **Plugin Loading**: Async loading may impact CLI startup
- **Bundle Size**: Data files increase plugin size
- **Mitigation**: Lazy loading, data compression

#### Browser Compatibility Risks
- **Issue**: Plugins not available in browser environment
- **Mitigation**: Document browser limitations, provide built-in alternative
- **Future**: Consider browser plugin bundles

### Success Criteria

1. **Functional Compatibility**: All existing DFRPG features work identically
2. **API Compatibility**: No breaking changes to CLI or programmatic usage
3. **Performance**: No significant performance regression
4. **Testing**: All existing tests pass without modification
5. **Documentation**: Clear migration guide and plugin development docs

### Future Benefits

1. **Modularity**: DFRPG can be developed/maintained independently
2. **Distribution**: Plugin can be published separately on npm
3. **Versioning**: Independent versioning from core DOA
4. **Third-party**: Enables community DFRPG extensions
5. **Performance**: Core bundle size reduced (DFRPG loaded on demand)

---
