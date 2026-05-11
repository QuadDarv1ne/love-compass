# Netlify Deployment

# Netlify works with Next.js static export and serverless functions.
# For full SSR, use netlify.toml below.

# Steps:
# 1. Connect repo to Netlify
# 2. Set build command: bun run build
# 3. Set publish directory: .next
# 4. Add DATABASE_URL env var (Supabase/external PostgreSQL)

# Note: Netlify functions have 10s timeout (free) / 26s (pro)
# For better performance, use Vercel or Docker deployment
