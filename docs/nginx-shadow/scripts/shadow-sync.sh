#!/usr/bin/env bash
set -euo pipefail
SRC="${1:-/dev/stdin}"
PORT="${2:-3000}"
DIR="/etc/nginx/shadow-servers"
mkdir -p "$DIR"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
if [[ "$SRC" == "-" ]]; then
  cat /dev/stdin > "$tmpdir/ips.raw"
else
  cat "$SRC" > "$tmpdir/ips.raw"
fi
grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' "$tmpdir/ips.raw" | sort -u > "$tmpdir/ips"
changed=0
while IFS= read -r ip; do
  [[ -z "$ip" ]] && continue
  f="$DIR/$ip.conf"
  content="server $ip:$PORT max_fails=2 fail_timeout=10s;"
  if [[ ! -f "$f" ]] || ! grep -qxF "$content" "$f"; then
    echo "$content" > "$f.tmp"
    mv -f "$f.tmp" "$f"
    changed=1
  fi
done < "$tmpdir/ips"
for f in "$DIR"/*.conf; do
  [[ -e "$f" ]] || continue
  ip="$(basename "$f" .conf)"
  if ! grep -qxF "$ip" "$tmpdir/ips"; then
    rm -f "$f"
    changed=1
  fi
done
if [[ "$changed" -eq 1 ]]; then
  nginx -t
  nginx -s reload
fi
