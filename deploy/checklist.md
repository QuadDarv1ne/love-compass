# Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] All tests pass
- [ ] Lint clean: `bun run lint`
- [ ] TypeScript clean: `bun tsc --noEmit`
- [ ] Build succeeds: `bun run build`
- [ ] No console.log in production code
- [ ] Dependencies updated: `bun update`

### Security
- [ ] No secrets in code (use .env)
- [ ] `.env` in `.gitignore`
- [ ] JWT_SECRET generated (32+ chars)
- [ ] CORS configured correctly
- [ ] Rate limiting on sensitive endpoints
- [ ] HTTPS enforced

### Database
- [ ] Schema migrated: `bun prisma db push`
- [ ] Seed data ready (if needed)
- [ ] Backup created before migration
- [ ] Connection string points to production DB

### Environment
- [ ] All required env vars set
- [ ] DATABASE_URL correct
- [ ] NODE_ENV=production
- [ ] Domain configured (if applicable)

## Deployment

### Docker
- [ ] Image built: `docker build -f deploy/Dockerfile -t love-compass .`
- [ ] Compose up: `docker compose -f deploy/docker-compose.yml up -d`
- [ ] Health check passes: `curl http://localhost:3000/api/health`
- [ ] Logs clean: `docker compose logs --tail=50`

### VPS (PM2)
- [ ] Code pulled: `git pull origin master`
- [ ] Dependencies installed: `bun install --frozen-lockfile`
- [ ] Build complete: `bun run build`
- [ ] PM2 started: `pm2 restart all`
- [ ] Nginx config tested: `nginx -t && systemctl reload nginx`

### Cloud (Vercel/Railway/Render)
- [ ] Repo connected
- [ ] Env vars configured in platform dashboard
- [ ] Build command correct
- [ ] Deploy triggered
- [ ] Deploy logs clean

### Kubernetes
- [ ] Context correct: `kubectl config current-context`
- [ ] Secrets created: `kubectl create secret generic ...`
- [ ] Applied manifests: `kubectl apply -f deploy/kubernetes.yml`
- [ ] Pods running: `kubectl get pods`
- [ ] Ingress working

## Post-Deployment

### Verification
- [ ] Homepage loads
- [ ] API health: `/api/health` returns 200
- [ ] Database connected (check health response)
- [ ] User registration works
- [ ] Profile creation works
- [ ] Matching/likes work
- [ ] SSL certificate valid

### Monitoring
- [ ] Logs being collected
- [ ] Error tracking configured (Sentry)
- [ ] Alerts set up for downtime
- [ ] Dashboard accessible (Grafana)

### Backup
- [ ] Database backup scheduled (cron)
- [ ] Backup tested (restore from backup)
- [ ] Old backups cleanup configured

### Documentation
- [ ] README updated with current deployment info
- [ ] Team notified of deployment
- [ ] Rollback plan documented

## Rollback Plan

If something goes wrong:

```bash
# Docker
docker compose -f deploy/docker-compose.yml down
docker compose -f deploy/docker-compose.yml up -d

# PM2
pm2 rollback

# Kubernetes
kubectl rollout undo deployment/love-compass

# Script
./deploy/rollback.sh [docker|pm2|k8s]
```
