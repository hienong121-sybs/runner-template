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

is_valid_port() {
  candidate="$(normalize_value "${1:-}")"
  case "$candidate" in
    ''|*[!0-9]*)
      return 1
      ;;
  esac
  if [ "$candidate" -lt 1 ] || [ "$candidate" -gt 65535 ]; then
    return 1
  fi
  return 0
}

is_leap_year() {
  year="$1"
  if [ $((year % 400)) -eq 0 ]; then
    return 0
  fi
  if [ $((year % 100)) -eq 0 ]; then
    return 1
  fi
  [ $((year % 4)) -eq 0 ]
}

days_in_month() {
  year="$1"
  month="$2"
  case "$month" in
    1|3|5|7|8|10|12)
      printf '31'
      ;;
    4|6|9|11)
      printf '30'
      ;;
    2)
      if is_leap_year "$year"; then
        printf '29'
      else
        printf '28'
      fi
      ;;
    *)
      printf '0'
      ;;
  esac
}

increment_yyyymmddhh() {
  raw="$(normalize_value "${1:-}")"
  case "$raw" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9])
      ;;
    *)
      return 1
      ;;
  esac

  year="${raw%??????}"
  month_tmp="${raw#????}"
  month="${month_tmp%????}"
  day_tmp="${raw#??????}"
  day="${day_tmp%??}"
  hour="${raw#????????}"

  year_num=$((10#$year))
  month_num=$((10#$month))
  day_num=$((10#$day))
  hour_num=$((10#$hour))

  if [ "$month_num" -lt 1 ] || [ "$month_num" -gt 12 ]; then
    return 1
  fi
  month_days="$(days_in_month "$year_num" "$month_num")"
  if [ "$day_num" -lt 1 ] || [ "$day_num" -gt "$month_days" ]; then
    return 1
  fi
  if [ "$hour_num" -lt 0 ] || [ "$hour_num" -gt 23 ]; then
    return 1
  fi

  hour_num=$((hour_num + 1))
  if [ "$hour_num" -gt 23 ]; then
    hour_num=0
    day_num=$((day_num + 1))
    if [ "$day_num" -gt "$month_days" ]; then
      day_num=1
      month_num=$((month_num + 1))
      if [ "$month_num" -gt 12 ]; then
        month_num=1
        year_num=$((year_num + 1))
      fi
    fi
  fi

  printf '%04d%02d%02d%02d\n' "$year_num" "$month_num" "$day_num" "$hour_num"
}

populate_mirror_slot_00_from_datetime() {
  current_slot_00="$(normalize_value "${NGINX_MIRROR_URL_PORT_00:-}")"
  if [ -n "$current_slot_00" ]; then
    return
  fi

  now_hour_key="$(normalize_value "${DOTENVRTDB_NOW_YYYYDDMMHH:-}")"
  tailnet_dns="$(normalize_value "${TAILSCALE_TAILNET_DNS:-}")"
  tailnet_dns="${tailnet_dns#.}"

  if [ -z "$now_hour_key" ] || [ -z "$tailnet_dns" ]; then
    return
  fi

  if ! next_hour_key="$(increment_yyyymmddhh "$now_hour_key")"; then
    echo "warning: cannot derive NGINX_MIRROR_URL_PORT_00 from DOTENVRTDB_NOW_YYYYDDMMHH='${now_hour_key}'" >&2
    return
  fi

  mirror_port="$(normalize_value "${NGINX_PORT:-8080}")"
  if ! is_valid_port "$mirror_port"; then
    mirror_port="8080"
  fi

  export NGINX_MIRROR_URL_PORT_00="${next_hour_key}.${tailnet_dns}:${mirror_port}"
  echo "info: auto-set NGINX_MIRROR_URL_PORT_00=${NGINX_MIRROR_URL_PORT_00}" >&2
}

append_mirror_target() {
  raw_target="$(normalize_value "${1:-}")"
  if [ -z "$raw_target" ]; then
    return
  fi

  if [ "${raw_target#*:}" = "$raw_target" ]; then
    echo "warning: skip mirror target '${raw_target}' because format must be host:port" >&2
    return
  fi

  host_part="${raw_target%:*}"
  port_part="${raw_target##*:}"

  host_part="$(normalize_value "$host_part")"
  port_part="$(normalize_value "$port_part")"

  if [ -z "$host_part" ]; then
    echo "warning: skip mirror target '${raw_target}' because host is empty" >&2
    return
  fi

  if ! is_valid_port "$port_part"; then
    echo "warning: skip mirror target '${raw_target}' because port is invalid" >&2
    return
  fi

  if [ -n "${TAILSCALE_DNS_CURRENT}" ] && [ "$host_part" = "${TAILSCALE_DNS_CURRENT}" ]; then
    echo "warning: skip mirror target '${raw_target}' because it equals TAILSCALE_DNS_CURRENT" >&2
    return
  fi

  normalized_target="${host_part}:${port_part}"
  if grep -Fxq -- "$normalized_target" "$mirror_targets_file"; then
    return
  fi
  printf '%s\n' "$normalized_target" >> "$mirror_targets_file"
}

export_runtime_snapshot() {
  runtime_dir="/opt/nginx/runtime"
  if ! mkdir -p "$runtime_dir" 2>/dev/null; then
    return
  fi

  cp "$rendered_file" "$runtime_dir/default.conf" 2>/dev/null || true
  cp "$mirror_directives_file" "$runtime_dir/mirror-directives.conf" 2>/dev/null || true
  cp "$mirror_locations_file" "$runtime_dir/mirror-locations.conf" 2>/dev/null || true

  runtime_env_file="$runtime_dir/runtime.env"
  {
    printf 'HOST_CWD=%s\n' "$HOST_CWD"
    printf 'RUNNER_START_TIME=%s\n' "$RUNNER_START_TIME"
    printf 'MAIN_TARGET_DNS=%s\n' "$MAIN_TARGET_DNS"
    printf 'MAIN_TARGET_PORT=%s\n' "$MAIN_TARGET_PORT"
    printf 'NGINX_PORT=%s\n' "$NGINX_PORT"
    printf 'NGINX_MIRROR_ENABLED=%s\n' "$NGINX_MIRROR_ENABLED"
    printf 'TAILSCALE_DNS_CURRENT=%s\n' "$TAILSCALE_DNS_CURRENT"
    printf 'TAILSCALE_DNS_NAMESERVER_PRIMARY=%s\n' "$TAILSCALE_DNS_NAMESERVER_PRIMARY"
    printf 'TAILSCALE_DNS_NAMESERVER_FALLBACK=%s\n' "$TAILSCALE_DNS_NAMESERVER_FALLBACK"
    env | awk -F= '/^NGINX_MIRROR_URL_PORT_[A-Za-z0-9_]+=/{print $0}' | sort
  } > "$runtime_env_file"
}

export HOST_CWD="$(normalize_value "${HOST_CWD:-${PWD:-/workspace}}")"
if [ -z "$HOST_CWD" ]; then
  export HOST_CWD="${PWD:-/workspace}"
fi
export RUNNER_START_TIME="$(normalize_value "${RUNNER_START_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}")"
export NGINX_PORT="$(normalize_value "${NGINX_PORT:-8080}")"
export MAIN_TARGET_DNS="$(normalize_value "${MAIN_TARGET_DNS:-127.0.0.1}")"
export MAIN_TARGET_PORT="$(normalize_value "${MAIN_TARGET_PORT:-3000}")"
export TAILSCALE_DNS_NAMESERVER_PRIMARY="$(normalize_value "${TAILSCALE_DNS_NAMESERVER_PRIMARY:-100.100.100.100}")"
export TAILSCALE_DNS_NAMESERVER_FALLBACK="$(normalize_value "${TAILSCALE_DNS_NAMESERVER_FALLBACK:-1.1.1.1}")"
export NGINX_MIRROR_ENABLED="$(normalize_value "${NGINX_MIRROR_ENABLED:-0}")"
export TAILSCALE_DNS_CURRENT="$(normalize_value "${TAILSCALE_DNS_CURRENT:-}")"

if [ -z "$MAIN_TARGET_DNS" ]; then
  MAIN_TARGET_DNS="127.0.0.1"
  export MAIN_TARGET_DNS
fi
if ! is_valid_port "$MAIN_TARGET_PORT"; then
  echo "warning: MAIN_TARGET_PORT is invalid, fallback to 3000" >&2
  MAIN_TARGET_PORT="3000"
  export MAIN_TARGET_PORT
fi
if ! is_valid_port "$NGINX_PORT"; then
  echo "warning: NGINX_PORT is invalid, fallback to 8080" >&2
  NGINX_PORT="8080"
  export NGINX_PORT
fi
if [ -z "$TAILSCALE_DNS_NAMESERVER_PRIMARY" ]; then
  TAILSCALE_DNS_NAMESERVER_PRIMARY="100.100.100.100"
  export TAILSCALE_DNS_NAMESERVER_PRIMARY
fi
if [ "$NGINX_MIRROR_ENABLED" != "1" ]; then
  NGINX_MIRROR_ENABLED="0"
  export NGINX_MIRROR_ENABLED
fi

populate_mirror_slot_00_from_datetime

mirror_targets_file="/tmp/nginx-mirror-targets.conf"
mirror_directives_file="/etc/nginx/conf.d/mirror-directives.conf"
mirror_locations_file="/etc/nginx/conf.d/mirror-locations.conf"
: > "$mirror_targets_file"

if [ "$NGINX_MIRROR_ENABLED" = "1" ]; then
  prefixed_keys="$(env | awk -F= '/^NGINX_MIRROR_URL_PORT_[A-Za-z0-9_]+=/ {print $1}' | sort)"
  for key in $prefixed_keys; do
    eval "raw_value=\${$key:-}"
    append_mirror_target "$raw_value"
  done
fi

: > "$mirror_directives_file"
: > "$mirror_locations_file"

if [ "$NGINX_MIRROR_ENABLED" = "1" ] && [ -s "$mirror_targets_file" ]; then
  mirror_index=0
  while IFS= read -r mirror_target; do
    [ -z "$mirror_target" ] && continue
    mirror_dns="${mirror_target%:*}"
    mirror_port="${mirror_target##*:}"
    mirror_id="$(printf '%02d' "$mirror_index")"

    printf '    mirror /_mirror_next_%s;\n' "$mirror_id" >> "$mirror_directives_file"

    cat >> "$mirror_locations_file" <<EOF
  location = /_mirror_next_${mirror_id} {
    internal;
    if (\$http_x_mirror_request = "1") {
      return 204;
    }

    set \$mirror_target_dns "${mirror_dns}";
    set \$mirror_target_port "${mirror_port}";

    proxy_http_version 1.1;
    proxy_set_header Host \$mirror_target_dns;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto http;
    proxy_set_header X-Mirror-Request 1;
    proxy_set_header Connection "";
    proxy_connect_timeout 1s;
    proxy_read_timeout 15s;
    proxy_send_timeout 15s;
    proxy_pass http://\$mirror_target_dns:\$mirror_target_port\$request_uri;
  }

EOF
    mirror_index=$((mirror_index + 1))
  done < "$mirror_targets_file"
  printf '    mirror_request_body on;\n' >> "$mirror_directives_file"
else
  if [ "$NGINX_MIRROR_ENABLED" = "1" ]; then
    echo "warning: NGINX_MIRROR_ENABLED=1 but no valid NGINX_MIRROR_URL_PORT_* target found, mirror disabled" >&2
  fi
  printf '    # mirror disabled\n' > "$mirror_directives_file"
  printf '  # mirror locations disabled\n' > "$mirror_locations_file"
fi

rm -f "$mirror_targets_file"

sh /opt/common/setup-resolver.sh

sh /opt/nginx/setup-htpasswd.sh

template_file="/etc/nginx/templates/default.template.conf"
rendered_file="/etc/nginx/conf.d/default.conf"
render_vars='${HOST_CWD} ${RUNNER_START_TIME} ${NGINX_PORT} ${MAIN_TARGET_DNS} ${MAIN_TARGET_PORT}'
render_vars="${render_vars} \${TAILSCALE_DNS_NAMESERVER_PRIMARY} \${TAILSCALE_DNS_NAMESERVER_FALLBACK}"
envsubst "$render_vars" < "$template_file" > "$rendered_file"

export_runtime_snapshot

exec nginx -g 'daemon off;'
