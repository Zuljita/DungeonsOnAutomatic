import { Dungeon, Monster, WanderingMonster } from '../core/types';

export class WanderingMonsterService {
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  /**
   * Generates a wandering monster table based on monsters already placed in the dungeon
   */
  generateWanderingMonsters(dungeon: Dungeon): WanderingMonster[] {
    // Collect all unique monsters from the dungeon
    const monsterCounts = new Map<string, { monster: Monster; count: number }>();
    
    // Iterate through all rooms and count monster occurrences
    dungeon.rooms.forEach(room => {
      const roomEncounters = dungeon.encounters?.[room.id];
      if (roomEncounters?.monsters) {
        roomEncounters.monsters.forEach(monster => {
          const key = monster.name;
          if (monsterCounts.has(key)) {
            monsterCounts.get(key)!.count++;
          } else {
            monsterCounts.set(key, { monster, count: 1 });
          }
        });
      }
    });

    // If no monsters found, return empty array
    if (monsterCounts.size === 0) {
      return [];
    }

    // Convert to array and sort by frequency (most common first)
    const monsterEntries = Array.from(monsterCounts.entries())
      .sort((a, b) => b[1].count - a[1].count);

    // Create a 2d6 roll table (2-12)
    const wanderingMonsters: WanderingMonster[] = [];
    
    // Distribute monsters across the 2d6 range
    // More common monsters get more roll ranges
    let currentRoll = 2;
    
    monsterEntries.forEach(([name, { monster, count }], index) => {
      // Calculate how many roll ranges this monster should get
      // More common monsters get more ranges
      const rollRanges = Math.max(1, Math.min(3, Math.ceil(count / 2)));
      
      for (let i = 0; i < rollRanges && currentRoll <= 12; i++) {
        const rollEnd = Math.min(12, currentRoll + 1);
        const rollRange = rollEnd === currentRoll ? `${currentRoll}` : `${currentRoll}-${rollEnd}`;
        
        // Determine quantity based on monster type and frequency
        const quantity = this.determineQuantity(monster, count);
        
        wanderingMonsters.push({
          roll: rollRange,
          monster: { ...monster },
          quantity
        });
        
        currentRoll = rollEnd + 1;
      }
    });

    // Fill remaining roll ranges with random monsters from the pool
    while (currentRoll <= 12) {
      const randomMonster = monsterEntries[Math.floor(this.rng() * monsterEntries.length)][1].monster;
      const rollEnd = Math.min(12, currentRoll + 1);
      const rollRange = rollEnd === currentRoll ? `${currentRoll}` : `${currentRoll}-${rollEnd}`;
      
      wanderingMonsters.push({
        roll: rollRange,
        monster: { ...randomMonster },
        quantity: this.determineQuantity(randomMonster, 1)
      });
      
      currentRoll = rollEnd + 1;
    }

    return wanderingMonsters;
  }

  /**
   * Determines the quantity of monsters based on their type and frequency
   */
  private determineQuantity(monster: Monster, frequency: number): string {
    // Base quantity on monster threat level and frequency
    const baseQuantity = frequency >= 3 ? '2d4' : frequency >= 2 ? '1d4' : '1d3';
    
    // Adjust for monster size and threat
    if (monster.threat_rating === 'boss') {
      return '1'; // Boss monsters are always single
    } else if (monster.threat_rating === 'worthy') {
      return frequency >= 2 ? '1d3' : '1d2';
    } else if (monster.threat_rating === 'fodder') {
      return frequency >= 3 ? '3d6' : frequency >= 2 ? '2d4' : '1d4';
    }
    
    // Default based on frequency
    return baseQuantity;
  }
}
