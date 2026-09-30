output "pipeline_name" {
  description = "Name of the CodePipeline"
  value       = aws_codepipeline.main.name
}

output "codebuild_project_name" {
  description = "Name of the CodeBuild project"
  value       = aws_codebuild_project.main.name
}

output "github_connection_arn" {
  description = "CodeStar GitHub connection ARN — must be manually authorized in AWS Console after apply"
  value       = aws_codestarconnections_connection.github.arn
}

output "pipeline_console_url" {
  description = "Direct link to the pipeline in AWS Console"
  value       = "https://${var.aws_region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${aws_codepipeline.main.name}/view"
}
