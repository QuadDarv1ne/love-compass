#!/bin/bash
set -e

# Production database seed script
# Usage: ./deploy/seed-prod.sh [--dry-run]

DRY_RUN=${1:-}

echo "=== Production Seed ==="

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "DRY RUN - no changes will be made"
  bun run seed --dry-run
else
  echo "Checking database connection..."
  bun prisma db execute --stdin <<EOF
SELECT 1;
EOF

  echo "Seeding database..."
  bun run seed

  echo "Verifying seed..."
  bun prisma db execute --stdin <<EOF
SELECT count(*) FROM "User";
SELECT count(*) FROM "Profile";
EOF

  echo "=== Seed complete ==="
fi
