import { buildDungeon } from '@src/services/assembler';
import { renderSvg } from '@src/services/render';
import { exportFoundry } from '@src/services/foundry';
import { loadSystemModule } from '@src/services/system-loader';
import { populateRooms, htmlRoomDetails } from '@src/services/room-key';
import type { SystemModule } from '@src/core/types';

async function generate(): Promise<void> {
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const seedInput = document.getElementById('seed') as HTMLInputElement;
  const systemInput = document.getElementById('system') as HTMLSelectElement;
  const mapEl = document.getElementById('map') as HTMLElement;
  const keyEl = document.getElementById('room-key') as HTMLElement;
  const inputEl = document.getElementById('inputs') as HTMLElement;
  const svgLink = document.getElementById('download-svg') as HTMLAnchorElement;
  const foundryLink = document.getElementById('download-foundry') as HTMLAnchorElement;

  const rooms = parseInt(roomsInput.value, 10) || 8;
  const seed = seedInput.value || undefined;
  const system = systemInput.value || 'generic';

  const opts = { rooms, seed };
  inputEl.textContent = JSON.stringify({ ...opts, system }, null, 2);
  const base = buildDungeon(opts);
  let sys: SystemModule;
  try {
    sys = await loadSystemModule(system, base.rng);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    alert(msg);
    sys = await loadSystemModule('generic', base.rng);
  }
  const enriched = await sys.enrich(base);
  const svg = renderSvg(enriched);
  mapEl.innerHTML = svg;
  const details = populateRooms(enriched, enriched.rng ?? Math.random);
  keyEl.innerHTML = htmlRoomDetails(enriched, details);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  svgLink.href = URL.createObjectURL(svgBlob);
  const foundry = exportFoundry(enriched);
  const foundryBlob = new Blob([JSON.stringify(foundry, null, 2)], { type: 'application/json' });
  foundryLink.href = URL.createObjectURL(foundryBlob);
}

document.getElementById('generate')?.addEventListener('click', () => {
  generate().catch(err => {
    console.error(err);
    const mapEl = document.getElementById('map') as HTMLElement;
    mapEl.textContent = 'Error generating dungeon';
  });
});

generate().catch(console.error);
