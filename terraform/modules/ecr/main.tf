# ─────────────────────────────────────────────
# ECR REPOSITORIES — one per service
# ─────────────────────────────────────────────
resource "aws_ecr_repository" "repos" {
  for_each = toset(var.repository_names)

  name                 = each.value
  image_tag_mutability = "MUTABLE"   # allows overwriting 'latest' tag

  image_scanning_configuration {
    scan_on_push = true   # AWS scans for OS vulnerabilities on every push
  }

  tags = { Name = each.value }
}

# ─────────────────────────────────────────────
# LIFECYCLE POLICY — keep costs low
# Keeps only the last 10 tagged images per repo.
# Untagged (dangling) images are deleted after 1 day.
# ─────────────────────────────────────────────
resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v", "latest"]
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      }
    ]
  })
}
