output "log_group_names" {
  description = "CloudWatch log group names per service"
  value       = [for k, v in aws_cloudwatch_log_group.services : v.name]
}
