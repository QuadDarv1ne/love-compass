#!/bin/bash
set -e

echo "=== Pre-deploy Validation ==="

# Check required files
echo "Checking required files..."
REQUIRED_FILES=("package.json" "next.config.ts" "prisma/schema.prisma")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Missing required file: $file"
    exit 1
  fi
  echo "  [OK] $file"
done

# Check Node.js/Bun
echo "Checking runtime..."
if command -v bun &> /dev/null; then
  echo "  [OK] Bun $(bun --version)"
elif command -v node &> /dev/null; then
  echo "  [OK] Node.js $(node --version)"
else
  echo "ERROR: Neither Bun nor Node.js found"
  exit 1
fi

# Check dependencies
echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  bun install --frozen-lockfile
fi

# Prisma generate
echo "Checking Prisma client..."
if [ ! -d "node_modules/.prisma" ]; then
  echo "Generating Prisma client..."
  bun prisma generate
fi

# Build check
echo "Running build..."
if ! bun run build; then
  echo "ERROR: Build failed!"
  exit 1
fi
echo "  [OK] Build successful"

# Environment check
echo "Checking environment..."
if [ ! -f ".env" ]; then
  echo "WARNING: No .env file found. Copying from .env.example"
  cp deploy/.env.example .env
fi

# Database check
echo "Checking database..."
if [ ! -f "db/custom.db" ]; then
  echo "WARNING: Database file not found. Running migrations..."
  mkdir -p db
  bun prisma db push
  echo "Running seed..."
  bun run seed
fi

echo ""
echo "=== All checks passed! Ready to deploy. ==="
