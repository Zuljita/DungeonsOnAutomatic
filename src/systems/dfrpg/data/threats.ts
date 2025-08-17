// DFRPG Threat Scaling System
// Based on the DFRPG Random Dungeon Generator relative challenge system

export interface ThreatLevel {
  name: string;
  minMultiplier: number;
  maxMultiplier: number;
  description: string;
}

export const THREAT_LEVELS: Record<string, ThreatLevel> = {
  Trivial: {
    name: 'Trivial',
    minMultiplier: 0.10,
    maxMultiplier: 0.25,
    description: 'Almost no threat to the party'
  },
  Easy: {
    name: 'Easy',
    minMultiplier: 0.25,
    maxMultiplier: 0.50,
    description: 'Light challenge, warm-up encounter'
  },
  Average: {
    name: 'Average',
    minMultiplier: 0.50,
    maxMultiplier: 1.00,
    description: 'Standard encounter difficulty'
  },
  Challenging: {
    name: 'Challenging',
    minMultiplier: 1.00,
    maxMultiplier: 1.50,
    description: 'Significant threat requiring strategy'
  },
  Hard: {
    name: 'Hard',
    minMultiplier: 1.50,
    maxMultiplier: 2.00,
    description: 'Dangerous encounter, high resource cost'
  },
  Epic: {
    name: 'Epic',
    minMultiplier: 2.00,
    maxMultiplier: 10.00,
    description: 'Boss-level encounter, potential party killer'
  }
};

export type ThreatLevelName = keyof typeof THREAT_LEVELS;

/**
 * Get a random CER multiplier for the given threat level
 */
export function getThreatMultiplier(threatLevel: ThreatLevelName, rng: () => number = Math.random): number {
  const threat = THREAT_LEVELS[threatLevel];
  if (!threat) {
    throw new Error(`Unknown threat level: ${threatLevel}`);
  }
  
  const range = threat.maxMultiplier - threat.minMultiplier;
  return threat.minMultiplier + (rng() * range);
}

/**
 * Calculate target encounter CER based on party CER and threat level
 */
export function calculateTargetCER(partyCER: number, threatLevel: ThreatLevelName, rng: () => number = Math.random): number {
  const multiplier = getThreatMultiplier(threatLevel, rng);
  return Math.round(partyCER * multiplier);
}