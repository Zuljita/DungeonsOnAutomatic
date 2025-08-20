import { describe, it, expect } from "vitest";
import { buildDungeon } from "../src/services/assembler.js";
import { roll20ExportPlugin } from "../src/plugins/roll20-export/index.js";

describe("roll20 export plugin", () => {
  it("creates a page with walls and tokens", () => {
    const d = buildDungeon({ rooms: 2, seed: "roll20" });
    const result = roll20ExportPlugin.export(d, "roll20");
    const page: any = result.data;
    expect(page.width).toBeGreaterThan(0);
    expect(page.height).toBeGreaterThan(0);
    expect(Array.isArray(page.walls)).toBe(true);
    expect(page.walls.length).toBeGreaterThan(0);
    expect(Array.isArray(page.tokens)).toBe(true);
  });
});
