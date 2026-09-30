# ─────────────────────────────────────────────
# PROVIDERS
# ─────────────────────────────────────────────
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Kubernetes and Helm providers need the EKS cluster to exist first.
# They authenticate using the cluster's API endpoint.
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ─────────────────────────────────────────────
# MODULE: NETWORKING
# Creates VPC, subnets, IGW, NAT, security groups
# ─────────────────────────────────────────────
module "networking" {
  source       = "./modules/networking"
  cluster_name = var.cluster_name
  aws_region   = var.aws_region
}

# ─────────────────────────────────────────────
# MODULE: ECR
# Creates 3 container image repositories
# ─────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"
}

# ─────────────────────────────────────────────
# MODULE: EKS
# Creates cluster, node group, ALB controller, metrics server
# ─────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  cluster_name       = var.cluster_name
  aws_region         = var.aws_region
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  public_subnet_ids  = module.networking.public_subnet_ids
  node_sg_id         = module.networking.eks_node_sg_id

  depends_on = [module.networking]
}

# ─────────────────────────────────────────────
# MODULE: REDIS
# ElastiCache cache.t2.micro (free tier)
# ─────────────────────────────────────────────
module "redis" {
  source = "./modules/redis"

  cluster_name       = var.cluster_name
  private_subnet_ids = module.networking.private_subnet_ids
  redis_sg_id        = module.networking.redis_sg_id

  depends_on = [module.networking]
}

# ─────────────────────────────────────────────
# MODULE: CLOUDWATCH
# Container Insights + log groups
# ─────────────────────────────────────────────
module "cloudwatch" {
  source = "./modules/cloudwatch"

  cluster_name = var.cluster_name
  aws_region   = var.aws_region

  depends_on = [module.eks]
}

# ─────────────────────────────────────────────
# MODULE: CODEPIPELINE
# GitHub → CodeBuild → ECR → EKS rolling deploy
# ─────────────────────────────────────────────
module "codepipeline" {
  source = "./modules/codepipeline"

  cluster_name        = var.cluster_name
  aws_region          = var.aws_region
  github_repo         = var.github_repo
  github_branch       = var.github_branch
  ecr_repository_urls = module.ecr.repository_urls

  depends_on = [module.ecr, module.eks]
}

# ─────────────────────────────────────────────
# KUBERNETES SECRETS — inject app secrets into the cluster
# The backend pod reads these via envFrom: secretRef
# ─────────────────────────────────────────────
resource "kubernetes_secret" "backend_secrets" {
  metadata {
    name      = "backend-secrets"
    namespace = "default"
  }

  data = {
    MONGODB_URI        = var.mongodb_uri
    JWT_ACCESS_SECRET  = var.jwt_access_secret
    JWT_REFRESH_SECRET = var.jwt_refresh_secret
    GMAIL_USER         = var.gmail_user
    GMAIL_APP_PASSWORD = var.gmail_app_password
    # Redis URL auto-filled from ElastiCache output
    UPSTASH_REDIS_REST_URL = "redis://${module.redis.redis_endpoint}:${module.redis.redis_port}"
    UPSTASH_REDIS_REST_TOKEN = ""   # not needed for plain Redis (was for Upstash)
  }

  depends_on = [module.eks]
}

# ─────────────────────────────────────────────
# KUBERNETES CONFIGMAPS — non-secret app config
# ─────────────────────────────────────────────
resource "kubernetes_config_map" "backend_config" {
  metadata {
    name      = "backend-config"
    namespace = "default"
  }

  data = {
    NODE_ENV              = "production"
    PORT                  = "5000"
    JWT_ACCESS_EXPIRES    = "15m"
    JWT_REFRESH_EXPIRES   = "7d"
    CUSTOMER_PORTAL_URL   = "http://${module.eks.cluster_endpoint}"
    OWNER_PORTAL_URL      = "http://${module.eks.cluster_endpoint}"
  }

  depends_on = [module.eks]
}

resource "kubernetes_config_map" "customer_portal_config" {
  metadata {
    name      = "customer-portal-config"
    namespace = "default"
  }

  data = {
    VITE_API_URL    = "http://${module.eks.cluster_endpoint}/api"
    VITE_SOCKET_URL = "http://${module.eks.cluster_endpoint}"
  }

  depends_on = [module.eks]
}

resource "kubernetes_config_map" "owner_portal_config" {
  metadata {
    name      = "owner-portal-config"
    namespace = "default"
  }

  data = {
    VITE_API_URL    = "http://${module.eks.cluster_endpoint}/api"
    VITE_SOCKET_URL = "http://${module.eks.cluster_endpoint}"
  }

  depends_on = [module.eks]
}
