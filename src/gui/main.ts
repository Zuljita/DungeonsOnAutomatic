import { buildDungeon } from "../services/assembler";
import { renderSvg } from "../services/render";
import { exportFoundry } from "../services/foundry";
import { loadSystemModule } from "../services/system-loader";

async function generate(): Promise<void> {
const roomsInput = document.getElementById("rooms") as HTMLInputElement;
const seedInput = document.getElementById("seed") as HTMLInputElement;
const systemInput = document.getElementById("system") as HTMLSelectElement;
const mapEl = document.getElementById("map") as HTMLElement;
const inputEl = document.getElementById("inputs") as HTMLElement;
const outputEl = document.getElementById("outputs") as HTMLElement;
const foundryLink = document.getElementById("download-foundry") as HTMLAnchorElement;

const rooms = parseInt(roomsInput.value, 10) || 8;
const seed = seedInput.value || undefined;
const system = systemInput.value || "generic";


  const opts = { rooms, seed };
  inputEl.textContent = JSON.stringify({ ...opts, system }, null, 2);
  const base = buildDungeon(opts);
  const sys = await loadSystemModule(system);
  const enriched = await sys.enrich(base);
  mapEl.innerHTML = renderSvg(enriched);
  outputEl.textContent = JSON.stringify(enriched, null, 2);
  const foundry = exportFoundry(enriched);
  const blob = new Blob([JSON.stringify(foundry, null, 2)], { type: "application/json" });
  foundryLink.href = URL.createObjectURL(blob);
}

document.getElementById("generate")?.addEventListener("click", () => {
  generate().catch((err) => {
    // log error to console and show message in UI
    console.error(err);
    const mapEl = document.getElementById("map") as HTMLElement;
    mapEl.textContent = "Error generating dungeon";
  });
});

// generate a dungeon on load for convenience
generate().catch(console.error);
