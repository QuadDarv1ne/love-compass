import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    return pkg.version || "0.3.0";
  } catch {
    return "0.3.0";
  }
}

export async function GET() {
  const health: {
    status: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    version: string;
    database?: string;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: getVersion(),
  };

  // Check database connection using the shared singleton
  try {
    await db.user.count();
    health.database = "connected";
  } catch {
    health.database = "disconnected";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
