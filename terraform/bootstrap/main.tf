terraform {
  required_version = ">= 1.6"

  backend "local" {
    path = "terraform.tfstate"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}


data "aws_caller_identity" "current" {}


resource "aws_s3_bucket" "tfstate" {
  bucket = "cargoflow-tfstate-${data.aws_caller_identity.current.account_id}"

  # Prevent accidental deletion of state bucket
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name    = "cargoflow-tfstate"
    Purpose = "Terraform remote state"
    Project = "cargoflow"
  }
}

# Enable versioning — lets you recover from accidental state corruption
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption — state files contain secrets, encrypt at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tfstate_lock" {
  name         = "cargoflow-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name    = "cargoflow-tfstate-lock"
    Purpose = "Terraform state locking"
    Project = "cargoflow"
  }
}
