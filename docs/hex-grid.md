# Hex Grid Coordinate System

The hexagonal map style uses **axial coordinates** with a pointy-top orientation.

For a hex with axial coordinates `(q, r)` and hex size `s` (the radius):

- Pixel X: `x = s * sqrt(3) * (q + r/2)`
- Pixel Y: `y = s * 1.5 * r`

Distance between two hexes `a` and `b` is:

```
(|aq - bq| + |aq + ar - bq - br| + |ar - br|) / 2
```

Neighboring hexes are obtained by adding one of the six direction vectors:

```
[ {q:1,r:0}, {q:1,r:-1}, {q:0,r:-1},
  {q:-1,r:0}, {q:-1,r:1}, {q:0,r:1} ]
```

These utilities are available from `src/services/hex-grid.ts` and are used by the
SVG renderer when `--map-style hex` is selected.
