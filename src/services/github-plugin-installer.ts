import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import semver from 'semver';
import type { PluginMetadata } from '../core/plugin-types';
import pkg from '../../package.json';

const execAsync = promisify(exec);
const CORE_VERSION = pkg.version as string;

export interface GitHubPluginMetadata extends PluginMetadata {
  doaVersion?: string;
  name?: string;
  license?: string;
  repository?: { type: string; url: string } | string;
  homepage?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  type?: string;
  // Keep npm author format separate for internal use
  npmAuthor?: string | { name: string; email?: string };
}

export interface InstallationOptions {
  /** Force installation even if plugin exists */
  force?: boolean;
  /** Skip dependency installation */
  skipDeps?: boolean;
  /** Validate plugin before installation */
  validate?: boolean;
  /** Installation timeout in milliseconds */
  timeout?: number;
}

export interface InstallationResult {
  success: boolean;
  pluginId: string;
  version: string;
  path: string;
  message: string;
  dependencies?: string[];
  errors?: string[];
}

/**
 * Service for installing plugins directly from GitHub repositories
 */
export class GitHubPluginInstaller {
  private pluginsDir: string;
  private tempDir: string;

  constructor(pluginsDir?: string) {
    this.pluginsDir = pluginsDir || path.resolve(process.cwd(), 'plugins');
    this.tempDir = path.resolve(process.cwd(), '.temp-plugins');
  }

