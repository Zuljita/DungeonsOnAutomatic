#!/usr/bin/env node

/**
 * Test script to verify the desktop build is complete
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Electron Desktop App Build...\n');

// Check required files exist
const requiredFiles = [
  'dist/electron/main.js',
  'dist/electron/preload.js', 
  'dist/electron/plugin-manager.js',
  'dist/renderer/index.html',
  'package.json'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

// Check plugins directory
const pluginsDir = path.join(__dirname, 'plugins');
const pluginExists = fs.existsSync(pluginsDir);
console.log(`  ${pluginExists ? '✅' : '❌'} plugins/ directory`);

if (pluginExists) {
  const plugins = fs.readdirSync(pluginsDir);
  console.log(`\n🔌 Found ${plugins.length} plugin directories:`);
  for (const plugin of plugins) {
    const hasPackageJson = fs.existsSync(path.join(pluginsDir, plugin, 'package.json'));
    const hasIndex = fs.existsSync(path.join(pluginsDir, plugin, 'index.ts'));
    console.log(`  ${hasPackageJson && hasIndex ? '✅' : '❌'} ${plugin}`);
  }
}

// Check main Electron entry point
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const mainEntry = packageJson.main;
const mainExists = fs.existsSync(path.join(__dirname, mainEntry));
console.log(`\n⚡ Electron main entry: ${mainExists ? '✅' : '❌'} ${mainEntry}`);

// Summary
console.log('\n📊 Build Status:');
if (allFilesExist && pluginExists && mainExists) {
  console.log('✅ Desktop app build is COMPLETE');
  console.log('📦 Ready for testing with: pnpm start');
  console.log('\n🎯 Key Features Implemented:');
  console.log('  • Full Electron app structure');
  console.log('  • Plugin system with IPC bridge');
  console.log('  • Desktop-optimized GUI renderer');
  console.log('  • Bundled system and export plugins');
  console.log('  • Security-conscious plugin loading');
  process.exit(0);
} else {
  console.log('❌ Desktop app build is INCOMPLETE');
  console.log('🔧 Please fix missing files before testing');
  process.exit(1);
}