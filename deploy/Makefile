.PHONY: help build up down up-prod logs restart clean deploy-docker deploy-pm2 db-backup db-restore backup pre-deploy swarm rollback seed-prod ssl-renew checklist

help:
	@echo "Available commands:"
	@echo "  build          - Build Docker image"
	@echo "  up             - Start containers (SQLite)"
	@echo "  up-prod        - Start production stack (PostgreSQL + Redis)"
	@echo "  down           - Stop containers"
	@echo "  logs           - View container logs"
	@echo "  logs-follow    - Follow container logs"
	@echo "  restart        - Restart containers"
	@echo "  clean          - Remove containers, volumes, and images"
	@echo "  shell          - Open shell in running container"
	@echo "  db-backup      - Backup SQLite database (quick)"
	@echo "  backup         - Automated backup script (sqlite|postgres)"
	@echo "  backup-postgres - Automated PostgreSQL backup"
	@echo "  db-restore     - Restore SQLite database"
	@echo "  pre-deploy     - Run pre-deploy validation"
	@echo "  deploy-docker  - Build and push Docker image"
	@echo "  deploy-pm2     - Deploy with PM2 (VPS)"
	@echo "  swarm-deploy   - Deploy to Docker Swarm"
	@echo "  swarm-scale    - Scale Swarm replicas"
	@echo "  swarm-update   - Rolling update on Swarm"
	@echo "  rollback       - Rollback deployment"
	@echo "  seed-prod      - Seed production database"
	@echo "  ssl-renew      - Renew SSL certificates"
	@echo "  checklist      - Show deployment checklist"

# Docker
build:
	docker build -f deploy/Dockerfile -t love-compass .

up:
	docker compose -f deploy/docker-compose.yml up -d

up-prod:
	docker compose -f deploy/docker-compose.prod.yml --profile production up -d

down:
	docker compose -f deploy/docker-compose.yml down

logs:
	docker compose -f deploy/docker-compose.yml logs --tail=100

logs-follow:
	docker compose -f deploy/docker-compose.yml logs -f

restart:
	docker compose -f deploy/docker-compose.yml restart

clean:
	docker compose -f deploy/docker-compose.yml down -v --rmi local

shell:
	docker compose -f deploy/docker-compose.yml exec app sh

# Database
db-backup:
	@mkdir -p deploy/backups
	cp db/custom.db deploy/backups/custom-$$(date +%Y%m%d_%H%M%S).db
	@echo "Database backed up to deploy/backups/"

db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make db-restore FILE=deploy/backups/custom_20260511_120000.db"; \
		exit 1; \
	fi
	cp $(FILE) db/custom.db
	@echo "Database restored from $(FILE)"

# Deployment
deploy-docker: build
	@echo "Tag and push your image manually:"
	@echo "  docker tag love-compass your-registry/love-compass:latest"
	@echo "  docker push your-registry/love-compass:latest"

deploy-pm2:
	@echo "Building application..."
	bun install --frozen-lockfile
	bun run build
	@echo "Starting with PM2..."
	pm2 start deploy/ecosystem.config.js --env production
	pm2 save
	pm2 startup

# Utilities
backup:
	chmod +x deploy/backup.sh
	./deploy/backup.sh

backup-postgres:
	chmod +x deploy/backup.sh
	./deploy/backup.sh postgres

pre-deploy:
	chmod +x deploy/pre-deploy.sh
	./deploy/pre-deploy.sh

# Swarm
swarm-deploy:
	chmod +x deploy/swarm-deploy.sh
	./deploy/swarm-deploy.sh deploy

swarm-scale:
	./deploy/swarm-deploy.sh scale $(REPLICAS)

swarm-update:
	./deploy/swarm-deploy.sh update

# Rollback
rollback:
	chmod +x deploy/rollback.sh
	./deploy/rollback.sh $(PLATFORM)

# Seed
seed-prod:
	chmod +x deploy/seed-prod.sh
	./deploy/seed-prod.sh

# SSL
ssl-renew:
	chmod +x deploy/ssl-renew.sh
	./deploy/ssl-renew.sh

# Checklist
checklist:
	@cat deploy/checklist.md
