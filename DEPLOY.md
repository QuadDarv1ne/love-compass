# Deployment Guide — Love Compass

Полный гайд по деплою приложения на различные платформы. Выберите вариант который подходит вам.

---

## Быстрый выбор платформы

| Сценарий | Платформа | Цена | Время настройки |
|---|---|---|---|
| **Демо / MVP** | Vercel + Supabase | $0 | 5 минут |
| **Dating app launch** | Railway | $0 (free tier) | 3 минуты |
| **Production без ops** | Render | $25/мес | 10 минут |
| **Полный контроль** | VPS + Docker | $5/мес (Hetzner) | 30 минут |
| **Высокий трафик** | Docker Swarm / K8s | $50+/мес | 1-2 часа |

### Критерии выбора

**База данных:**
- **SQLite** — работает на VPS, Docker, Railway (с persistent volume)
- **PostgreSQL** — нужен для Vercel, Netlify, Render, Kubernetes

**Трафик:**
- **< 100 пользователей** — бесплатный tier любой платформы
- **100-10K** — Railway (~$15/мес) или VPS ($5/мес)
- **10K-100K** — Render ($25/мес) или VPS ($7/мес)
- **100K+** — Docker Swarm / Kubernetes / AWS ECS

---

## 1. Vercel + Supabase (рекомендуется для MVP)

**Плюсы:** бесплатно, авто-SSL, CI/CD из Git, нативная поддержка Next.js
**Минусы:** serverless функции имеют таймаут 10с (free) / 60с (pro), нет SQLite

### Шаг 1: Создайте базу данных в Supabase

