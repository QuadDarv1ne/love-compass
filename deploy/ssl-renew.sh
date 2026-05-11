#!/bin/bash
set -e

# SSL certificate auto-renewal script
# Add to crontab: 0 3 * * 1 /path/to/ssl-renew.sh

echo "=== SSL Certificate Renewal Check ==="

# Certbot (Let's Encrypt)
if command -v certbot &> /dev/null; then
  echo "Running certbot renew..."
  certbot renew --quiet --post-hook "systemctl reload nginx"
  echo "Certbot renewal complete"
fi

# Caddy (automatic)
if pgrep -x "caddy" > /dev/null; then
  echo "Caddy handles SSL automatically - no action needed"
fi

# Traefik (automatic)
if docker ps --format '{{.Names}}' | grep -q traefik; then
  echo "Traefik handles SSL automatically - no action needed"
fi

echo "=== SSL check complete ==="
