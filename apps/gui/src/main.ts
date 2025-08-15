import { systemLoader } from '@src/services/system-loader';
import { renderSvg } from '@src/services/render';
import { htmlRoomDetails } from '@src/services/room-key';
import { ImportWizardComponent } from './import-wizard';
import { tagSystem } from '@src/services/tag-system';
import { mapGenerator, MapGenerationOptions } from '@src/services/map-generator';

let importWizard: ImportWizardComponent;

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = (tab as HTMLElement).getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      if (targetTab) {
        showTab(targetTab);
      }
    });
  });
}

function showTab(tabName: string) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => content.classList.remove('active'));

  // Remove active class from all tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Show selected tab content
  const selectedContent = document.getElementById(`${tabName}-tab`);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }

  // Add active class to selected tab
  const selectedTab = document.querySelector(`[onclick*="${tabName}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
}

function initializeThemeSelector() {
  const systemSelect = document.getElementById('system') as HTMLSelectElement;
  const themeSelect = document.getElementById('theme') as HTMLSelectElement;
  
  function updateThemes() {
    const selectedSystem = systemSelect.value;
    const themes = tagSystem.getThemesForSystem(selectedSystem);
    
    themeSelect.innerHTML = '<option value="">No Theme (Random)</option>';
    
    themes.forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });
  }
  
  systemSelect.addEventListener('change', updateThemes);
  updateThemes(); // Initial call
}

function populateSystemSelector() {
  const systemSelect = document.getElementById('system') as HTMLSelectElement;
  const systems = systemLoader.getSystems();
  
  systemSelect.innerHTML = '<option value="">Select System</option>';
  
  systems.forEach(system => {
    const option = document.createElement('option');
    option.value = system.id;
    option.textContent = system.label;
    systemSelect.appendChild(option);
  });
}

async function generate(): Promise<void> {
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const seedInput = document.getElementById('seed') as HTMLInputElement;
  const systemInput = document.getElementById('system') as HTMLSelectElement;
  const themeInput = document.getElementById('theme') as HTMLSelectElement;
  const widthInput = document.getElementById('width') as HTMLInputElement;
  const heightInput = document.getElementById('height') as HTMLInputElement;
  const layoutTypeInput = document.getElementById('layout-type') as HTMLSelectElement;
  const roomLayoutInput = document.getElementById('room-layout') as HTMLSelectElement;
  const roomSizeInput = document.getElementById('room-size') as HTMLSelectElement;
  const roomShapeInput = document.getElementById('room-shape') as HTMLSelectElement;
  const corridorTypeInput = document.getElementById('corridor-type') as HTMLSelectElement;
  const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
  const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
  const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
  const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;

  const rooms = parseInt(roomsInput.value) || 8;
  const seed = seedInput.value || undefined;
  const system = systemInput.value || 'generic';
  const theme = themeInput.value || undefined;
  const width = parseInt(widthInput.value) || 50;
  const height = parseInt(heightInput.value) || 50;
  const layoutType = layoutTypeInput.value as any || 'rectangle';
  const roomLayout = roomLayoutInput.value as any || 'scattered';
  const roomSize = roomSizeInput.value as any || 'medium';
  const roomShape = roomShapeInput.value as any || 'rectangular';
  const corridorType = corridorTypeInput.value as any || 'straight';
  const allowDeadends = allowDeadendsInput.checked;
  const stairsUp = stairsUpInput.checked;
  const stairsDown = stairsDownInput.checked;
  const entranceFromPeriphery = entrancePeripheryInput.checked;

  const mapEl = document.getElementById('map');
  const roomKeyEl = document.getElementById('room-key');
  const inputEl = document.getElementById('inputs');
  const downloadEl = document.getElementById('download-svg') as HTMLAnchorElement;

  if (!mapEl || !roomKeyEl || !inputEl) return;

  try {
    // Create map generation options
    const mapOptions: MapGenerationOptions = {
      rooms,
      width,
      height,
      seed,
      layoutType,
      roomLayout,
      roomSize,
      roomShape,
      corridorType,
      allowDeadends,
      stairsUp,
      stairsDown,
      entranceFromPeriphery
    };

    console.log('Map generation options:', mapOptions);

    // Generate the dungeon using the new map generator
    const dungeon = mapGenerator.generateDungeon(mapOptions);
    console.log('Generated dungeon:', dungeon);

    // Enrich with system-specific content
    const sys = await systemLoader.getSystem(system);
    const tagOptions = theme ? { theme } : undefined;
    const enriched = await sys.enrich(dungeon, { tags: tagOptions });
    console.log('Enriched dungeon:', enriched);

    // Display input parameters
    const inputParams = {
      ...mapOptions,
      system,
      theme: theme || 'none'
    };
    inputEl.textContent = JSON.stringify(inputParams, null, 2);

    // Render the map
    const svg = renderSvg(enriched);
    mapEl.innerHTML = svg;

    // Generate room details (now with safe error handling)
    const details = enriched.encounters || {};
    const roomDetails = htmlRoomDetails(enriched, details as any);
    roomKeyEl.innerHTML = `<h2>Room Key</h2>${roomDetails}`;

    // Update download link
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadEl.href = URL.createObjectURL(blob);
    downloadEl.download = `dungeon-${layoutType}-${rooms}rooms.svg`;

  } catch (error) {
    console.error('Error generating dungeon:', error);
    mapEl.innerHTML = `<p style="color: red;">Error generating dungeon: ${error}</p>`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  populateSystemSelector();
  initializeThemeSelector();
  importWizard = new ImportWizardComponent();
  
  const generateBtn = document.getElementById('generate');
  if (generateBtn) {
    generateBtn.addEventListener('click', generate);
  }

  // Initial generation
  generate().catch(console.error);
});

// Make showTab and importWizard available globally for onclick handlers
(window as any).showTab = showTab;
(window as any).importWizard = importWizard;
