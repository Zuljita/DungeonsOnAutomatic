import { systemLoader } from '@src/services/system-loader';
import { renderSvg, lightTheme, darkTheme, sepiaTheme, type RenderOptions, type RenderTheme } from '@src/services/render';
import { htmlRoomDetails, populateRooms, getDungeonMetaHtml } from '@src/services/room-key';
import { ImportWizardComponent } from './import-wizard';
import { tagSystem } from '@src/services/tag-system';
import { buildDungeon } from '@src/services/assembler';
import { dungeonTemplateService } from '@src/services/dungeon-templates';
import { roomShapeService } from '@src/services/room-shapes';
import { presetStorage, type DungeonPreset, type PresetConfiguration } from './preset-system';
import Panzoom from '@panzoom/panzoom';

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

function initializeSourceSelector() {
  const systemSelect = document.getElementById('system') as HTMLSelectElement;
  const sourcesSelect = document.getElementById('sources') as HTMLSelectElement;
  
  async function updateSources() {
    const selectedSystem = systemSelect.value;
    
    sourcesSelect.innerHTML = '<option value="">All Sources</option>';
    
    if (!selectedSystem) return;
    
    try {
      const sys = await systemLoader.getSystem(selectedSystem);
      // Get available sources from the system if the method exists
      if (typeof sys.getAvailableSources === 'function') {
        const sources = sys.getAvailableSources();
        
        sources.forEach(source => {
          const option = document.createElement('option');
          option.value = typeof source === 'string' ? source : source.id;
          option.textContent = typeof source === 'string' ? source : source.name;
          sourcesSelect.appendChild(option);
        });
      } else {
        // Fallback: Add some common source options for systems that don't provide them
        const commonSources = ['core', 'basic', 'advanced', 'expanded'];
        commonSources.forEach(source => {
          const option = document.createElement('option');
          option.value = source;
          option.textContent = source.charAt(0).toUpperCase() + source.slice(1);
          sourcesSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.warn('Failed to load sources for system:', selectedSystem, error);
      // Leave with just "All Sources" option on error
    }
  }
  
  systemSelect.addEventListener('change', updateSources);
  updateSources(); // Initial call
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
  const pathfindingAlgorithmInput = document.getElementById('pathfinding-algorithm') as HTMLSelectElement;
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
  if (options.pathfindingAlgorithm) pathfindingAlgorithmInput.value = options.pathfindingAlgorithm;
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
  
  // Always run validation for immediate feedback
  const validation = validateForm();
  displayValidationErrors(validation.errors);
  
  // Only auto-generate if real-time preview is enabled and form is valid
  if (!realtimePreview?.checked || !validation.isValid) return;
  
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
    
    // New form elements
    const sourcesInput = document.getElementById('sources') as HTMLSelectElement;
    const monsterTagsInput = document.getElementById('monster-tags') as HTMLInputElement;
    const trapTagsInput = document.getElementById('trap-tags') as HTMLInputElement;
    const treasureTagsInput = document.getElementById('treasure-tags') as HTMLInputElement;
    const textureInput = document.getElementById('texture') as HTMLSelectElement;

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
    pathfindingAlgorithmInput.value = settings.pathfindingAlgorithm ?? 'manhattan';
    corridorWidthInput.value = settings.corridorWidth !== undefined ? String(settings.corridorWidth) : '1';
    allowDeadendsInput.checked = !!settings.allowDeadends;
    stairsUpInput.checked = !!settings.stairsUp;
    stairsDownInput.checked = !!settings.stairsDown;
    entrancePeripheryInput.checked = !!settings.entranceFromPeriphery;
    
    // Load new settings
    if (settings.sources && Array.isArray(settings.sources)) {
      // Select multiple sources
      Array.from(sourcesInput.options).forEach(option => {
        option.selected = settings.sources.includes(option.value);
      });
    }
    monsterTagsInput.value = settings.monsterTags ? settings.monsterTags.join(', ') : '';
    trapTagsInput.value = settings.trapTags ? settings.trapTags.join(', ') : '';
    treasureTagsInput.value = settings.treasureTags ? settings.treasureTags.join(', ') : '';
    textureInput.value = settings.texture ?? 'none';
  } catch (error) {
    console.error('Failed to load generator settings', error);
  }
}

async function generate(): Promise<void> {
  // Validate form before generation
  const validation = validateForm();
  displayValidationErrors(validation.errors);
  
  if (!validation.isValid) {
    hideLoadingState();
    return;
  }

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
  const pathfindingAlgorithmInput = document.getElementById('pathfinding-algorithm') as HTMLSelectElement;
  const corridorWidthInput = document.getElementById('corridor-width') as HTMLSelectElement;
  const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
  const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
  const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
  const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;
  
  // Map rendering controls
  const mapStyleInput = document.getElementById('map-style') as HTMLSelectElement;
  const colorThemeInput = document.getElementById('color-theme') as HTMLSelectElement;
  const showGridInput = document.getElementById('show-grid') as HTMLInputElement;
  const wobbleIntensityInput = document.getElementById('wobble-intensity') as HTMLSelectElement;
  const wallThicknessInput = document.getElementById('wall-thickness') as HTMLSelectElement;
  
  // New content filtering controls
  const sourcesInput = document.getElementById('sources') as HTMLSelectElement;
  const monsterTagsInput = document.getElementById('monster-tags') as HTMLInputElement;
  const trapTagsInput = document.getElementById('trap-tags') as HTMLInputElement;
  const treasureTagsInput = document.getElementById('treasure-tags') as HTMLInputElement;
  const textureInput = document.getElementById('texture') as HTMLSelectElement;

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
  const pathfindingAlgorithm = pathfindingAlgorithmInput.value as any || 'manhattan';
  const corridorWidth = parseInt(corridorWidthInput.value) || 1;
  const allowDeadends = allowDeadendsInput.checked;
  const stairsUp = stairsUpInput.checked;
  const stairsDown = stairsDownInput.checked;
  const entranceFromPeriphery = entrancePeripheryInput.checked;
  
  // Parse tag inputs
  const monsterTags = monsterTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  const trapTags = trapTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  const treasureTags = treasureTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  
  // Get selected sources
  const selectedSources = Array.from(sourcesInput.selectedOptions).map(option => option.value).filter(s => s);
  
  // Get texture setting
  const texture = textureInput.value;

  const mapEl = document.getElementById('map');
  const mapContentEl = document.getElementById('map-content');
  const roomKeyEl = document.getElementById('room-key');
  const inputEl = document.getElementById('inputs');
  const downloadEl = document.getElementById('download-svg') as HTMLAnchorElement;

  if (!mapEl || !mapContentEl || !roomKeyEl || !inputEl) {
    hideLoadingState();
    return;
  }

  try {
    // Initialize the room shape plugin before generation to ensure it's loaded
    await roomShapeService.initialize();
    
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
      pathfindingAlgorithm,
      corridorWidth,
      allowDeadends,
      stairsUp,
      stairsDown,
      entranceFromPeriphery
    };
    
    const generatorSettings = {
      ...dungeonOptions,
      system,
      theme,
      sources: selectedSources,
      monsterTags,
      trapTags,
      treasureTags,
      texture,
      mapStyle: mapStyleInput.value,
      colorTheme: colorThemeInput.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(generatorSettings));
    
    // Update configuration summary
    updateConfigurationSummary(generatorSettings);

    console.log('Dungeon generation options:', dungeonOptions);

    // Generate the dungeon using buildDungeon (includes all improvements)
    const dungeon = buildDungeon(dungeonOptions);
    console.log('Generated dungeon:', dungeon);

    // Enrich with system-specific content
    const sys = await systemLoader.getSystem(system);
    
    // Build tag options from the new inputs
    const tagOptions = 
      theme || monsterTags.length || trapTags.length || treasureTags.length
        ? {
            theme,
            monsters: monsterTags.length ? { requiredTags: monsterTags } : undefined,
            traps: trapTags.length ? { requiredTags: trapTags } : undefined,
            treasure: treasureTags.length ? { requiredTags: treasureTags } : undefined,
          }
        : undefined;
    
    const enriched = await sys.enrich(dungeon, { 
      sources: selectedSources.length ? selectedSources : undefined, 
      tags: tagOptions 
    });
    console.log('Enriched dungeon:', enriched);

    // Display input parameters
    const inputParams = {
      ...dungeonOptions,
      system,
      theme: theme || 'none'
    };
    inputEl.textContent = JSON.stringify(inputParams, null, 2);

    // Prepare rendering options
    const mapStyle = mapStyleInput.value as "classic" | "hand-drawn";
    const colorTheme = colorThemeInput.value;
    const showGrid = showGridInput.checked;
    const wobbleIntensity = parseFloat(wobbleIntensityInput.value) || 1;
    const wallThickness = parseFloat(wallThicknessInput.value) || 1;

    // Select the appropriate theme
    let selectedTheme: RenderTheme;
    switch (colorTheme) {
      case 'dark':
        selectedTheme = darkTheme;
        break;
      case 'sepia':
        selectedTheme = sepiaTheme;
        break;
      default:
        selectedTheme = lightTheme;
        break;
    }

    // Create render options
    const renderOptions: RenderOptions = {
      style: mapStyle,
      showGrid: showGrid,
      wobbleIntensity: wobbleIntensity,
      wallThickness: wallThickness
    };

    // Render the map
    const svg = await renderSvg(enriched, selectedTheme, renderOptions);
    mapContentEl.innerHTML = svg;

    // Setup pan and zoom functionality
    setupMapPanZoom(mapEl);
    setupZoomControls(mapEl);
    
    // Create minimap from the rendered SVG (after panzoom is ready)
    const svgElement = mapContentEl.querySelector('svg');
    if (svgElement) {
      setTimeout(() => {
        createMinimap(svgElement);
      }, 150);
    }

    // Generate room details using populateRooms to get proper format with features
    const details = populateRooms(enriched, enriched.rng ?? Math.random, system);
    const roomDetails = htmlRoomDetails(enriched, details);
    
    // Add dungeon metadata and wandering monsters if available
    const dungeonMetaHtml = getDungeonMetaHtml(enriched);
    const fullRoomKey = `<h2>Room Key</h2>${roomDetails}${dungeonMetaHtml}`;
    
    roomKeyEl.innerHTML = fullRoomKey;

    setupMapKeyInteractions(mapContentEl, roomKeyEl);

    // Update download link
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadEl.href = URL.createObjectURL(blob);
    downloadEl.download = `dungeon-${layoutType}-${rooms}rooms.svg`;

  } catch (error) {
    console.error('Error generating dungeon:', error);
    mapContentEl.innerHTML = `<p style="color: red;">Error generating dungeon: ${error}</p>`;
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
    'allow-deadends', 'stairs-up', 'stairs-down', 'entrance-periphery',
    'map-style', 'color-theme', 'show-grid', 'wobble-intensity', 'wall-thickness',
    'sources', 'monster-tags', 'trap-tags', 'treasure-tags', 'texture'
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

function setupMapStyleControls() {
  const mapStyleInput = document.getElementById('map-style') as HTMLSelectElement;
  const gridToggleGroup = document.getElementById('grid-toggle-group') as HTMLElement;
  const wobbleIntensityGroup = document.getElementById('wobble-intensity-group') as HTMLElement;
  const wallThicknessGroup = document.getElementById('wall-thickness-group') as HTMLElement;

  function toggleHandDrawnControls() {
    const isHandDrawn = mapStyleInput.value === 'hand-drawn';
    if (gridToggleGroup) {
      gridToggleGroup.style.display = isHandDrawn ? 'block' : 'none';
    }
    if (wobbleIntensityGroup) {
      wobbleIntensityGroup.style.display = isHandDrawn ? 'block' : 'none';
    }
    if (wallThicknessGroup) {
      wallThicknessGroup.style.display = isHandDrawn ? 'block' : 'none';
    }
  }

  // Initial setup
  toggleHandDrawnControls();

  // Listen for style changes
  if (mapStyleInput) {
    mapStyleInput.addEventListener('change', toggleHandDrawnControls);
  }
}

function validateForm(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate rooms
  const roomsInput = document.getElementById('rooms') as HTMLInputElement;
  const rooms = parseInt(roomsInput.value);
  if (rooms < 3 || rooms > 20) {
    errors.push('Rooms must be between 3 and 20');
    roomsInput.style.borderColor = 'var(--accent-danger)';
  } else {
    roomsInput.style.borderColor = '';
  }
  
  // Validate width
  const widthInput = document.getElementById('width') as HTMLInputElement;
  const width = parseInt(widthInput.value);
  if (width < 20 || width > 100) {
    errors.push('Width must be between 20 and 100');
    widthInput.style.borderColor = 'var(--accent-danger)';
  } else {
    widthInput.style.borderColor = '';
  }
  
  // Validate height
  const heightInput = document.getElementById('height') as HTMLInputElement;
  const height = parseInt(heightInput.value);
  if (height < 20 || height > 100) {
    errors.push('Height must be between 20 and 100');
    heightInput.style.borderColor = 'var(--accent-danger)';
  } else {
    heightInput.style.borderColor = '';
  }
  
  // Validate room count vs map size (rooms should fit reasonably)
  if (rooms && width && height && rooms > (width * height) / 50) {
    errors.push('Too many rooms for map size - consider increasing map dimensions or reducing room count');
  }
  
  return { isValid: errors.length === 0, errors };
}

function displayValidationErrors(errors: string[]) {
  let errorContainer = document.getElementById('validation-errors');
  
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'validation-errors';
    errorContainer.className = 'status-message status-error';
    const previewControls = document.querySelector('.preview-controls');
    previewControls?.insertBefore(errorContainer, previewControls.firstChild);
  }
  
  if (errors.length === 0) {
    errorContainer.style.display = 'none';
  } else {
    errorContainer.style.display = 'block';
    errorContainer.innerHTML = `
      <strong>Configuration Issues:</strong>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        ${errors.map(error => `<li>${error}</li>`).join('')}
      </ul>
    `;
  }
}

function updateConfigurationSummary(config: any) {
  const summaryText = document.getElementById('config-summary-text');
  if (!summaryText) return;
  
  const summary = `🎲 Dungeon Configuration Summary

Basic Settings:
  • Template: ${config.template || 'Custom'}
  • System: ${config.system || 'Generic'}
  • Theme: ${config.theme || 'Random'}
  • Rooms: ${config.rooms}
  • Map Size: ${config.width} × ${config.height}
  • Seed: ${config.seed || 'Random'}

Layout & Structure:
  • Layout Type: ${config.layoutType || 'Rectangle'}
  • Room Layout: ${config.roomLayout || 'Scattered'}
  • Room Size: ${config.roomSize || 'Medium'}
  • Room Shape: ${config.roomShape || 'Rectangular'}

Corridors:
  • Type: ${config.corridorType || 'Straight'}
  • Width: ${config.corridorWidth || 1} tiles
  • Deadends: ${config.allowDeadends ? 'Allowed' : 'Not allowed'}

Special Features:
  • Stairs Up: ${config.stairsUp ? 'Yes' : 'No'}
  • Stairs Down: ${config.stairsDown ? 'Yes' : 'No'}
  • Entrance from Periphery: ${config.entranceFromPeriphery ? 'Yes' : 'No'}

Content Filtering:
  • Sources: ${config.sources?.length ? config.sources.join(', ') : 'All'}
  • Monster Tags: ${config.monsterTags?.length ? config.monsterTags.join(', ') : 'None'}
  • Trap Tags: ${config.trapTags?.length ? config.trapTags.join(', ') : 'None'}
  • Treasure Tags: ${config.treasureTags?.length ? config.treasureTags.join(', ') : 'None'}

Rendering:
  • Style: ${config.mapStyle || 'Classic'}
  • Color Theme: ${config.colorTheme || 'Light'}
  • Texture: ${config.texture || 'None'}`;

  summaryText.textContent = summary;
}

function toggleSummary() {
  const content = document.getElementById('summary-content');
  const toggle = document.getElementById('summary-toggle');
  
  if (content && toggle) {
    if (content.classList.contains('expanded')) {
      content.classList.remove('expanded');
      toggle.textContent = '▼';
    } else {
      content.classList.add('expanded');
      toggle.textContent = '▲';
    }
  }
}

function toggleOptionGroup(groupName: string) {
  const group = document.querySelector(`[data-group="${groupName}"]`);
  if (!group) return;
  
  const isCollapsed = group.classList.contains('collapsed');
  const icon = group.querySelector('.toggle-icon');
  
  if (isCollapsed) {
    group.classList.remove('collapsed');
    if (icon) icon.textContent = '▼';
  } else {
    group.classList.add('collapsed');
    if (icon) icon.textContent = '▶';
  }
  
  // Save collapsed state to localStorage
  const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');
  if (isCollapsed) {
    // Remove from collapsed list (expanding)
    const index = collapsedGroups.indexOf(groupName);
    if (index > -1) collapsedGroups.splice(index, 1);
  } else {
    // Add to collapsed list (collapsing)
    if (!collapsedGroups.includes(groupName)) {
      collapsedGroups.push(groupName);
    }
  }
  localStorage.setItem('collapsedGroups', JSON.stringify(collapsedGroups));
}

function restoreCollapsedStates() {
  const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');
  
  collapsedGroups.forEach((groupName: string) => {
    const group = document.querySelector(`[data-group="${groupName}"]`);
    const icon = group?.querySelector('.toggle-icon');
    if (group && !group.classList.contains('collapsed')) {
      group.classList.add('collapsed');
      if (icon) icon.textContent = '▶';
    }
  });
}

// Preset Management Functions

function getCurrentConfiguration(): PresetConfiguration {
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
  const pathfindingAlgorithmInput = document.getElementById('pathfinding-algorithm') as HTMLSelectElement;
  const corridorWidthInput = document.getElementById('corridor-width') as HTMLSelectElement;
  const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
  const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
  const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
  const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;
  
  const sourcesInput = document.getElementById('sources') as HTMLSelectElement;
  const monsterTagsInput = document.getElementById('monster-tags') as HTMLInputElement;
  const trapTagsInput = document.getElementById('trap-tags') as HTMLInputElement;
  const treasureTagsInput = document.getElementById('treasure-tags') as HTMLInputElement;
  const textureInput = document.getElementById('texture') as HTMLSelectElement;
  const mapStyleInput = document.getElementById('map-style') as HTMLSelectElement;
  const colorThemeInput = document.getElementById('color-theme') as HTMLSelectElement;

  const selectedSources = Array.from(sourcesInput.selectedOptions).map(option => option.value).filter(s => s);
  const monsterTags = monsterTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  const trapTags = trapTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  const treasureTags = treasureTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

  return {
    template: templateInput.value || undefined,
    system: systemInput.value || undefined,
    theme: themeInput.value || undefined,
    rooms: parseInt(roomsInput.value) || undefined,
    width: parseInt(widthInput.value) || undefined,
    height: parseInt(heightInput.value) || undefined,
    seed: seedInput.value || undefined,
    layoutType: layoutTypeInput.value || undefined,
    roomLayout: roomLayoutInput.value || undefined,
    roomSize: roomSizeInput.value || undefined,
    roomShape: roomShapeInput.value || undefined,
    corridorType: corridorTypeInput.value || undefined,
    pathfindingAlgorithm: pathfindingAlgorithmInput.value || undefined,
    corridorWidth: parseInt(corridorWidthInput.value) || undefined,
    allowDeadends: allowDeadendsInput.checked,
    stairsUp: stairsUpInput.checked,
    stairsDown: stairsDownInput.checked,
    entranceFromPeriphery: entrancePeripheryInput.checked,
    sources: selectedSources.length ? selectedSources : undefined,
    monsterTags: monsterTags.length ? monsterTags : undefined,
    trapTags: trapTags.length ? trapTags : undefined,
    treasureTags: treasureTags.length ? treasureTags : undefined,
    texture: textureInput.value || undefined,
    mapStyle: mapStyleInput.value || undefined,
    colorTheme: colorThemeInput.value || undefined
  };
}

function applyConfiguration(config: PresetConfiguration): void {
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
  const pathfindingAlgorithmInput = document.getElementById('pathfinding-algorithm') as HTMLSelectElement;
  const corridorWidthInput = document.getElementById('corridor-width') as HTMLSelectElement;
  const allowDeadendsInput = document.getElementById('allow-deadends') as HTMLInputElement;
  const stairsUpInput = document.getElementById('stairs-up') as HTMLInputElement;
  const stairsDownInput = document.getElementById('stairs-down') as HTMLInputElement;
  const entrancePeripheryInput = document.getElementById('entrance-periphery') as HTMLInputElement;
  
  const sourcesInput = document.getElementById('sources') as HTMLSelectElement;
  const monsterTagsInput = document.getElementById('monster-tags') as HTMLInputElement;
  const trapTagsInput = document.getElementById('trap-tags') as HTMLInputElement;
  const treasureTagsInput = document.getElementById('treasure-tags') as HTMLInputElement;
  const textureInput = document.getElementById('texture') as HTMLSelectElement;
  const mapStyleInput = document.getElementById('map-style') as HTMLSelectElement;
  const colorThemeInput = document.getElementById('color-theme') as HTMLSelectElement;

  // Apply basic settings
  if (config.template !== undefined) templateInput.value = config.template;
  if (config.system !== undefined) {
    systemInput.value = config.system;
    systemInput.dispatchEvent(new Event('change')); // Update themes and sources
  }
  if (config.theme !== undefined) themeInput.value = config.theme;
  if (config.rooms !== undefined) roomsInput.value = String(config.rooms);
  if (config.width !== undefined) widthInput.value = String(config.width);
  if (config.height !== undefined) heightInput.value = String(config.height);
  if (config.seed !== undefined) seedInput.value = config.seed;
  
  // Apply layout settings
  if (config.layoutType !== undefined) layoutTypeInput.value = config.layoutType;
  if (config.roomLayout !== undefined) roomLayoutInput.value = config.roomLayout;
  if (config.roomSize !== undefined) roomSizeInput.value = config.roomSize;
  if (config.roomShape !== undefined) roomShapeInput.value = config.roomShape;
  
  // Apply corridor settings
  if (config.corridorType !== undefined) corridorTypeInput.value = config.corridorType;
  if (config.pathfindingAlgorithm !== undefined) pathfindingAlgorithmInput.value = config.pathfindingAlgorithm;
  if (config.corridorWidth !== undefined) corridorWidthInput.value = String(config.corridorWidth);
  if (config.allowDeadends !== undefined) allowDeadendsInput.checked = config.allowDeadends;
  
  // Apply special features
  if (config.stairsUp !== undefined) stairsUpInput.checked = config.stairsUp;
  if (config.stairsDown !== undefined) stairsDownInput.checked = config.stairsDown;
  if (config.entranceFromPeriphery !== undefined) entrancePeripheryInput.checked = config.entranceFromPeriphery;
  
  // Apply content filtering
  if (config.sources && Array.isArray(config.sources)) {
    Array.from(sourcesInput.options).forEach(option => {
      option.selected = config.sources!.includes(option.value);
    });
  }
  if (config.monsterTags && Array.isArray(config.monsterTags)) {
    monsterTagsInput.value = config.monsterTags.join(', ');
  }
  if (config.trapTags && Array.isArray(config.trapTags)) {
    trapTagsInput.value = config.trapTags.join(', ');
  }
  if (config.treasureTags && Array.isArray(config.treasureTags)) {
    treasureTagsInput.value = config.treasureTags.join(', ');
  }
  
  // Apply rendering settings
  if (config.texture !== undefined) textureInput.value = config.texture;
  if (config.mapStyle !== undefined) {
    mapStyleInput.value = config.mapStyle;
    mapStyleInput.dispatchEvent(new Event('change')); // Update related controls
  }
  if (config.colorTheme !== undefined) colorThemeInput.value = config.colorTheme;
}

function populatePresetSelector(): void {
  const selector = document.getElementById('preset-selector') as HTMLSelectElement;
  const presets = presetStorage.getAllPresets();
  
  // Clear existing options
  selector.innerHTML = '<option value="">Select a preset...</option>';
  
  // Group by category
  const categories = presetStorage.getCategories();
  const categorizedPresets = new Map<string, DungeonPreset[]>();
  const uncategorized: DungeonPreset[] = [];
  
  presets.forEach(preset => {
    if (preset.metadata.category) {
      if (!categorizedPresets.has(preset.metadata.category)) {
        categorizedPresets.set(preset.metadata.category, []);
      }
      categorizedPresets.get(preset.metadata.category)!.push(preset);
    } else {
      uncategorized.push(preset);
    }
  });
  
  // Add built-in presets first
  if (categories.length > 0) {
    categories.forEach(category => {
      const categoryPresets = categorizedPresets.get(category) || [];
      const builtInPresets = categoryPresets.filter(p => p.metadata.isBuiltIn);
      
      if (builtInPresets.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${category} (Built-in)`;
        
        builtInPresets.forEach(preset => {
          const option = document.createElement('option');
          option.value = preset.metadata.id;
          option.textContent = preset.metadata.name;
          option.title = preset.metadata.description;
          optgroup.appendChild(option);
        });
        
        selector.appendChild(optgroup);
      }
    });
  }
  
  // Add custom presets
  if (categories.length > 0) {
    categories.forEach(category => {
      const categoryPresets = categorizedPresets.get(category) || [];
      const customPresets = categoryPresets.filter(p => !p.metadata.isBuiltIn);
      
      if (customPresets.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        
        customPresets.forEach(preset => {
          const option = document.createElement('option');
          option.value = preset.metadata.id;
          option.textContent = preset.metadata.name;
          option.title = preset.metadata.description;
          optgroup.appendChild(option);
        });
        
        selector.appendChild(optgroup);
      }
    });
  }
  
  // Add uncategorized presets
  if (uncategorized.length > 0) {
    const customUncategorized = uncategorized.filter(p => !p.metadata.isBuiltIn);
    if (customUncategorized.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Custom';
      
      customUncategorized.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.metadata.id;
        option.textContent = preset.metadata.name;
        option.title = preset.metadata.description;
        optgroup.appendChild(option);
      });
      
      selector.appendChild(optgroup);
    }
  }
}

function showPresetStatus(message: string, type: 'success' | 'error' | 'info'): void {
  const statusEl = document.getElementById('preset-status');
  if (!statusEl) return;
  
  statusEl.className = `preset-status-message preset-status-${type}`;
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

function initializePresetSystem(): void {
  populatePresetSelector();
  
  // Preset selector change handler
  const selector = document.getElementById('preset-selector') as HTMLSelectElement;
  const loadBtn = document.getElementById('load-preset-btn') as HTMLButtonElement;
  
  selector.addEventListener('change', () => {
    loadBtn.disabled = !selector.value;
  });
  
  // Load preset button
  loadBtn.addEventListener('click', () => {
    const presetId = selector.value;
    if (!presetId) return;
    
    const preset = presetStorage.loadPreset(presetId);
    if (preset) {
      applyConfiguration(preset.configuration);
      showPresetStatus(`Loaded preset: ${preset.metadata.name}`, 'success');
      debounceGenerate(); // Trigger regeneration with new settings
    } else {
      showPresetStatus('Failed to load preset', 'error');
    }
  });
  
  // Save preset button
  const saveBtn = document.getElementById('save-preset-btn');
  saveBtn?.addEventListener('click', () => {
    openSavePresetModal();
  });
  
  // Manage presets button
  const manageBtn = document.getElementById('manage-presets-btn');
  manageBtn?.addEventListener('click', () => {
    openManagePresetsModal();
  });
  
  // Export presets button
  const exportBtn = document.getElementById('export-presets-btn');
  exportBtn?.addEventListener('click', () => {
    exportAllPresets();
  });
  
  // Import presets button
  const importBtn = document.getElementById('import-presets-btn');
  const importFile = document.getElementById('import-file') as HTMLInputElement;
  
  importBtn?.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      importPresets(file);
    }
  });
}

function openSavePresetModal(): void {
  const modal = document.getElementById('save-preset-modal');
  const nameInput = document.getElementById('preset-name') as HTMLInputElement;
  const descriptionInput = document.getElementById('preset-description') as HTMLTextAreaElement;
  const categoryInput = document.getElementById('preset-category') as HTMLInputElement;
  const errorDiv = document.getElementById('save-preset-error');
  
  // Clear previous values
  nameInput.value = '';
  descriptionInput.value = '';
  categoryInput.value = '';
  if (errorDiv) errorDiv.style.display = 'none';
  
  // Show modal
  modal?.classList.add('show');
  nameInput.focus();
}

function closeSavePresetModal(): void {
  const modal = document.getElementById('save-preset-modal');
  modal?.classList.remove('show');
}

function saveCurrentPreset(): void {
  const nameInput = document.getElementById('preset-name') as HTMLInputElement;
  const descriptionInput = document.getElementById('preset-description') as HTMLTextAreaElement;
  const categoryInput = document.getElementById('preset-category') as HTMLInputElement;
  const errorDiv = document.getElementById('save-preset-error');
  
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const category = categoryInput.value.trim() || undefined;
  
  if (!name) {
    if (errorDiv) {
      errorDiv.textContent = 'Please enter a preset name';
      errorDiv.style.display = 'block';
    }
    return;
  }
  
  if (!description) {
    if (errorDiv) {
      errorDiv.textContent = 'Please enter a description';
      errorDiv.style.display = 'block';
    }
    return;
  }
  
  const config = getCurrentConfiguration();
  const success = presetStorage.savePreset(name, description, config, category);
  
  if (success) {
    closeSavePresetModal();
    populatePresetSelector();
    showPresetStatus(`Preset "${name}" saved successfully!`, 'success');
  } else {
    if (errorDiv) {
      errorDiv.textContent = 'Failed to save preset. Name may already exist.';
      errorDiv.style.display = 'block';
    }
  }
}

function openManagePresetsModal(): void {
  const modal = document.getElementById('manage-presets-modal');
  modal?.classList.add('show');
  populatePresetList();
}

function closeManagePresetsModal(): void {
  const modal = document.getElementById('manage-presets-modal');
  modal?.classList.remove('show');
}

function populatePresetList(searchQuery?: string): void {
  const listContainer = document.getElementById('preset-list');
  if (!listContainer) return;
  
  const presets = searchQuery ? presetStorage.searchPresets(searchQuery) : presetStorage.getAllPresets();
  
  listContainer.innerHTML = '';
  
  if (presets.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">No presets found</div>';
    return;
  }
  
  presets.forEach(preset => {
    const item = document.createElement('div');
    item.className = `preset-item ${preset.metadata.isBuiltIn ? 'built-in' : ''}`;
    
    const createdDate = new Date(preset.metadata.createdAt).toLocaleDateString();
    const usageText = preset.metadata.usageCount > 0 ? `Used ${preset.metadata.usageCount} times` : 'Never used';
    
    item.innerHTML = `
      <div class="preset-info">
        <div class="preset-name">
          ${preset.metadata.name}
          ${preset.metadata.isBuiltIn ? '<span class="preset-badge">Built-in</span>' : ''}
          ${preset.metadata.category ? `<span class="preset-badge">${preset.metadata.category}</span>` : ''}
        </div>
        <div class="preset-description">${preset.metadata.description}</div>
        <div class="preset-meta">
          <span>Created: ${createdDate}</span>
          <span>${usageText}</span>
          ${preset.metadata.systemType ? `<span>System: ${preset.metadata.systemType}</span>` : ''}
        </div>
      </div>
      <div class="preset-actions-inline">
        <button class="preset-action-small preset-load-btn" onclick="loadPresetFromManager('${preset.metadata.id}')">Load</button>
        <button class="preset-action-small preset-export-btn" onclick="exportSinglePreset('${preset.metadata.id}')">Export</button>
        ${!preset.metadata.isBuiltIn ? `<button class="preset-action-small preset-delete-btn" onclick="deletePresetFromManager('${preset.metadata.id}')">Delete</button>` : ''}
      </div>
    `;
    
    listContainer.appendChild(item);
  });
  
  // Add search functionality
  const searchInput = document.getElementById('preset-search') as HTMLInputElement;
  searchInput.oninput = (e) => {
    const query = (e.target as HTMLInputElement).value;
    populatePresetList(query);
  };
}

function loadPresetFromManager(presetId: string): void {
  const preset = presetStorage.loadPreset(presetId);
  if (preset) {
    applyConfiguration(preset.configuration);
    closeManagePresetsModal();
    showPresetStatus(`Loaded preset: ${preset.metadata.name}`, 'success');
    debounceGenerate(); // Trigger regeneration
  } else {
    showPresetStatus('Failed to load preset', 'error');
  }
}

function deletePresetFromManager(presetId: string): void {
  const preset = presetStorage.loadPreset(presetId);
  if (!preset) return;
  
  if (confirm(`Are you sure you want to delete the preset "${preset.metadata.name}"?`)) {
    const success = presetStorage.deletePreset(presetId);
    if (success) {
      populatePresetList();
      populatePresetSelector();
      showPresetStatus(`Deleted preset: ${preset.metadata.name}`, 'success');
    } else {
      showPresetStatus('Failed to delete preset', 'error');
    }
  }
}

function exportSinglePreset(presetId: string): void {
  const json = presetStorage.exportPresets([presetId]);
  const preset = presetStorage.loadPreset(presetId);
  const filename = `doa-preset-${preset?.metadata.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'export'}.json`;
  
  downloadJSON(json, filename);
  showPresetStatus('Preset exported successfully!', 'success');
}

function exportAllPresets(): void {
  const json = presetStorage.exportPresets();
  const filename = `doa-presets-export-${new Date().toISOString().split('T')[0]}.json`;
  
  downloadJSON(json, filename);
  showPresetStatus('All presets exported successfully!', 'success');
}

function importPresets(file: File): void {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const json = e.target?.result as string;
      const result = presetStorage.importPresets(json, false); // Don't overwrite by default
      
      if (result.success) {
        populatePresetSelector();
        showPresetStatus(`Successfully imported ${result.imported} preset(s)`, 'success');
        
        if (result.errors.length > 0) {
          console.warn('Import warnings:', result.errors);
        }
      } else {
        showPresetStatus(`Import failed: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      showPresetStatus('Failed to read preset file', 'error');
    }
  };
  
  reader.readAsText(file);
}

function setupMapKeyInteractions(mapEl: HTMLElement, roomKeyEl: HTMLElement): void {
  const svg = mapEl.querySelector('svg');
  if (!svg) return;

  svg.querySelectorAll<SVGTextElement>('text[data-room]').forEach(el => {
    el.addEventListener('click', () => {
      const num = el.getAttribute('data-room');
      const target = roomKeyEl.querySelector<HTMLElement>(`#room-${num}`);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  svg.querySelectorAll<SVGGraphicsElement>('.door-icon').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-door');
      const target = roomKeyEl.querySelector<HTMLElement>(`#door-${id}`);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  svg.querySelectorAll<SVGGraphicsElement>('.key-icon').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-key');
      const target = roomKeyEl.querySelector<HTMLElement>(`#key-${id}`);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const highlight = (element: SVGGraphicsElement) => {
    svg.querySelectorAll('.map-highlight').forEach(e => e.classList.remove('map-highlight'));
    element.classList.add('map-highlight');
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };

  roomKeyEl.querySelectorAll<HTMLElement>('section.room').forEach(section => {
    const num = section.getAttribute('data-room');
    section.addEventListener('click', () => {
      const el = svg.querySelector<SVGGraphicsElement>(`.room-shape[data-room="${num}"]`);
      if (el) highlight(el);
    });
  });

  roomKeyEl.querySelectorAll<HTMLElement>('[data-key]').forEach(keyEl => {
    const id = keyEl.getAttribute('data-key');
    keyEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = svg.querySelector<SVGGraphicsElement>(`.key-icon[data-key="${id}"]`);
      if (el) highlight(el);
    });
  });
}

// Minimap functionality
interface MinimapState {
  isVisible: boolean;
  isCollapsed: boolean;
  scale: number;
  svgWidth: number;
  svgHeight: number;
  containerWidth: number;
  containerHeight: number;
}

let minimapState: MinimapState = {
  isVisible: false,
  isCollapsed: false,
  scale: 1,
  svgWidth: 0,
  svgHeight: 0,
  containerWidth: 200,
  containerHeight: 126 // 150 - 24 (header height)
};

function createMinimap(originalSvg: SVGElement): void {
  const minimapContainer = document.getElementById('minimap-svg-container');
  const minimap = document.getElementById('minimap');
  
  if (!minimapContainer || !minimap || !originalSvg) return;

  // Clone the original SVG for the minimap
  const clonedSvg = originalSvg.cloneNode(true) as SVGElement;
  clonedSvg.classList.add('minimap-svg');
  clonedSvg.removeAttribute('id'); // Avoid duplicate IDs
  
  // Get original SVG dimensions
  const originalViewBox = originalSvg.getAttribute('viewBox');
  const originalWidth = parseFloat(originalSvg.getAttribute('width') || '800');
  const originalHeight = parseFloat(originalSvg.getAttribute('height') || '600');
  
  minimapState.svgWidth = originalWidth;
  minimapState.svgHeight = originalHeight;
  
  // Calculate scale to fit minimap container
  const scaleX = minimapState.containerWidth / originalWidth;
  const scaleY = minimapState.containerHeight / originalHeight;
  minimapState.scale = Math.min(scaleX, scaleY);
  
  // Set minimap SVG dimensions
  const minimapWidth = originalWidth * minimapState.scale;
  const minimapHeight = originalHeight * minimapState.scale;
  
  clonedSvg.setAttribute('width', minimapWidth.toString());
  clonedSvg.setAttribute('height', minimapHeight.toString());
  
  if (originalViewBox) {
    clonedSvg.setAttribute('viewBox', originalViewBox);
  }
  
  // Clear previous content and add new minimap
  minimapContainer.innerHTML = '';
  minimapContainer.appendChild(clonedSvg);
  
  // Show minimap
  minimap.style.display = 'block';
  minimapState.isVisible = true;
  
  // Setup minimap interactions
  setupMinimapInteractions();
  
  // Initial viewport rectangle update
  updateMinimapViewport();
}

function setupMinimapInteractions(): void {
  const minimapToggle = document.getElementById('minimap-toggle');
  const minimap = document.getElementById('minimap');
  const minimapSvgContainer = document.getElementById('minimap-svg-container');
  
  if (!minimapToggle || !minimap || !minimapSvgContainer) return;
  
  // Toggle collapse/expand
  minimapToggle.addEventListener('click', () => {
    minimapState.isCollapsed = !minimapState.isCollapsed;
    
    if (minimapState.isCollapsed) {
      minimap.classList.add('collapsed');
      minimapToggle.setAttribute('title', 'Expand');
      minimapToggle.textContent = '+';
    } else {
      minimap.classList.remove('collapsed');
      minimapToggle.setAttribute('title', 'Collapse'); 
      minimapToggle.textContent = '−';
    }
  });
  
  // Expand when clicking collapsed minimap
  minimap.addEventListener('click', () => {
    if (minimapState.isCollapsed) {
      minimapState.isCollapsed = false;
      minimap.classList.remove('collapsed');
      minimapToggle.setAttribute('title', 'Collapse');
      minimapToggle.textContent = '−';
    }
  });
  
  // Click to navigate
  minimapSvgContainer.addEventListener('click', (e) => {
    if (minimapState.isCollapsed) return;
    
    const rect = minimapSvgContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    navigateToMinimapPoint(clickX, clickY);
  });
  
  // Drag viewport rectangle
  setupViewportDragging();
}

function navigateToMinimapPoint(minimapX: number, minimapY: number): void {
  const mapContainer = document.getElementById('map');
  const minimapSvg = document.querySelector('.minimap-svg') as SVGElement;
  if (!mapContainer || !minimapSvg || !panzoomInstance) return;
  
  // Get the minimap SVG's bounding rect to account for centering
  const minimapSvgRect = minimapSvg.getBoundingClientRect();
  const minimapContainerRect = document.getElementById('minimap-svg-container')?.getBoundingClientRect();
  
  if (!minimapContainerRect) return;
  
  // Adjust coordinates to account for SVG centering within container
  const svgOffsetX = (minimapContainerRect.width - minimapSvgRect.width) / 2;
  const svgOffsetY = (minimapContainerRect.height - minimapSvgRect.height) / 2;
  
  const adjustedX = minimapX - svgOffsetX;
  const adjustedY = minimapY - svgOffsetY;
  
  // Convert minimap coordinates to original SVG coordinates
  const svgX = adjustedX / minimapState.scale;
  const svgY = adjustedY / minimapState.scale;
  
  // Get container dimensions for centering
  const containerRect = mapContainer.getBoundingClientRect();
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  // Get current transform by parsing CSS transform
  const svg = document.querySelector('#map-content svg') as SVGElement;
  const transform = svg?.style.transform || 'matrix(1, 0, 0, 1, 0, 0)';
  const matrix = transform.match(/matrix\(([^)]+)\)/);
  const currentScale = matrix ? parseFloat(matrix[1].split(',')[0]) : 1;
  
  // Calculate new pan position to center the clicked point
  const newX = -(svgX * currentScale) + centerX;
  const newY = -(svgY * currentScale) + centerY;
  
  // Apply the new transform
  panzoomInstance.pan(newX, newY, { animate: true });
}

function setupViewportDragging(): void {
  const viewportRect = document.getElementById('minimap-viewport');
  const minimapContainer = document.getElementById('minimap-svg-container');
  
  if (!viewportRect || !minimapContainer) return;
  
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startScrollX = 0;
  let startScrollY = 0;
  
  viewportRect.addEventListener('mousedown', (e) => {
    isDragging = true;
    viewportRect.classList.add('dragging');
    
    startX = e.clientX;
    startY = e.clientY;
    
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      startScrollX = mapContainer.scrollLeft;
      startScrollY = mapContainer.scrollTop;
    }
    
    e.preventDefault();
    e.stopPropagation(); // Prevent minimap click navigation
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Convert minimap movement to main map scroll
    const scrollDeltaX = (deltaX / minimapState.scale) * mapViewState.scale;
    const scrollDeltaY = (deltaY / minimapState.scale) * mapViewState.scale;
    
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.scrollLeft = Math.max(0, startScrollX + scrollDeltaX);
      mapContainer.scrollTop = Math.max(0, startScrollY + scrollDeltaY);
    }
    
    updateMinimapViewport();
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      if (viewportRect) {
        viewportRect.classList.remove('dragging');
        viewportRect.style.pointerEvents = 'none';
      }
    }
  });
}

function updateMinimapViewport(): void {
  const mapContainer = document.getElementById('map');
  const viewportRect = document.getElementById('minimap-viewport');
  const minimapContainer = document.getElementById('minimap-svg-container');
  const minimapSvg = document.querySelector('.minimap-svg') as SVGElement;
  
  if (!mapContainer || !viewportRect || !minimapContainer || !minimapSvg || !minimapState.isVisible || minimapState.isCollapsed) {
    return;
  }
  
  // If panzoom isn't ready yet, hide viewport and return
  if (!panzoomInstance) {
    viewportRect.style.display = 'none';
    return;
  }
  
  // Get transform from the SVG's style instead of getTransform
  const svg = document.querySelector('#map-content svg') as SVGElement;
  if (!svg) return;
  
  const transform = svg.style.transform || 'matrix(1, 0, 0, 1, 0, 0)';
  const matrix = transform.match(/matrix\(([^)]+)\)/);
  
  let scale = mapViewState.scale || 1;
  let translateX = 0;
  let translateY = 0;
  
  if (matrix) {
    const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
    scale = values[0] || 1;
    translateX = values[4] || 0;
    translateY = values[5] || 0;
  }
  
  const containerRect = mapContainer.getBoundingClientRect();
  
  // Get minimap SVG position within its container (for centering offset)
  const minimapSvgRect = minimapSvg.getBoundingClientRect();
  const minimapContainerRect = minimapContainer.getBoundingClientRect();
  
  const svgOffsetX = (minimapContainerRect.width - minimapSvgRect.width) / 2;
  const svgOffsetY = (minimapContainerRect.height - minimapSvgRect.height) / 2;
  
  // Convert main map transform to minimap coordinates
  const minimapX = (-translateX / scale) * minimapState.scale + svgOffsetX;
  const minimapY = (-translateY / scale) * minimapState.scale + svgOffsetY;
  const minimapViewWidth = (containerRect.width / scale) * minimapState.scale;
  const minimapViewHeight = (containerRect.height / scale) * minimapState.scale;
  
  // Position and size the viewport rectangle
  viewportRect.style.left = minimapX + 'px';
  viewportRect.style.top = minimapY + 'px';
  viewportRect.style.width = minimapViewWidth + 'px';
  viewportRect.style.height = minimapViewHeight + 'px';
  
  // Ensure viewport rectangle is visible
  viewportRect.style.display = 'block';
}

// Map pan and zoom functionality
interface MapViewState {
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragStartScrollX: number;
  dragStartScrollY: number;
}

let mapViewState: MapViewState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartScrollX: 0,
  dragStartScrollY: 0
};

