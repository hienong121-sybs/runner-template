# Changelog

All notable changes to `runner-template` are documented in this file.

This project follows:
- Semantic Versioning: https://semver.org
- Keep a Changelog style: https://keepachangelog.com

## [Unreleased]

### Changed
- Switched runtime topology to `Caddy (TLS gateway) -> Nginx (business proxy + mirror)`.
- Updated `docker-compose.yml`:
  - added dedicated `nginx` service as primary HTTP runtime
  - removed `HOLD_URL`/`HOLD_PORT` fallback upstream from runtime path
  - kept `caddy` as automatic HTTPS layer proxying to nginx
- Updated `nginx/default.conf.template`:
  - keeps `/files`, `/cwd`, `/healthz` endpoints
  - primary upstream is now only `MAIN_URL:MAIN_PORT`
  - added one-way mirror subrequest flow with env gating
- Added `nginx/entrypoint.sh`:
  - sets startup time for `/cwd`
  - renders nginx template by env
  - disables mirror automatically when target equals current DNS
- Added mirror env model:
  - `MIRROR_ENABLED`
  - `MIRROR_TARGET_DNS` (fallback to `TAILSCALE_DNS_NEXTHOUR`)
  - `MIRROR_TARGET_PORT` (fallback to `NGINX_PORT`)
  - removed `TAILSCALE_DNS_PREVHOUR` from template env files
- Updated template copy/publish file lists to include nginx runtime files.

## [0.8.1] - 2026-02-09

### Changed
- Switched runtime `pull-data` implementation from shell + local `tailscale status --json` to Node.js (`scripts/pull-data.js`) using Tailscale OAuth + Devices API.
- Updated `docker-compose.yml` `pull-data` service to run `node /opt/pull-data.js` and pass Tailscale API auth env vars.
- Updated template copy/publish lists to include `scripts/pull-data.js`.
- Updated `README.md` runtime pull-data section to document API-based flow.

## [0.8.0] - 2026-02-09

### Added
- Added `pull-data` runtime script: `scripts/pull-data.sh`:
  - discovers active Tailscale peers (excluding self) via `tailscale status --json`
  - fetches peer metadata from `/cwd`
  - picks only the peer with the newest `startTime` and syncs via `rsync` over SSH by IP
  - logs remote/local paths and transfer stats while excluding `.git` directories
- Added new docker compose service `pull-data` with minimal env config.
- Added minimal pull-data env keys in `.env.example`.
- Included `nginx/default.conf.template` and `scripts/pull-data.sh` in template copy/publish outputs.

### Changed
- Updated `nginx/default.conf.template`:
  - `/cwd` now returns JSON with `cwd` and `startTime` (container startup time)
  - added IPv6 listen on port `8080`
- Updated `docker-compose.yml`:
  - shared Tailscale socket volume for pull-data access
  - nginx now waits for pull-data completion before startup

## [0.7.0] - 2026-02-09

### Added
- Added new aggregate CLI `runner-template`:
  - displays all available project CLIs in numbered order
  - allows selecting command by menu input (`1`, `2`, `3`)
  - supports direct selector invocation: `runner-template <selector> [args...]`
- Updated npm bin mapping to publish `runner-template`.

## [0.6.0] - 2026-02-09

### Added
- Added new CLI command `runner-template-tailscale` for updating Tailscale Access Controls (ACL):
  - supports action aliases `access-controls` and `acl`
  - validates auth env and body file before making API calls
  - supports `--dry-run`, `--tailnet`, and `--body-file`
- Added Tailscale API modules for extensibility:
  - `tailscale/api-client.js` with generic request function
  - auth support for both Basic and Bearer
  - OAuth token helper (`/api/v2/oauth/token`) for fallback flows
- Added separate ACL body config file:
  - `tailscale/access-controls.hujson`
  - included in `runner-template-copy` template file list

### Changed
- Updated `runner-template-copy.js` command routing to support Tailscale mode in addition to copy/create-tunnel modes.
- Updated `package.json`:
  - added new bin `runner-template-tailscale`
  - included `tailscale/**/*` in publish files
  - bumped package version to `0.6.0`
