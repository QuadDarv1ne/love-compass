# Deployment Platform Cost Comparison

## Free Tier Comparison

| Feature | Vercel | Netlify | Railway | Render | VPS (Hetzner) |
|---|---|---|---|---|---|
| **Free Hours** | Unlimited | Unlimited | 500 hrs/mo | 750 hrs/mo | - |
| **Memory** | 512MB | 512MB | 512MB | 512MB | 2GB+ |
| **CPU** | Shared | Shared | Shared | Shared | Dedicated |
| **Bandwidth** | 100GB | 100GB | $5 credit | Unlimited | 20TB |
| **Custom Domain** | Yes | Yes | Yes | Yes | Yes |
| **SSL** | Auto | Auto | Auto | Auto | Manual |
| **SQLite** | No | No | Yes | Ephemeral | Yes |

## Estimated Monthly Costs

### Hobby / MVP (0-100 users)
- **Vercel + Supabase**: $0 (free tiers)
- **Netlify + Supabase**: $0 (free tiers)
- **Railway**: $0 (500 free hours)

### Small (100-1000 users)
- **Vercel Pro**: $20/mo + Supabase Pro: $25/mo = **$45/mo**
- **Railway**: ~$15/mo (usage-based)
- **VPS Hetzner CPX11**: ~$5/mo + domain

### Medium (1000-10000 users)
- **Vercel Pro + Supabase Pro**: **$45/mo**
- **Render**: ~$30/mo (web service + postgres)
- **VPS Hetzner CAX11**: ~$7/mo

### Scale (10000+ users)
- **AWS ECS Fargate**: ~$50-100/mo (depends on traffic)
- **Kubernetes (DO/GKE)**: ~$50/mo (managed k8s)
- **VPS Hetzner EX44**: ~$35/mo (dedicated server)

## Platform-Specific Notes

### Vercel
- Best for Next.js (native support)
- Serverless functions: 10s timeout (free), 60s (pro)
- Edge functions available
- Automatic CI/CD from git

### Railway
- Persistent volumes for SQLite
- Simple UI, easy setup
- Pay for what you use
- Good for MVPs

### Render
- Free tier has spin-down after 15min inactivity
- PostgreSQL included in free tier (90 days)
- Docker support

### VPS (Hetzner/OVH/DigitalOcean)
- Full control, best price/performance
- Requires manual setup (or use deploy configs)
- Need to handle SSL, backups, monitoring yourself

## Recommendation

**Start:** Vercel + Supabase (free, zero ops)
**Grow:** Railway or Render (simple scaling)
**Scale:** VPS or AWS ECS (full control, cost-effective)
