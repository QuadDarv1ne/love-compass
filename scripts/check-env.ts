#!/usr/bin/env bun

/**
 * Auto-detects and validates all available launch parameters for the project.
 * Run with: bun run scripts/check-env.ts
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const envFile = join(rootDir, ".env");
const envExampleFile = join(rootDir, ".env.example");

interface EnvVar {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
  currentValue?: string;
  isSet: boolean;
}

function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function detectEnvVars(): EnvVar[] {
  const exampleContent = existsSync(envExampleFile)
    ? readFileSync(envExampleFile, "utf-8")
    : "";
  const exampleVars = parseEnvFile(exampleContent);

  const currentVars = existsSync(envFile)
    ? parseEnvFile(readFileSync(envFile, "utf-8"))
    : new Map();

  const vars: EnvVar[] = [
    {
      name: "DATABASE_URL",
      description: "Database connection string. Supports: file:./path.db (SQLite), postgresql://user:pass@host/db (PostgreSQL), mongodb://host/db (MongoDB)",
      defaultValue: "file:./db/custom.db",
      required: true,
      currentValue: currentVars.get("DATABASE_URL"),
      isSet: currentVars.has("DATABASE_URL"),
    },
    {
      name: "DB_PROVIDER",
      description: "Database provider for Prisma (sqlite or postgresql). Auto-detected for MongoDB.",
      defaultValue: "sqlite",
      required: false,
      currentValue: currentVars.get("DB_PROVIDER"),
      isSet: currentVars.has("DB_PROVIDER"),
    },
    {
      name: "RESEND_API_KEY",
      description: "API key for Resend email service (https://resend.com)",
      required: false,
      currentValue: currentVars.get("RESEND_API_KEY"),
      isSet: currentVars.has("RESEND_API_KEY"),
    },
    {
      name: "RESEND_FROM_EMAIL",
      description: "Sender email address for Resend",
      defaultValue: "onboarding@resend.dev",
      required: false,
      currentValue: currentVars.get("RESEND_FROM_EMAIL"),
      isSet: currentVars.has("RESEND_FROM_EMAIL"),
    },
    {
      name: "NEXT_PUBLIC_APP_URL",
      description: "Public URL of the application",
      defaultValue: "http://localhost:3000",
      required: false,
      currentValue: currentVars.get("NEXT_PUBLIC_APP_URL"),
      isSet: currentVars.has("NEXT_PUBLIC_APP_URL"),
    },
    {
      name: "NEXT_PUBLIC_DEMO_MODE",
      description: "Enable demo mode (true/false)",
      defaultValue: "true",
      required: false,
      currentValue: currentVars.get("NEXT_PUBLIC_DEMO_MODE"),
      isSet: currentVars.has("NEXT_PUBLIC_DEMO_MODE"),
    },
    {
      name: "JWT_SECRET",
      description: "Secret for JWT token signing (required for 2FA)",
      required: true,
      currentValue: currentVars.get("JWT_SECRET"),
      isSet: currentVars.has("JWT_SECRET") && currentVars.get("JWT_SECRET") !== "",
    },
  ];

  // Add any additional vars from .env.example not listed above
  const knownNames = new Set(vars.map((v) => v.name));
  for (const [key, value] of exampleVars) {
    if (!knownNames.has(key)) {
      vars.push({
        name: key,
        description: "Custom environment variable",
        defaultValue: value || undefined,
        required: false,
        currentValue: currentVars.get(key),
        isSet: currentVars.has(key),
      });
    }
  }

  return vars;
}

function validateEnvVars(vars: EnvVar[]): { ok: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const v of vars) {
    if (v.required && !v.isSet) {
      errors.push(`Missing required variable: ${v.name} - ${v.description}`);
    } else if (v.required && v.currentValue === "") {
      errors.push(`Empty required variable: ${v.name} - ${v.description}`);
    } else if (!v.isSet && v.defaultValue) {
      warnings.push(`Using default for ${v.name}: ${v.defaultValue}`);
    } else if (!v.isSet) {
      warnings.push(`Optional variable not set: ${v.name}`);
    }
  }

  return { ok: errors.length === 0, warnings, errors };
}

function printReport(vars: EnvVar[]) {
  const { ok, warnings, errors } = validateEnvVars(vars);

  console.log("\n🔍 Love Compass - Environment Parameter Detection");
  console.log("═".repeat(60));

  console.log("\n📋 Environment Variables:");
  console.log("─".repeat(60));

  for (const v of vars) {
    const status = v.isSet
      ? v.currentValue === ""
        ? "⚠️  EMPTY"
        : "✅ SET"
      : "❌ MISSING";
    const value = v.isSet
      ? v.name.includes("SECRET") || v.name.includes("KEY")
        ? "(hidden)"
        : v.currentValue
      : v.defaultValue
        ? `(default: ${v.defaultValue})`
        : "(not set)";

    console.log(`\n${status} ${v.name} ${v.required ? "(required)" : "(optional)"}`);
    console.log(`   ${v.description}`);
    console.log(`   Value: ${value}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("📊 Validation Report:");
  console.log("─".repeat(60));

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    for (const e of errors) console.log(`   • ${e}`);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`   • ${w}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("\n✅ All environment variables are properly configured!");
  }

  console.log("\n" + "═".repeat(60));
  console.log("🚀 Available Launch Commands:");
  console.log("─".repeat(60));
  console.log(`
   bun run dev          - Start development server (port 3000)
   bun run build        - Build for production
   bun run start        - Start production server
   bun run db:generate  - Generate Prisma client
   bun run db:push      - Push schema to database
   bun run db:migrate   - Run database migrations
   bun run db:reset     - Reset database
   bun run seed         - Seed database with sample data
   bun run lint         - Run ESLint
  `);

  if (!ok) {
    console.log("⚠️  Fix errors before running in production mode.");
    console.log(`   Copy .env.example to .env and fill in required values.`);
  }

  console.log("═".repeat(60) + "\n");
}

// Run detection
const vars = detectEnvVars();
printReport(vars);

// Export for programmatic use
export { detectEnvVars, validateEnvVars };
