variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default = [
    "cargoflow-backend",
    "cargoflow-customer-portal",
    "cargoflow-owner-portal"
  ]
}
