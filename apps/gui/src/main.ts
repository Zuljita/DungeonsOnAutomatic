import { buildDungeon } from '@src/services/assembler';
import { renderAscii } from '@src/services/render';
import { loadSystemModule } from '@src/services/system-loader';

async function generate(): Promise<void> {
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const seedInput = document.getElementById('seed') as HTMLInputElement;
  const systemInput = document.getElementById('system') as HTMLSelectElement;
  const mapEl = document.getElementById('map') as HTMLElement;
  const inputEl = document.getElementById('inputs') as HTMLElement;
  const outputEl = document.getElementById('outputs') as HTMLElement;

  const rooms = parseInt(roomsInput.value, 10) || 8;
  const seed = seedInput.value || undefined;
  const system = systemInput.value || 'generic';

  const opts = { rooms, seed };
  inputEl.textContent = JSON.stringify({ ...opts, system }, null, 2);
  const base = buildDungeon(opts);
  const sys = await loadSystemModule(system);
  const enriched = await sys.enrich(base);
  mapEl.textContent = renderAscii(enriched);
  outputEl.textContent = JSON.stringify(enriched, null, 2);
}

document.getElementById('generate')?.addEventListener('click', () => {
  generate().catch(err => {
    console.error(err);
    const mapEl = document.getElementById('map') as HTMLElement;
    mapEl.textContent = 'Error generating dungeon';
  });
});

generate().catch(console.error);
