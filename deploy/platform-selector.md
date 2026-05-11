# Deployment Platform Selector

Quick decision tree for choosing the right deployment platform.

## Questions

### 1. What's your budget?

- **$0 (free)** → Go to [2A](#2a-free-tier)
- **$10-50/mo** → Go to [2B](#2b-low-budget)
- **$50+/mo or unlimited** → Go to [2C](#2c-full-budget)

### 2a. Free Tier

**Do you need persistent database?**
- **Yes** → **Railway** (500 free hours + volumes)
- **No / OK with external DB** → **Vercel + Supabase** (both free)

### 2b. Low Budget

**Do you want zero ops?**
- **Yes** → **Render** ($25/mo web service + postgres)
- **No, can manage server** → **Hetzner VPS** (~$5/mo, use Docker configs)

### 2c. Full Budget

**Expected traffic?**
- **< 10K users** → **Vercel Pro + Supabase Pro** ($45/mo)
- **10K-100K users** → **AWS ECS Fargate** (auto-scaling)
- **100K+ users** → **Kubernetes** (EKS/GKE) + RDS

## Quick Picks

| Scenario | Platform | Why |
|---|---|---|
| MVP / Demo | **Vercel + Supabase** | Free, fastest setup |
| Dating app launch | **Railway** | SQLite support, simple |
| Production with team | **Render** | Stable, good DX |
| High traffic | **AWS ECS** | Auto-scaling, reliable |
| Maximum control | **VPS + Docker** | Full control, cheapest |
| Enterprise | **Kubernetes** | Infinite scale |

## Database Decision

**Use SQLite if:**
- Single server / container
- < 100K users
- Simple backup needs
- Railway, VPS, Docker

**Use PostgreSQL if:**
- Serverless (Vercel, Netlify)
- Multiple app instances
- Need connections pooling
- Production at scale

## TL;DR

```
Just ship it     → Vercel + Supabase (free)
Need SQLite      → Railway (free tier)
Want simple prod → Render ($25/mo)
Full control     → Hetzner VPS + Docker ($5/mo)
Scale big        → AWS ECS / Kubernetes
```
