import { describe, it, expect } from 'vitest';
import { GitHubPluginInstaller } from '../src/services/github-plugin-installer';

describe('GitHubPluginInstaller', () => {
  describe('URL Parsing', () => {
    it('should parse various GitHub URL formats', () => {
      const installer = new GitHubPluginInstaller();
      
      // Access private method for testing
      const parseGitHubUrl = (installer as any).parseGitHubUrl.bind(installer);
      
      const testCases = [
        {
          input: 'owner/repo',
          expected: { owner: 'owner', repo: 'repo', ref: undefined }
        },
        {
          input: 'github:owner/repo',
          expected: { owner: 'owner', repo: 'repo', ref: undefined }
        },
        {
          input: 'https://github.com/owner/repo',
          expected: { owner: 'owner', repo: 'repo', ref: undefined }
        },
        {
          input: 'https://github.com/owner/repo.git',
          expected: { owner: 'owner', repo: 'repo', ref: undefined }
        },
        {
          input: 'owner/repo@main',
          expected: { owner: 'owner', repo: 'repo', ref: 'main' }
        },
        {
          input: 'github:owner/repo#v1.0.0',
          expected: { owner: 'owner', repo: 'repo', ref: 'v1.0.0' }
        },
        {
          input: 'https://github.com/owner/repo/releases/tag/v1.0.0',
          expected: { owner: 'owner', repo: 'repo', ref: undefined }
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = parseGitHubUrl(input);
        expect(result).toEqual(expected);
      });
    });

    it('should return null for invalid URLs', () => {
      const installer = new GitHubPluginInstaller();
      const parseGitHubUrl = (installer as any).parseGitHubUrl.bind(installer);
      
      const invalidUrls = [
        '',
        'invalid',
        'not-a-url',
        'https://gitlab.com/owner/repo',
        'npm:package-name'
      ];
      
      invalidUrls.forEach(url => {
        const result = parseGitHubUrl(url);
        expect(result).toBeNull();
      });
    });
  });

  describe('Repository URL Extraction', () => {
    it('should extract repository URLs from metadata', () => {
      const installer = new GitHubPluginInstaller();
      const extractRepositoryUrl = (installer as any).extractRepositoryUrl.bind(installer);
      
      // String format
      expect(extractRepositoryUrl({ repository: 'https://github.com/owner/repo' }))
        .toBe('https://github.com/owner/repo');
      
      // Object format
      expect(extractRepositoryUrl({ 
        repository: { type: 'git', url: 'https://github.com/owner/repo.git' } 
      })).toBe('https://github.com/owner/repo.git');
      
      // No repository
      expect(extractRepositoryUrl({})).toBeNull();
      expect(extractRepositoryUrl({ repository: {} })).toBeNull();
    });
  });

  describe('Plugin Validation', () => {
    it('should validate plugin metadata correctly', async () => {
      const installer = new GitHubPluginInstaller();
      const validatePluginCompatibility = (installer as any).validatePluginCompatibility.bind(installer);
      
      // Valid plugin
      const validPlugin = {
        id: 'test-plugin',
        version: '1.0.0',
        type: 'ExportPlugin',
        doaVersion: '^0.1.0'
      };
      
      const validResult = await validatePluginCompatibility(validPlugin);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Invalid plugin type
      const invalidTypePlugin = {
        id: 'test-plugin',
        version: '1.0.0',
        type: 'InvalidType'
      };
      
      const invalidTypeResult = await validatePluginCompatibility(invalidTypePlugin);
      expect(invalidTypeResult.valid).toBe(false);
      expect(invalidTypeResult.errors.some(e => e.includes('Invalid plugin type'))).toBe(true);
    });
  });
});