// Global panzoom instance for external access
let panzoomInstance: any = null;

function setupMapPanZoom(mapEl: HTMLElement): void {
  const mapContentEl = mapEl.querySelector('#map-content') as HTMLElement;
  const svg = mapContentEl?.querySelector('svg');
  if (!svg || !mapContentEl) return;

  // Clean up any existing panzoom instance
  if (panzoomInstance) {
    try {
      panzoomInstance.destroy();
    } catch (e) {
      // Ignore errors during cleanup
    }
    panzoomInstance = null;
  }

  // Add class to SVG for CSS transitions
  svg.classList.add('map-svg');
  
  // Test if Panzoom is available
  if (typeof Panzoom === 'undefined') {
    console.error('Panzoom library not loaded!');
    return;
  }
  
  // Try the simplest possible panzoom setup
  try {
    panzoomInstance = Panzoom(svg, {
      // Minimal options
      maxScale: 3,
      minScale: 0.5
    });
    
    console.log('Panzoom created on SVG element');
    
    // Add wheel zoom to parent
    mapEl.addEventListener('wheel', panzoomInstance.zoomWithWheel);
    
    // Update minimap when changes occur
    svg.addEventListener('panzoomchange', (event: any) => {
      if (panzoomInstance) {
        // Use the event detail instead of getTransform
        const transform = event.detail || { scale: 1, x: 0, y: 0 };
        mapViewState.scale = transform.scale;
        updateMinimapViewport();
      }
    });
    
  } catch (error) {
    console.error('Failed to create panzoom:', error);
    return;
  }
  
  // Initial minimap update after panzoom is ready
  setTimeout(() => {
    updateMinimapViewport();
  }, 100);
}

