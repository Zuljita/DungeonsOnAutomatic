/**
 * Desktop-specific main module that uses Electron's plugin system
 * This replaces the browser-based main.ts for the desktop app
 */

// Check if we're in an Electron environment
const isElectron = typeof window !== 'undefined' && window.electronAPI;

if (!isElectron) {
  throw new Error('This module requires Electron environment with plugin support');
}

// Import only browser-safe modules
import { ImportWizardComponent } from './import-wizard';
import { presetStorage, type DungeonPreset, type PresetConfiguration } from './preset-system';
import { initializePluginManager } from './plugin-manager';
import Panzoom from '@panzoom/panzoom';

// Import plugin manager CSS
import './plugin-manager.css';

// Room key functions - these need to be imported dynamically to avoid Node.js dependencies
let htmlRoomDetails: any;
let getDungeonMetaHtml: any;

let importWizard: ImportWizardComponent | null = null;
const STORAGE_KEY = 'doa-generator-settings';

// Real-time preview state
let isGenerating = false;
let generateTimeout: number | null = null;
const DEBOUNCE_DELAY = 500; // 500ms delay for real-time updates

// Plugin state
let availablePlugins: any[] = [];
let availableSystems: any[] = [];

/**
 * Initialize plugins on startup
 */
async function initializePlugins() {
  try {
    console.log('🔌 Initializing desktop plugin system...');
    
    // Get list of available plugins
    availablePlugins = await window.electronAPI.plugins.list();
    console.log(`📦 Found ${availablePlugins.length} plugins:`, availablePlugins);
    
    // Filter system plugins
    availableSystems = availablePlugins.filter(p => p.type === 'system');
    console.log(`🎮 Found ${availableSystems.length} system plugins:`, availableSystems.map(s => s.id));
    
    // Populate system dropdown
    const systemSelect = document.getElementById('system') as HTMLSelectElement;
    if (systemSelect) {
      // Clear existing options except the first one
      systemSelect.innerHTML = '<option value="">Select System</option>';
      
      // Add system plugins
      availableSystems.forEach(system => {
        const option = document.createElement('option');
        option.value = system.id;
        option.textContent = system.name || system.id;
        systemSelect.appendChild(option);
      });
    }
    
    // Test Electron API
    const version = await window.electronAPI.getVersion();
    console.log(`🚀 Desktop app version: ${version}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize plugins:', error);
    
    // Show error in UI
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--accent-danger);">
          <h3>❌ Plugin System Error</h3>
          <p>Failed to initialize desktop plugin system.</p>
          <p><small>${error.message}</small></p>
          <p>Check the console for more details.</p>
        </div>
      `;
    }
  }
}

/**
 * Generate dungeon using desktop plugin system
 */
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

  try {
    // Get form values (same as original)
    const config = getFormConfiguration();
    console.log('🎲 Generating dungeon with config:', config);
    
    // Use Electron plugin system for generation
    if (config.system && config.system !== 'generic') {
      console.log(`🎮 Using system plugin: ${config.system}`);
      
      // Generate dungeon with system plugin
      const enrichedDungeon = await window.electronAPI.plugins.generateDungeon(config.system, config);
      console.log('✅ Dungeon generated with system plugin');
      
      // Render the dungeon
      await renderDungeon(enrichedDungeon, config);
      
    } else {
      // Fallback to basic generation (no system enrichment)
      console.log('🏗️ Using basic dungeon generation (no system)');
      
      // For basic generation, show a message
      console.log('⚠️ Basic generation not yet implemented for desktop app');
      throw new Error('Please select a system to generate dungeons in the desktop app');
    }
    
  } catch (error) {
    console.error('❌ Generation failed:', error);
    
    const mapContainer = document.getElementById('map-content');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--accent-danger);">
          <h3>❌ Generation Failed</h3>
          <p>${error.message}</p>
          <p><small>Check the console for more details.</small></p>
        </div>
      `;
    }
  } finally {
    hideLoadingState();
  }
}

/**
 * Render dungeon using export plugins
 */
async function renderDungeon(dungeon: any, config: any) {
  const mapContentEl = document.getElementById('map-content');
  const roomKeyEl = document.getElementById('room-key');
  const inputEl = document.getElementById('inputs');
  
  if (!mapContentEl || !roomKeyEl || !inputEl) return;
  
  try {
    // Try to use SVG export plugin
    console.log('🎨 Rendering dungeon with SVG export plugin...');
    
    const exportOptions = {
      theme: config.colorTheme || 'light',
      style: config.mapStyle || 'classic',
      showGrid: config.showGrid || false,
      wobbleIntensity: config.wobbleIntensity || 1,
      wallThickness: config.wallThickness || 1,
    };
    
    const result = await window.electronAPI.plugins.export('svg-export', dungeon, exportOptions);
    
    if (result && result.data) {
      mapContentEl.innerHTML = result.data;
      console.log('✅ SVG rendering successful');
      
      // Setup interactive features
      const mapEl = document.getElementById('map');
      if (mapEl) {
        setupMapPanZoom(mapEl);
        setupZoomControls(mapEl);
      }
      
    } else {
      throw new Error('SVG export plugin returned no data');
    }
    
  } catch (exportError) {
    console.warn('⚠️ SVG export failed, using fallback:', exportError);
    
    // Fallback to simple display
    mapContentEl.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h3>🗺️ Dungeon Generated</h3>
        <p>Dungeon created with ${dungeon.rooms.length} rooms</p>
        <p><small>SVG rendering unavailable - plugin system issue</small></p>
      </div>
    `;
  }
  
  // Always populate room key - simplified for desktop
  try {
    roomKeyEl.innerHTML = `
      <h2>Room Key</h2>
      <div class="room-summary">
        <p><strong>Generated dungeon with ${dungeon.rooms.length} rooms</strong></p>
        ${dungeon.wanderingMonsters ? '<h3>Wandering Monsters</h3><p>See console for wandering monsters table</p>' : ''}
      </div>
    `;
    
    // Log detailed room info to console for now
    console.log('🗝️ Room details:', dungeon.rooms);
    if (dungeon.wanderingMonsters) {
      console.log('👹 Wandering monsters:', dungeon.wanderingMonsters);
    }
  } catch (error) {
    console.warn('⚠️ Room key generation failed:', error);
    roomKeyEl.innerHTML = '<h2>Room Key</h2><p>Unable to generate room details</p>';
  }
  
  // Display input parameters
  inputEl.textContent = JSON.stringify(config, null, 2);
}

