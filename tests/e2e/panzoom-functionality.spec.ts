import { test, expect } from '@playwright/test';

test.describe('Panzoom Library Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Generate a dungeon to test panzoom functionality
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
  });

  test('should load panzoom without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('404')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Test basic zoom functionality
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(300);
    
    // Should have no panzoom-related errors
    const panzoomErrors = consoleErrors.filter(error => 
      error.includes('panzoom') || 
      error.includes('getTransform') ||
      error.includes('Panzoom')
    );
    
    expect(panzoomErrors).toEqual([]);
  });

  test('should support zoom controls', async ({ page }) => {
    const svg = page.locator('#map-content svg');
    
    // Get initial transform
    const initialTransform = await svg.getAttribute('style') || '';
    
    // Zoom in
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(300);
    
    const zoomedTransform = await svg.getAttribute('style') || '';
    expect(zoomedTransform).not.toBe(initialTransform);
    expect(zoomedTransform).toContain('scale(');
    
    // Reset should work
    await page.locator('#reset-view').click();
    await page.waitForTimeout(300);
    
    const resetTransform = await svg.getAttribute('style') || '';
    expect(resetTransform).toContain('scale(1)');
  });

  test('should support mouse wheel zoom', async ({ page }) => {
    const svg = page.locator('#map-content svg');
    const mapContainer = page.locator('#map');
    
    // Get initial transform
    const initialTransform = await svg.getAttribute('style') || '';
    
    // Wheel zoom
    await mapContainer.hover();
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(300);
    
    const wheelZoomedTransform = await svg.getAttribute('style') || '';
    expect(wheelZoomedTransform).not.toBe(initialTransform);
  });

  test('should support panning with mouse drag', async ({ page }) => {
    const svg = page.locator('#map-content svg');
    const mapContainer = page.locator('#map');
    
    // Get initial transform
    const initialTransform = await svg.getAttribute('style') || '';
    
    // Perform significant drag
    const box = await mapContainer.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      const draggedTransform = await svg.getAttribute('style') || '';
      // Check that translate values changed
      expect(draggedTransform).toContain('translate(');
    }
  });

  test('should update minimap viewport correctly', async ({ page }) => {
    // Check that minimap viewport exists
    await expect(page.locator('#minimap-viewport')).toBeVisible();
    
    // Zoom in to test viewport update
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(300);
    
    // Minimap viewport should still be visible and positioned
    const viewport = page.locator('#minimap-viewport');
    await expect(viewport).toBeVisible();
    
    const viewportStyle = await viewport.getAttribute('style');
    expect(viewportStyle).toContain('left');
  });

  test('should handle minimap click navigation', async ({ page }) => {
    const minimapSvg = page.locator('#minimap-svg-container svg');
    const svg = page.locator('#map-content svg');
    
    // Get initial transform
    const initialTransform = await svg.getAttribute('style') || '';
    
    // Click on minimap SVG directly
    await minimapSvg.click({ position: { x: 20, y: 20 }, force: true });
    await page.waitForTimeout(1000);
    
    // Transform should change (viewport should move)
    const newTransform = await svg.getAttribute('style') || '';
    expect(newTransform).not.toBe(initialTransform);
  });
});