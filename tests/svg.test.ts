import { describe, it, expect } from "vitest";
import { buildDungeon } from "../src/services/assembler.js";
import { renderSvg } from "../src/services/render.js";

describe("renderSvg", () => {
  it("produces svg markup", () => {
    const d = buildDungeon({ rooms: 2, width: 40, height: 30, seed: "svg" });
    const svg = renderSvg(d);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toMatch(/<rect/);
    expect(svg).toMatch(/<text[^>]*>1<\/text>/);
  });
});