/**
 * Get form configuration
 */
function getFormConfiguration() {
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
  const lockPercentageInput = document.getElementById('lock-percentage') as HTMLInputElement;
  const magicalLocksInput = document.getElementById('magical-locks') as HTMLInputElement;
  
  // Map rendering controls
  const mapStyleInput = document.getElementById('map-style') as HTMLSelectElement;
  const colorThemeInput = document.getElementById('color-theme') as HTMLSelectElement;
  const showGridInput = document.getElementById('show-grid') as HTMLInputElement;
  const wobbleIntensityInput = document.getElementById('wobble-intensity') as HTMLSelectElement;
  const wallThicknessInput = document.getElementById('wall-thickness') as HTMLSelectElement;
  const textureInput = document.getElementById('texture') as HTMLSelectElement;

  return {
    template: templateInput?.value || undefined,
    rooms: parseInt(roomsInput?.value) || 8,
    seed: seedInput?.value || undefined,
    system: systemInput?.value || 'generic',
    theme: themeInput?.value || undefined,
    width: parseInt(widthInput?.value) || 50,
    height: parseInt(heightInput?.value) || 50,
    layoutType: layoutTypeInput?.value || 'rectangle',
    roomLayout: roomLayoutInput?.value || 'scattered',
    roomSize: roomSizeInput?.value || 'medium',
    roomShape: roomShapeInput?.value || 'rectangular',
    corridorType: corridorTypeInput?.value || 'straight',
    pathfindingAlgorithm: pathfindingAlgorithmInput?.value || 'manhattan',
    corridorWidth: parseInt(corridorWidthInput?.value) || 1,
    allowDeadends: allowDeadendsInput?.checked,
    stairsUp: stairsUpInput?.checked,
    stairsDown: stairsDownInput?.checked,
    entranceFromPeriphery: entrancePeripheryInput?.checked,
    lockPercentage: parseFloat(lockPercentageInput?.value) || undefined,
    magicalLocks: magicalLocksInput?.checked,
    mapStyle: mapStyleInput?.value,
    colorTheme: colorThemeInput?.value,
    showGrid: showGridInput?.checked,
    wobbleIntensity: parseFloat(wobbleIntensityInput?.value) || 1,
    wallThickness: parseFloat(wallThicknessInput?.value) || 1,
    texture: textureInput?.value,
  };
}

// Import utility functions from original (these don't depend on plugins)
function validateForm() {
  // Basic validation - in real implementation would be more thorough
  return { isValid: true, errors: [] };
}

function displayValidationErrors(errors: any[]) {
  // Display validation errors - implementation depends on UI
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

function updateConfigurationSummary(config: any) {
  const summaryEl = document.getElementById('config-summary-text');
  if (summaryEl) {
    summaryEl.textContent = JSON.stringify(config, null, 2);
  }
}

// Simplified versions of map interaction functions
function setupMapPanZoom(mapEl: HTMLElement) {
  const panzoom = Panzoom(mapEl, {
    maxScale: 5,
    minScale: 0.1,
  });
  
  mapEl.addEventListener('wheel', panzoom.zoomWithWheel);
}

function setupZoomControls(mapEl: HTMLElement) {
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const resetViewBtn = document.getElementById('reset-view');
  
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      // Basic zoom implementation
      console.log('Zoom in');
    });
  }
  
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      // Basic zoom implementation
      console.log('Zoom out');
    });
  }
  
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      // Basic reset implementation
      console.log('Reset view');
    });
  }
}

function debounceGenerate() {
  const realtimePreview = document.getElementById('real-time-preview') as HTMLInputElement;
  
  if (!realtimePreview?.checked) return;
  
  if (generateTimeout) {
    clearTimeout(generateTimeout);
  }
  
  generateTimeout = window.setTimeout(generate, DEBOUNCE_DELAY);
}

// Initialize desktop app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🖥️ Initializing desktop app...');
  
  // Initialize plugins first
  await initializePlugins();
  
  // Initialize plugin manager
  await initializePluginManager();
  
  // Set up event listeners
  const generateBtn = document.getElementById('generate');
  if (generateBtn) {
    generateBtn.addEventListener('click', generate);
  }
  
  // Set up real-time preview
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('change', debounceGenerate);
    input.addEventListener('input', debounceGenerate);
  });
  
  console.log('✅ Desktop app initialized successfully');
});

// Export for global access
(window as any).generate = generate;
(window as any).availablePlugins = availablePlugins;