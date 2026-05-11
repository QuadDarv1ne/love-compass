# Deployment Troubleshooting

## Docker

### Container exits immediately
```bash
# Check logs
docker compose -f deploy/docker-compose.yml logs app

# Common causes:
# - Missing DATABASE_URL
# - Port already in use
# - Build artifacts missing
```

### Database not persisting
```bash
# Check volume exists
docker volume ls | grep db_data

# Inspect volume
docker volume inspect love-compass_db_data
```

### Build fails
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker compose -f deploy/docker-compose.yml build --no-cache
```

## PM2 / VPS

### App won't start
```bash
# Check PM2 logs
pm2 logs love-compass --lines 100

# Check if port is in use
lsof -i :3000

# Restart
pm2 restart love-compass
```

### Out of memory
```bash
# Check memory
free -h

# Reduce PM2 instances in ecosystem.config.js
# Change "instances": "max" to "instances": 2
```

## PostgreSQL

### Connection refused
```bash
# Check if DB is running
docker compose -f deploy/docker-compose.postgres.yml ps

# Check DB logs
docker compose -f deploy/docker-compose.postgres.yml logs db

# Test connection
docker exec -it deploy-db-1 psql -U postgres -d lovecompass
```

### Migrations fail
```bash
# Reset database (WARNING: deletes all data)
docker compose -f deploy/docker-compose.postgres.yml down -v
docker compose -f deploy/docker-compose.postgres.yml up -d

# Run migration script
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lovecompass ./deploy/migrate.sh postgres
```

## Kubernetes

### Pods not starting
```bash
kubectl get pods -l app=love-compass
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### PVC not binding
```bash
kubectl get pvc
kubectl describe pvc love-compass-pvc
# Check storage class exists
kubectl get storageclass
```

## Common Errors

| Error | Solution |
|---|---|
| `EADDRINUSE` | Port 3000 in use — change PORT env var |
| `Cannot find module` | Run `bun install` or rebuild Docker |
| `Prisma Client not generated` | Run `bun prisma generate` |
| `Database file not found` | Create `db/` directory, run `bun prisma db push` |
| `OOMKilled` | Increase memory limit or reduce instances |
