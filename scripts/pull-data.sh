#!/bin/sh

set -eu

log() {
  printf '[pull-data] %s\n' "$*"
}

warn() {
  printf '[pull-data] warning: %s\n' "$*" >&2
}

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

HOST_CWD="${HOST_CWD:-}"
PULL_DATA_SYNC_DIRS="${PULL_DATA_SYNC_DIRS:-.pocketbase}"

TAILSCALE_SOCKET="${TAILSCALE_SOCKET:-/var/run/tailscale/tailscaled.sock}"
TAILSCALE_STATUS_WAIT_SECONDS="30"
CWD_PORT="8080"
TMP_DIR="/tmp/pull-data"
STATUS_JSON_FILE="$TMP_DIR/tailscale-status.json"
PEER_TSV_FILE="$TMP_DIR/peer-candidates.tsv"
SYNC_DIRS_FILE="$TMP_DIR/sync-dirs.txt"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

mkdir -p "$TMP_DIR"

if [ -z "$HOST_CWD" ]; then
  warn "HOST_CWD is empty, skip"
  exit 0
fi

for cmd in tailscale jq curl rsync ssh; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    warn "missing command: $cmd"
    exit 0
  fi
done

check_tailscale_status() {
  tailscale --socket "$TAILSCALE_SOCKET" status --json >"$STATUS_JSON_FILE" 2>"$TMP_DIR/tailscale-status.err"
}

status_wait_count=0
while [ "$status_wait_count" -lt "$TAILSCALE_STATUS_WAIT_SECONDS" ]; do
  if check_tailscale_status; then
    log "tailscale status ready"
    break
  fi
  status_wait_count=$((status_wait_count + 1))
  sleep 1
done

if [ "$status_wait_count" -ge "$TAILSCALE_STATUS_WAIT_SECONDS" ]; then
  warn "tailscale status is unavailable after ${TAILSCALE_STATUS_WAIT_SECONDS}s"
  if [ -s "$TMP_DIR/tailscale-status.err" ]; then
    warn "tailscale error: $(head -n 1 "$TMP_DIR/tailscale-status.err")"
  fi
  exit 0
fi

self_id="$(jq -r '.Self.ID // ""' "$STATUS_JSON_FILE")"

jq -r --arg self_id "$self_id" '
  def peers:
    if (.Peer | type) == "object" then
      (.Peer | to_entries | map(.value))
    elif (.Peer | type) == "array" then
      .Peer
    else
      []
    end;

  peers[]
  | . as $peer
  | (($peer.Online // false) or ($peer.Active // false)) as $is_active
  | select($is_active)
  | select(($peer.ID // "") != $self_id)
  | (($peer.TailscaleIPs // []) | map(select(test("^[0-9]+\\."))) | .[0] // "") as $peer_ip
  | select($peer_ip != "")
  | [$peer_ip, ($peer.HostName // "")]
  | @tsv
' "$STATUS_JSON_FILE" >"$PEER_TSV_FILE"

if [ ! -s "$PEER_TSV_FILE" ]; then
  log "no active peer found"
  exit 0
fi

TAB_CHAR="$(printf '\t')"
selected_ip=""
selected_remote_cwd=""
selected_start_time=""

while IFS="$TAB_CHAR" read -r peer_ip peer_host; do
  peer_cwd_url="http://${peer_ip}:${CWD_PORT}/cwd"
  peer_cwd_json="$(curl -fsS --max-time 5 "$peer_cwd_url" 2>/dev/null || true)"
  if [ -z "$peer_cwd_json" ]; then
    continue
  fi

  peer_remote_cwd="$(printf '%s' "$peer_cwd_json" | jq -r '.cwd // ""' 2>/dev/null || true)"
  peer_start_time="$(printf '%s' "$peer_cwd_json" | jq -r '.startTime // ""' 2>/dev/null || true)"

  if [ -z "$peer_remote_cwd" ]; then
    continue
  fi

  if [ -z "$selected_ip" ] || [ "$peer_start_time" \> "$selected_start_time" ]; then
    selected_ip="$peer_ip"
    selected_remote_cwd="$peer_remote_cwd"
    selected_start_time="$peer_start_time"
  fi

  log "peer ${peer_host:-unknown} ip=$peer_ip startTime=${peer_start_time:-unknown}"
done <"$PEER_TSV_FILE"

if [ -z "$selected_ip" ]; then
  log "no valid peer from /cwd"
  exit 0
fi

log "selected ip=$selected_ip startTime=${selected_start_time:-unknown}"
log "remote cwd: $selected_remote_cwd"
log "local cwd: $HOST_CWD"

printf '%s' "$PULL_DATA_SYNC_DIRS" | tr ',;' '\n' >"$SYNC_DIRS_FILE"

sync_index=0
while IFS= read -r raw_sync_dir; do
  sync_dir="$(trim "$raw_sync_dir")"
  if [ -z "$sync_dir" ]; then
    continue
  fi

  case "$sync_dir" in
    /*|*".."*)
      warn "skip unsafe path: $sync_dir"
      continue
      ;;
  esac

  sync_index=$((sync_index + 1))
  remote_path="${selected_remote_cwd%/}/${sync_dir}"
  local_path="${HOST_CWD%/}/${sync_dir}"
  mkdir -p "$(dirname "$local_path")"

  log ""
  log "[sync $sync_index] $sync_dir"
  log "  remote: ${selected_ip}:${remote_path}/"
  log "  local:  ${local_path}/"

  if ! ssh $SSH_OPTS "$selected_ip" "test -d '$remote_path'" >/dev/null 2>&1; then
    warn "remote path missing: $remote_path"
    continue
  fi

  if ! RSYNC_RSH="ssh $SSH_OPTS" rsync \
    -avh \
    --delete \
    --exclude=".git/" \
    --exclude="**/.git/" \
    --info=NAME,STATS2,PROGRESS2 \
    "${selected_ip}:${remote_path}/" \
    "${local_path}/"; then
    warn "rsync failed: $sync_dir"
  fi
done <"$SYNC_DIRS_FILE"

log "done"
exit 0
