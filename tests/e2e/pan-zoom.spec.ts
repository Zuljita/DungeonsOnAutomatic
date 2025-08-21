import { test, expect } from '@playwright/test';

test.describe('Map Pan and Zoom Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial generation to complete
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
  });

  test('should have zoom control buttons visible', async ({ page }) => {
    await expect(page.locator('#zoom-in')).toBeVisible();
    await expect(page.locator('#zoom-out')).toBeVisible();
    await expect(page.locator('#reset-view')).toBeVisible();
    
    // Check button attributes
    await expect(page.locator('#zoom-in')).toHaveAttribute('title', 'Zoom In');
    await expect(page.locator('#zoom-out')).toHaveAttribute('title', 'Zoom Out');
    await expect(page.locator('#reset-view')).toHaveAttribute('title', 'Reset View');
  });

  test('should allow zooming in and out', async ({ page }) => {
    const svg = page.locator('#map-content svg');
    await expect(svg).toBeVisible();

    // Get initial transform
    const initialTransform = await svg.getAttribute('style') || '';
    
    // Zoom in
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(300); // Allow transition
    
    const zoomedInTransform = await svg.getAttribute('style') || '';
    expect(zoomedInTransform).not.toBe(initialTransform);
    expect(zoomedInTransform).toContain('scale(');
    
    // Zoom out
    await page.locator('#zoom-out').click();
    await page.waitForTimeout(300);
    
    const zoomedOutTransform = await svg.getAttribute('style') || '';
    expect(zoomedOutTransform).not.toBe(zoomedInTransform);
  });

  test('should reset view when reset button is clicked', async ({ page }) => {
    const svg = page.locator('#map-content svg');
    const mapContainer = page.locator('#map');
    
    // Zoom in first
    await page.locator('#zoom-in').click();
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(300);
    
    // Reset view
    await page.locator('#reset-view').click();
    await page.waitForTimeout(300);
    
    const finalTransform = await svg.getAttribute('style') || '';
    expect(finalTransform).toContain('scale(1)');
  });

  test('should support mouse wheel zooming', async ({ page }) => {
    const svg = page.locator('#map-content svg');
    const mapContainer = page.locator('#map');
    
    await expect(svg).toBeVisible();
    
    // Get initial transform
    const initialTransform = await svg.getAttribute('style') || '';
    
    // Simulate mouse wheel zoom in (negative deltaY)
    await mapContainer.hover();
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(300);
    
    const zoomedTransform = await svg.getAttribute('style') || '';
    expect(zoomedTransform).not.toBe(initialTransform);
    expect(zoomedTransform).toContain('scale(');
  });

  test('should show grab cursor on map container', async ({ page }) => {
    const mapContainer = page.locator('#map');
    await expect(mapContainer).toHaveCSS('cursor', /grab/);
  });

  test('should support panning with mouse drag', async ({ page }) => {
    const mapContainer = page.locator('#map');
    
    // Get initial scroll position
    const initialScrollLeft = await mapContainer.evaluate(el => el.scrollLeft);
    const initialScrollTop = await mapContainer.evaluate(el => el.scrollTop);
    
    // Perform drag operation
    const box = await mapContainer.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
      await page.mouse.up();
      await page.waitForTimeout(300);
      
      // Check if scroll position changed
      const finalScrollLeft = await mapContainer.evaluate(el => el.scrollLeft);
      const finalScrollTop = await mapContainer.evaluate(el => el.scrollTop);
      
      // Should have some movement (allowing for small differences)
      const movedHorizontally = Math.abs(finalScrollLeft - initialScrollLeft) > 5;
      const movedVertically = Math.abs(finalScrollTop - initialScrollTop) > 5;
      
      expect(movedHorizontally || movedVertically).toBe(true);
    }
  });

  test('should maintain interactive elements functionality', async ({ page }) => {
    // Generate a dungeon with system content to get clickable elements
    await page.selectOption('#system', 'dfrpg');
    await page.locator('#generate').click();
    await expect(page.locator('#map svg')).toBeVisible({ timeout: 10000 });
    
    // Check that room numbers are still clickable
    const roomElements = page.locator('#map-content svg text[data-room]');
    const roomCount = await roomElements.count();
    
    if (roomCount > 0) {
      // Click first room number and verify it doesn't interfere with pan functionality
      await roomElements.first().click();
      // Should scroll to room details without error
      await expect(page.locator('#room-key')).toBeVisible();
    }
  });

  test('should work with different map styles', async ({ page }) => {
    // Test with hex grid style
    await page.selectOption('#map-style', 'hex');
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Zoom controls should still work
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(300);
    
    const svg = page.locator('#map-content svg');
    const transform = await svg.getAttribute('style') || '';
    expect(transform).toContain('scale(');
    
    // Test with hand-drawn style
    await page.selectOption('#map-style', 'hand-drawn');
    await page.locator('#generate').click();
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 10000 });
    
    // Reset should work
    await page.locator('#reset-view').click();
    await page.waitForTimeout(300);
    
    const resetTransform = await svg.getAttribute('style') || '';
    expect(resetTransform).toContain('scale(1)');
  });

  test('should handle large dungeons performance', async ({ page }) => {
    // Generate a large dungeon
    await page.fill('#rooms', '20');
    await page.fill('#width', '80');
    await page.fill('#height', '80');
    await page.locator('#generate').click();
    
    // Wait for generation to complete
    await expect(page.locator('#map-content svg')).toBeVisible({ timeout: 15000 });
    
    // Test that zoom operations are still responsive
    const startTime = Date.now();
    await page.locator('#zoom-in').click();
    await page.waitForTimeout(100);
    const endTime = Date.now();
    
    // Should respond quickly (less than 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
    
    // Test panning performance
    const mapContainer = page.locator('#map');
    const box = await mapContainer.boundingBox();
    
    if (box) {
      const panStartTime = Date.now();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
      await page.mouse.up();
      const panEndTime = Date.now();
      
      // Pan operation should be responsive
      expect(panEndTime - panStartTime).toBeLessThan(1000);
    }
  });
});