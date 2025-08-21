#!/usr/bin/env node

/**
 * Corridor Connection Test Suite
 * 
 * This script generates multiple dungeons and analyzes corridor connections
 * using the debug ASCII renderer to identify connection issues.
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

const TEST_CASES = [
  { rooms: 2, locks: 1.0, description: "2 rooms, all doors locked" },
  { rooms: 3, locks: 0.5, description: "3 rooms, half doors locked" },
  { rooms:4, locks: 0.3, description: "4 rooms, some doors locked" },
  { rooms: 2, locks: 0.0, description: "2 rooms, no locks" },
];

function runTest(testCase, testIndex) {
  console.log(`\n=== Test ${testIndex + 1}: ${testCase.description} ===`);
  
  try {
    // Generate dungeon with debug ASCII
    const command = `pnpm doa generate --rooms=${testCase.rooms} --system=dfrpg --lock-percentage=${testCase.locks} --debug-ascii --debug-scale 8`;
    const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    
    // Save output to file
    const filename = `test_${testIndex + 1}_corridor_debug.txt`;
    writeFileSync(filename, output);
    
    // Analyze corridor connections
    const analysis = analyzeCorridorConnections(output);
    
    console.log(`Generated: ${filename}`);
    console.log(`Analysis: ${analysis.summary}`);
    
    if (analysis.issues.length > 0) {
      console.log("Issues found:");
      analysis.issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log("✓ No obvious connection issues detected");
    }
    
    return analysis;
    
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return { summary: "Test failed", issues: [`Error: ${error.message}`] };
  }
}

function analyzeCorridorConnections(output) {
  const lines = output.split('\n');
  const issues = [];
  let corridorPaths = 0;
  let doorConnections = 0;
  let doors = 0;
  let disconnectedCorridors = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count corridor and door markers
    corridorPaths += (line.match(/\+/g) || []).length;
    doorConnections += (line.match(/[◄►]/g) || []).length;
    doors += (line.match(/D/g) || []).length;
    
    // Check for corridor segments that don't have nearby door connections
    if (line.includes('+')) {
      // Find all corridor positions in this line
      for (let pos = 0; pos < line.length; pos++) {
        if (line[pos] === '+') {
          // Check surrounding area for door connections or room boundaries
          let hasNearbyConnection = false;
          
          // Check this line and adjacent lines for door markers or room boundaries
          for (let checkLine = Math.max(0, i - 2); checkLine <= Math.min(lines.length - 1, i + 2); checkLine++) {
            const checkLineContent = lines[checkLine] || '';
            const startPos = Math.max(0, pos - 3);
            const endPos = Math.min(checkLineContent.length, pos + 4);
            const nearbyArea = checkLineContent.substring(startPos, endPos);
            
            if (nearbyArea.includes('◄') || nearbyArea.includes('►') || 
                nearbyArea.includes('#') || nearbyArea.includes('.')) {
              hasNearbyConnection = true;
              break;
            }
          }
          
          if (!hasNearbyConnection) {
            disconnectedCorridors++;
          }
        }
      }
    }
  }
  
  // Analyze corridor to door connection ratio
  if (corridorPaths > 0 && doorConnections === 0) {
    issues.push("No door connection markers found, but corridors exist");
  }
  
  // Check for reasonable door to corridor ratio
  if (doors > 0 && doorConnections < doors * 0.5) {
    issues.push(`Low door connection ratio: ${doorConnections} connections for ${doors} doors`);
  }
  
  // Report disconnected corridor segments
  if (disconnectedCorridors > corridorPaths * 0.3) {
    issues.push(`Many isolated corridor segments: ${disconnectedCorridors} potentially disconnected`);
  }
  
  const summary = `${corridorPaths} corridor path segments, ${doors} doors, ${doorConnections} door connections`;
  
  return { summary, issues };
}

function main() {
  console.log("🔍 Corridor Connection Test Suite");
  console.log("=================================");
  
  const results = [];
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = runTest(TEST_CASES[i], i);
    results.push(result);
  }
  
  // Summary
  console.log("\n📊 Test Summary");
  console.log("===============");
  
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const testsWithIssues = results.filter(r => r.issues.length > 0).length;
  
  console.log(`Total tests: ${TEST_CASES.length}`);
  console.log(`Tests with issues: ${testsWithIssues}`);
  console.log(`Total issues found: ${totalIssues}`);
  
  if (totalIssues > 0) {
    console.log("\n🔧 Next steps:");
    console.log("- Review generated debug files");
    console.log("- Analyze corridor pathfinding algorithm");
    console.log("- Check door placement logic");
  } else {
    console.log("\n✅ All tests passed!");
  }
}

main();