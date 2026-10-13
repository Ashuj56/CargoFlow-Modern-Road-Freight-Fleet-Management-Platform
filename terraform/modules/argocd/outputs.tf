output "argocd_namespace" {
  value = "argocd"
}

output "argocd_app_names" {
  description = "Names of all ArgoCD Applications created (one per service)"
  value       = [for k, _ in local.cargoflow_apps : k]
  # Output: ["cargoflow-backend", "cargoflow-customer-portal", "cargoflow-owner-portal"]
}

