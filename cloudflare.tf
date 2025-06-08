terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_account_email" {
  type = string
}

provider "cloudflare" {
  email     = var.cloudflare_account_email
  api_token = var.cloudflare_api_token
}

variable "domain" {
  default = "bronen.com.br"
}

resource "cloudflare_dns_record" "github_subdomain" {
  zone_id = var.cloudflare_zone_id
  name    = "github.${var.domain}"
  content = var.domain
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "www_subdomain" {
  zone_id = var.cloudflare_zone_id
  name    = "www.${var.domain}"
  content = var.domain
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "nameserver_06" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  content = "ns06.domaincontrol.com"
  type    = "NS"
  ttl     = 1
}

resource "cloudflare_dns_record" "nameserver_05" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  content = "ns05.domaincontrol.com"
  type    = "NS"
  ttl     = 1
}

resource "cloudflare_email_routing_rule" "contact_route_redirect" {
  zone_id = var.cloudflare_zone_id

  name    = "contact@bronen.com.br rule"
  enabled = true

  actions = [{
    type  = "forward"
    value = [var.cloudflare_account_email]
  }]

  matchers = [{
    type  = "literal"
    field = "to"
    value = "contact@${var.domain}"
  }]
}
