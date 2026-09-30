output "repository_urls" {
  description = "Map of service name → ECR repository URL"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "registry_id" {
  description = "AWS account ID (used as ECR registry ID)"
  value       = values(aws_ecr_repository.repos)[0].registry_id
}
