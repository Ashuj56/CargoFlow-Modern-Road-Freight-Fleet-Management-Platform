#!/usr/bin/env bash

set -euo pipefail

RESOURCE_GROUP="cargoflow-rg"
AKS_CLUSTER_NAME="cargoflow-aks"
KEYVAULT_NAME="cargoflow-keyvault"
LOCATION="eastus"

echo "=== CargoFlow: Azure Key Vault Setup ==="

az keyvault create \
  --name "$KEYVAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku standard

read -rsp "MongoDB Atlas URI (mongodb+srv://...): " MONGODB_URI
echo ""
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-mongodb-uri" --value "$MONGODB_URI"

read -rsp "Upstash Redis REST URL: " UPSTASH_URL
echo ""
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-upstash-redis-url" --value "$UPSTASH_URL"

read -rsp "Upstash Redis REST Token: " UPSTASH_TOKEN
echo ""
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-upstash-redis-token" --value "$UPSTASH_TOKEN"

JWT_ACCESS=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH=$(openssl rand -base64 64 | tr -d '\n')
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-jwt-access-secret" --value "$JWT_ACCESS"
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-jwt-refresh-secret" --value "$JWT_REFRESH"
echo "JWT secrets auto-generated."

read -rp "Gmail address (press Enter to skip): " GMAIL_USER
if [[ -n "$GMAIL_USER" ]]; then
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-gmail-user" --value "$GMAIL_USER"
  read -rsp "Gmail App Password: " GMAIL_PASS
  echo ""
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "cargoflow-gmail-password" --value "$GMAIL_PASS"
fi

AKS_IDENTITY=$(az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --query identityProfile.kubeletidentity.objectId -o tsv)

az keyvault set-policy \
  --name "$KEYVAULT_NAME" \
  --object-id "$AKS_IDENTITY" \
  --secret-permissions get list

echo "=== Setup Complete! Key Vault: $KEYVAULT_NAME ==="
echo "Secrets stored:"
az keyvault secret list --vault-name "$KEYVAULT_NAME" --query "[].name" -o tsv
