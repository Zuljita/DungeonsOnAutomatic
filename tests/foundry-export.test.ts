import { describe, it, expect } from "vitest";
import { buildDungeon } from "../src/services/assembler.js";
import { exportFoundry } from "../src/services/foundry.js";

describe("exportFoundry", () => {
  it("creates a scene with walls and doors", () => {
    const d = buildDungeon({ rooms: 2, seed: "foundry" });
    expect(d.doors.length).toBe(d.corridors.length * 2);
    const scene = exportFoundry(d);
    expect(scene.walls.length).toBeGreaterThan(0);
    expect(scene.doors.length).toBeGreaterThan(0);
    expect(scene.width).toBeGreaterThan(0);
    expect(scene.height).toBeGreaterThan(0);
  });

  it("scales walls, doors, and scene size based on grid", () => {
    const d = buildDungeon({ rooms: 2, seed: "foundry" });
    const scene100 = exportFoundry(d, 100);
    const scene50 = exportFoundry(d, 50);
    expect(scene50.width).toBe(scene100.width / 2);
    expect(scene50.height).toBe(scene100.height / 2);
    expect(scene50.walls[0].c).toEqual(scene100.walls[0].c.map((n) => n / 2));
    expect(scene50.doors[0].c).toEqual(scene100.doors[0].c.map((n) => n / 2));
  });
});
