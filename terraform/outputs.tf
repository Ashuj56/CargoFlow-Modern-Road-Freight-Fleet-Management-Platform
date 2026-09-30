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

output "pipeline_console_url" {
  description = "Open this URL to watch your CI/CD pipeline run"
  value       = module.codepipeline.pipeline_console_url
}

output "github_connection_arn" {
  description = "⚠️  After apply: go to AWS Console → Developer Tools → Connections and authorize this connection"
  value       = module.codepipeline.github_connection_arn
}

output "cloudwatch_url" {
  description = "Open this to see pod CPU/memory dashboards (same as Grafana)"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home#container-insights:infrastructure"
}
