output "s3_bucket_name" {
  description = "Paste this into terraform/backend.tf bucket field"
  value       = aws_s3_bucket.tfstate.bucket
}

output "dynamodb_table_name" {
  description = "Paste this into terraform/backend.tf dynamodb_table field"
  value       = aws_dynamodb_table.tfstate_lock.name
}

output "next_step" {
  description = "What to do after this apply"
  value       = "cd .. && terraform init  (this migrates state to the S3 backend)"
}
