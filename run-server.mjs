#!/usr/bin/env node

// Simple server runner that works with the ES module environment
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🚀 Starting event venue booking platform...');

// Set up environment for ts-node
const env = {
  ...process.env,
  TS_NODE_TRANSPILE_ONLY: 'true',
  TS_NODE_SKIP_PROJECT: 'true',
  TS_NODE_COMPILER_OPTIONS: JSON.stringify({
    module: 'CommonJS',
    target: 'ES2020',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    strict: false
  })
};

// Start the server using ts-node with proper configuration
const child = spawn('node', [
  'node_modules/ts-node/dist/bin.js',
  '--transpile-only',
  '--skip-project',
  'server/index.ts'
], {
  stdio: 'inherit',
  env
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});