# Tagging System

Purpose: Central, simple rule store for affinities/antagonisms between tags.

## Inputs

- Tag names (strings) used to construct `Tag` values.
- Relationship registrations via `TagService.AddAffinity(tagA, tagB)` and `AddAntagonism(tagA, tagB)`.

## Logic

- Tags are immutable value-like structs identified by `Name`.
- `TagService` stores symmetric relationships:
  - `AddAffinity(A, B)` registers both A→B and B→A (and rejects if antagonistic already).
  - `AddAntagonism(A, B)` registers both A→B and B→A (and rejects if already affine).
- Compatibility: `AreCompatible(A, B)` is true when not antagonistic.

## Outputs

- Relationship queries for constraints/rendering: `HaveAffinity`, `HaveAntagonism`, `AreCompatible`.

## Usage Patterns

- WFC path: Pass a single `TagService` into `WfcService` and register all rules there (plugins call `RegisterTags` with that service).
- Tiles: `TileData` carries tags; `MapTile` inherits those tags post-generation.

## Notes & Pitfalls

- Single source of truth: Prefer the `TagService` owned by `WfcService` to avoid split-brain rules. Although `TileSetData` has an internal `TagService`, constraints currently use the `WfcService` one.
- Self-antagonism is allowed and used by tests to assert failure behavior.

