import { systemLoader } from '@src/services/system-loader';
import { renderSvg } from '@src/services/render';
import { htmlRoomDetails, populateRooms, getDungeonMetaHtml } from '@src/services/room-key';
import { ImportWizardComponent } from './import-wizard';
import { tagSystem } from '@src/services/tag-system';
import { buildDungeon } from '@src/services/assembler';
import { dungeonTemplateService } from '@src/services/dungeon-templates';

let importWizard: ImportWizardComponent | null = null;
const STORAGE_KEY = 'doa-generator-settings';

// Real-time preview state
let isGenerating = false;
let generateTimeout: number | null = null;
const DEBOUNCE_DELAY = 500; // 500ms delay for real-time updates

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

  // Initialize import wizard lazily when data manager tab is accessed
  if (tabName === 'data-manager' && !importWizard) {
    try {
      importWizard = new ImportWizardComponent();
    } catch (error) {
      console.error('Failed to initialize ImportWizardComponent:', error);
    }
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

function populateTemplateSelector() {
  const templateSelect = document.getElementById('template') as HTMLSelectElement;
  const categories = dungeonTemplateService.getCategories();
  
  templateSelect.innerHTML = '<option value="">No Template (Custom)</option>';
  
  categories.forEach(category => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = category.name;
    
    const templates = dungeonTemplateService.getTemplatesByCategory(category.id);
    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      option.title = template.description;
      optgroup.appendChild(option);
    });
    
    templateSelect.appendChild(optgroup);
  });
}

function applyTemplate(templateId: string) {
  if (!templateId) return;
  
  const template = dungeonTemplateService.getTemplate(templateId);
  if (!template) return;
  
  console.log(`Applying template: ${template.name}`);
  
  // Get form elements
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const widthInput = document.getElementById('width') as HTMLInputElement;
  const heightInput = document.getElementById('height') as HTMLInputElement;
  const layoutTypeInput = document.getElementById('layout-type') as HTMLSelectElement;
  const roomLayoutInput = document.getElementById('room-layout') as HTMLSelectElement;
  const roomSizeInput = document.getElementById('room-size') as HTMLSelectElement;
  const roomShapeInput = document.getElementById('room-shape') as HTMLSelectElement;
  const corridorTypeInput = document.getElementById('corridor-type') as HTMLSelectElement;
  const corridorWidthInput = document.getElementById('corridor-width') as HTMLSelectElement;
  const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
  const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
  const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
  const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;
  const systemInput = document.getElementById('system') as HTMLSelectElement;
  
  // Apply template values
  const options = template.mapOptions;
  
  if (options.rooms !== undefined) roomsInput.value = String(options.rooms);
  if (options.width !== undefined) widthInput.value = String(options.width);
  if (options.height !== undefined) heightInput.value = String(options.height);
  if (options.layoutType) layoutTypeInput.value = options.layoutType;
  if (options.roomLayout) roomLayoutInput.value = options.roomLayout;
  if (options.roomSize) roomSizeInput.value = options.roomSize;
  if (options.roomShape) roomShapeInput.value = options.roomShape;
  if (options.corridorType) corridorTypeInput.value = options.corridorType;
  if (options.corridorWidth !== undefined) corridorWidthInput.value = String(options.corridorWidth);
  if (options.allowDeadends !== undefined) allowDeadendsInput.checked = options.allowDeadends;
  if (options.stairsUp !== undefined) stairsUpInput.checked = options.stairsUp;
  if (options.stairsDown !== undefined) stairsDownInput.checked = options.stairsDown;
  if (options.entranceFromPeriphery !== undefined) entrancePeripheryInput.checked = options.entranceFromPeriphery;
  
  // Apply recommended system
  if (template.recommendedSystem) {
    systemInput.value = template.recommendedSystem;
    systemInput.dispatchEvent(new Event('change')); // Trigger theme update
  }
}

function showLoadingState() {
  const loadingIndicator = document.getElementById('loading-indicator');
  const mapContainer = document.getElementById('map');
  
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }
  if (mapContainer) {
    mapContainer.classList.add('loading');
  }
  isGenerating = true;
}

function hideLoadingState() {
  const loadingIndicator = document.getElementById('loading-indicator');
  const mapContainer = document.getElementById('map');
  
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  if (mapContainer) {
    mapContainer.classList.remove('loading');
  }
  isGenerating = false;
}

function debounceGenerate() {
  const realtimePreview = document.getElementById('real-time-preview') as HTMLInputElement;
  
  // Only auto-generate if real-time preview is enabled
  if (!realtimePreview?.checked) return;
  
  // Clear existing timeout
  if (generateTimeout) {
    clearTimeout(generateTimeout);
  }
  
  // Don't start new generation if already generating
  if (isGenerating) return;
  
  // Set new timeout
  generateTimeout = window.setTimeout(() => {
    generate().catch(console.error);
    generateTimeout = null;
  }, DEBOUNCE_DELAY);
}

function loadGeneratorSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const settings = JSON.parse(stored);
    const templateInput = document.getElementById('template') as HTMLSelectElement;
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
    const corridorWidthInput = document.getElementById('corridor-width') as HTMLSelectElement;
    const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
    const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
    const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
    const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;

    templateInput.value = settings.template ?? '';
    roomsInput.value =
      settings.rooms !== undefined ? String(settings.rooms) : '';
    seedInput.value = settings.seed ?? '';
    systemInput.value = settings.system ?? '';
    systemInput.dispatchEvent(new Event('change'));
    themeInput.value = settings.theme ?? '';
    widthInput.value =
      settings.width !== undefined ? String(settings.width) : '';
    heightInput.value =
      settings.height !== undefined ? String(settings.height) : '';
    layoutTypeInput.value = settings.layoutType ?? '';
    roomLayoutInput.value = settings.roomLayout ?? '';
    roomSizeInput.value = settings.roomSize ?? '';
    roomShapeInput.value = settings.roomShape ?? '';
    corridorTypeInput.value = settings.corridorType ?? '';
    corridorWidthInput.value = settings.corridorWidth !== undefined ? String(settings.corridorWidth) : '1';
    allowDeadendsInput.checked = !!settings.allowDeadends;
    stairsUpInput.checked = !!settings.stairsUp;
    stairsDownInput.checked = !!settings.stairsDown;
    entrancePeripheryInput.checked = !!settings.entranceFromPeriphery;
  } catch (error) {
    console.error('Failed to load generator settings', error);
  }
}

async function generate(): Promise<void> {
  // Show loading state
  showLoadingState();

  const templateInput = document.getElementById('template') as HTMLSelectElement;
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
  const corridorWidthInput = document.getElementById('corridor-width') as HTMLSelectElement;
  const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
  const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
  const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
  const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;

  const template = templateInput.value || undefined;
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
  const corridorWidth = parseInt(corridorWidthInput.value) || 1;
  const allowDeadends = allowDeadendsInput.checked;
  const stairsUp = stairsUpInput.checked;
  const stairsDown = stairsDownInput.checked;
  const entranceFromPeriphery = entrancePeripheryInput.checked;

  const mapEl = document.getElementById('map');
  const roomKeyEl = document.getElementById('room-key');
  const inputEl = document.getElementById('inputs');
  const downloadEl = document.getElementById('download-svg') as HTMLAnchorElement;

  if (!mapEl || !roomKeyEl || !inputEl) {
    hideLoadingState();
    return;
  }

  try {
    // Create dungeon generation options
    const dungeonOptions = {
      rooms,
      width,
      height,
      seed,
      template,
      layoutType,
      roomLayout,
      roomSize,
      roomShape,
      corridorType,
      corridorWidth,
      allowDeadends,
      stairsUp,
      stairsDown,
      entranceFromPeriphery
    };
    
    const generatorSettings = {
      ...dungeonOptions,
      system,
      theme
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(generatorSettings));

    console.log('Dungeon generation options:', dungeonOptions);

    // Generate the dungeon using buildDungeon (includes all improvements)
    const dungeon = buildDungeon(dungeonOptions);
    console.log('Generated dungeon:', dungeon);

    // Enrich with system-specific content
    const sys = await systemLoader.getSystem(system);
    const tagOptions = theme ? { theme } : undefined;
    const enriched = await sys.enrich(dungeon, { tags: tagOptions });
    console.log('Enriched dungeon:', enriched);

    // Display input parameters
    const inputParams = {
      ...dungeonOptions,
      system,
      theme: theme || 'none'
    };
    inputEl.textContent = JSON.stringify(inputParams, null, 2);

    // Render the map
    const svg = renderSvg(enriched);
    mapEl.innerHTML = svg;

    // Generate room details using populateRooms to get proper format with features
    const details = populateRooms(enriched, enriched.rng ?? Math.random, system);
    const roomDetails = htmlRoomDetails(enriched, details);
    
    // Add dungeon metadata and wandering monsters if available
    const dungeonMetaHtml = getDungeonMetaHtml(enriched);
    const fullRoomKey = `<h2>Room Key</h2>${roomDetails}${dungeonMetaHtml}`;
    
    roomKeyEl.innerHTML = fullRoomKey;

    // Update download link
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadEl.href = URL.createObjectURL(blob);
    downloadEl.download = `dungeon-${layoutType}-${rooms}rooms.svg`;

  } catch (error) {
    console.error('Error generating dungeon:', error);
    mapEl.innerHTML = `<p style="color: red;">Error generating dungeon: ${error}</p>`;
  } finally {
    // Always hide loading state
    hideLoadingState();
  }
}

function setupRealTimePreview() {
  // Get all form elements that should trigger real-time updates
  const formElements = [
    'rooms', 'width', 'height', 'seed',
    'layout-type', 'room-layout', 'room-size', 'room-shape',
    'corridor-type', 'corridor-width', 'system', 'theme',
    'allow-deadends', 'stairs-up', 'stairs-down', 'entrance-periphery'
  ];

  formElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      if (element.type === 'checkbox') {
        element.addEventListener('change', debounceGenerate);
      } else {
        element.addEventListener('input', debounceGenerate);
        element.addEventListener('change', debounceGenerate);
      }
    }
  });

  // Special handling for template selector
  const templateSelect = document.getElementById('template') as HTMLSelectElement;
  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.value) {
        applyTemplate(target.value);
        // Trigger real-time update after applying template
        debounceGenerate();
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  populateTemplateSelector();
  populateSystemSelector();
  initializeThemeSelector();
  loadGeneratorSettings();
  
  const generateBtn = document.getElementById('generate');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      // Force generation even if real-time is disabled
      generate().catch(console.error);
    });
  }

  // Setup real-time preview listeners
  setupRealTimePreview();

  // Initial generation
  generate().catch(console.error);
});

// Make showTab and importWizard available globally for onclick handlers
(window as any).showTab = showTab;
(window as any).importWizard = {
  deleteDataset: (moduleId: string, dataType: string) => {
    if (importWizard) {
      importWizard.deleteDataset(moduleId, dataType);
    }
  }
};
