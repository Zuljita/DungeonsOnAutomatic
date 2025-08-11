/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dungeon, SystemModule } from '../../core/types.js';

// monsters-complete.js exports "var monsters_complete = [ ... ]"
async function loadMonsters(): Promise<any[]> {
  // Use dynamic import via data URL shim because the source is plain .js with a var declaration
  const raw = await import('./data/monsters-complete.js?raw');
  // Extract array literal from the file text
  const txt = (raw as any).default as string;
  const match = txt.match(/var\s+monsters_complete\s*=\s*(\[.*\]);/s);
  if (!match) return [];
  try {
    // Turn into valid JSON by replacing trailing commas if any (best-effort)
    const jsonish = match[1].replace(/,(\s*[\]\}])/g, '$1');
    return JSON.parse(jsonish);
  } catch {
    return [];
  }
}

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy',
  async enrich(d: Dungeon): Promise<Dungeon> {
    const monsters = await loadMonsters();
    // naive: drop 0-2 monsters in each room from the dataset
    const byRoom = d.rooms.map(() => {
      const count = Math.floor(Math.random() * 3);
      const picks = [];
      for (let i=0;i<count;i++) {
        const m = monsters[Math.floor(Math.random() * monsters.length)];
        if (m) picks.push({ name: m.Description, sm: m.SM ?? null, cls: m.Class, subclass: m.Subclass });
      }
      return picks;
    });
    const encounters = { ...d.encounters };
    d.rooms.forEach((r, idx) => {
      if (byRoom[idx]?.length) {
        encounters[r.id] = { ...(encounters[r.id] || {}), monsters: byRoom[idx] };
      }
    });
    return { ...d, encounters };
  }
};

export default dfrpg;
