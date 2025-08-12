import { Dungeon } from "../core/types";

/**
 * Render a simple ASCII map of the dungeon. Rooms are drawn with '#' borders
 * and '.' interiors; corridor tiles are marked with '+'.
 * The map is tightly cropped to the extents of the dungeon geometry.
 */
export function renderAscii(d: Dungeon): string {
  const points: { x: number; y: number }[] = [];
  for (const r of d.rooms) {
    points.push({ x: r.x + r.w, y: r.y + r.h });
  }
  for (const c of d.corridors) {
    for (const p of c.path) points.push(p);
  }
  const maxX = Math.max(0, ...points.map((p) => p.x)) + 1;
  const maxY = Math.max(0, ...points.map((p) => p.y)) + 1;
  const grid: string[][] = Array.from({ length: maxY }, () => Array(maxX).fill(" "));

  for (const r of d.rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const border = x === r.x || x === r.x + r.w - 1 || y === r.y || y === r.y + r.h - 1;
        grid[y][x] = border ? "#" : ".";
      }
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) {
      if (grid[p.y]?.[p.x] === " ") grid[p.y][p.x] = "+";
    }
  }
  return grid.map((row) => row.join("")).join("\n");
}

/**
 * Render a very simple SVG representation of the dungeon. Rooms are drawn as
 * stroked rectangles and corridor tiles are filled squares. The output is a
 * standalone SVG string sized to the dungeon's extents.
 */
export function renderSvg(d: Dungeon): string {
  const cell = 20; // pixel size of a single grid square
  const points: { x: number; y: number }[] = [];
  for (const r of d.rooms) {
    points.push({ x: r.x + r.w, y: r.y + r.h });
  }
  for (const c of d.corridors) {
    for (const p of c.path) points.push(p);
  }
  const maxX = Math.max(0, ...points.map((p) => p.x)) + 1;
  const maxY = Math.max(0, ...points.map((p) => p.y)) + 1;
  const width = maxX * cell;
  const height = maxY * cell;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ];

  for (const c of d.corridors) {
    for (const p of c.path) {
      parts.push(
        `<rect x="${p.x * cell}" y="${p.y * cell}" width="${cell}" height="${cell}" fill="white" stroke="none"/>`,
      );
    }
  }

  for (const r of d.rooms) {
    parts.push(
      `<rect x="${r.x * cell}" y="${r.y * cell}" width="${r.w * cell}" height="${r.h * cell}" fill="white" stroke="black"/>`,
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

export default renderAscii;
