# Launch Parameters & Configuration Guide

## Quick Start

```bash
# 1. Check environment configuration
bun run check-env

# 2. Install dependencies
bun install

# 3. Setup database
bun run db:generate
bun run db:push

# 4. Start development server
bun run dev
```

## Environment Variables

Run `bun run check-env` to automatically detect and validate all available parameters.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./db/custom.db` (SQLite) or `postgresql://...` |
| `JWT_SECRET` | Secret for JWT token signing (2FA) | Generate with: `openssl rand -base64 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key for Resend email service | - |
| `RESEND_FROM_EMAIL` | Sender email address | `onboarding@resend.dev` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | `http://localhost:3000` |
| `NEXT_PUBLIC_DEMO_MODE` | Enable demo mode | `true` |

## Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server on port 3000 |
| `bun run lint` | Run ESLint |

### Database

| Command | Description |
|---------|-------------|
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema changes to database |
| `bun run db:migrate` | Run database migrations (dev) |
| `bun run db:reset` | Reset database |
| `bun run seed` | Seed database with sample data |

### Production

| Command | Description |
|---------|-------------|
| `bun run build` | Build for production |
| `bun run start` | Start production server |

## VS Code Launch Configurations

The project includes pre-configured launch settings for VS Code:

- **Next.js: Dev** - Start development server with debugging
- **Next.js: Dev (Debug)** - Start with Node.js debugger attached
- **Next.js: Build** - Build for production
- **Next.js: Start (Production)** - Start production server
- **Prisma: Generate/Push/Migrate** - Database operations
- **Seed Database** - Seed with sample data

Press `F5` in VS Code to see available launch configurations.

## Docker Deployment

```bash
# Local (SQLite)
make -f deploy/Makefile build
make -f deploy/Makefile up

# Production (PostgreSQL + Redis)
make -f deploy/Makefile up-prod

# With monitoring
make -f deploy/Makefile up-monitoring
```

## Port Configuration

The development server runs on port **3000** by default. To change it, modify the `dev` script in `package.json`:

```json
"dev": "next dev -p YOUR_PORT 2>&1 | tee dev.log"
```
