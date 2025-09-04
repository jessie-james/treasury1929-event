#!/usr/bin/env node

/**
 * Custom build script for deployment that properly excludes Vite dependencies
 * and cleans up files before building
 */

import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { existsSync } from 'fs';

console.log('🧹 Cleaning dist directory...');
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
  console.log('✅ dist directory cleaned');
}

console.log('🏗️  Building client with Vite...');
try {
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ Client build completed');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

console.log('📦 Building server with esbuild...');
try {
  const esbuildCommand = [
    'esbuild server/index.ts',
    '--platform=node',
    '--packages=external',
    '--bundle',
    '--format=esm',
    '--outdir=dist',
    '--external:vite',
    '--external:@vitejs/plugin-react',
    '--external:@replit/vite-plugin-cartographer',
    '--external:@replit/vite-plugin-runtime-error-modal',
    '--external:@replit/vite-plugin-shadcn-theme-json'
  ].join(' ');
  
  execSync(esbuildCommand, { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

console.log('🚀 Build completed successfully! Ready for deployment.');