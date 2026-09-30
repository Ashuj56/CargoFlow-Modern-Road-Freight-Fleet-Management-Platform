variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "github_repo" {
  description = "Full GitHub repo path, e.g. your-username/CargoFlow"
  type        = string
}

variable "github_branch" {
  description = "Branch that triggers the pipeline"
  type        = string
  default     = "main"
}

variable "ecr_repository_urls" {
  description = "Map of service name → ECR URL (from ECR module output)"
  type        = map(string)
}