- Updated `.env.example` and `README.md` with Tailscale ACL env vars and usage docs.

## [0.5.0] - 2026-02-08

### Changed
- Updated tunnel-name resolution priority:
  - use `CLOUDFLARED_TUNNEL_NAME` first (no suffix)
  - fallback to prefixed keys `CLOUDFLARED_TUNNEL_NAME_xx` when the non-prefixed key is missing
- Added idempotent tunnel/DNS behavior:
  - if tunnel already exists, treat as success and continue
  - if DNS record already exists, treat as success and continue
- Added `cloudflared-config.yml` generation in cwd with:
  - `tunnel: <TunnelID>`
  - `credentials-file: /etc/cloudflared/credentials.json`
  - ingress rules from env domains
  - `ssh://localhost:${SSH_PORT}` for hostnames starting with `ssh`
  - default service `http://localhost:8045` for non-ssh hostnames
- Updated credentials output (`cloudflared-credentials.json`):
  - include tunnel metadata + domain list
  - include `tunnel_ref` (TunnelID if available, otherwise tunnel name)
  - include generated config content
  - include `base64` field computed from file content before `base64` is added
  - fallback to `cloudflared tunnel token <name>` when local credentials JSON cannot be found
- Updated `.env.example` and `README.md` for the new env format and outputs.

## [0.4.1] - 2026-02-08

### Changed
- Updated `runner-template-createtunnel` behavior to use exactly one tunnel name with many DNS domains:
  - tunnel name is read from `CLOUDFLARED_TUNNEL_NAME` or `CLOUDFLARED_TUNNEL_NAME_xx`
  - domains are read from `CLOUDFLARED_TUNNEL_DOMAIN_xx`
  - tunnel is created once, then DNS records are routed one by one for that same tunnel
- Updated credentials output behavior:
  - now writes only `cloudflared-credentials.json` in cwd
  - now adds `tunnul_domains` array metadata (in addition to `tunnel_name` and `tunnul_domain`)
- Updated docs and `.env.example` to reflect single-tunnel multi-domain configuration.

## [0.4.0] - 2026-02-08

### Added
- Added new CLI command `runner-template-createtunnel` (implemented in `runner-template-copy.js`) to:
  - scan env pairs `CLOUDFLARED_TUNNEL_NAME_xx` + `CLOUDFLARED_TUNNEL_DOMAIN_xx`
  - confirm total pairs before execution
  - run and log `cloudflared tunnel create` and `cloudflared tunnel route dns`
- Added credentials discovery workflow:
  - parse `.json` path from `cloudflared` output when available
  - fallback scan in default `.cloudflared` directory for newly created credentials file
  - copy/enrich credentials to cwd with `tunnel_name` and `tunnul_domain`
- Added CLI flag `--yes` for non-interactive confirmation bypass.
- Added wrapper entry file `runner-template-createtunnel.js` and npm `bin` mapping.
- Added env examples for tunnel pairs in `.env.example`.
- Added documentation for tunnel CLI usage and prerequisites in `README.md`.

## [0.3.0] - 2026-02-08

### Added
- Added npm CLI package `runner-template-copy` with:
  - `package.json` (no dependencies)
  - `runner-template-copy.js` for copying template files into current directory
- Added detailed copy logs with emoji, source path, destination path, and summary.
- Added safe default behavior: skip existing files (use `--force` to overwrite).

## [0.2.0] - 2026-02-08

### Added
- Expanded GitHub Actions template with commentable options in `.github/workflows/deploy.yml`.
- Added Azure Pipelines equivalent in `.azure/deploy.yml`.
- Added usage documentation in `README.md`.
- Added standard environment sample in `.env.example`.
- Added this `CHANGELOG.md` for template version tracking.

## [0.1.0] - 2026-02-08

### Added
- Initial deploy template workflow for GitHub Actions.
- Base `.gitignore` and `.npmignore` for secrets/runtime safety.
