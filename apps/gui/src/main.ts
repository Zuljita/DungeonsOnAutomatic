import { buildDungeon } from '@src/services/assembler';
import { renderSvg } from '@src/services/render';
import { exportFoundry } from '@src/services/foundry';
import { loadSystemModule } from '@src/services/system-loader';
import { populateRooms, htmlRoomDetails } from '@src/services/room-key';
import { ImportWizardComponent } from './import-wizard';
import { tagSystem } from '@src/services/tag-system';
import type { SystemModule } from '@src/core/types';

async function generate(): Promise<void> {
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const seedInput = document.getElementById('seed') as HTMLInputElement;
  const systemInput = document.getElementById('system') as HTMLSelectElement;
  const themeInput = document.getElementById('theme') as HTMLSelectElement;
  const mapEl = document.getElementById('map') as HTMLElement;
  const keyEl = document.getElementById('room-key') as HTMLElement;
  const inputEl = document.getElementById('inputs') as HTMLElement;
  const svgLink = document.getElementById('download-svg') as HTMLAnchorElement;
  const foundryLink = document.getElementById('download-foundry') as HTMLAnchorElement;

  const rooms = parseInt(roomsInput.value, 10) || 8;
  const seed = seedInput.value || undefined;
  const system = systemInput.value || 'generic';
  const theme = themeInput.value || undefined;

  const opts = { rooms, seed };
  const tagOptions = theme ? { theme } : undefined;
  
  inputEl.textContent = JSON.stringify({ ...opts, system, theme }, null, 2);
  const base = buildDungeon(opts);
  let sys: SystemModule;
  try {
    sys = await loadSystemModule(system, base.rng);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    alert(msg);
    sys = await loadSystemModule('generic', base.rng);
  }
  const enriched = await sys.enrich(base, { tags: tagOptions });
  const svg = renderSvg(enriched);
  mapEl.innerHTML = svg;
  const details = populateRooms(enriched, enriched.rng ?? Math.random, system);
  keyEl.innerHTML = htmlRoomDetails(enriched, details);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  svgLink.href = URL.createObjectURL(svgBlob);
  const foundry = exportFoundry(enriched);
  const foundryBlob = new Blob([JSON.stringify(foundry, null, 2)], { type: 'application/json' });
  foundryLink.href = URL.createObjectURL(foundryBlob);
}

// Initialize tab navigation
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = (button as HTMLElement).dataset.tab;
      if (!target) return;

      // Remove active class from all tabs and contents
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const content = document.getElementById(`${target}-tab`);
      if (content) {
        content.classList.add('active');
      }
    });
  });
}

// Initialize theme selector
function initializeThemeSelector() {
  const systemSelect = document.getElementById('system') as HTMLSelectElement;
  const themeSelect = document.getElementById('theme') as HTMLSelectElement;
  
  function updateThemes() {
    const selectedSystem = systemSelect.value;
    const themes = tagSystem.getThemesForSystem(selectedSystem);
    
    // Clear existing options except the first one
    themeSelect.innerHTML = '<option value="">No Theme (Random)</option>';
    
    // Add system-specific themes
    themes.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });
  }
  
  // Update themes when system changes
  systemSelect.addEventListener('change', updateThemes);
  
  // Initialize themes for current system
  updateThemes();
}

// Initialize the import wizard
let importWizard: ImportWizardComponent;

document.getElementById('generate')?.addEventListener('click', () => {
  generate().catch(err => {
    console.error(err);
    const mapEl = document.getElementById('map') as HTMLElement;
    mapEl.textContent = 'Error generating dungeon';
  });
});

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeThemeSelector();
  importWizard = new ImportWizardComponent();
  
  // Make import wizard available globally for delete buttons
  window.importWizard = importWizard;
  
  // Generate initial dungeon
  generate().catch(console.error);
});
