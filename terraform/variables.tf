variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name prefix for all CargoFlow AWS resources"
  type        = string
  default     = "cargoflow-eks"
}

variable "github_repo" {
  description = "Your GitHub repo in format: username/repo-name  e.g. ashuj56/CargoFlow"
  type        = string
}

variable "github_branch" {
  description = "Git branch that triggers the CI pipeline"
  type        = string
  default     = "main"
}

# ─── SECRETS (store in terraform.tfvars — never commit to Git) ───

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
  sensitive   = true
}

variable "jwt_access_secret" {
  description = "Secret key for signing access tokens"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "Secret key for signing refresh tokens"
  type        = string
  sensitive   = true
}

variable "gmail_user" {
  description = "Gmail address used by the backend for emails"
  type        = string
  sensitive   = true
}

variable "gmail_app_password" {
  description = "Gmail App Password (16-char, generated in Google Account settings)"
  type        = string
  sensitive   = true
}
