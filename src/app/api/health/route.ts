import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from '@/lib/logger';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = hits.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const CACHE_TTL_MS = 5_000;
let cachedResult: { health: object; status: number } | null = null;
let cacheTimestamp = 0;

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    return pkg.version || "0.3.0";
  } catch (err) {
    logger.warn('health.getVersion', 'Failed to read package.json', err);
    return "0.3.0";
  }
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const now = Date.now();
  if (cachedResult && now - cacheTimestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedResult.health, { status: cachedResult.status });
  }

  const health: {
    status: string;
    timestamp: string;
    version: string;
    database?: string;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: getVersion(),
  };

  try {
    await db.user.count();
    health.database = "connected";
  } catch (err) {
    logger.error('health.GET', 'Database health check failed', err);
    health.database = "disconnected";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  cachedResult = { health, status: statusCode };
  cacheTimestamp = now;

  return NextResponse.json(health, { status: statusCode });
}
