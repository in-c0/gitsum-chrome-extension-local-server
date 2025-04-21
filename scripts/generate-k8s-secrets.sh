#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env

# Check if all required environment variables are set
if [ -z "$MONGODB_URI" ] || [ -z "$JWT_SECRET" ] || [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$STRIPE_WEBHOOK_SECRET" ] || [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: Missing required environment variables"
  exit 1
fi

# Base64 encode the secrets
MONGODB_URI_BASE64=$(echo -n "$MONGODB_URI" | base64)
JWT_SECRET_BASE64=$(echo -n "$JWT_SECRET" | base64)
STRIPE_SECRET_KEY_BASE64=$(echo -n "$STRIPE_SECRET_KEY" | base64)
STRIPE_WEBHOOK_SECRET_BASE64=$(echo -n "$STRIPE_WEBHOOK_SECRET" | base64)
OPENAI_API_KEY_BASE64=$(echo -n "$OPENAI_API_KEY" | base64)

# Create the secrets file
cat > k8s/secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: gitsum-secrets
type: Opaque
data:
  mongodb-uri: $MONGODB_URI_BASE64
  jwt-secret: $JWT_SECRET_BASE64
  stripe-secret-key: $STRIPE_SECRET_KEY_BASE64
  stripe-webhook-secret: $STRIPE_WEBHOOK_SECRET_BASE64
  openai-api-key: $OPENAI_API_KEY_BASE64
EOF

echo "Kubernetes secrets file generated at k8s/secrets.yaml"
