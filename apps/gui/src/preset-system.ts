/**
 * Configuration Preset System
 * Handles saving, loading, and managing dungeon generation configuration presets
 */

// Preset data structure matching the current configuration format
export interface PresetConfiguration {
  // Basic settings
  template?: string;
  system?: string;
  theme?: string;
  rooms?: number;
  width?: number;
  height?: number;
  seed?: string;

  // Layout and structure
  layoutType?: string;
  roomLayout?: string;
  roomSize?: string;
  roomShape?: string;

  // Corridors
  corridorType?: string;
  corridorWidth?: number;
  allowDeadends?: boolean;

  // Special features
  stairsUp?: boolean;
  stairsDown?: boolean;
  entranceFromPeriphery?: boolean;

  // Content filtering
  sources?: string[];
  monsterTags?: string[];
  trapTags?: string[];
  treasureTags?: string[];

  // Rendering
  mapStyle?: string;
  colorTheme?: string;
  texture?: string;
}

// Preset metadata
export interface PresetMetadata {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  modifiedAt: string;
  lastUsed?: string;
  usageCount: number;
  systemType?: string;
  version: string;
  isBuiltIn: boolean;
}

// Complete preset structure
export interface DungeonPreset {
  metadata: PresetMetadata;
  configuration: PresetConfiguration;
}

