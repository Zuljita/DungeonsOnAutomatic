import { describe, it, expect } from "vitest";
import { buildDungeon } from "../src/services/assembler.js";
import { exportFoundry } from "../src/services/foundry.js";

describe("exportFoundry", () => {
  it("creates a scene with walls", () => {
    const d = buildDungeon({ rooms: 1, seed: "foundry" });
    expect(d.doors.length).toBe(d.corridors.length * 2);
    const scene = exportFoundry(d);
    expect(scene.walls.length).toBeGreaterThan(0);
    expect(scene.width).toBeGreaterThan(0);
    expect(scene.height).toBeGreaterThan(0);
  });
});
