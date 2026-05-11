# Deploy Configurations

Конфигурации для деплоя приложения love-compass на различных платформах.

## Быстрый старт

```bash
# Docker Compose (рекомендуется для локального тестирования)
make up

# С помощью Docker напрямую
make build && make up

# PM2 (для VPS)
make deploy-pm2
```

## Платформы

### Docker & Docker Compose
| Файл | Описание |
|---|---|
| `Dockerfile` | Multi-stage build с HEALTHCHECK |
| `.dockerignore` | Исключения для оптимизации размера образа |
| `docker-compose.yml` | SQLite + volume |
| `docker-compose.prod.yml` | Production: PostgreSQL + Redis + resource limits |
| `docker-compose.postgres.yml` | PostgreSQL + app |
| `docker-compose.traefik.yml` | Traefik reverse proxy + SSL |
| `docker-compose.monitoring.yml` | Prometheus + Grafana |
| `docker-compose.swarm.yml` | Docker Swarm: replicas + zero-downtime updates |

```bash
# SQLite (default)
make up

# Production stack (PostgreSQL + Redis)
make up-prod

# PostgreSQL only
docker compose -f deploy/docker-compose.postgres.yml up -d

# Traefik (with auto SSL)
docker compose -f deploy/docker-compose.traefik.yml up -d

# Monitoring
docker compose -f deploy/docker-compose.monitoring.yml up -d
```

### Docker Swarm
| Файл | Описание |
|---|---|
| `docker-compose.swarm.yml` | Swarm stack с replicas и rolling updates |
| `swarm-deploy.sh` | Скрипт деплоя (build/deploy/scale/update) |
| `swarm-deploy.md` | Документация по Swarm |

```bash
make swarm-deploy              # деплой
make swarm-scale REPLICAS=5    # масштабирование
make swarm-update              # rolling update
```

### Makefile
Универсальный `Makefile` с командами для всех сценариев:

| Команда | Описание |
|---|---|
| `make build` | Сборка Docker образа |
| `make up` | Запуск (SQLite) |
| `make up-prod` | Запуск production (PostgreSQL + Redis) |
| `make down` | Остановка контейнеров |
| `make logs` | Просмотр логов |
| `make logs-follow` | Логи в реальном времени |
| `make restart` | Перезапуск |
| `make clean` | Удаление контейнеров, volumes, образов |
| `make shell` | Shell внутри контейнера |
| `make db-backup` | Быстрый бэкап SQLite БД |
| `make backup` | Автоматический бэкап (с ротацией) |
| `make backup-postgres` | Бэкап PostgreSQL |
| `make db-restore FILE=...` | Восстановление БД |
| `make pre-deploy` | Валидация перед деплоем |
| `make deploy-docker` | Build + push в registry |
| `make deploy-pm2` | Деплой на VPS через PM2 |
| `make swarm-deploy` | Деплой в Docker Swarm |
| `make swarm-scale REPLICAS=N` | Масштабирование Swarm |
| `make swarm-update` | Rolling update в Swarm |
| `make rollback PLATFORM=docker` | Откат деплоя |
| `make seed-prod` | Сид production БД |
| `make ssl-renew` | Обновление SSL сертификатов |
| `make checklist` | Чеклист деплоя |

### VPS / Dedicated Server (PM2 + Nginx)
| Файл | Описание |
|---|---|
| `ecosystem.config.js` | PM2 конфигурация с кластеризацией |
| `nginx.conf` | Reverse proxy с security headers и gzip |

