#!/bin/sh
set -eu

normalize_value() {
  value="$(printf '%s' "${1:-}" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  case "$value" in
    \#*)
      value=""
      ;;
    *" #"*)
      value="$(printf '%s' "$value" | sed 's/[[:space:]]#.*$//')"
      ;;
  esac
  printf '%s' "$value"
}

log_warn() {
  printf '[resolver] warning: %s\n' "$1" >&2
}

if [ "${TAILSCALE_DNS_SETUP_ENABLED:-1}" != "1" ]; then
  exit 0
fi

primary_dns="$(normalize_value "${TAILSCALE_DNS_NAMESERVER_PRIMARY:-100.100.100.100}")"
fallback_dns="$(normalize_value "${TAILSCALE_DNS_NAMESERVER_FALLBACK:-1.1.1.1}")"
search_domain="$(normalize_value "${TAILSCALE_DNS_SEARCH_DOMAIN:-${TAILSCALE_TAILNET_DNS:-}}")"

if [ -z "$primary_dns" ]; then
  log_warn "TAILSCALE_DNS_NAMESERVER_PRIMARY is empty, skip resolver setup"
  exit 0
fi

tmp_file="/tmp/resolv.conf.codex.$$"

{
  if [ -n "$search_domain" ]; then
    printf 'search %s\n' "$search_domain"
  fi
  printf 'nameserver %s\n' "$primary_dns"
  if [ -n "$fallback_dns" ] && [ "$fallback_dns" != "$primary_dns" ]; then
    printf 'nameserver %s\n' "$fallback_dns"
  fi
  printf 'options timeout:2 attempts:2\n'
} > "$tmp_file"

if cat "$tmp_file" > /etc/resolv.conf 2>/dev/null; then
  :
elif cp "$tmp_file" /etc/resolv.conf 2>/dev/null; then
  :
else
  if grep -Fq "nameserver $primary_dns" /etc/resolv.conf 2>/dev/null; then
    :
  else
    log_warn "cannot write /etc/resolv.conf, keep default DNS"
  fi
fi

rm -f "$tmp_file"
