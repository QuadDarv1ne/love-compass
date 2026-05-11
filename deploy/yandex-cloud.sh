# Yandex Cloud (Yandex Compute Container / Yandex Container Registry)

# Build and push to Yandex Container Registry
# Requires: yc CLI authenticated

# 1. Create registry
# yc container registry create --name love-compass

# 2. Authenticate Docker
# yc container registry configure-docker

# 3. Build and push
TAG=cr.yandex/${YC_REGISTRY_ID}/love-compass:latest
docker build -f deploy/Dockerfile -t $TAG .
docker push $TAG

# 4. Deploy to Yandex Compute Cloud (VM)
# On VM: docker pull $TAG && docker run -d -p 3000:3000 $TAG

# Or deploy to Yandex Serverless Containers:
# yc serverless container revision deploy \
#   --container-name love-compass \
#   --image $TAG \
#   --cores 1 \
#   --memory 512m \
#   --execution-timeout 60s \
#   --port 3000 \
#   --env DATABASE_URL=file:/tmp/db/custom.db \
#   --concurrency 1
