terraform {
  backend "s3" {
    bucket         = "cargoflow-tfstate-848647692924"
    key            = "cargoflow/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "cargoflow-tfstate-lock"
  }
}