function zoomToPoint(mapEl: HTMLElement, svg: SVGElement, clientX: number, clientY: number, newScale: number): void {
  if (!panzoomInstance) return;
  
  // Use panzoom's built-in zoom functionality
  panzoomInstance.zoomToPoint(newScale, { clientX, clientY });
}

function setupZoomControls(mapEl: HTMLElement): void {
  if (!panzoomInstance) return;

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const resetViewBtn = document.getElementById('reset-view');

  zoomInBtn?.addEventListener('click', () => {
    panzoomInstance.zoomIn();
  });

  zoomOutBtn?.addEventListener('click', () => {
    panzoomInstance.zoomOut();
  });

  resetViewBtn?.addEventListener('click', () => {
    panzoomInstance.reset();
  });
}

function downloadJSON(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  populateTemplateSelector();
  populateSystemSelector();
  initializeThemeSelector();
  initializeSourceSelector();
  initializePresetSystem(); // Initialize preset system
  loadGeneratorSettings();
  restoreCollapsedStates(); // Restore collapsed states from localStorage
  
  const generateBtn = document.getElementById('generate');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      // Force generation even if real-time is disabled
      generate().catch(console.error);
    });
  }

  // Setup real-time preview listeners
  setupRealTimePreview();

  // Setup map style controls
  setupMapStyleControls();

  // Initial generation
  generate().catch(console.error);
});

// Make functions available globally for onclick handlers
(window as any).showTab = showTab;
(window as any).toggleSummary = toggleSummary;
(window as any).toggleOptionGroup = toggleOptionGroup;
(window as any).closeSavePresetModal = closeSavePresetModal;
(window as any).saveCurrentPreset = saveCurrentPreset;
(window as any).closeManagePresetsModal = closeManagePresetsModal;
(window as any).loadPresetFromManager = loadPresetFromManager;
(window as any).deletePresetFromManager = deletePresetFromManager;
(window as any).exportSinglePreset = exportSinglePreset;
(window as any).importWizard = {
  deleteDataset: (moduleId: string, dataType: string) => {
    if (importWizard) {
      importWizard.deleteDataset(moduleId, dataType);
    }
  }
};
