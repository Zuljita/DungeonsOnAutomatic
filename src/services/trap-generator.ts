import { id } from './random';

export interface Trap {
  id: string;
  name: string;
  type: string;
  location: string;
  systemStats: Record<string, unknown>;
  placed?: { x: number; y: number } | null;
}

export interface TrapSystem {
  getTrapStats(type: string, difficulty: string): { name: string; [key: string]: unknown };
}

export class TrapGeneratorService {
  private traps: Trap[] = [];

  constructor(private readonly system: TrapSystem) {}

  generateTrap(type: string, difficulty: string, location: string, r: () => number = Math.random): Trap {
    const stats = this.system.getTrapStats(type, difficulty);
    const trap: Trap = {
      id: id('trap', r),
      name: stats.name ?? `${difficulty} ${type} trap`,
      type,
      location,
      systemStats: stats,
      placed: null,
    };
    this.traps.push(trap);
    return trap;
  }

  getUnplacedTraps(): Trap[] {
    return this.traps.filter((t) => !t.placed);
  }

  placeTrap(trapId: string, coordinates: { x: number; y: number }): Trap | null {
    const trap = this.traps.find((t) => t.id === trapId);
    if (!trap) return null;
    trap.placed = coordinates;
    return trap;
  }
}

export default TrapGeneratorService;
