terraform {
  required_version = ">= 1.0"
  # Specifies terraform API provider to use for `hcloud`
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "1.60.0"
    }
  }
  backend "gcs" {}
}

# Configures hcloud provider for deploy
provider "hcloud" {
  # Hetzner API token 
  token = var.HETZNER_CLOUD_TOKEN
}

# =================================================================================================
# Creates an SSH key used for redeploy
resource "hcloud_ssh_key" "redeploy" {
  name       = "${var.HOST_SERVER_NAME}-redeploy-key"
  public_key = data.local_sensitive_file.ssh_public_key.content
}

# =================================================================================================
# Static IP for the instance
resource "hcloud_primary_ip" "primary_ip" {
  name          = "${var.HOST_SERVER_NAME}-primary-ip"
  location      = var.HOST_SERVER_LOCATION
  type          = "ipv4"
  assignee_type = "server"
  auto_delete   = false

  lifecycle {
    prevent_destroy = true
  }
}

# =================================================================================================
# Hetzner instance itselfs
resource "hcloud_server" "host_server" {
  name        = var.HOST_SERVER_NAME
  server_type = var.HOST_SERVER_TYPE
  image       = var.HOST_SERVER_IMAGE
  location    = var.HOST_SERVER_LOCATION

  public_net {
    ipv4_enabled = true
    ipv4         = hcloud_primary_ip.primary_ip.id
    ipv6_enabled = true
  }

  ssh_keys = [hcloud_ssh_key.redeploy.name]

  # Startup cloud-init script for the instance
  user_data = templatefile("${path.module}/../cloud-init.yml", {
    ssh_public_key = data.local_sensitive_file.ssh_public_key.content,
    project_name   = var.PROJECT_NAME
  })
}

resource "terraform_data" "redeploy_sh" {
  depends_on = [hcloud_server.host_server]

  triggers_replace = {
    redeploy_sh    = filesha256("${path.module}/../redeploy.sh")
    compose        = filesha256("${path.module}/../../docker-compose.dev.yml")
    nginx_conf     = filesha256("${path.module}/../nginx/nginx.conf")
    https_template = filesha256("${path.module}/../nginx/https.conf.template")
    redis_template = filesha256("${path.module}/../redis.conf.template")
    env            = sha256(join("\n", [for k, v in var.PROJECT_MAP_VARIABLES : "${k}='${replace(v, "'", "'\\''")}'"]))
  }

  # Connect to host server
  connection {
    type        = "ssh"
    user        = "deploy"
    private_key = data.local_sensitive_file.ssh_private_key.content
    host        = hcloud_primary_ip.primary_ip.ip_address
    timeout     = "35m"
  }

  # Cloud-init wait
  provisioner "remote-exec" {
    inline = [
      # Wait cloud-init to finish
      "bash -lc 'if command -v cloud-init >/dev/null 2>&1; then timeout 30m cloud-init status --wait; fi'",
    ]
  }

  # ===============================================================================================
  # Files copy

  # Project folder create
  provisioner "remote-exec" {
    inline = [
      "mkdir -p /opt/${var.PROJECT_NAME}/deploy",
      "mkdir -p /opt/${var.PROJECT_NAME}/nginx",
    ]
  }

  # nginx static config
  provisioner "file" {
    source      = "${path.module}/../nginx/nginx.conf"
    destination = "/opt/${var.PROJECT_NAME}/nginx/nginx.conf"
  }

  # nginx HTTPS template — expanded by envsubst in redeploy.sh
  provisioner "file" {
    source      = "${path.module}/../nginx/https.conf.template"
    destination = "/opt/${var.PROJECT_NAME}/nginx/https.conf.template"
  }

  # Redis config template — expanded by envsubst in redeploy.sh
  provisioner "file" {
    source      = "${path.module}/../redis.conf.template"
    destination = "/opt/${var.PROJECT_NAME}/deploy/redis.conf.template"
  }

  # redeploy.sh
  provisioner "file" {  
    source      = "${path.module}/../redeploy.sh"
    destination = "/opt/${var.PROJECT_NAME}/deploy/redeploy.sh"
  }

  # docker-compose.yml
  provisioner "file" {  
    source      = "${path.module}/../../docker-compose.dev.yml"
    destination = "/opt/${var.PROJECT_NAME}/deploy/docker-compose.yml"
  }

  # env generate
  provisioner "file" {
    content = join("\n", concat(
      [
        for k, v in var.PROJECT_MAP_VARIABLES :
        "${k}='${replace(v, "'", "'\\''")}'"
      ]
    ))

    destination = "/opt/${var.PROJECT_NAME}/deploy/.env"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod 600 /opt/${var.PROJECT_NAME}/deploy/.env",
    ]
  }

  # GCP credentials — transferred over SSH so the key never enters Terraform state
  # or Hetzner user-data. The file is shredded from /tmp immediately after docker login.
  provisioner "file" {
    source      = var.GOOGLE_APPLICATION_CREDENTIALS
    destination = "/tmp/gcp_creds.json"
  }

  provisioner "remote-exec" {
    inline = [
      "trap 'shred -u /tmp/gcp_creds.json 2>/dev/null || rm -f /tmp/gcp_creds.json' EXIT",
      "chmod 600 /tmp/gcp_creds.json",
      "cat /tmp/gcp_creds.json | docker login -u _json_key --password-stdin https://${var.GOOGLE_APPLICATION_REGION}-docker.pkg.dev",
      "shred -u /tmp/gcp_creds.json",
    ]
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      "sudo bash /opt/${var.PROJECT_NAME}/deploy/redeploy.sh",
    ]
  }
}
