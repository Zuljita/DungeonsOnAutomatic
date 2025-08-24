/**
 * Plugin Manager UI for the desktop app
 * Allows installing, updating, and managing plugins through the Electron main process
 */

interface Plugin {
  id: string;
  name: string;
  version?: string;
  description?: string;
  type: 'system' | 'export' | 'room-shape';
  installed: boolean;
  updateAvailable?: boolean;
  gitUrl?: string;
}

let availablePlugins: Plugin[] = [];
let installedPlugins: Plugin[] = [];

/**
 * Initialize plugin manager UI
 */
export async function initializePluginManager() {
  console.log('🔌 Initializing Plugin Manager...');
  
  try {
    // Get currently installed plugins
    installedPlugins = await window.electronAPI.plugins.list();
    console.log(`📦 Found ${installedPlugins.length} installed plugins`);
    
    // Load plugin marketplace/registry (mock data for now)
    availablePlugins = await loadAvailablePlugins();
    
    // Render the plugin manager UI
    renderPluginManager();
    
  } catch (error) {
    console.error('❌ Failed to initialize plugin manager:', error);
    showError('Failed to load plugin manager');
  }
}

/**
 * Load available plugins from registry/marketplace
 */
async function loadAvailablePlugins(): Promise<Plugin[]> {
  // Mock data - in real implementation, this could fetch from:
  // - npm registry with 'doa-plugin' keyword
  // - GitHub topics/searches
  // - Custom plugin registry
  
  return [
    {
      id: 'advanced-svg-export',
      name: 'Advanced SVG Export',
      version: '1.2.0',
      description: 'Enhanced SVG export with custom themes and animations',
      type: 'export',
      installed: false,
      gitUrl: 'https://github.com/example/doa-advanced-svg-export'
    },
    {
      id: 'pathfinder-system',
      name: 'Pathfinder RPG System',
      version: '2.1.0',
      description: 'Generate dungeons with Pathfinder RPG encounters and treasure',
      type: 'system',
      installed: false,
      gitUrl: 'https://github.com/example/doa-pathfinder-system'
    },
    {
      id: 'organic-rooms',
      name: 'Organic Room Shapes',
      version: '1.0.5',
      description: 'Natural, cave-like room shapes for organic dungeons',
      type: 'room-shape',
      installed: false,
      gitUrl: 'https://github.com/example/doa-organic-rooms'
    },
    {
      id: 'roll20-enhanced',
      name: 'Enhanced Roll20 Export',
      version: '1.4.2',
      description: 'Roll20 export with dynamic lighting and advanced features',
      type: 'export',
      installed: false,
      gitUrl: 'https://github.com/example/doa-roll20-enhanced'
    }
  ];
}

/**
 * Render the plugin manager UI
 */
function renderPluginManager() {
  const container = document.getElementById('plugin-manager-container');
  if (!container) return;

  container.innerHTML = `
    <div class="plugin-manager">
      <header class="plugin-manager-header">
        <h2>🔌 Plugin Manager</h2>
        <div class="plugin-stats">
          <span class="stat">
            <strong>${installedPlugins.length}</strong> installed
          </span>
          <span class="stat">
            <strong>${availablePlugins.filter(p => !p.installed).length}</strong> available
          </span>
        </div>
      </header>

      <nav class="plugin-tabs">
        <button class="tab-button active" data-tab="installed">Installed</button>
        <button class="tab-button" data-tab="available">Available</button>
        <button class="tab-button" data-tab="install-custom">Install Custom</button>
      </nav>

      <div class="tab-content">
        <div class="tab-panel active" id="installed-tab">
          <div class="plugin-list">
            ${renderInstalledPlugins()}
          </div>
        </div>

        <div class="tab-panel" id="available-tab">
          <div class="plugin-search">
            <input type="text" id="plugin-search" placeholder="Search plugins...">
            <button id="refresh-plugins">🔄 Refresh</button>
          </div>
          <div class="plugin-list">
            ${renderAvailablePlugins()}
          </div>
        </div>

        <div class="tab-panel" id="install-custom-tab">
          <div class="custom-install">
            <h3>Install Plugin from Git Repository</h3>
            <div class="install-form">
              <input type="url" id="git-url" placeholder="https://github.com/user/plugin-name" required>
              <button id="install-from-git">Install Plugin</button>
            </div>
            <div class="install-help">
              <p><strong>Supported sources:</strong></p>
              <ul>
                <li>GitHub repositories</li>
                <li>GitLab repositories</li>
                <li>Any Git repository with a valid plugin structure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div id="plugin-status" class="status-area"></div>
    </div>
  `;

  // Setup event listeners
  setupPluginManagerEvents();
}

/**
 * Render installed plugins
 */
function renderInstalledPlugins(): string {
  if (installedPlugins.length === 0) {
    return '<div class="empty-state">No plugins installed</div>';
  }

  return installedPlugins.map(plugin => `
    <div class="plugin-card installed">
      <div class="plugin-info">
        <h4>${plugin.name || plugin.id}</h4>
        <p class="plugin-type">${plugin.type}</p>
        ${plugin.version ? `<p class="plugin-version">v${plugin.version}</p>` : ''}
      </div>
      <div class="plugin-actions">
        <button class="btn-secondary" onclick="togglePlugin('${plugin.id}')">
          ${plugin.enabled !== false ? 'Disable' : 'Enable'}
        </button>
        <button class="btn-danger" onclick="uninstallPlugin('${plugin.id}')">Uninstall</button>
      </div>
    </div>
  `).join('');
}