  /**
   * Install a plugin from a GitHub repository
   */
  async installFromGitHub(
    repoUrl: string, 
    options: InstallationOptions = {}
  ): Promise<InstallationResult> {
    const { force = false, skipDeps = false, validate = true, timeout = 60000 } = options;
    
    try {
      // Parse repository URL
      const repoInfo = this.parseGitHubUrl(repoUrl);
      if (!repoInfo) {
        return {
          success: false,
          pluginId: '',
          version: '',
          path: '',
          message: 'Invalid GitHub repository URL format'
        };
      }

      // Create temp directory
      await fs.mkdir(this.tempDir, { recursive: true });
      const tempRepoDir = path.join(this.tempDir, `${repoInfo.owner}-${repoInfo.repo}-${Date.now()}`);

      try {
        // Clone repository
        console.log(`Downloading plugin from ${repoInfo.owner}/${repoInfo.repo}...`);
        await this.cloneRepository(repoInfo, tempRepoDir, timeout);

        // Validate plugin structure
        const metadata = await this.validatePluginStructure(tempRepoDir);
        
        if (validate) {
          const validationResult = await this.validatePluginCompatibility(metadata);
          if (!validationResult.valid) {
            return {
              success: false,
              pluginId: metadata.id,
              version: metadata.version || '1.0.0',
              path: '',
              message: `Plugin validation failed: ${validationResult.errors.join(', ')}`
            };
          }
        }

        // Check if plugin already exists
        const targetDir = path.join(this.pluginsDir, metadata.id);
        const exists = await this.pluginExists(targetDir);
        
        if (exists && !force) {
          return {
            success: false,
            pluginId: metadata.id,
            version: metadata.version || '1.0.0',
            path: targetDir,
            message: `Plugin ${metadata.id} already exists. Use --force to overwrite.`
          };
        }

        // Install plugin
        await fs.mkdir(this.pluginsDir, { recursive: true });
        
        // Remove existing installation if force is enabled
        if (exists && force) {
          await fs.rm(targetDir, { recursive: true, force: true });
        }

        // Copy plugin files
        await fs.cp(tempRepoDir, targetDir, { recursive: true });

        // Install dependencies if needed
        const dependencies: string[] = [];
        if (!skipDeps && (metadata as GitHubPluginMetadata).dependencies) {
          const deps = await this.installDependencies(targetDir, (metadata as GitHubPluginMetadata).dependencies!);
          dependencies.push(...deps);
        }

        return {
          success: true,
          pluginId: metadata.id,
          version: metadata.version || '1.0.0',
          path: targetDir,
          message: `Successfully installed plugin ${metadata.id}`,
          dependencies
        };

      } finally {
        // Cleanup temp directory
        await fs.rm(tempRepoDir, { recursive: true, force: true });
      }

    } catch (error) {
      return {
        success: false,
        pluginId: '',
        version: '',
        path: '',
        message: `Installation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Update an installed plugin to the latest version
   */
  async updatePlugin(pluginId: string, options: InstallationOptions = {}): Promise<InstallationResult> {
    try {
      // Find installed plugin
      const pluginDir = path.join(this.pluginsDir, pluginId);
      
      if (!await this.pluginExists(pluginDir)) {
        return {
          success: false,
          pluginId,
          version: '',
          path: '',
          message: `Plugin ${pluginId} is not installed`
        };
      }

      // Read current metadata to get repository URL
      const currentMetadata = await this.readPluginMetadata(pluginDir);
      const repoUrl = this.extractRepositoryUrl(currentMetadata);
      
      if (!repoUrl) {
        return {
          success: false,
          pluginId,
          version: currentMetadata.version || '',
          path: pluginDir,
          message: `Cannot update ${pluginId}: no repository URL found in plugin metadata`
        };
      }

      // Install with force to overwrite existing
      return await this.installFromGitHub(repoUrl, { ...options, force: true });

    } catch (error) {
      return {
        success: false,
        pluginId,
        version: '',
        path: '',
        message: `Update failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Remove an installed plugin
   */
  async removePlugin(pluginId: string): Promise<InstallationResult> {
    try {
      const pluginDir = path.join(this.pluginsDir, pluginId);
      
      if (!await this.pluginExists(pluginDir)) {
        return {
          success: false,
          pluginId,
          version: '',
          path: '',
          message: `Plugin ${pluginId} is not installed`
        };
      }

      // Read metadata before removal
      const metadata = await this.readPluginMetadata(pluginDir);

      // Remove plugin directory
      await fs.rm(pluginDir, { recursive: true, force: true });

      return {
        success: true,
        pluginId,
        version: metadata.version || '',
        path: pluginDir,
        message: `Successfully removed plugin ${pluginId}`
      };

    } catch (error) {
      return {
        success: false,
        pluginId,
        version: '',
        path: '',
        message: `Removal failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * List all installed plugins with GitHub metadata
   */
  async listInstalledPlugins(): Promise<Array<{ metadata: GitHubPluginMetadata; path: string; hasUpdate?: boolean }>> {
    try {
      const plugins: Array<{ metadata: GitHubPluginMetadata; path: string; hasUpdate?: boolean }> = [];
      
      if (!await this.pluginExists(this.pluginsDir)) {
        return plugins;
      }

      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const pluginDir = path.join(this.pluginsDir, entry.name);
        try {
          const metadata = await this.readPluginMetadata(pluginDir) as GitHubPluginMetadata;
          plugins.push({ metadata, path: pluginDir });
        } catch (error) {
          // Skip invalid plugins
          console.warn(`Skipping invalid plugin in ${pluginDir}: ${error}`);
        }
      }

      return plugins;

    } catch (error) {
      console.error(`Failed to list plugins: ${error}`);
      return [];
    }
  }

  // Private helper methods

  private parseGitHubUrl(url: string): { owner: string; repo: string; ref?: string } | null {
    // Handle different GitHub URL formats
    const patterns = [
      /^github:([^\/]+)\/([^@#]+)(?:[@#](.+))?$/,  // github:owner/repo[@ref]
      /^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?(?:[@#](.+))?$/,  // https://github.com/owner/repo
      /^git\+https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:[@#](.+))?$/,  // git+https://github.com/owner/repo
      /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(?:[@#](.+))?$/  // owner/repo[@ref] - more restrictive
    ];

    // Don't process if it's clearly not a GitHub URL
    if (url.includes('://') && !url.includes('github.com')) {
      return null;
    }

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          ref: match[3] // branch, tag, or commit
        };
      }
    }

    return null;
  }

  private async cloneRepository(
    repoInfo: { owner: string; repo: string; ref?: string }, 
    targetDir: string, 
    timeout: number
  ): Promise<void> {
    const repoUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;
    let cloneCmd = `git clone --depth 1`;
    
    if (repoInfo.ref) {
      cloneCmd += ` --branch ${repoInfo.ref}`;
    }
    
    cloneCmd += ` "${repoUrl}" "${targetDir}"`;

    try {
      await execAsync(cloneCmd, { timeout });
    } catch (error) {
      // If branch/tag fails, try without it
      if (repoInfo.ref) {
        console.warn(`Failed to clone ${repoInfo.ref}, trying default branch...`);
        const fallbackCmd = `git clone --depth 1 "${repoUrl}" "${targetDir}"`;
        await execAsync(fallbackCmd, { timeout });
      } else {
        throw error;
      }
    }

    // Remove .git directory to save space
    const gitDir = path.join(targetDir, '.git');
    try {
      await fs.rm(gitDir, { recursive: true, force: true });
    } catch {
      // Ignore errors removing .git directory
    }
  }

  private async validatePluginStructure(pluginDir: string): Promise<GitHubPluginMetadata> {
    // Check for package.json
    const packageJsonPath = path.join(pluginDir, 'package.json');
    
    try {
      await fs.access(packageJsonPath);
    } catch {
      throw new Error('Plugin missing package.json file');
    }

    // Read and parse package.json
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    let packageJson: any;
    
    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch {
      throw new Error('Invalid package.json format');
    }

    // Validate DOA plugin metadata
    const doaPlugin = packageJson.doaPlugin;
    if (!doaPlugin) {
      throw new Error('Missing "doaPlugin" field in package.json');
    }

    if (!doaPlugin.type) {
      throw new Error('Missing plugin type in doaPlugin metadata');
    }

    // Extract plugin metadata
    const author = typeof packageJson.author === 'string' 
      ? packageJson.author 
      : packageJson.author?.name || undefined;
    
    const metadata: GitHubPluginMetadata = {
      id: packageJson.name || path.basename(pluginDir),
      version: packageJson.version || '1.0.0',
      description: packageJson.description || doaPlugin.description,
      author,
      tags: doaPlugin.tags,
      ...doaPlugin,
      name: packageJson.name,
      license: packageJson.license,
      repository: packageJson.repository,
      homepage: packageJson.homepage,
      dependencies: packageJson.dependencies,
      peerDependencies: packageJson.peerDependencies,
      type: doaPlugin.type,
      npmAuthor: packageJson.author
    };

    // Check for main entry point
    const mainFile = packageJson.main || 'index.js';
    const mainPath = path.join(pluginDir, mainFile);
    
    try {
      await fs.access(mainPath);
    } catch {
      // Check for TypeScript source
      const tsPath = mainPath.replace('.js', '.ts');
      try {
        await fs.access(tsPath);
      } catch {
        throw new Error(`Plugin entry point not found: ${mainFile}`);
      }
    }

    return metadata;
  }

  private async validatePluginCompatibility(metadata: GitHubPluginMetadata): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check DOA version compatibility
    if (metadata.doaVersion) {
      if (!semver.satisfies(CORE_VERSION, metadata.doaVersion)) {
        errors.push(`Plugin requires DOA ${metadata.doaVersion}, current version is ${CORE_VERSION}`);
      }
    }

    // Validate plugin type if specified
    if (metadata.type) {
      const validTypes = ['ExportPlugin', 'SystemPlugin', 'RoomShapePlugin'];
      if (!validTypes.includes(metadata.type)) {
        errors.push(`Invalid plugin type: ${metadata.type}. Must be one of: ${validTypes.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async pluginExists(pluginDir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(pluginDir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async readPluginMetadata(pluginDir: string): Promise<GitHubPluginMetadata> {
    const packageJsonPath = path.join(pluginDir, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    const doaPlugin = packageJson.doaPlugin || {};
    const author = typeof packageJson.author === 'string' 
      ? packageJson.author 
      : packageJson.author?.name || undefined;
    
    return {
      id: packageJson.name || path.basename(pluginDir),
      version: packageJson.version || '1.0.0',
      description: packageJson.description || doaPlugin.description,
      author,
      tags: doaPlugin.tags,
      ...doaPlugin,
      name: packageJson.name,
      license: packageJson.license,
      repository: packageJson.repository,
      homepage: packageJson.homepage,
      dependencies: packageJson.dependencies,
      peerDependencies: packageJson.peerDependencies,
      type: doaPlugin.type,
      npmAuthor: packageJson.author
    };
  }

  private extractRepositoryUrl(metadata: GitHubPluginMetadata): string | null {
    if (metadata.repository) {
      if (typeof metadata.repository === 'string') {
        return metadata.repository;
      } else if (metadata.repository.url) {
        return metadata.repository.url;
      }
    }
    return null;
  }

  private async installDependencies(pluginDir: string, dependencies: Record<string, string>): Promise<string[]> {
    const installedDeps: string[] = [];
    
    // For now, just log dependencies that would need to be installed
    // In a full implementation, this could run npm/pnpm install
    for (const [name, version] of Object.entries(dependencies)) {
      console.log(`Plugin dependency: ${name}@${version}`);
      installedDeps.push(`${name}@${version}`);
    }

    return installedDeps;
  }
}