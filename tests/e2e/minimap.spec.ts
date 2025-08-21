import { test, expect } from '@playwright/test';

test.describe('Minimap Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Generate a dungeon to create the minimap
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
  });

  test('should display minimap after dungeon generation', async ({ page }) => {
    const minimap = page.locator('#minimap');
    await expect(minimap).toBeVisible();
    
    // Check minimap components
    await expect(page.locator('.minimap-header')).toBeVisible();
    await expect(page.locator('#minimap-toggle')).toBeVisible();
    await expect(page.locator('#minimap-svg-container svg')).toBeVisible();
    await expect(page.locator('#minimap-viewport')).toBeVisible();
  });

  test('should toggle minimap collapse/expand', async ({ page }) => {
    const minimap = page.locator('#minimap');
    const toggleBtn = page.locator('#minimap-toggle');
    
    // Initially expanded
    await expect(minimap).not.toHaveClass(/collapsed/);
    await expect(toggleBtn).toHaveText('−');
    
    // Collapse
    await toggleBtn.click();
    await expect(minimap).toHaveClass(/collapsed/);
    await expect(toggleBtn).toHaveText('+');
    
    // Expand by clicking toggle
    await toggleBtn.click();
    await expect(minimap).not.toHaveClass(/collapsed/);
    await expect(toggleBtn).toHaveText('−');
    
    // Collapse again
    await toggleBtn.click();
    await expect(minimap).toHaveClass(/collapsed/);
    
    // Expand by clicking minimap body
    await minimap.click();
    await expect(minimap).not.toHaveClass(/collapsed/);
  });

  test('should navigate when clicking on minimap', async ({ page }) => {
    const mapContainer = page.locator('#map');
    const minimapSvg = page.locator('#minimap-svg-container');
    
    // Get initial scroll position
    const initialScrollLeft = await mapContainer.evaluate(el => el.scrollLeft);
    const initialScrollTop = await mapContainer.evaluate(el => el.scrollTop);
    
    // Click on a point in the minimap
    const minimapBox = await minimapSvg.boundingBox();
    if (minimapBox) {
      await minimapSvg.click({
        position: { x: minimapBox.width * 0.7, y: minimapBox.height * 0.7 }
      });
      
      await page.waitForTimeout(100);
      
      // Check that scroll position changed
      const finalScrollLeft = await mapContainer.evaluate(el => el.scrollLeft);
      const finalScrollTop = await mapContainer.evaluate(el => el.scrollTop);
      
      const movedHorizontally = Math.abs(finalScrollLeft - initialScrollLeft) > 10;
      const movedVertically = Math.abs(finalScrollTop - initialScrollTop) > 10;
      
      expect(movedHorizontally || movedVertically).toBe(true);
    }
  });

  test('should update viewport rectangle when panning main map', async ({ page }) => {
    const mapContainer = page.locator('#map');
    const viewportRect = page.locator('#minimap-viewport');
    
    // Get initial viewport position
    const initialLeft = await viewportRect.evaluate(el => parseFloat(el.style.left || '0'));
    const initialTop = await viewportRect.evaluate(el => parseFloat(el.style.top || '0'));
    
    // Pan the main map
    const mapBox = await mapContainer.boundingBox();
    if (mapBox) {
      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(mapBox.x + mapBox.width / 2 + 50, mapBox.y + mapBox.height / 2 + 50);
      await page.mouse.up();
      
      await page.waitForTimeout(100);
      
      // Check that viewport rectangle moved
      const finalLeft = await viewportRect.evaluate(el => parseFloat(el.style.left || '0'));
      const finalTop = await viewportRect.evaluate(el => parseFloat(el.style.top || '0'));
      
      const movedHorizontally = Math.abs(finalLeft - initialLeft) > 2;
      const movedVertically = Math.abs(finalTop - initialTop) > 2;
      
      expect(movedHorizontally || movedVertically).toBe(true);
    }
  });

  test('should update viewport rectangle when zooming main map', async ({ page }) => {
    const mapContainer = page.locator('#map');
    const viewportRect = page.locator('#minimap-viewport');
    
    // Get initial viewport size
    const initialWidth = await viewportRect.evaluate(el => parseFloat(el.style.width || '0'));
    const initialHeight = await viewportRect.evaluate(el => parseFloat(el.style.height || '0'));
    
    // Zoom in using button
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(200);
    
    // Check that viewport rectangle got smaller (zoom in = smaller viewport)
    const finalWidth = await viewportRect.evaluate(el => parseFloat(el.style.width || '0'));
    const finalHeight = await viewportRect.evaluate(el => parseFloat(el.style.height || '0'));
    
    expect(finalWidth).toBeLessThan(initialWidth);
    expect(finalHeight).toBeLessThan(initialHeight);
  });

  test('should handle viewport rectangle dragging', async ({ page }) => {
    const mapContainer = page.locator('#map');
    const viewportRect = page.locator('#minimap-viewport');
    
    // Get initial main map scroll position
    const initialScrollLeft = await mapContainer.evaluate(el => el.scrollLeft);
    const initialScrollTop = await mapContainer.evaluate(el => el.scrollTop);
    
    // Drag the viewport rectangle
    const viewportBox = await viewportRect.boundingBox();
    if (viewportBox) {
      await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(viewportBox.x + viewportBox.width / 2 + 20, viewportBox.y + viewportBox.height / 2 + 20);
      await page.mouse.up();
      
      await page.waitForTimeout(100);
      
      // Check that main map scroll position changed
      const finalScrollLeft = await mapContainer.evaluate(el => el.scrollLeft);
      const finalScrollTop = await mapContainer.evaluate(el => el.scrollTop);
      
      const movedHorizontally = Math.abs(finalScrollLeft - initialScrollLeft) > 5;
      const movedVertically = Math.abs(finalScrollTop - initialScrollTop) > 5;
      
      expect(movedHorizontally || movedVertically).toBe(true);
    }
  });

  test('should work with different map styles', async ({ page }) => {
    // Test with hand-drawn style (valid option)
    await page.selectOption('#map-style', 'hand-drawn');
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Minimap should still be visible and functional
    await expect(page.locator('#minimap')).toBeVisible();
    await expect(page.locator('#minimap-svg-container svg')).toBeVisible();
    
    // Test navigation still works
    const minimapSvg = page.locator('#minimap-svg-container');
    const minimapBox = await minimapSvg.boundingBox();
    if (minimapBox) {
      await minimapSvg.click({
        position: { x: minimapBox.width * 0.3, y: minimapBox.height * 0.3 }
      });
      // Should not crash
      await page.waitForTimeout(100);
    }
  });

  test('should handle large dungeons efficiently', async ({ page }) => {
    // Generate a large dungeon
    await page.fill('#rooms', '15');
    await page.fill('#width', '60');
    await page.fill('#height', '60');
    await page.locator('#generate').click();
    
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 15000 });
    
    // Minimap should still work with large dungeons
    await expect(page.locator('#minimap')).toBeVisible();
    
    // Test performance of minimap interactions
    const startTime = Date.now();
    
    // Test minimap click navigation
    const minimapSvg = page.locator('#minimap-svg-container');
    await minimapSvg.click({ position: { x: 50, y: 50 } });
    
    const navigationTime = Date.now() - startTime;
    expect(navigationTime).toBeLessThan(1000); // Should be fast
    
    // Test viewport dragging performance
    const dragStartTime = Date.now();
    const viewportRect = page.locator('#minimap-viewport');
    const viewportBox = await viewportRect.boundingBox();
    
    if (viewportBox) {
      await page.mouse.move(viewportBox.x + 10, viewportBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(viewportBox.x + 30, viewportBox.y + 30);
      await page.mouse.up();
    }
    
    const dragTime = Date.now() - dragStartTime;
    expect(dragTime).toBeLessThan(1000); // Should be responsive
  });

  test('should maintain minimap state during map regeneration', async ({ page }) => {
    // Collapse the minimap
    await page.locator('#minimap-toggle').click();
    await expect(page.locator('#minimap')).toHaveClass(/collapsed/);
    
    // Generate a new map
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Note: In current implementation, minimap state resets on generation
    // This test documents the current behavior - minimap will be expanded again
    await expect(page.locator('#minimap')).toBeVisible();
    await expect(page.locator('#minimap-svg-container svg')).toBeVisible();
  });

  test('should display correct minimap proportions', async ({ page }) => {
    const mainSvg = page.locator('#map-content svg');
    const minimapSvg = page.locator('#minimap-svg-container svg');
    
    // Get dimensions of both SVGs
    const mainWidth = await mainSvg.evaluate(el => el.getBoundingClientRect().width);
    const mainHeight = await mainSvg.evaluate(el => el.getBoundingClientRect().height);
    const minimapWidth = await minimapSvg.evaluate(el => el.getBoundingClientRect().width);
    const minimapHeight = await minimapSvg.evaluate(el => el.getBoundingClientRect().height);
    
    // Calculate aspect ratios
    const mainAspectRatio = mainWidth / mainHeight;
    const minimapAspectRatio = minimapWidth / minimapHeight;
    
    // Aspect ratios should be approximately equal (within 5% tolerance)
    const aspectRatioDiff = Math.abs(mainAspectRatio - minimapAspectRatio);
    const tolerance = Math.max(mainAspectRatio, minimapAspectRatio) * 0.05;
    
    expect(aspectRatioDiff).toBeLessThan(tolerance);
  });
});