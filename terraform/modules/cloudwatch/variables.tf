variable "cluster_name" {
  description = "EKS cluster name — used for log group naming"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
