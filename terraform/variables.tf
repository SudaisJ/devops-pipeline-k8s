variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name prefix used for all resource names"
  type        = string
  default     = "url-shortener"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "RDS master password — set via TF_VAR_db_password env variable, never hardcode"
  type        = string
  sensitive   = true
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = "production"
    ManagedBy   = "terraform"
    Owner       = "devops-team"
  }
}