**Деплой на VPS:**
```bash
# 1. Скопировать файлы на сервер
scp -r . user@server:/app/love-compass

# 2. На сервере
cd /app/love-compass
make deploy-pm2

# 3. Настроить Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/love-compass
sudo ln -s /etc/nginx/sites-available/love-compass /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Kubernetes
| Файл | Описание |
|---|---|
| `kubernetes.yml` | Deployment, Service, PVC, Secret, Ingress |

```bash
kubectl apply -f deploy/kubernetes.yml
kubectl get pods -l app=love-compass
```

> Не забудьте заменить `your-domain.com` в Ingress на свой домен.

### Cloud Platforms

#### Vercel + Supabase (рекомендуется)
- **Файлы:** `vercel.json`, `supabase-vercel.md`
- [Supabase](https://supabase.com) — бесплатный PostgreSQL
- [Vercel](https://vercel.com) — серверлесс хостинг Next.js
- См. [supabase-vercel.md](supabase-vercel.md) для настройки

```bash
# 1. Создать проект в Supabase, получить DATABASE_URL
# 2. Push схемы:
DATABASE_URL=postgresql://... bun prisma db push
# 3. Деплой на Vercel (автоматически при push в master)
```

#### Netlify
- **Файлы:** `netlify.toml`, `netlify.md`
- Подключите репозиторий к [Netlify](https://netlify.com)
- Требуется внешний PostgreSQL (Supabase)

#### Railway
- **Файл:** `railway.toml`
- Подключите репозиторий к [Railway](https://railway.app)
- SQLite работает с persistent volumes

#### Render
- **Файл:** `render.yaml`
- Подключите репозиторий к [Render](https://render.com)
- Рекомендуется внешний PostgreSQL для production

#### Yandex Cloud
- **Файл:** `yandex-cloud.sh`
- Container Registry + Serverless Containers / Compute Cloud
```bash
chmod +x deploy/yandex-cloud.sh
# Следуйте инструкциям в файле
```

### CI/CD — GitHub Actions
- **Файл:** `github-actions.yml`
- Поместите в `.github/workflows/`
- Пайплайн: Lint → Build Test → Security Audit → Deploy (SSH)
- Required secrets: `DATABASE_URL`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | Строка подключения к БД | `file:/app/db/custom.db` |
| `NODE_ENV` | Окружение | `production` |
| `PORT` | Порт приложения | `3000` |

См. `.env.example` для шаблона.

## Примечание о базе данных

Приложение использует SQLite через Prisma.

**Платформы где SQLite работает:**
- Docker (с volume)
- VPS / Dedicated Server
- Railway (с persistent volume)

**Платформы где нужен PostgreSQL:**
- Vercel
- Render (free tier)
- Kubernetes (без RWX storage)

Для перехода на PostgreSQL измените `DATABASE_URL`:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
```

## Скрипты

| Файл | Описание |
|---|---|
| `pre-deploy.sh` | Валидация перед деплоем (зависимости, build, БД) |
| `migrate.sh` | Миграция БД (sqlite или postgres) |
| `backup.sh` | Автоматический бэкап с ротацией (7 дней) |
| `rollback.sh` | Откат деплоя (docker/swarm/pm2/k8s) |
| `seed-prod.sh` | Сид production базы данных |
| `ssl-renew.sh` | Проверка/обновление SSL сертификатов |
| `swarm-deploy.sh` | Деплой в Docker Swarm |

```bash
# Pre-deploy check
make pre-deploy

# Migrate to PostgreSQL
DATABASE_URL=postgresql://... ./deploy/migrate.sh postgres

# Backup (auto-cleanup old backups)
make backup
make backup-postgres

# Rollback if something goes wrong
make rollback PLATFORM=docker

# Seed production DB
make seed-prod

# SSL renewal check
make ssl-renew
```

## Environment Files

| Файл | Описание |
|---|---|
| `.env.example` | Базовый шаблон |
| `.env.production` | Production шаблон (Supabase, Sentry, SMTP) |
| `.dockerignore` | Исключения для Docker build |

## Monitoring

```bash
docker compose -f deploy/docker-compose.monitoring.yml up -d
```
- **Prometheus:** `http://localhost:9090`
- **Grafana:** `http://localhost:3001` (admin/admin)

## AWS ECS

| Файл | Описание |
|---|---|
| `aws-ecs-task.json` | ECS Task Definition для Fargate + EFS |

```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker tag love-compass ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/love-compass:latest
docker push ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/love-compass:latest

# Register task definition
aws ecs register-task-definition --cli-input-json file://deploy/aws-ecs-task.json
```

## Guides

- **Platform Selector:** [platform-selector.md](platform-selector.md) — как выбрать платформу
- **Cost Comparison:** [cost-comparison.md](cost-comparison.md) — сравнение цен
- **Security Hardening:** [security-hardening.md](security-hardening.md)
- **Deployment Checklist:** [checklist.md](checklist.md)
- **Docker Swarm:** [swarm-deploy.md](swarm-deploy.md)
- **Supabase + Vercel:** [supabase-vercel.md](supabase-vercel.md)
- **Netlify:** [netlify.md](netlify.md)
- **SSL/TLS Setup:** [ssl-setup.md](ssl-setup.md)
- **Troubleshooting:** [troubleshooting.md](troubleshooting.md)

## Health Check

Приложение имеет встроенный health check endpoint:

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-11T12:00:00.000Z",
  "uptime": 12345,
  "memory": { "rss": 123456789, ... },
  "database": "connected"
}
```

Используется Docker HEALTHCHECK и Kubernetes liveness/readiness probes.
