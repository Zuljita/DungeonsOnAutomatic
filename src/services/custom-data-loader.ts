import { dataStorageService } from './data-storage';
import { Monster, Trap, Door, Treasure, EnvironmentalDetail } from '../core/types';

/**
 * Service to load custom imported data for use in system modules
 */
export class CustomDataLoaderService {
  /**
   * Get custom monsters for a module, or return default data if none available
   */
  getMonsters(moduleId: string, defaultMonsters: Monster[] = []): Monster[] {
    const customData = dataStorageService.getData(moduleId, 'monsters');
    
    if (customData.length > 0) {
      // Convert custom data to Monster format
      return customData.map(item => ({
        name: String(item.name || item.Description || 'Unknown Monster'),
        sm: typeof item.sm === 'number' ? item.sm : (typeof item.SM === 'number' ? item.SM : null),
        cls: String(item.cls || item.Class || ''),
        subclass: String(item.subclass || item.Subclass || ''),
        notes: String(item.notes || ''),
        source: String(item.source || item.Source1 || 'Custom Import')
      }));
    }
    
    return defaultMonsters;
  }

  /**
   * Get custom traps for a module, or return default data if none available
   */
  getTraps(moduleId: string, defaultTraps: Trap[] = []): Trap[] {
    const customData = dataStorageService.getData(moduleId, 'traps');
    
    if (customData.length > 0) {
      return customData.map(item => ({
        name: String(item.name || 'Unknown Trap'),
        level: typeof item.level === 'number' ? item.level : undefined,
        notes: String(item.notes || item.effect || '')
      }));
    }
    
    return defaultTraps;
  }

  /**
   * Get custom doors for a module, or return default data if none available
   */
  getDoors(moduleId: string, defaultDoors: Partial<Door>[] = []): Partial<Door>[] {
    const customData = dataStorageService.getData(moduleId, 'doors');
    
    if (customData.length > 0) {
      return customData.map(item => ({
        type: this.validateDoorType(String(item.type || 'normal')),
        status: this.validateDoorStatus(String(item.status || 'locked')),
        material: String(item.material || ''),
        notes: String(item.notes || '')
      }));
    }
    
    return defaultDoors;
  }

  /**
   * Get custom room features/decorations for a module
   */
  getDecorations(moduleId: string): Array<{ name: string; weight: number; description?: string }> {
    const customData = dataStorageService.getData(moduleId, 'decorations');
    
    return customData.map(item => ({
      name: String(item.name || 'Unknown Feature'),
      weight: typeof item.weight === 'number' ? item.weight : 1,
      description: String(item.description || '')
    }));
  }

  /**
   * Get custom treasure for a module, or return default data if none available
   */
  getTreasure(moduleId: string, defaultTreasure: Treasure[] = []): Treasure[] {
    const customData = dataStorageService.getData(moduleId, 'treasure');
    
    if (customData.length > 0) {
      return customData.map(item => ({
        kind: this.validateTreasureKind(String(item.kind || 'other')),
        valueHint: String(item.valueHint || ''),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : []
      }));
    }
    
    return defaultTreasure;
  }

  /**
   * Get custom environmental details (lighting, ceilings, mana levels, etc.)
   */
  getEnvironmentData(
    dataType: string,
    defaultData: EnvironmentalDetail[] = []
  ): EnvironmentalDetail[] {
    const customData = dataStorageService.getData('environment', dataType);

    if (customData.length > 0) {
      return customData.map(item => ({
        name: String(item.name || 'Unknown'),
        description: String(item.description || ''),
        weight: typeof item.weight === 'number' ? item.weight : 1
      }));
    }

    return defaultData;
  }

  /**
   * Check if custom data exists for a specific module and data type
   */
  hasCustomData(moduleId: string, dataType: string): boolean {
    return dataStorageService.hasData(moduleId, dataType);
  }

  /**
   * Get raw custom data for advanced use cases
   */
  getCustomData(moduleId: string, dataType: string): Record<string, unknown>[] {
    return dataStorageService.getData(moduleId, dataType);
  }

  private validateDoorType(type: string): Door['type'] {
    const validTypes: Door['type'][] = ['normal', 'arch', 'portcullis', 'hole'];
    return validTypes.includes(type as Door['type']) ? type as Door['type'] : 'normal';
  }

  private validateDoorStatus(status: string): Door['status'] {
    const validStatuses: Door['status'][] = ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'];
    return validStatuses.includes(status as Door['status']) ? status as Door['status'] : 'locked';
  }

  private validateTreasureKind(kind: string): Treasure['kind'] {
    const validKinds: Treasure['kind'][] = ['coins', 'gems', 'art', 'gear', 'magic', 'other'];
    return validKinds.includes(kind as Treasure['kind']) ? kind as Treasure['kind'] : 'other';
  }
}

export const customDataLoader = new CustomDataLoaderService();