/**
 * Data storage service for managing custom imported data
 * Uses localStorage for persistence in the browser
 */

export interface StoredDataSet {
  moduleId: string;
  dataType: string;
  data: Record<string, unknown>[];
  importedAt: string;
  name: string;
}

export class DataStorageService {
  private readonly storageKey = 'doa-custom-data';

  /**
   * Save imported data to storage
   */
  saveData(moduleId: string, dataType: string, data: Record<string, unknown>[], name?: string): void {
    const storedData = this.getAllStoredData();
    const key = `${moduleId}-${dataType}`;
    
    storedData[key] = {
      moduleId,
      dataType,
      data,
      importedAt: new Date().toISOString(),
      name: name || `${moduleId} ${dataType}`
    };

    localStorage.setItem(this.storageKey, JSON.stringify(storedData));
  }

  /**
   * Retrieve data for a specific module and data type
   */
  getData(moduleId: string, dataType: string): Record<string, unknown>[] {
    const storedData = this.getAllStoredData();
    const key = `${moduleId}-${dataType}`;
    return storedData[key]?.data || [];
  }

  /**
   * Check if custom data exists for a module/dataType combination
   */
  hasData(moduleId: string, dataType: string): boolean {
    const storedData = this.getAllStoredData();
    const key = `${moduleId}-${dataType}`;
    return key in storedData && storedData[key].data.length > 0;
  }

  /**
   * Get all stored datasets
   */
  getAllDatasets(): StoredDataSet[] {
    const storedData = this.getAllStoredData();
    return Object.values(storedData);
  }

  /**
   * Delete data for a specific module and data type
   */
  deleteData(moduleId: string, dataType: string): void {
    const storedData = this.getAllStoredData();
    const key = `${moduleId}-${dataType}`;
    delete storedData[key];
    localStorage.setItem(this.storageKey, JSON.stringify(storedData));
  }

  /**
   * Clear all stored data
   */
  clearAllData(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Export all data as JSON for backup
   */
  exportData(): string {
    const storedData = this.getAllStoredData();
    return JSON.stringify(storedData, null, 2);
  }

  /**
   * Import data from JSON backup
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      // Validate that it's the correct format
      if (typeof data === 'object' && data !== null) {
        for (const value of Object.values(data)) {
          if (!this.isValidStoredDataSet(value)) {
            return false;
          }
        }
        localStorage.setItem(this.storageKey, jsonData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private getAllStoredData(): Record<string, StoredDataSet> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private isValidStoredDataSet(value: unknown): value is StoredDataSet {
    return (
      typeof value === 'object' &&
      value !== null &&
      'moduleId' in value &&
      'dataType' in value &&
      'data' in value &&
      'importedAt' in value &&
      'name' in value &&
      Array.isArray((value as StoredDataSet).data)
    );
  }
}

export const dataStorageService = new DataStorageService();