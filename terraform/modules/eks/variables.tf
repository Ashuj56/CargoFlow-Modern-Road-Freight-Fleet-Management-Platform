variable "cluster_name" {
  description = "Name for the EKS cluster"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID from networking module"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs where nodes will run"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs (needed for ALB controller)"
  type        = list(string)
}

variable "node_sg_id" {
  description = "Security group ID for EKS nodes"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
