import net from 'net';
import { PORT } from '@/lib/constants';

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

export async function findFreePort(
  startFrom: number,
  maxAttempts = PORT.MAX_ATTEMPTS
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startFrom + i;
    if (port >= PORT.MAX_PORT) break;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `Could not find a free port after ${maxAttempts} attempts starting from ${startFrom}`
  );
}

export async function getOptimalPort(): Promise<number> {
  const requested = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : PORT.DEFAULT;

  if (isNaN(requested) || requested <= 0 || requested >= PORT.MAX_PORT) {
    const port = await findFreePort(PORT.START);
    return port;
  }

  if (await isPortAvailable(requested)) {
    return requested;
  }

  const port = await findFreePort(requested + 1);
  return port;
}
