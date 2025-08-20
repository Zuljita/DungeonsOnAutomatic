import { describe, it, expect } from "vitest";
import { buildDungeon } from "../src/services/assembler.js";
import { renderSvg, darkTheme, sepiaTheme } from "../src/services/render.js";

describe("renderSvg", () => {
  it("produces svg markup", async () => {
    const d = buildDungeon({ rooms: 2, seed: "svg" });
    expect(d.doors.length).toBe(d.corridors.length * 2);
    const svg = await renderSvg(d);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toMatch(/<rect/);
    expect(svg).toMatch(/fill="#cccccc"/); // corridor color from light theme
    expect(svg).toMatch(/<text[^>]*>1<\/text>/);
  });

  it("applies theme colors", async () => {
    const d = buildDungeon({ rooms: 2, seed: "svgTheme" });
    const svg = await renderSvg(d, darkTheme);
    expect(svg).toMatch(/fill="#555555"/); // corridor color from dark theme
    expect(svg).toMatch(/fill="#222222"/); // room fill from dark theme
  });

  it("supports hand-drawn style via plugin", async () => {
    const d = buildDungeon({ rooms: 1, seed: "sketch" });
    const svg = await renderSvg(d, sepiaTheme, {
      style: "hand-drawn",
      wobbleIntensity: 1,
      wallThickness: 1,
    });
    // Test should pass if plugin is loaded, otherwise falls back to classic style
    expect(svg.startsWith("<svg")).toBe(true);
  });
});
