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
    ssh_public_key=data.local_sensitive_file.ssh_public_key.content,
    google_application_region="${var.GOOGLE_APPLICATION_REGION}",
    service_account_creds_b64    = filebase64(var.GOOGLE_APPLICATION_CREDENTIALS)
  })
}

resource "terraform_data" "redeploy_sh" {
  triggers_replace = {
    always = timestamp()
  }

  # Connect to host server
  connection {
    type        = "ssh"
    user        = "root"
    private_key = data.local_sensitive_file.ssh_private_key.content
    host        = hcloud_primary_ip.primary_ip.ip_address
    timeout     = "3m"
  }

  # Cloud-init wait
  provisioner "remote-exec" {
    inline = [
      # Wait cloud-init to finish
      "bash -lc 'command -v cloud-init >/dev/null 2>&1 && timeout 30m cloud-init status --wait || true'", 
    ]
  }

  # ===============================================================================================
  # Files copy

  # Project folder create
  provisioner "remote-exec" {
    inline = [ 
      "mkdir -p /opt/itinerary_service/deploy",
      "mkdir -p /opt/itinerary_service/nginx",
    ]
  }

  # nginx
  provisioner "file" {
    content = templatefile("${path.module}/../nginx/nginx.conf", {
      project_domain = "${var.PROJECT_DOMAIN}"
    })

    destination = "/opt/itinerary_service/nginx/nginx.conf"
  }

  # redeploy.sh
  provisioner "file" {  
    source      = "${path.module}/../redeploy.sh"
    destination = "/opt/itinerary_service/deploy/redeploy.sh"
  }

  # docker-compose.yml
  provisioner "file" {  
    source      = "${path.module}/../../docker-compose.dev.yml"
    destination = "/opt/itinerary_service/deploy/docker-compose.yml"
  }

  # env generate
  provisioner "file" {
    content = join("\n", concat(
      [
        for k, v in var.PROJECT_MAP_VARIABLES :
        "${k}=${v}"
      ]
    ))

    destination = "/opt/itinerary_service/deploy/.env"
  }

  # redeploy.sh start 
  provisioner "file" {
    source      = var.GOOGLE_APPLICATION_CREDENTIALS
    destination = "/root/.sa.json"
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      "bash /opt/itinerary_service/deploy/redeploy.sh < /root/.sa.json",
    ]
  }
}
