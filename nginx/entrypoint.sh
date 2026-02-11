#!/bin/sh
set -eu

export HOST_CWD="${HOST_CWD:-${PWD:-/workspace}}"
export RUNNER_START_TIME="${RUNNER_START_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
export NGINX_PORT="${NGINX_PORT:-8080}"
export MAIN_URL="${MAIN_URL:-127.0.0.1}"
export MAIN_PORT="${MAIN_PORT:-3000}"
export MAIN_TARGET_DNS="${MAIN_TARGET_DNS:-${MAIN_URL}}"
export MAIN_TARGET_PORT="${MAIN_TARGET_PORT:-${MAIN_PORT}}"
export MIRROR_ENABLED="${MIRROR_ENABLED:-1}"
export MIRROR_TARGET_DNS="${MIRROR_TARGET_DNS:-${TAILSCALE_DNS_NEXTHOUR:-}}"
export MIRROR_TARGET_PORT="${MIRROR_TARGET_PORT:-${NGINX_PORT}}"
export TAILSCALE_DNS_CURRENT="${TAILSCALE_DNS_CURRENT:-}"

if [ "$MIRROR_ENABLED" != "1" ]; then
  MIRROR_ENABLED="0"
  export MIRROR_ENABLED
fi

if [ -n "$MIRROR_TARGET_DNS" ] && [ -n "$TAILSCALE_DNS_CURRENT" ] && [ "$MIRROR_TARGET_DNS" = "$TAILSCALE_DNS_CURRENT" ]; then
  echo "warning: MIRROR_TARGET_DNS equals TAILSCALE_DNS_CURRENT, mirror disabled to avoid self-loop" >&2
  export MIRROR_TARGET_DNS=""
fi

sh /opt/common/setup-resolver.sh

sh /opt/nginx/setup-htpasswd.sh

template_file="/etc/nginx/templates/default.conf.template"
rendered_file="/etc/nginx/conf.d/default.conf"
render_vars='${HOST_CWD} ${RUNNER_START_TIME} ${NGINX_PORT} ${MAIN_TARGET_DNS} ${MAIN_TARGET_PORT} ${MIRROR_ENABLED} ${MIRROR_TARGET_DNS} ${MIRROR_TARGET_PORT}'
envsubst "$render_vars" < "$template_file" > "$rendered_file"

exec nginx -g 'daemon off;'
