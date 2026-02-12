#!/usr/bin/env bash
set -euo pipefail
IP="${1:?missing ip}"
PORT="${2:-3000}"
DIR="/etc/nginx/shadow-servers"
FILE="$DIR/$IP.conf"
TMP="$FILE.tmp"
mkdir -p "$DIR"
echo "server $IP:$PORT max_fails=2 fail_timeout=10s;" > "$TMP"
mv -f "$TMP" "$FILE"
nginx -t
nginx -s reload
