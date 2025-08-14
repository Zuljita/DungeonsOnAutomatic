import { ImportWizardComponent } from './import-wizard';

declare global {
  interface Window {
    importWizard: ImportWizardComponent;
  }
}

export {};
