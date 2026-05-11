#!/bin/bash
set -e

# Production database migration script
# Usage: ./deploy/migrate.sh [sqlite|postgres]

DB_TYPE=${1:-sqlite}

echo "=== Database Migration ==="
echo "Database type: $DB_TYPE"

if [ "$DB_TYPE" = "postgres" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is required for PostgreSQL"
    echo "Usage: DATABASE_URL=postgresql://... ./deploy/migrate.sh postgres"
    exit 1
  fi
  echo "Using DATABASE_URL from environment"
else
  echo "Using SQLite: file:./db/custom.db"
  mkdir -p db
fi

# Push schema changes
echo "Pushing database schema..."
bun prisma db push --accept-data-loss

# Generate client
echo "Generating Prisma client..."
bun prisma generate

# Validate
echo "Validating database connection..."
bun prisma validate

echo "=== Migration complete ==="
