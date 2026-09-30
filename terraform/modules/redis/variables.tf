variable "cluster_name" {
  description = "EKS cluster name — used for naming the Redis subnet group"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the Redis subnet group"
  type        = list(string)
}

variable "redis_sg_id" {
  description = "Security group ID that locks Redis to EKS nodes only"
  type        = string
}

variable "redis_node_type" {
  description = "ElastiCache node type (cache.t2.micro is free-tier eligible)"
  type        = string
  default     = "cache.t2.micro"
}
