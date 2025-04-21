#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env

# Build the Docker image
echo "Building Docker image..."
docker build -t gitsum-api:latest .

# Tag the image for your registry
echo "Tagging image..."
docker tag gitsum-api:latest your-registry.com/gitsum-api:latest

# Push to registry
echo "Pushing to registry..."
docker push your-registry.com/gitsum-api:latest

# Deploy to production (example for Kubernetes)
echo "Deploying to production..."
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

echo "Deployment completed successfully!"
