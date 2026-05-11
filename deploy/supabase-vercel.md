# Supabase + Vercel Deployment

# Supabase provides PostgreSQL:
# DATABASE_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres

# Steps:
# 1. Create project at https://supabase.com
# 2. Get connection string from Settings → Database
# 3. Push Prisma schema:
#    DATABASE_URL=postgresql://... bun prisma db push
# 4. Deploy to Vercel with the same DATABASE_URL

# Vercel environment variables:
# DATABASE_URL=postgresql://...  (from Supabase)
# NODE_ENV=production

# Note: Supabase connection pooling (port 6543) works better for Vercel serverless:
# DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
# DIRECT_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
