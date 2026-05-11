#!/bin/bash
set -e

# Deployment rollback script
# Usage: ./deploy/rollback.sh [docker|swarm|pm2|k8s]

PLATFORM=${1:-docker}
BACKUP_DIR="deploy/backups"

echo "=== Rollback on $PLATFORM ==="

case $PLATFORM in
  docker)
    echo "Rolling back Docker containers..."
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/sqlite_*.db.gz 2>/dev/null | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
      echo "No database backup found!"
      exit 1
    fi
    echo "Restoring database from: $LATEST_BACKUP"
    gunzip -c "$LATEST_BACKUP" > db/custom.db
    docker compose -f deploy/docker-compose.yml down
    docker compose -f deploy/docker-compose.yml up -d
    ;;
  swarm)
    echo "Rolling back Docker Swarm service..."
    docker service update --rollback love-compass_app
    ;;
  pm2)
    echo "Rolling back PM2 deployment..."
    cd /opt/love-compass
    git log --oneline -5
    echo "Enter commit hash to rollback to:"
    read COMMIT
    git reset --hard $COMMIT
    bun install --frozen-lockfile
    bun run build
    pm2 reload all
    ;;
  k8s)
    echo "Rolling back Kubernetes deployment..."
    kubectl rollout undo deployment/love-compass
    kubectl rollout status deployment/love-compass
    ;;
  *)
    echo "Unknown platform: $PLATFORM"
    echo "Usage: $0 [docker|swarm|pm2|k8s]"
    exit 1
    ;;
esac

echo "=== Rollback complete ==="
