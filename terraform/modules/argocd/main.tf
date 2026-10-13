resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  namespace  = "argocd"
  version    = "7.4.4" # Latest stable as of mid-2025

  set {
    name  = "server.service.type"
    value = "ClusterIP"
  }
  set {
    name  = "configs.params.server\\.insecure"
    value = "true"
  }

  depends_on = [kubernetes_namespace.argocd]
}


locals {
  cargoflow_apps = {
    "cargoflow-backend" = {
      path      = "backend/k8s"          
      namespace = "default"
    }
    "cargoflow-customer-portal" = {
      path      = "customer-portal/k8s"
      namespace = "default"
    }
    "cargoflow-owner-portal" = {
      path      = "owner-portal/k8s"
      namespace = "default"
    }
  }
}

resource "kubernetes_manifest" "argocd_apps" {
  for_each = local.cargoflow_apps

  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = each.key          # e.g. "cargoflow-backend"
      namespace = "argocd"
      labels = {
        "app.kubernetes.io/part-of" = "cargoflow"
      }
    }
    spec = {
      project = "default"
      source = {
        repoURL        = var.gitops_repo_url  # https://github.com/you/CargoFlow-k8s
        targetRevision = "HEAD"
        path           = each.value.path      # "backend" | "customer-portal" | "owner-portal"
        # ArgoCD auto-detects kustomization.yaml and runs kustomize build
        kustomize = {}
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = each.value.namespace
      }
      syncPolicy = {
        automated = {
          prune    = true   
          selfHeal = true  
        }
        syncOptions = [
          "CreateNamespace=true",
          "ApplyOutOfSyncOnly=true", 
        ]
      }
    }
  }

  depends_on = [helm_release.argocd]
}
