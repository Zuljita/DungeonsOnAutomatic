import { buildDungeon } from "../services/assembler";
import { renderSvg } from "../services/render";
import { exportFoundry } from "../services/foundry";
import { loadSystemModule } from "../services/system-loader";
import type { SystemModule } from "../core/types";

async function generate(): Promise<void> {
  const roomsInput = document.getElementById("rooms");
  if (!(roomsInput instanceof HTMLInputElement)) {
    alert("Missing rooms input");
    return;
  }
  const seedInput = document.getElementById("seed");
  if (!(seedInput instanceof HTMLInputElement)) {
    alert("Missing seed input");
    return;
  }
  const systemInput = document.getElementById("system");
  if (!(systemInput instanceof HTMLSelectElement)) {
    alert("Missing system selector");
    return;
  }
  const mapEl = document.getElementById("map");
  if (!(mapEl instanceof HTMLElement)) {
    alert("Missing map element");
    return;
  }
  const inputEl = document.getElementById("inputs");
  if (!(inputEl instanceof HTMLElement)) {
    alert("Missing inputs element");
    return;
  }
  const outputEl = document.getElementById("outputs");
  if (!(outputEl instanceof HTMLElement)) {
    alert("Missing outputs element");
    return;
  }
  const foundryLink = document.getElementById("download-foundry");
  if (!(foundryLink instanceof HTMLAnchorElement)) {
    alert("Missing Foundry download link");
    return;
  }

  const rooms = parseInt(roomsInput.value, 10) || 8;
  const seed = seedInput.value || undefined;
  const system = systemInput.value || "generic";

  const opts = { rooms, seed };
  inputEl.textContent = JSON.stringify({ ...opts, system }, null, 2);
  const base = buildDungeon(opts);
  let sys: SystemModule;
  try {
    sys = await loadSystemModule(system, base.rng);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    alert(msg);
    sys = await loadSystemModule("generic", base.rng);
  }
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
    const mapEl = document.getElementById("map");
    if (mapEl instanceof HTMLElement) {
      mapEl.textContent = "Error generating dungeon";
    }
  });
});

// generate a dungeon on load for convenience
generate().catch(console.error);