1. Зайдите на [supabase.com](https://supabase.com) → New Project
2. Дождитесь создания проекта
3. Settings → Database → Connection string → выберите **URI**
4. Скопируйте строку вида:
   ```
   postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

> Для production используйте connection pooling (port 6543):
> ```
> DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
> DIRECT_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
> ```

### Шаг 2: Инициализируйте базу данных

```bash
# Установите переменную окружения
export DATABASE_URL="postgresql://..."

# Push схемы
bun prisma db push

# (опционально) Сид данных
bun prisma db seed
```

### Шаг 3: Деплой на Vercel

**Вариант A — через CLI:**
```bash
bun i -g vercel-cli
vercel login
vercel --env DATABASE_URL="postgresql://..." --env NODE_ENV=production
```

**Вариант B — через веб-интерфейс:**
1. Зайдите на [vercel.com](https://vercel.com) → New Project
2. Подключите GitHub репозиторий
3. Добавьте Environment Variables:
   - `DATABASE_URL` — строка подключения Supabase
   - `NODE_ENV` = `production`
   - `JWT_SECRET` — сгенерируйте: `openssl rand -base64 32`
4. Нажмите Deploy

**Вариант C — автоматически при push:**
```bash
# Подключите репозиторий к Vercel один раз
vercel link
# Далее каждый push в main автоматически деплоит
```

### Шаг 4: Проверьте

Откройте `https://your-project.vercel.app/api/health` — должен вернуться `{"status":"ok"}`.

---

## 2. Railway (с SQLite)

**Плюсы:** поддерживает SQLite с persistent volume, простой UI, free tier 500 часов/мес
**Минусы:** часы тратятся даже когда сервис не активен

### Шаг 1: Подключите репозиторий

1. Зайдите на [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Выберите репозиторий `love-compass`

### Шаг 2: Настройте переменные окружения

В панели Railway → Variables:
```
DATABASE_URL=file:/app/db/custom.db
NODE_ENV=production
JWT_SECRET=<сгенерируйте 32+ символа>
```

### Шаг 3: Настройте volume для SQLite

Railway автоматически создаст volume при первом деплое. Убедитесь что `railway.toml` указывает на правильный Dockerfile:

```toml
[build]
context = "."
dockerfile = "deploy/Dockerfile"
```

Volume `db_data` будет монтироваться в `/app/db` — данные сохраняются между перезапусками.

### Шаг 4: Деплой

Railway автоматически деплоит при push в main. Или нажмите **Deploy** в панели.

### Шаг 5: Миграция БД

После первого деплоя откройте Railway Shell и выполните:
```bash
bun prisma db push
```

---

## 3. Render

**Плюсы:** стабильный, хороший DX, авто-SSL
**Минусы:** free tier засыпает через 15мин неактивности

### Шаг 1: Создайте Web Service

1. [render.com](https://render.com) → New Web Service
2. Подключите репозиторий
3. Настройки:
   - **Build Command:** `bun run build`
   - **Start Command:** `bun start`
   - **Environment:** `NODE_ENV=production`

### Шаг 2: Добавьте PostgreSQL

1. New → PostgreSQL
2. Скопируйте Internal Database URL
3. Добавьте как переменную `DATABASE_URL` в Web Service

### Шаг 3: Деплой

Render автоматически деплоит при push. Файл `render.yaml` уже настроен.

---

## 4. VPS + Docker (полный контроль)

**Плюсы:** cheapest за ресурсы, полный контроль, любые БД, нет ограничений
**Минусы:** нужно администрировать сервер

### Рекомендуемые VPS провайдеры

| Провайдер | План | RAM | CPU | Цена |
|---|---|---|---|---|
| Hetzner | CAX11 | 2GB | 2 vCPU | ~$5/мес |
| DigitalOcean | Basic | 1GB | 1 vCPU | $6/мес |
| Linode | Nanode | 1GB | 1 vCPU | $5/мес |
| AWS | t3.micro | 1GB | 2 vCPU | ~$8/мес |

### Шаг 1: Подготовьте сервер

```bash
# SSH на сервер
ssh root@your-server-ip

# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# (опционально) Установите Docker Compose
apt install -y docker-compose-plugin
```

### Шаг 2: Клонируйте репозиторий

```bash
git clone https://github.com/QuadDarv1ne/love-compass.git
cd love-compass
```

### Шаг 3: Создайте .env файл

```bash
cp .env.example .env
nano .env
```

Минимальные переменные:
```
DATABASE_URL=file:/app/db/custom.db
NODE_ENV=production
JWT_SECRET=<openssl rand -base64 32>
PORT=3000
```

### Шаг 4: Запустите

**SQLite (простой вариант):**
```bash
make up
# или
docker compose -f deploy/docker-compose.yml up -d
```

**Production (PostgreSQL + Redis):**
```bash
make up-prod
# или
docker compose -f deploy/docker-compose.prod.yml up -d
```

### Шаг 5: Миграция БД

```bash
docker compose -f deploy/docker-compose.yml exec app bun prisma db push
```

### Шаг 6: Настройте Nginx (reverse proxy)

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/love-compass
sudo ln -s /etc/nginx/sites-available/love-compass /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Шаг 7: Настройте SSL (бесплатно)

```bash
apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Автоматическое обновление сертификатов:
```bash
make ssl-renew
# или добавьте в crontab:
echo "0 0 1 * * certbot renew --quiet" | crontab -
```

### Шаг 8: Проверьте

```bash
curl http://localhost:3000/api/health
curl https://your-domain.com/api/health
```

---

## 5. Docker Swarm (высокий трафик)

**Плюсы:** zero-downtime deploys, rolling updates, replicas
**Минусы:** требует несколько серверов

### Шаг 1: Инициализируйте Swarm

```bash
# На manager ноде
docker swarm init

# Добавьте worker ноды
docker swarm join --token <token> <manager-ip>:2377
```

### Шаг 2: Задеплойте стек

```bash
make swarm-deploy
# или
docker stack deploy -c deploy/docker-compose.swarm.yml love-compass
```

### Шаг 3: Масштабируйте

```bash
make swarm-scale REPLICAS=5
# или
docker service scale love-compass_app=5
```

### Шаг 4: Rolling update

```bash
make swarm-update
```

---

## 6. Netlify

**Плюсы:** бесплатно, быстрый CDN
**Минусы:** функции таймаут 10с (free), нет SQLite

### Шаг 1: Подключите репозиторий

1. [netlify.com](https://netlify.com) → New site from Git
2. Выберите репозиторий

### Шаг 2: Настройте переменные

Site settings → Environment variables:
```
DATABASE_URL=postgresql://...  # Supabase или другой PostgreSQL
NODE_ENV=production
JWT_SECRET=<32+ символа>
```

### Шаг 3: Деплой

Netlify автоматически деплоит при push. Файл `netlify.toml` уже настроен.

> Для Next.js рекомендуется установить плагин `@netlify/plugin-nextjs` — он уже указан в `netlify.toml`.

---

## 7. Yandex Cloud

**Плюсы:** российский провайдер, низкая задержка для RU аудитории
**Минусы:** требуется ручная настройка

### Шаг 1: Установите CLI

```bash
curl -sSL https://storage.yandexcloud.net/cli/install.py | python3
yc init
```

### Шаг 2: Задеплойте

```bash
chmod +x deploy/yandex-cloud.sh
./deploy/yandex-cloud.sh
```

Скрипт:
1. Создаёт Container Registry
2. Билдит и пушит Docker образ
3. Создаёт Serverless Container или Compute Cloud instance

---

## Переменные окружения

### Обязательные

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | Строка подключения к БД | `file:/app/db/custom.db` или `postgresql://...` |
| `NODE_ENV` | Окружение | `production` |
| `JWT_SECRET` | Секрет для сессий (32+ символа) | `openssl rand -base64 32` |

### Опциональные

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PORT` | Порт приложения | `3000` |
| `ALLOWED_ORIGINS` | Разрешённые CORS origins | same-origin |
| `SMTP_HOST` | SMTP сервер для email | - |
| `SMTP_PORT` | SMTP порт | `587` |
| `SMTP_USER` | SMTP пользователь | - |
| `SMTP_PASS` | SMTP пароль | - |
| `SENTRY_DSN` | Sentry DSN для error tracking | - |

См. `.env.example` для полного шаблона.

---

## База данных: SQLite vs PostgreSQL

### Когда использовать SQLite

- Один сервер / контейнер
- < 100K пользователей
- Простой бэкап (copy файла)
- Платформы: VPS, Docker, Railway

### Когда использовать PostgreSQL

- Serverless (Vercel, Netlify)
- Несколько инстансов приложения
- Connection pooling нужен
- Production при масштабе

### Миграция SQLite → PostgreSQL

```bash
# 1. Экспорт SQLite
sqlite3 db/custom.db .dump > backup.sql

# 2. Измените DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# 3. Push схемы
bun prisma db push

# 4. Импорт (если есть данные)
# Используйте prisma migrate или ручной импорт
```

---

## Бэкапы

### SQLite

```bash
# Быстрый бэкап
make db-backup

# Автоматический бэкап с ротацией (7 дней)
make backup

# Восстановление
make db-restore FILE=backups/db-2026-05-27.sqlite
```

### PostgreSQL

```bash
make backup-postgres
# или вручную:
pg_dump -U postgres dbname > backup.sql
```

### Автоматический бэкап (cron)

```bash
# Добавьте в crontab
crontab -e

# Ежедневный бэкап в 3:00
0 3 * * * cd /app/love-compass && make backup >> /var/log/backup.log 2>&1

# Еженедельный бэкап PostgreSQL
0 3 * * 0 cd /app/love-compass && make backup-postgres >> /var/log/backup.log 2>&1
```

---

## Мониторинг

### Docker Compose Monitoring

```bash
docker compose -f deploy/docker-compose.monitoring.yml up -d
```

- **Prometheus:** `http://localhost:9090`
- **Grafana:** `http://localhost:3001` (admin/admin)

### Health Check

```
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2026-05-27T12:00:00.000Z",
  "uptime": 12345,
  "memory": { "rss": 123456789 },
  "database": "connected"
}
```

### Логи

```bash
# Docker
make logs
make logs-follow  # real-time

# PM2
pm2 logs

# Journalctl (systemd)
journalctl -u love-compass -f
```

---

## CI/CD — GitHub Actions

Автоматический деплой при push в main.

### Шаг 1: Скопируйте workflow

```bash
cp .github/workflows/ci.yml .github/workflows/ci.yml  # уже есть в репозитории
```

### Шаг 2: Настройте secrets

GitHub → Settings → Secrets and variables → Actions:

| Secret | Описание |
|---|---|
| `DATABASE_URL` | Production строка подключения |
| `DEPLOY_HOST` | IP или hostname сервера |
| `DEPLOY_USER` | SSH пользователь |
| `DEPLOY_SSH_KEY` | SSH private key |

### Шаг 3: Push в main

Workflow автоматически:
1. Запускает lint + build + security audit
2. Если всё ок — деплоит на сервер по SSH

---

## Чеклист деплоя

### Перед деплоем

- [ ] `bun run lint` — без ошибок
- [ ] `bun tsc --noEmit` — без ошибок
- [ ] `bun run build` — успешно
- [ ] `.env` в `.gitignore`
- [ ] `JWT_SECRET` сгенерирован (32+ символа)
- [ ] CORS настроен
- [ ] Rate limiting включён

### После деплоя

- [ ] `GET /api/health` → 200
- [ ] Регистрация работает
- [ ] Профиль создаётся
- [ ] Лайки/мэтчи работают
- [ ] SSL сертификат валиден
- [ ] Бэкап настроен
- [ ] Логи собираются

---

## Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker compose logs app

# Проверьте БД
docker compose exec app bun prisma db push

# Проверьте health
curl http://localhost:3000/api/health
```

### База данных не подключается

```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# PostgreSQL — проверьте что сервер запущен
docker compose ps

# SQLite — проверьте права на файл
ls -la db/custom.db
```

### SSL сертификат истёк

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Rollback

```bash
# Docker
make rollback PLATFORM=docker

# PM2
pm2 rollback

# Kubernetes
kubectl rollout undo deployment/love-compass
```

---

## Полезные ссылки

- [Platform Selector](deploy/platform-selector.md) — детальное дерево решений
- [Cost Comparison](deploy/cost-comparison.md) — сравнение цен
- [Security Hardening](deploy/security-hardening.md) — усиление безопасности
- [SSL Setup](deploy/ssl-setup.md) — настройка SSL/TLS
- [Docker Swarm](deploy/swarm-deploy.md) — Swarm документация
- [Supabase + Vercel](deploy/supabase-vercel.md) — детали настройки
- [Netlify](deploy/netlify.md) — Netlify специфика
- [Troubleshooting](deploy/troubleshooting.md) — решение проблем
