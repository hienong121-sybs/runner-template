#!/usr/bin/env bash
set -euo pipefail
IP="${1:?missing ip}"
DIR="/etc/nginx/shadow-servers"
FILE="$DIR/$IP.conf"
rm -f "$FILE"
nginx -t
nginx -s reload
