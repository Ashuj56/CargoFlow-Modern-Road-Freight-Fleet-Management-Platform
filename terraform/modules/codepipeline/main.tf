data "aws_caller_identity" "current" {}

# ─────────────────────────────────────────────
# S3 BUCKET — stores pipeline artifacts between stages
# ─────────────────────────────────────────────
resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket        = "${var.cluster_name}-pipeline-artifacts-${data.aws_caller_identity.current.account_id}"
  force_destroy = true   # lets `terraform destroy` clean it up

  tags = { Name = "cargoflow-pipeline-artifacts" }
}

resource "aws_s3_bucket_versioning" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id
  versioning_configuration { status = "Enabled" }
}

# ─────────────────────────────────────────────
# CODESTAR CONNECTION — links CodePipeline to GitHub
# NOTE: After `terraform apply`, you must go to:
# AWS Console → Developer Tools → Connections
# and click "Update pending connection" to authorize GitHub.
# ─────────────────────────────────────────────
resource "aws_codestarconnections_connection" "github" {
  name          = "${var.cluster_name}-github"
  provider_type = "GitHub"
}

# ─────────────────────────────────────────────
# IAM ROLE — CodePipeline
# ─────────────────────────────────────────────
resource "aws_iam_role" "codepipeline" {
  name = "${var.cluster_name}-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "${var.cluster_name}-codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Access S3 artifact bucket
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:GetBucketVersioning"]
        Resource = ["${aws_s3_bucket.pipeline_artifacts.arn}", "${aws_s3_bucket.pipeline_artifacts.arn}/*"]
      },
      {
        # Start CodeBuild jobs
        Effect   = "Allow"
        Action   = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"]
        Resource = "*"
      },
      {
        # Use CodeStar connection to GitHub
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection"]
        Resource = aws_codestarconnections_connection.github.arn
      }
    ]
  })
}

# ─────────────────────────────────────────────
# IAM ROLE — CodeBuild
# ─────────────────────────────────────────────
resource "aws_iam_role" "codebuild" {
  name = "${var.cluster_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = "${var.cluster_name}-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Write logs to CloudWatch
        Effect = "Allow"
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        # Read/write artifact bucket
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:GetBucketAcl", "s3:GetBucketLocation"]
        Resource = ["${aws_s3_bucket.pipeline_artifacts.arn}", "${aws_s3_bucket.pipeline_artifacts.arn}/*"]
      },
      {
        # Push Docker images to ECR
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      },
      {
        # Update EKS (for kubectl rollout restart in deploy stage)
        Effect = "Allow"
        Action = ["eks:DescribeCluster"]
        Resource = "arn:aws:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${var.cluster_name}"
      }
    ]
  })
}

# ─────────────────────────────────────────────
# CODEBUILD PROJECT
# Runs buildspec.yml — builds Docker images and pushes to ECR
# ─────────────────────────────────────────────
resource "aws_codebuild_project" "main" {
  name          = "${var.cluster_name}-build"
  description   = "Build & push CargoFlow Docker images to ECR"
  service_role  = aws_iam_role.codebuild.arn
  build_timeout = 20   # minutes — enough for 3 parallel Docker builds

  source {
    type      = "CODEPIPELINE"   # gets source from CodePipeline
    buildspec = "buildspec.yml"  # our file in the repo root
  }

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"  # free tier: 100 min/month
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true   # required for Docker builds inside CodeBuild

    # These env vars are available inside buildspec.yml
    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "CLUSTER_NAME"
      value = var.cluster_name
    }
    environment_variable {
      name  = "ECR_BACKEND_URL"
      value = var.ecr_repository_urls["cargoflow-backend"]
    }
    environment_variable {
      name  = "ECR_CUSTOMER_PORTAL_URL"
      value = var.ecr_repository_urls["cargoflow-customer-portal"]
    }
    environment_variable {
      name  = "ECR_OWNER_PORTAL_URL"
      value = var.ecr_repository_urls["cargoflow-owner-portal"]
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/cargoflow/codebuild"
      stream_name = "build-logs"
    }
  }

  tags = { Name = "${var.cluster_name}-build" }
}

# ─────────────────────────────────────────────
# CODEPIPELINE — 3 stages: Source → Build → Deploy
# ─────────────────────────────────────────────
resource "aws_codepipeline" "main" {
  name     = "${var.cluster_name}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.pipeline_artifacts.bucket
  }

  # STAGE 1: Pull code from GitHub on every push to main branch
  stage {
    name = "Source"
    action {
      name             = "GitHub_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = var.github_repo
        BranchName       = var.github_branch
        DetectChanges    = "true"   # auto-trigger on push
      }
    }
  }

  # STAGE 2: Build Docker images and push to ECR
  stage {
    name = "Build"
    action {
      name             = "CodeBuild"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      configuration = {
        ProjectName = aws_codebuild_project.main.name
      }
    }
  }

  tags = { Name = "${var.cluster_name}-pipeline" }
}