/**
 * Render available plugins
 */
function renderAvailablePlugins(): string {
  const uninstalled = availablePlugins.filter(p => !p.installed);
  
  if (uninstalled.length === 0) {
    return '<div class="empty-state">No plugins available</div>';
  }

  return uninstalled.map(plugin => `
    <div class="plugin-card available">
      <div class="plugin-info">
        <h4>${plugin.name}</h4>
        <p class="plugin-description">${plugin.description}</p>
        <p class="plugin-meta">
          <span class="plugin-type">${plugin.type}</span>
          ${plugin.version ? `• v${plugin.version}` : ''}
        </p>
      </div>
      <div class="plugin-actions">
        <button class="btn-primary" onclick="installPlugin('${plugin.id}')">
          Install
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Setup event listeners for plugin manager
 */
function setupPluginManagerEvents() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabId = target.dataset.tab;
      switchTab(tabId);
    });
  });

  // Search functionality
  const searchInput = document.getElementById('plugin-search') as HTMLInputElement;
  searchInput?.addEventListener('input', filterPlugins);

  // Refresh plugins
  document.getElementById('refresh-plugins')?.addEventListener('click', refreshPlugins);

  // Install from Git
  document.getElementById('install-from-git')?.addEventListener('click', installFromGit);
}

/**
 * Switch between plugin manager tabs
 */
function switchTab(tabId: string) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`${tabId}-tab`)?.classList.add('active');
}

/**
 * Filter available plugins by search term
 */
function filterPlugins(e: Event) {
  const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
  const pluginCards = document.querySelectorAll('#available-tab .plugin-card');
  
  pluginCards.forEach(card => {
    const name = card.querySelector('h4')?.textContent?.toLowerCase() || '';
    const description = card.querySelector('.plugin-description')?.textContent?.toLowerCase() || '';
    const visible = name.includes(searchTerm) || description.includes(searchTerm);
    (card as HTMLElement).style.display = visible ? 'block' : 'none';
  });
}

/**
 * Refresh plugin list from registry
 */
async function refreshPlugins() {
  showStatus('Refreshing plugin list...', 'info');
  try {
    availablePlugins = await loadAvailablePlugins();
    installedPlugins = await window.electronAPI.plugins.list();
    renderPluginManager();
    showStatus('Plugin list refreshed', 'success');
  } catch (error) {
    showStatus('Failed to refresh plugins', 'error');
  }
}

/**
 * Install plugin from Git repository
 */
async function installFromGit() {
  const gitUrlInput = document.getElementById('git-url') as HTMLInputElement;
  const gitUrl = gitUrlInput.value.trim();
  
  if (!gitUrl) {
    showStatus('Please enter a Git repository URL', 'error');
    return;
  }

  try {
    showStatus('Installing plugin from Git repository...', 'info');
    await window.electronAPI.plugins.installFromGit(gitUrl);
    showStatus('Plugin installed successfully!', 'success');
    
    // Refresh plugin lists
    await refreshPlugins();
    gitUrlInput.value = '';
    
  } catch (error) {
    showStatus(`Installation failed: ${error.message}`, 'error');
  }
}

/**
 * Install a plugin by ID
 */
async function installPlugin(pluginId: string) {
  const plugin = availablePlugins.find(p => p.id === pluginId);
  if (!plugin || !plugin.gitUrl) return;

  try {
    showStatus(`Installing ${plugin.name}...`, 'info');
    await window.electronAPI.plugins.installFromGit(plugin.gitUrl);
    showStatus(`${plugin.name} installed successfully!`, 'success');
    
    // Mark as installed and refresh
    plugin.installed = true;
    await refreshPlugins();
    
  } catch (error) {
    showStatus(`Failed to install ${plugin.name}: ${error.message}`, 'error');
  }
}

/**
 * Uninstall a plugin
 */
async function uninstallPlugin(pluginId: string) {
  if (!confirm(`Are you sure you want to uninstall the plugin "${pluginId}"?`)) {
    return;
  }

  try {
    showStatus(`Uninstalling ${pluginId}...`, 'info');
    await window.electronAPI.plugins.uninstall(pluginId);
    showStatus(`${pluginId} uninstalled successfully!`, 'success');
    
    await refreshPlugins();
    
  } catch (error) {
    showStatus(`Failed to uninstall ${pluginId}: ${error.message}`, 'error');
  }
}

/**
 * Toggle plugin enabled/disabled state
 */
async function togglePlugin(pluginId: string) {
  try {
    await window.electronAPI.plugins.toggle(pluginId);
    showStatus(`Plugin ${pluginId} toggled`, 'success');
    await refreshPlugins();
  } catch (error) {
    showStatus(`Failed to toggle plugin: ${error.message}`, 'error');
  }
}

/**
 * Show status message
 */
function showStatus(message: string, type: 'info' | 'success' | 'error') {
  const statusArea = document.getElementById('plugin-status');
  if (!statusArea) return;

  statusArea.className = `status-area ${type}`;
  statusArea.textContent = message;
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusArea.textContent = '';
      statusArea.className = 'status-area';
    }, 3000);
  }
}

/**
 * Show error message
 */
function showError(message: string) {
  showStatus(message, 'error');
}

// Make functions available globally for onclick handlers
(window as any).installPlugin = installPlugin;
(window as any).uninstallPlugin = uninstallPlugin;
(window as any).togglePlugin = togglePlugin;