# Docker Swarm Deployment

## Initialize Swarm

```bash
docker swarm init
# Add workers:
docker swarm join --token <token> <manager-ip>:2377
```

## Deploy

```bash
# Build and tag image
docker build -f deploy/Dockerfile -t love-compass:latest .

# Deploy stack
docker stack deploy -c deploy/docker-compose.swarm.yml love-compass

# Check status
docker stack ps love-compass
docker service ls
docker service logs love-compass_app
```

## Scale

```bash
# Scale app to 5 replicas
docker service scale love-compass_app=5

# Scale down
docker service scale love-compass_app=2
```

## Update (Zero Downtime)

```bash
# Update image (rolling update)
docker service update --image love-compass:v2 love-compass_app

# Monitor rollout
docker service ps love-compass_app
```

## Teardown

```bash
docker stack rm love-compass
```
