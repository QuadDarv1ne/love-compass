#!/usr/bin/env bun

/**
 * Dev server wrapper with automatic port detection.
 * Finds a free port and starts next dev on it.
 *
 * Usage: bun run scripts/dev-wrapper.ts
 */

import { spawn } from 'child_process';
import { findFreePort } from '@/lib/db/port-detector';

async function main() {
  const requestedPort = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  const port = isNaN(requestedPort) || requestedPort <= 0 || requestedPort >= 65536
    ? await findFreePort(3000)
    : await findFreePort(requestedPort);

  if (port !== requestedPort) {
    console.log(`\n⚠️  Port ${requestedPort} is occupied. Using port ${port} instead.\n`);
  } else {
    console.log(`\n🚀 Starting dev server on port ${port}...\n`);
  }

  process.env.PORT = String(port);

  const child = spawn('npx', ['next', 'dev', '--port', String(port)], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('error', (err) => {
    console.error('Failed to start dev server:', err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  const shutdown = () => {
    child.kill('SIGTERM');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(`\n❌ Failed to start dev server: ${e}`);
  process.exit(1);
});