// Preset validation result
export interface PresetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Storage management class
export class PresetStorage {
  private readonly PRESETS_KEY = 'doa-configuration-presets';
  private readonly VERSION = '1.0.0';

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      const stored = localStorage.getItem(this.PRESETS_KEY);
      if (!stored) {
        // Initialize with built-in presets
        const builtInPresets = this.getBuiltInPresets();
        localStorage.setItem(this.PRESETS_KEY, JSON.stringify(builtInPresets));
      }
    } catch (error) {
      console.error('Failed to initialize preset storage:', error);
    }
  }

  /**
   * Get all stored presets
   */
  getAllPresets(): DungeonPreset[] {
    try {
      const stored = localStorage.getItem(this.PRESETS_KEY);
      if (!stored) return [];
      
      const presets = JSON.parse(stored) as DungeonPreset[];
      return Array.isArray(presets) ? presets : [];
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  }

  /**
   * Save a new preset
   */
  savePreset(name: string, description: string, configuration: PresetConfiguration, category?: string): boolean {
    try {
      const presets = this.getAllPresets();
      
      // Check for duplicate names
      if (presets.some(p => p.metadata.name === name)) {
        throw new Error(`Preset with name "${name}" already exists`);
      }

      const preset: DungeonPreset = {
        metadata: {
          id: this.generateId(),
          name,
          description,
          category,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          usageCount: 0,
          systemType: configuration.system,
          version: this.VERSION,
          isBuiltIn: false
        },
        configuration
      };

      presets.push(preset);
      localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
      return true;
    } catch (error) {
      console.error('Failed to save preset:', error);
      return false;
    }
  }

  /**
   * Load a preset by ID
   */
  loadPreset(presetId: string): DungeonPreset | null {
    try {
      const presets = this.getAllPresets();
      const preset = presets.find(p => p.metadata.id === presetId);
      
      if (preset) {
        // Update usage statistics
        preset.metadata.lastUsed = new Date().toISOString();
        preset.metadata.usageCount++;
        this.updatePreset(preset);
      }
      
      return preset || null;
    } catch (error) {
      console.error('Failed to load preset:', error);
      return null;
    }
  }

  /**
   * Update an existing preset
   */
  updatePreset(updatedPreset: DungeonPreset): boolean {
    try {
      const presets = this.getAllPresets();
      const index = presets.findIndex(p => p.metadata.id === updatedPreset.metadata.id);
      
      if (index === -1) {
        throw new Error('Preset not found');
      }

      updatedPreset.metadata.modifiedAt = new Date().toISOString();
      presets[index] = updatedPreset;
      localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
      return true;
    } catch (error) {
      console.error('Failed to update preset:', error);
      return false;
    }
  }

  /**
   * Delete a preset by ID
   */
  deletePreset(presetId: string): boolean {
    try {
      const presets = this.getAllPresets();
      const preset = presets.find(p => p.metadata.id === presetId);
      
      if (!preset) {
        throw new Error('Preset not found');
      }

      if (preset.metadata.isBuiltIn) {
        throw new Error('Cannot delete built-in presets');
      }

      const filteredPresets = presets.filter(p => p.metadata.id !== presetId);
      localStorage.setItem(this.PRESETS_KEY, JSON.stringify(filteredPresets));
      return true;
    } catch (error) {
      console.error('Failed to delete preset:', error);
      return false;
    }
  }

  /**
   * Export presets as JSON
   */
  exportPresets(presetIds?: string[]): string {
    const presets = this.getAllPresets();
    const toExport = presetIds 
      ? presets.filter(p => presetIds.includes(p.metadata.id))
      : presets.filter(p => !p.metadata.isBuiltIn); // Don't export built-ins by default

    return JSON.stringify({
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      presets: toExport
    }, null, 2);
  }

  /**
   * Import presets from JSON
   */
  importPresets(jsonData: string, overwriteExisting: boolean = false): { success: boolean; imported: number; errors: string[] } {
    try {
      const importData = JSON.parse(jsonData);
      const existingPresets = this.getAllPresets();
      const errors: string[] = [];
      let imported = 0;

      if (!importData.presets || !Array.isArray(importData.presets)) {
        throw new Error('Invalid preset data format');
      }

      for (const preset of importData.presets) {
        try {
          const validation = this.validatePreset(preset);
          if (!validation.isValid) {
            errors.push(`Invalid preset "${preset.metadata?.name}": ${validation.errors.join(', ')}`);
            continue;
          }

          const existingIndex = existingPresets.findIndex(p => p.metadata.name === preset.metadata.name);
          
          if (existingIndex !== -1) {
            if (overwriteExisting) {
              preset.metadata.id = existingPresets[existingIndex].metadata.id;
              preset.metadata.modifiedAt = new Date().toISOString();
              existingPresets[existingIndex] = preset;
              imported++;
            } else {
              errors.push(`Preset "${preset.metadata.name}" already exists (skipped)`);
            }
          } else {
            preset.metadata.id = this.generateId();
            preset.metadata.modifiedAt = new Date().toISOString();
            preset.metadata.isBuiltIn = false;
            existingPresets.push(preset);
            imported++;
          }
        } catch (error) {
          errors.push(`Failed to import preset "${preset.metadata?.name}": ${error}`);
        }
      }

      if (imported > 0) {
        localStorage.setItem(this.PRESETS_KEY, JSON.stringify(existingPresets));
      }

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return { success: false, imported: 0, errors: [`Import failed: ${error}`] };
    }
  }

  /**
   * Validate preset data structure
   */
  private validatePreset(preset: any): PresetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!preset.metadata) {
      errors.push('Missing preset metadata');
    } else {
      if (!preset.metadata.name || typeof preset.metadata.name !== 'string') {
        errors.push('Invalid or missing preset name');
      }
      if (!preset.metadata.description || typeof preset.metadata.description !== 'string') {
        errors.push('Invalid or missing preset description');
      }
    }

    if (!preset.configuration) {
      errors.push('Missing preset configuration');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate unique ID for presets
   */
  private generateId(): string {
    return 'preset_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Get built-in example presets
   */
  private getBuiltInPresets(): DungeonPreset[] {
    const baseMetadata = {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      usageCount: 0,
      version: this.VERSION,
      isBuiltIn: true
    };

    return [
      {
        metadata: {
          ...baseMetadata,
          id: 'builtin_small_dungeon',
          name: 'Small Dungeon',
          description: 'A compact 5-room dungeon perfect for quick sessions',
          category: 'Quick Start',
          systemType: 'generic'
        },
        configuration: {
          rooms: 5,
          width: 30,
          height: 30,
          layoutType: 'rectangle',
          roomLayout: 'scattered',
          roomSize: 'small',
          corridorType: 'straight',
          system: 'generic'
        }
      },
      {
        metadata: {
          ...baseMetadata,
          id: 'builtin_classic_dungeon',
          name: 'Classic Dungeon',
          description: 'Traditional 10-room dungeon with balanced layout',
          category: 'Classic',
          systemType: 'generic'
        },
        configuration: {
          rooms: 10,
          width: 50,
          height: 50,
          layoutType: 'rectangle',
          roomLayout: 'scattered',
          roomSize: 'medium',
          corridorType: 'straight',
          allowDeadends: true,
          system: 'generic'
        }
      },
      {
        metadata: {
          ...baseMetadata,
          id: 'builtin_large_complex',
          name: 'Large Complex',
          description: 'Extensive 20-room dungeon for extended campaigns',
          category: 'Epic',
          systemType: 'generic'
        },
        configuration: {
          rooms: 20,
          width: 80,
          height: 80,
          layoutType: 'rectangle',
          roomLayout: 'dense',
          roomSize: 'mixed',
          corridorType: 'winding',
          corridorWidth: 2,
          stairsUp: true,
          stairsDown: true,
          system: 'generic'
        }
      },
      {
        metadata: {
          ...baseMetadata,
          id: 'builtin_dfrpg_delve',
          name: 'DFRPG Delve',
          description: 'Optimized for Dungeon Fantasy RPG with appropriate encounters',
          category: 'DFRPG',
          systemType: 'dfrpg'
        },
        configuration: {
          rooms: 12,
          width: 60,
          height: 60,
          layoutType: 'box',
          roomLayout: 'symmetric',
          roomSize: 'medium',
          corridorType: 'straight',
          system: 'dfrpg'
        }
      },
      {
        metadata: {
          ...baseMetadata,
          id: 'builtin_fortress',
          name: 'Fortress Keep',
          description: 'Castle-like structure with defensive layout',
          category: 'Themed',
          systemType: 'generic'
        },
        configuration: {
          rooms: 15,
          width: 70,
          height: 70,
          layoutType: 'keep',
          roomLayout: 'symmetric',
          roomSize: 'large',
          corridorType: 'straight',
          corridorWidth: 3,
          entranceFromPeriphery: true,
          system: 'generic'
        }
      }
    ];
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category?: string): DungeonPreset[] {
    const presets = this.getAllPresets();
    return category 
      ? presets.filter(p => p.metadata.category === category)
      : presets.filter(p => !p.metadata.category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const presets = this.getAllPresets();
    const categories = new Set<string>();
    
    presets.forEach(preset => {
      if (preset.metadata.category) {
        categories.add(preset.metadata.category);
      }
    });
    
    return Array.from(categories).sort();
  }

  /**
   * Search presets by name or description
   */
  searchPresets(query: string): DungeonPreset[] {
    if (!query.trim()) return this.getAllPresets();
    
    const searchTerm = query.toLowerCase().trim();
    return this.getAllPresets().filter(preset => 
      preset.metadata.name.toLowerCase().includes(searchTerm) ||
      preset.metadata.description.toLowerCase().includes(searchTerm) ||
      preset.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
}

// Export singleton instance
export const presetStorage = new PresetStorage();