#!/usr/bin/env node

/**
 * Simple test script to verify the MCP server can start
 * This doesn't test the full MCP protocol, just that the server initializes
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing MCP Server...\n');

const serverPath = join(__dirname, 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('[Server Log]', data.toString());
});

// Give the server 3 seconds to start
setTimeout(() => {
  if (errorOutput.includes('MCP Server running')) {
    console.log('✓ MCP Server started successfully!\n');
    console.log('The server is ready to accept connections.');
    console.log('\nNext steps:');
    console.log('1. Configure Claude Desktop with the MCP server (see SETUP.md)');
    console.log('2. Restart Claude Desktop');
    console.log('3. Start using the Playwright automation tools!\n');
  } else if (errorOutput.includes('Error')) {
    console.log('✗ Server encountered errors:\n');
    console.log(errorOutput);
  } else {
    console.log('Server output:\n');
    console.log(errorOutput || 'No output yet - this might be normal');
  }

  server.kill();
  process.exit(0);
}, 3000);

server.on('error', (err) => {
  console.log('✗ Failed to start server:');
  console.log(err.message);
  process.exit(1);
});
