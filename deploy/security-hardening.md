# Security Hardening Guide

## Application Level

### Environment Variables
```bash
# NEVER commit .env files
echo ".env*" >> .gitignore

# Generate strong secrets
openssl rand -base64 32  # for JWT_SECRET
```

### Next.js Security Headers
Add to `next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
```

### API Rate Limiting
Add middleware or use `@upstash/ratelimit` for serverless:
```typescript
// Rate limit sensitive endpoints: /api/like, /api/messages
```

## Database Security

### Prisma
- Use connection pooling (PgBouncer for PostgreSQL)
- Limit connection string permissions (read-only for analytics)
- Never expose DATABASE_URL in client code

### SQLite (if used)
```bash
# Restrict file permissions
chmod 600 db/custom.db
chown nextjs:nextjs db/custom.db
```

## Docker Security

### Dockerfile Hardening
- ✅ Run as non-root user (already done)
- ✅ Multi-stage build (minimizes attack surface)
- Pin base image versions: `oven/bun:1.0.36` instead of `oven/bun:1`

### docker-compose
```yaml
# Add security_opt
security_opt:
  - no-new-privileges:true
# Read-only filesystem (except volumes)
read_only: true
```

## Network Security

### Firewall (VPS)
```bash
# Only open necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Docker Networks
- Use internal networks for DB (not exposed to host)
- Remove `ports` from db service in production compose

## TLS/SSL
- ✅ Auto-renewal via Traefik/Caddy/Certbot
- Force HTTPS redirect
- Use HSTS headers (see above)

## Dependency Security
```bash
# Regular audits
bun audit
npm audit --production

# Update dependencies weekly
bun update
```

## Monitoring
- Set up Sentry for error tracking
- Monitor failed login attempts
- Alert on unusual traffic patterns

## Checklist
- [ ] All secrets in vault/env, not in code
- [ ] HTTPS enforced everywhere
- [ ] CORS configured correctly
- [ ] Input validation on all API endpoints
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection (React handles this)
- [ ] CSRF tokens for state-changing operations
- [ ] Rate limiting on auth endpoints
- [ ] Regular dependency updates
- [ ] Backup encryption at rest
