#!/usr/bin/env node

import { spawn } from 'child_process';
import net from 'net';

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false)); // Port is available
    });
    server.on('error', () => resolve(true)); // Port is in use
  });
}

async function startServer() {
  const port = 3002;
  const isPortInUse = await checkPort(port);
  
  if (isPortInUse) {
    console.log(`Port ${port} is already in use`);
    return;
  }

  console.log(`Starting Express server on port ${port}...`);
  
  const server = spawn('tsx', ['server/express-only.ts'], {
    stdio: 'inherit',
    detached: false
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill();
    process.exit(0);
  });
}

startServer();