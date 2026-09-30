# ─────────────────────────────────────────────
# ELASTICACHE SUBNET GROUP
# Tells ElastiCache which private subnets it can use
# ─────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.cluster_name}-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "${var.cluster_name}-redis-subnet-group" }
}

# ─────────────────────────────────────────────
# ELASTICACHE CLUSTER — Single node Redis
# cache.t2.micro is FREE TIER eligible (750 hrs/month)
# ─────────────────────────────────────────────
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.cluster_name}-redis"
  engine               = "redis"
  node_type            = var.redis_node_type   # cache.t2.micro
  num_cache_nodes      = 1                     # single node — enough for dev/resume
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_sg_id]

  # Automatic minor version upgrades (safe)
  auto_minor_version_upgrade = true

  tags = { Name = "${var.cluster_name}-redis" }
}
