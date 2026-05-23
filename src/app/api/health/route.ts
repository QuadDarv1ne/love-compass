import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    version: process.env.npm_package_version || "0.2.0",
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
