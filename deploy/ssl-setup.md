# SSL/TLS Setup Guide

## Let's Encrypt (Free)

### With Certbot + Nginx

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### With Caddy (Automatic)

Caddy handles SSL automatically — just configure your domain:

```
your-domain.com {
    reverse_proxy app:3000
}
```

### With Traefik (Automatic)

Traefik auto-provisions certificates via ACME. See `docker-compose.traefik.yml`.

## Manual Certificate Upload

### Nginx with existing certs

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

## Cloudflare (Free SSL Proxy)

1. Add domain to Cloudflare
2. Set DNS records pointing to your server IP
3. SSL mode: **Full (strict)**
4. Origin Server → Create Certificate → install on server
5. Cloudflare handles auto-renewal at the edge
