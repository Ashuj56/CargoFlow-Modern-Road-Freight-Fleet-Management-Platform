# ─────────────────────────────────────────────
# CLOUDWATCH LOG GROUPS — one per service
# Logs are retained for 7 days (cheap, enough for a 4-day demo)
# ─────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset([
    "/cargoflow/backend",
    "/cargoflow/customer-portal",
    "/cargoflow/owner-portal",
  ])

  name              = each.value
  retention_in_days = 7   # delete logs after 7 days to avoid costs

  tags = { Name = each.value }
}

# ─────────────────────────────────────────────
# CLOUDWATCH CONTAINER INSIGHTS
# Enables the Container Insights feature on the EKS cluster.
# This gives you CPU, memory, network dashboards in AWS Console:
# CloudWatch → Insights → Container Insights → EKS → cargoflow-eks
# ─────────────────────────────────────────────
resource "aws_eks_addon" "cloudwatch_observability" {
  cluster_name             = var.cluster_name
  addon_name               = "amazon-cloudwatch-observability"
  resolve_conflicts_on_create = "OVERWRITE"

  tags = { Name = "cloudwatch-observability" }
}
