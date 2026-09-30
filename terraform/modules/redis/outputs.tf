output "redis_endpoint" {
  description = "Redis host — use this in the backend UPSTASH_REDIS_REST_URL env var"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "Redis port (6379)"
  value       = aws_elasticache_cluster.redis.port
}

output "redis_connection_url" {
  description = "Full Redis URL for the backend (redis://host:port)"
  value       = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
}
