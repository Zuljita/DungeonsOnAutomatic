import { Dungeon, SystemModule } from '../core/types';
import { customDataLoader } from '../services/custom-data-loader';

export const generic: SystemModule = {
  id: 'generic',
  label: 'Generic (no system)',
  enrich(d: Dungeon, opts?: Record<string, unknown>): Dungeon {
    void opts;
    
    // Check if there's any custom data for the generic system
    const hasCustomMonsters = customDataLoader.hasCustomData('generic', 'monsters');
    const hasCustomTraps = customDataLoader.hasCustomData('generic', 'traps');
    
    if (hasCustomMonsters || hasCustomTraps) {
      console.log('Using custom data for generic system');
      
      // Add basic encounters using custom data if available
      const encounters = { ...d.encounters };
      const R = () => Math.random(); // Simple RNG for generic system
      
      const customMonsters = hasCustomMonsters ? customDataLoader.getMonsters('generic') : [];
      const customTraps = hasCustomTraps ? customDataLoader.getTraps('generic') : [];
      
      d.rooms.forEach((room) => {
        const roomEncounter = encounters[room.id] || { monsters: [], traps: [], treasure: [] };
        
        // Add monsters if custom monsters are available
        if (customMonsters.length > 0 && R() < 0.4) {
          const monster = customMonsters[Math.floor(R() * customMonsters.length)];
          roomEncounter.monsters = roomEncounter.monsters || [];
          roomEncounter.monsters.push({ ...monster });
        }
        
        // Add traps if custom traps are available
        if (customTraps.length > 0 && R() < 0.2) {
          const trap = customTraps[Math.floor(R() * customTraps.length)];
          roomEncounter.traps = roomEncounter.traps || [];
          roomEncounter.traps.push({ ...trap });
        }
        
        encounters[room.id] = roomEncounter;
      });
      
      return { ...d, encounters };
    }
    
    return d;
  }
};

export default generic;
