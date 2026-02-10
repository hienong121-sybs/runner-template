#!/bin/sh
set -eu

auth_file="/etc/caddy/files-auth.caddy"
tmp_file="${auth_file}.tmp"
seen_users_file="${auth_file}.users.tmp"
auth_enabled=0

append_auth_user() {
  suffix="$1"
  user_var="NGINX_AUTH_USER_${suffix}"
  pass_var="NGINX_AUTH_PASS_${suffix}"
  caddy_user_var="CADDY_AUTH_USER_${suffix}"
  caddy_pass_var="CADDY_AUTH_PASS_${suffix}"

  eval "user=\${$user_var:-}"
  eval "pass=\${$pass_var:-}"

  if [ -z "$user" ]; then
    eval "user=\${$caddy_user_var:-}"
  fi
  if [ -z "$pass" ]; then
    eval "pass=\${$caddy_pass_var:-}"
  fi

  if [ -n "$user" ] && [ -n "$pass" ]; then
    if grep -Fxq -- "$user" "$seen_users_file"; then
      echo "warning: skip duplicate username '${user}' for slot ${suffix}" >&2
      return
    fi
    printf "%s\n" "$user" >> "$seen_users_file"

    hash="$(caddy hash-password --plaintext "$pass")"
    if [ "$auth_enabled" -eq 0 ]; then
      printf "basicauth {\n" >> "$tmp_file"
      auth_enabled=1
    fi
    printf "  %s %s\n" "$user" "$hash" >> "$tmp_file"
    return
  fi

  if [ -n "$user" ] || [ -n "$pass" ]; then
    echo "warning: skip auth pair ${suffix} because both user and pass are required" >&2
  fi
}

: > "$tmp_file"
: > "$seen_users_file"
append_auth_user "00"
append_auth_user "01"

if [ "$auth_enabled" -eq 1 ]; then
  printf "}\n" >> "$tmp_file"
else
  printf "# files auth disabled\n" >> "$tmp_file"
fi

mv "$tmp_file" "$auth_file"
rm -f "$seen_users_file"

export HOST_CWD="${HOST_CWD:-${PWD:-/workspace}}"
export RUNNER_START_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
