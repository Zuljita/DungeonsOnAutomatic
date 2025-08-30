# Design Decisions

This document records design decisions made during development, especially when deviating from the original plan.

## `IWFCConstraint` Interface

**Decision:** The `IWFCConstraint` interface will not be changed to match the simplified version in `plan.md` at this time.

**Reasoning:** The current implementation of the WFC engine relies on the `Propagate` method in the `IWFCConstraint` interface. The `plan.md` file describes a simpler interface with only `Initialize` and `Check` methods. Removing `Propagate` would require a significant and potentially risky refactoring of the working WFC engine. The current interface is more detailed and has proven to be effective. We will proceed with the current interface and may revisit this decision later if a refactoring is deemed necessary.

## TagService Single Source of Truth

**Decision:** The `TagService` instance owned by `WfcService` is the authoritative rule source for generation.

**Reasoning:** Constraints (e.g., `TagAdjacencyConstraint`) operate against the `TagService` injected into `WfcService`. While `TileSetData` exposes a `TagService` and a convenience `InitializeTagRelationships()` method, using multiple `TagService` instances creates split‑brain rule definitions that constraints won’t see. To avoid ambiguity, all plugins must register rules via `IMapRulesetPlugin.RegisterTags(TagService)`, which is passed the `WfcService` rule store.

**Plan:** Keep `TileSetData.TagService` as a utility for content validation for now, but do not rely on it for runtime rule enforcement. We may deprecate or repurpose it once the rule pipeline is fully consolidated.
