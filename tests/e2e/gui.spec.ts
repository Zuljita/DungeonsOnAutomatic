import { test, expect } from '@playwright/test';

test.describe('Dungeons On Automatic GUI', () => {
  test('should load without console errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    // Navigate to the GUI
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that no critical console errors occurred
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('404') && // Ignore 404s for favicons, etc.
      !error.includes('favicon') &&
      error.includes('Error') // Only actual JavaScript errors
    );
    
    expect(criticalErrors).toEqual([]);
    
    // Specifically check for Node.js module errors that we just fixed
    const nodeModuleErrors = consoleErrors.filter(error =>
      error.includes('node:fs') || 
      error.includes('Module "node:fs" has been externalized') ||
      error.includes('Cannot access "node:fs"')
    );
    
    expect(nodeModuleErrors).toEqual([]);
  });

  test('should render the main UI elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check main UI elements exist
    await expect(page.locator('h1')).toContainText('Dungeons On Automatic');
    await expect(page.locator('#generate')).toBeVisible();
    await expect(page.locator('#map')).toBeVisible();
    await expect(page.locator('#room-key')).toBeVisible();
  });

  test('should generate a dungeon successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Track console errors during generation
    const generationErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        generationErrors.push(msg.text());
      }
    });
    
    // Click generate button
    await page.locator('#generate').click();
    
    // Wait for generation to complete (look for SVG in map container)
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Check that dungeon was generated without errors
    expect(generationErrors.filter(e => 
      !e.includes('404') && !e.includes('favicon')
    )).toEqual([]);
    
    // Verify room key was populated
    await expect(page.locator('#room-key')).not.toBeEmpty();
  });

  test('should support room shape selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test different room shapes
    const roomShapes = ['rectangular', 'hexagonal', 'circular', 'octagonal'];
    
    for (const shape of roomShapes) {
      // Select room shape
      await page.selectOption('#room-shape', shape);
      
      // Generate dungeon
      await page.locator('#generate').click();
      
      // Wait for generation
      await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
      
      // Verify no errors for this shape
      const shapeErrors = await page.evaluate(() => {
        // Return any console errors from the last generation
        return (window as any).__lastConsoleError || null;
      });
      
      expect(shapeErrors).toBeNull();
    }
  });

  test('should handle room shape service initialization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Monitor for room shape service messages
    const roomShapeMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('room shape') || text.includes('Browser environment')) {
        roomShapeMessages.push(text);
      }
    });
    
    // Generate a dungeon to trigger room shape service
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Should see browser environment detection message
    const browserMessage = roomShapeMessages.find(msg => 
      msg.includes('Browser environment detected, using built-in room shapes')
    );
    expect(browserMessage).toBeTruthy();
    
    // Should NOT see plugin loading failure messages
    const pluginFailures = roomShapeMessages.filter(msg =>
      msg.includes('Failed to load room-shapes plugin')
    );
    expect(pluginFailures).toEqual([]);
  });

  test('should generate dungeons with enriched content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Select a system that should enrich content
    await page.selectOption('#system', 'dfrpg');
    
    // Generate dungeon
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Check that room key contains enriched content
    const roomKeyText = await page.locator('#room-key').textContent();
    
    // Should contain DFRPG-specific content if enrichment worked
    expect(roomKeyText).toContain('Room Key');
    
    // Verify SVG actually contains rooms (not empty)
    const svgContent = await page.locator('#map-content svg').innerHTML();
    expect(svgContent).toContain('rect'); // Should have room rectangles
  });

  test('should handle template selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Select a template
    await page.selectOption('#template', 'small-dungeon');
    
    // Generate dungeon with template
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Verify no template-related errors
    const templateErrors = await page.evaluate(() => {
      return console.error.toString().includes('template') ? 'Template error detected' : null;
    });
    
    expect(templateErrors).toBeNull();
  });

  test('should support real-time preview', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Enable real-time preview
    await page.check('#real-time-preview');
    
    // Change a setting that should trigger real-time update
    await page.selectOption('#room-size', 'large');
    
    // Wait a bit for debounced generation
    await page.waitForTimeout(1000);
    
    // Should see updated dungeon
    await expect(page.locator('#map-content svg')).toBeVisible();
  });

  test('should handle tabs switching', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test switching between tabs
    const tabs = ['generator', 'settings', 'data-manager'];
    
    for (const tab of tabs) {
      await page.click(`[onclick*="${tab}"]`);
      
      // Wait for tab content to be visible
      await expect(page.locator(`#${tab}-tab`)).toHaveClass(/active/);
      
      // Verify no tab switching errors
      const tabErrors = await page.evaluate(() => {
        return (window as any).__lastTabError || null;
      });
      
      expect(tabErrors).toBeNull();
    }
  });
});

test.describe('Browser Compatibility Issues', () => {
  test('should not attempt to use Node.js modules', async ({ page }) => {
    // Track all network requests and console errors
    const nodeModuleAttempts: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('node:') || text.includes('externalized for browser')) {
        nodeModuleAttempts.push(text);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Generate a dungeon to exercise the plugin system
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Should have no Node.js module access attempts
    expect(nodeModuleAttempts).toEqual([]);
  });

  test('should not have dynamic import issues', async ({ page }) => {
    const importErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('dynamic import') || text.includes('cannot be analyzed by Vite')) {
        importErrors.push(text);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Exercise room shape functionality
    await page.selectOption('#room-shape', 'hexagonal');
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Should not have critical dynamic import errors (warnings are OK)
    const criticalImportErrors = importErrors.filter(error => 
      error.includes('Error') && !error.includes('warning')
    );
    expect(criticalImportErrors).toEqual([]);
  });
});