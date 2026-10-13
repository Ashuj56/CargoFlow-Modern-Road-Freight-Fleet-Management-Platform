output "eks_cluster_name" {
  description = "EKS cluster name — use in kubectl config"
  value       = module.eks.cluster_name
}

output "kubeconfig_command" {
  description = "Run this command to connect kubectl to your cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_repository_urls" {
  description = "ECR image URLs — copy these into your k8s deployment image fields"
  value       = module.ecr.repository_urls
}

output "redis_endpoint" {
  description = "ElastiCache Redis host (already injected into backend-secrets)"
  value       = module.redis.redis_endpoint
}

output "argocd_apps" {
  description = "ArgoCD Application names — check sync status with: kubectl get application -n argocd"
  value       = module.argocd.argocd_app_names
}

output "cloudwatch_url" {
  description = "Open this to see pod CPU/memory dashboards (same as Grafana)"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home#container-insights:infrastructure"
}
