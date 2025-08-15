import { getAvailableModules, getDataTypesForModule, getModuleSchema } from '@src/data/schemas';
import { importWizardService } from '@src/services/import-wizard';
import { dataStorageService } from '@src/services/data-storage';
import { ValidationResult, ValidationError } from '@src/data/schemas/types';

export class ImportWizardComponent {
  private currentModule = '';
  private currentDataType = '';
  private validatedData: Record<string, unknown>[] | null = null;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.populateModules();
    this.updateDataManager();
  }

  private initializeElements() {
    // Get all the DOM elements we'll need
    this.getElement('wizard-module');
    this.getElement('wizard-datatype');
    this.getElement('generate-template');
    this.getElement('download-template');
    this.getElement('file-upload-area');
    this.getElement('file-input');
    this.getElement('save-data');
    this.getElement('dataset-name');
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id "${id}" not found`);
    }
    return element;
  }

  private setupEventListeners() {
    // Module selection
    this.getElement('wizard-module').addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onModuleChange(target.value);
    });

    // Data type selection
    this.getElement('wizard-datatype').addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.onDataTypeChange(target.value);
    });

    // Generate template
    this.getElement('generate-template').addEventListener('click', () => {
      this.generateTemplate();
    });

    // File upload
    const fileUploadArea = this.getElement('file-upload-area');
    const fileInput = this.getElement('file-input') as HTMLInputElement;

    fileUploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.handleFileUpload(target.files[0]);
      }
    });

    // Drag and drop
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove('dragover');
      
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // Save data
    this.getElement('save-data').addEventListener('click', () => {
      this.saveImportedData();
    });

    // Data manager actions
    this.getElement('export-all-data').addEventListener('click', () => {
      this.exportAllData();
    });

    this.getElement('import-backup').addEventListener('click', () => {
      const backupInput = this.getElement('backup-file') as HTMLInputElement;
      backupInput.click();
    });

    this.getElement('backup-file').addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.importBackup(target.files[0]);
      }
    });

    this.getElement('clear-all-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all custom data? This cannot be undone.')) {
        dataStorageService.clearAllData();
        this.updateDataManager();
        this.showStatus('upload-status', 'All custom data has been deleted.', 'info');
      }
    });
  }

  private populateModules() {
    const moduleSelect = this.getElement('wizard-module') as HTMLSelectElement;
    const modules = getAvailableModules();

    // Clear existing options except the first one
    moduleSelect.innerHTML = '<option value="">Select a module...</option>';

    modules.forEach(module => {
      const option = document.createElement('option');
      option.value = module.id;
      option.textContent = module.label;
      moduleSelect.appendChild(option);
    });
  }

  private onModuleChange(moduleId: string) {
    this.currentModule = moduleId;
    this.currentDataType = '';
    
    const dataTypeSelect = this.getElement('wizard-datatype') as HTMLSelectElement;
    const generateBtn = this.getElement('generate-template') as HTMLButtonElement;

    if (!moduleId) {
      dataTypeSelect.innerHTML = '<option value="">Select module first...</option>';
      dataTypeSelect.disabled = true;
      generateBtn.disabled = true;
      this.clearStatus('datatype-description');
      return;
    }

    // Populate data types
    const dataTypes = getDataTypesForModule(moduleId);
    dataTypeSelect.innerHTML = '<option value="">Select a data type...</option>';
    
    const schema = getModuleSchema(moduleId);
    if (schema) {
      dataTypes.forEach(dataType => {
        const option = document.createElement('option');
        option.value = dataType;
        option.textContent = schema.dataTypes[dataType].name;
        dataTypeSelect.appendChild(option);
      });
    }

    dataTypeSelect.disabled = false;
    generateBtn.disabled = true;
  }

  private onDataTypeChange(dataType: string) {
    this.currentDataType = dataType;
    
    const generateBtn = this.getElement('generate-template') as HTMLButtonElement;
    generateBtn.disabled = !dataType;

    // Show data type description
    if (dataType && this.currentModule) {
      const schema = getModuleSchema(this.currentModule);
      if (schema && schema.dataTypes[dataType]) {
        const description = schema.dataTypes[dataType].description;
        this.showStatus('datatype-description', description, 'info');
      }
    } else {
      this.clearStatus('datatype-description');
    }
  }

  private generateTemplate() {
    if (!this.currentModule || !this.currentDataType) return;

    const blob = importWizardService.createTemplateBlob(this.currentModule, this.currentDataType);
    if (!blob) {
      this.showStatus('template-status', 'Error generating template.', 'error');
      return;
    }

    const schema = getModuleSchema(this.currentModule);
    const fileName = schema?.dataTypes[this.currentDataType]?.fileName || 'template.csv';

    const downloadLink = this.getElement('download-template') as HTMLAnchorElement;
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = fileName;
    downloadLink.style.display = 'inline';
    downloadLink.textContent = `Download ${fileName}`;

    this.showStatus('template-status', 'Template generated successfully! Click the download link above.', 'success');
  }

  private async handleFileUpload(file: File) {
    if (!this.currentModule || !this.currentDataType) {
      this.showStatus('upload-status', 'Please select a module and data type first.', 'error');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.showStatus('upload-status', 'Please upload a CSV file.', 'error');
      return;
    }

    try {
      const content = await this.readFileAsText(file);
      const result = importWizardService.validateAndParse(this.currentModule, this.currentDataType, content);

      if (result.isValid && result.data) {
        this.validatedData = result.data;
        this.showStatus('upload-status', `File uploaded successfully! Found ${result.data.length} valid records.`, 'success');
        this.showValidationResults(result);
        
        const saveBtn = this.getElement('save-data') as HTMLButtonElement;
        saveBtn.disabled = false;
      } else {
        this.validatedData = null;
        this.showStatus('upload-status', 'File validation failed. Please fix the errors below.', 'error');
        this.showValidationResults(result);
        
        const saveBtn = this.getElement('save-data') as HTMLButtonElement;
        saveBtn.disabled = true;
      }
    } catch (error) {
      this.showStatus('upload-status', `Error reading file: ${error}`, 'error');
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private showValidationResults(result: ValidationResult) {
    const resultsDiv = this.getElement('validation-results');
    
    if (result.isValid) {
      resultsDiv.innerHTML = `
        <div class="status-message status-success">
          ✓ Validation successful! ${result.data?.length || 0} records ready to import.
        </div>
      `;
    } else {
      const errorList = result.errors.map((error: ValidationError) => 
        `<li>Row ${error.row}, Column "${error.column}": ${error.message} (Value: "${error.value}")</li>`
      ).join('');
      
      resultsDiv.innerHTML = `
        <div class="status-message status-error">
          <strong>Validation Errors:</strong>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            ${errorList}
          </ul>
        </div>
      `;
    }
  }

  private saveImportedData() {
    if (!this.validatedData || !this.currentModule || !this.currentDataType) return;

    const nameInput = this.getElement('dataset-name') as HTMLInputElement;
    const name = nameInput.value.trim();

    try {
      dataStorageService.saveData(this.currentModule, this.currentDataType, this.validatedData, name);
      this.showStatus('upload-status', 'Data saved successfully!', 'success');
      this.updateDataManager();
      
      // Reset form
      this.validatedData = null;
      nameInput.value = '';
      const saveBtn = this.getElement('save-data') as HTMLButtonElement;
      saveBtn.disabled = true;
      this.clearStatus('validation-results');
    } catch (error) {
      this.showStatus('upload-status', `Error saving data: ${error}`, 'error');
    }
  }

  private updateDataManager() {
    const dataList = this.getElement('custom-data-list');
    const datasets = dataStorageService.getAllDatasets();

    if (datasets.length === 0) {
      dataList.innerHTML = '<p>No custom data imported yet.</p>';
      return;
    }

    const items = datasets.map(dataset => `
      <div class="data-item">
        <div class="data-item-info">
          <strong>${dataset.name}</strong><br>
          <small>${dataset.moduleId} - ${dataset.dataType} (${dataset.data.length} records)</small><br>
          <small>Imported: ${new Date(dataset.importedAt).toLocaleString()}</small>
        </div>
        <div class="data-item-actions">
          <button class="btn btn-danger" onclick="window.importWizard.deleteDataset('${dataset.moduleId}', '${dataset.dataType}')">
            Delete
          </button>
        </div>
      </div>
    `).join('');

    dataList.innerHTML = items;
  }

  public deleteDataset(moduleId: string, dataType: string) {
    if (confirm(`Are you sure you want to delete the ${moduleId} ${dataType} dataset?`)) {
      dataStorageService.deleteData(moduleId, dataType);
      this.updateDataManager();
    }
  }

  private exportAllData() {
    const data = dataStorageService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `doa-custom-data-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  private async importBackup(file: File) {
    try {
      const content = await this.readFileAsText(file);
      const success = dataStorageService.importData(content);
      
      if (success) {
        this.updateDataManager();
        alert('Backup imported successfully!');
      } else {
        alert('Error importing backup: Invalid format.');
      }
    } catch (error) {
      alert(`Error importing backup: ${error}`);
    }
  }

  private showStatus(elementId: string, message: string, type: 'success' | 'error' | 'info') {
    const element = this.getElement(elementId);
    element.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
  }

  private clearStatus(elementId: string) {
    const element = this.getElement(elementId);
    element.innerHTML = '';
  }
}