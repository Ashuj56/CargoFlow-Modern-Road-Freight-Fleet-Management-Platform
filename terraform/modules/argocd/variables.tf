variable "cluster_name" {
  type = string
}
variable "gitops_repo_url" {
  type        = string
  description = "HTTPS URL of the GitOps manifests repo (e.g. https://github.com/you/CargoFlow-k8s)"
}
