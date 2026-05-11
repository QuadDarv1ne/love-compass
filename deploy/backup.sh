#!/bin/bash
set -e

# Automated backup script for production database
# Usage: ./deploy/backup.sh [sqlite|postgres] [backup_dir]

DB_TYPE=${1:-sqlite}
BACKUP_DIR=${2:-deploy/backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "=== Database Backup ==="
echo "Type: $DB_TYPE"
echo "Directory: $BACKUP_DIR"

if [ "$DB_TYPE" = "postgres" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL required for PostgreSQL backup"
    exit 1
  fi

  # Extract connection info from DATABASE_URL
  BACKUP_FILE="$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

  echo "Dumping PostgreSQL database..."
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

else
  DB_PATH="db/custom.db"

  if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database file not found: $DB_PATH"
    exit 1
  fi

  BACKUP_FILE="$BACKUP_DIR/sqlite_$TIMESTAMP.db.gz"

  echo "Backing up SQLite database..."
  # Use sqlite3 for consistent backup (or just copy)
  cp "$DB_PATH" "$BACKUP_DIR/custom_$TIMESTAMP.db"
  gzip "$BACKUP_DIR/custom_$TIMESTAMP.db"
  BACKUP_FILE="$BACKUP_DIR/sqlite_$TIMESTAMP.db.gz"
  mv "$BACKUP_DIR/custom_$TIMESTAMP.db.gz" "$BACKUP_FILE"
fi

echo "Backup created: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Cleanup old backups (keep last 7 days)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "=== Backup complete ==="
