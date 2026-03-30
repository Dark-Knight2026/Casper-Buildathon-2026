# =================================================================================================
# Hetzner API token

variable "HETZNER_CLOUD_TOKEN" {
  description = "Hetzner API token"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.HETZNER_CLOUD_TOKEN) > 20
    error_message = "HETZNER_CLOUD_TOKEN must be a valid non-empty token"
  }
}

variable "HOST_SERVER_TYPE" {
  description = "Hetzner server type"
  type        = string
  default     = "cx23"

  # Valid types verified via: hcloud server-type list
  # NOTE: cx22/cx32/cx42/cx52 do NOT exist in Hetzner's lineup — the correct shared-x86 cx series is cx23/cx33/cx43/cx53
  validation {
    condition = contains([
      "cx23", "cx33", "cx43", "cx53",
      "cpx11", "cpx21", "cpx31", "cpx41", "cpx51",
      "cpx12", "cpx22", "cpx32", "cpx42", "cpx52", "cpx62"
    ], var.HOST_SERVER_TYPE)

    error_message = "Invalid Hetzner server type"
  }
}


variable "HOST_SERVER_IMAGE" {
  description = "Server OS image"
  type        = string
  default     = "ubuntu-24.04"

  validation {
    condition = contains([
      "ubuntu-22.04",
      "ubuntu-24.04",
      "debian-12"
    ], var.HOST_SERVER_IMAGE)

    error_message = "Unsupported OS image"
  }
}

variable "HOST_SERVER_LOCATION" {
  description = "Hetzner location"
  type        = string
  default     = "hel1"

  validation {
    condition = contains([
      "hel1",
      "fsn1",
      "nbg1",
      "ash",
      "hil"
    ], var.HOST_SERVER_LOCATION)

    error_message = "Invalid Hetzner location"
  }
}

# =================================================================================================
# Public key for SSH connection

variable "SSH_PUBLIC_KEY_PATH" {
  description = "Path to the ssh public key file"
  type        = string

  validation {
    condition     = fileexists(var.SSH_PUBLIC_KEY_PATH)
    error_message = "SSH public key file does not exist"
  }
}

data "local_sensitive_file" "ssh_public_key" {
  filename = "${var.SSH_PUBLIC_KEY_PATH}"
}

# =================================================================================================
# GOOGLE CREDS

variable "GOOGLE_APPLICATION_REGION" {
  description = "GCP region"
  type        = string

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]+$", var.GOOGLE_APPLICATION_REGION))
    error_message = "Region must match GCP format (e.g., europe-central2)"
  }
}

# =================================================================================================
# Project

variable "PROJECT_NAME" {
  description = "Project name value"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9_]{3,40}$", var.PROJECT_NAME))
    error_message = "PROJECT_NAME must be lowercase snake-case (3-40 chars)"
  }
}

variable "DEPLOYMENT_MODE" {
  description = "Deployment mode"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.DEPLOYMENT_MODE)
    error_message = "DEPLOYMENT_MODE must be dev | staging | production"
  }
}

# =================================================================================================
# Network

variable "PROJECT_DOMAIN" {
  description = "Project domain"
  type        = string
  validation {
    condition = can(regex(
      "^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$",
      var.PROJECT_DOMAIN
    ))
    error_message = "PROJECT_DOMAIN must be a valid RFC-1123 domain (no underscores) like dashboard-demo.obox.systems"
  }
}

# =================================================================================================
# Host

variable "HOST_SERVER_NAME" {
  description = "Host server name"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,40}$", var.HOST_SERVER_NAME))
    error_message = "HOST_SERVER_NAME must be lowercase kebab-case"
  }
}

# =================================================================================================
# Docker tag

variable "TAG" {
  description = "Docker image base tag (registry/repo/name)"
  type        = string

  validation {
    condition     = length(var.TAG) > 5
    error_message = "TAG must not be empty"
  }
}

variable "VERSION" {
  description = "Docker version/tag"
  type        = string

  validation {
    # allow: timestamp OR git sha
    condition = can(regex("^[a-zA-Z0-9._-]{3,50}$", var.VERSION))
    error_message = "VERSION must be a valid docker tag"
  }
}

# =================================================================================================
# env map

variable "PROJECT_MAP_VARIABLES" {
  description = "Environment variables for project backend application"
  type        = map(string)
  sensitive   = true
  validation {
    condition     = length(var.PROJECT_MAP_VARIABLES) > 0
    error_message = "PROJECT_MAP_VARIABLES cannot be empty"
  }
}

# =================================================================================================
# Secrets

variable "GOOGLE_APPLICATION_CREDENTIALS" {
  description = "Path to the google application credentials file"
  type        = string

  validation {
    condition     = fileexists(var.GOOGLE_APPLICATION_CREDENTIALS)
    error_message = "Service account credentials file not found"
  }
}


variable "SSH_PRIVATE_KEY_PATH" {
  description = "Path to the ssh private key file"
  type        = string

  validation {
    condition     = fileexists(var.SSH_PRIVATE_KEY_PATH)
    error_message = "SSH private key file not found"
  }
}

data "local_sensitive_file" "ssh_private_key" {
  filename = var.SSH_PRIVATE_KEY_PATH
}

