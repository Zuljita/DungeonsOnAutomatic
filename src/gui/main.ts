import { buildDungeon } from '../services/assembler.js';
import { renderAscii } from '../services/render.js';
import { loadSystemModule } from '../services/system-loader.js';

async function generate(): Promise<void> {
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const seedInput = document.getElementById('seed') as HTMLInputElement;
  const mapEl = document.getElementById('map') as HTMLElement;
  const inputEl = document.getElementById('inputs') as HTMLElement;
  const outputEl = document.getElementById('outputs') as HTMLElement;

  const rooms = parseInt(roomsInput.value, 10) || 8;
  const seed = seedInput.value || undefined;

  const opts = { rooms, seed };
  inputEl.textContent = JSON.stringify(opts, null, 2);
  const base = buildDungeon(opts);
  const sys = await loadSystemModule('generic');
  const enriched = await sys.enrich(base);
  mapEl.textContent = renderAscii(enriched);
  outputEl.textContent = JSON.stringify(enriched, null, 2);
}

document.getElementById('generate')?.addEventListener('click', () => {
  generate().catch(err => {
    // log error to console and show message in UI
    console.error(err);
    const mapEl = document.getElementById('map') as HTMLElement;
    mapEl.textContent = 'Error generating dungeon';
  });
});

// generate a dungeon on load for convenience
generate().catch(console.error);
