import { test, expect } from '@playwright/test';

/**
 * Quick smoke test to catch major browser compatibility issues
 * This would have caught the Node.js module issues we just fixed
 */
test('GUI Smoke Test - No Critical Errors', async ({ page }) => {
  const criticalErrors: string[] = [];
  
  // Capture all console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      
      // Filter for critical errors (not 404s, favicon issues, etc.)
      if (text.includes('node:fs') || 
          text.includes('externalized for browser') ||
          text.includes('Cannot access') ||
          text.includes('Module "node:') ||
          (text.includes('Error') && !text.includes('404') && !text.includes('favicon'))) {
        criticalErrors.push(text);
      }
    }
  });
  
  // Load the page
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Try to generate a dungeon (this would trigger the plugin system)
  await page.locator('#generate').click();
  
  // Wait for generation to complete or timeout
  try {
    await expect(page.locator('#map svg')).toBeVisible({ timeout: 10000 });
  } catch (error) {
    // If generation failed, that's also a critical error
    criticalErrors.push(`Dungeon generation failed: ${error}`);
  }
  
  // Report any critical errors found
  if (criticalErrors.length > 0) {
    console.log('Critical browser errors detected:');
    criticalErrors.forEach(error => console.log(`  - ${error}`));
  }
  
  expect(criticalErrors).toEqual([]);
});

test('Room Shape Service Browser Compatibility', async ({ page }) => {
  const roomShapeIssues: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('room shape') || text.includes('plugin') || text.includes('fallback')) {
      roomShapeIssues.push(text);
    }
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Try different room shapes
  await page.selectOption('#room-shape', 'hexagonal');
  await page.locator('#generate').click();
  
  await expect(page.locator('#map svg')).toBeVisible({ timeout: 10000 });
  
  // Should see browser environment message, not plugin failures
  const hasValidBrowserMessage = roomShapeIssues.some(msg => 
    msg.includes('Browser environment detected, using built-in room shapes')
  );
  
  const hasPluginFailures = roomShapeIssues.some(msg =>
    msg.includes('Failed to load room-shapes plugin') && msg.includes('Error')
  );
  
  expect(hasValidBrowserMessage).toBe(true);
  expect(hasPluginFailures).toBe(false);
});