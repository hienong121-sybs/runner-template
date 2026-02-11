#!/bin/sh
set -eu

export CADDY_UPSTREAM_HOST="${CADDY_UPSTREAM_HOST:-127.0.0.1}"
export CADDY_UPSTREAM_PORT="${CADDY_UPSTREAM_PORT:-8080}"

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
