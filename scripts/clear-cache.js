#!/usr/bin/env node

/**
 * Clear Playwright Cache Script
 *
 * This script clears various caches to ensure clean test runs:
 * - Test results directory
 * - Playwright cache
 * - Authentication state (optional)
 * - Node modules cache (optional)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const clearAuth = args.includes('--auth');
const clearAll = args.includes('--all');

console.log('\n🧹 Clearing Playwright caches...\n');

// Function to recursively delete a directory
function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
    console.log(`✓ Cleared: ${path.relative(projectRoot, directoryPath)}`);
    return true;
  }
  return false;
}

// Directories to clear
const cacheDirs = [
  path.join(projectRoot, 'test-results'),
  path.join(projectRoot, 'playwright-report'),
  path.join(projectRoot, '.cache'),
];

// Optional: Clear authentication state
if (clearAuth || clearAll) {
  cacheDirs.push(path.join(projectRoot, 'tests/.auth'));
  console.log('⚠️  Authentication state will be cleared - re-authentication required\n');
}

// Clear each directory
let clearedCount = 0;
for (const dir of cacheDirs) {
  if (deleteFolderRecursive(dir)) {
    clearedCount++;
  }
}

// Clear specific cache files
const cacheFiles = [
  path.join(projectRoot, '.eslintcache'),
];

for (const file of cacheFiles) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`✓ Cleared: ${path.relative(projectRoot, file)}`);
    clearedCount++;
  }
}

// Recreate necessary directories
const necessaryDirs = [
  path.join(projectRoot, 'test-results'),
  path.join(projectRoot, 'tests/.auth'),
];

console.log('\n📁 Recreating necessary directories...\n');
for (const dir of necessaryDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created: ${path.relative(projectRoot, dir)}`);
  }
}

console.log(`\n✅ Cache clearing complete! (${clearedCount} items cleared)\n`);

if (clearAuth || clearAll) {
  console.log('ℹ️  Run tests to re-authenticate automatically.\n');
} else {
  console.log('ℹ️  To also clear authentication state, use: npm run clear-cache -- --auth\n');
}
