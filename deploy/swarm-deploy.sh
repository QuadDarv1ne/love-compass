#!/bin/bash
set -e

# Deploy to Docker Swarm
# Usage: ./deploy/swarm-deploy.sh [build|deploy|scale|update|down]

ACTION=${1:-deploy}
STACK_NAME="love-compass"
COMPOSE_FILE="deploy/docker-compose.swarm.yml"

case $ACTION in
  build)
    echo "Building Docker image..."
    docker build -f deploy/Dockerfile -t love-compass:latest .
    ;;
  deploy)
    echo "Initializing swarm if needed..."
    docker info > /dev/null 2>&1 || docker swarm init
    echo "Deploying stack..."
    docker stack deploy -c $COMPOSE_FILE $STACK_NAME
    echo "Waiting for services to start..."
    sleep 10
    docker stack ps $STACK_NAME
    ;;
  scale)
    REPLICAS=${2:-3}
    echo "Scaling app to $REPLICAS replicas..."
    docker service scale ${STACK_NAME}_app=$REPLICAS
    ;;
  update)
    echo "Rolling update..."
    docker service update --image love-compass:latest ${STACK_NAME}_app
    echo "Monitoring rollout..."
    watch -n 2 "docker service ps ${STACK_NAME}_app --no-trunc | head -20"
    ;;
  down)
    echo "Removing stack..."
    docker stack rm $STACK_NAME
    ;;
  *)
    echo "Usage: $0 [build|deploy|scale|update|down]"
    exit 1
    ;;
esac
