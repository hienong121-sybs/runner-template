# runner-template

Repo nay dung de luu template CI/CD co the copy qua cac repo khac, gom:

- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Azure Pipelines workflow: `.azure/deploy.yml`
- Mau ignore cho runtime/secrets: `.gitignore`, `.npmignore`
- Mau bien moi truong: `.env.example`
- Mau Access Controls body cho Tailscale: `tailscale/access-controls.hujson`
- Lich su version template: `CHANGELOG.md`
- CLI copy template: `runner-template-copy.js`, `package.json`

## Muc tieu

- Tao 1 bo deploy co san, co comment option de doi nhanh theo tung repo.
- Tranh lap lai viec viet pipeline moi cho moi project.
- Chuan hoa trigger, path filter, runner, env secret, va cleanup.

## Cach dung nhanh

1. Copy file template can dung sang repo dich:
   - GitHub: copy `.github/workflows/deploy.yml`
   - Azure: copy `.azure/deploy.yml`
2. Cap nhat trigger:
   - `branches`
   - `tags`
   - `paths` (chi chay khi thay doi file/folder nay)
   - `paths-ignore`/`exclude` (bo qua docs, markdown, file khong can deploy)
3. Chon runner:
   - GitHub `runs-on`: `ubuntu-latest` / `windows-latest` / `macos-latest` / `self-hosted`
   - Azure `vmImage`: `ubuntu-latest` / `windows-latest` / `macos-latest`
4. Khai bao secret/variable bat buoc:
   - `DOTENVRTDB_URL`
5. Chinh cac buoc script theo repo:
   - package can cai
   - file can pull tu `dotenvrtdb`
   - docker compose file duoc dung

## CLI bang npm link

Package nay co 4 CLI:

- `runner-template`: CLI tong hop, hien thi menu chon cac CLI con theo so thu tu.
- `runner-template-copy`: copy nhanh file template vao cwd hien tai.
- `runner-template-createtunnel`: tao Cloudflare tunnel + DNS record tu bien moi truong.
- `runner-template-tailscale`: cap nhat Tailscale Access Controls (ACL) tu file hujson.

1. Tai repo `runner-template`, tao global link:
   - `npm link`
2. Sang repo dich (thu muc can thao tac), chay theo nhu cau.

### 0) CLI tong hop (menu)

- Chay menu:
  - `runner-template`
- CLI se hien thi danh sach cac command dang co:
  - `1. runner-template-copy`
  - `2. runner-template-createtunnel`
  - `3. runner-template-tailscale`
- Nhap so tuong ung de chay dung logic CLI da chon.
- Co the chay truc tiep bang selector:
  - `runner-template 1 --force`
  - `runner-template 2 --yes`
  - `runner-template 3 --dry-run`

### 1) CLI copy template

- Chay copy:
  - `runner-template-copy`
- Neu muon ghi de file da ton tai:
  - `runner-template-copy --force`

Mac dinh CLI se skip file da ton tai de an toan.

File duoc copy:

- `.github/workflows/deploy.yml`
- `.azure/deploy.yml`
- `.env.example`
- `.gitignore`
- `.npmignore`
- `tailscale/access-controls.hujson`
- `docker-compose.yml`
- `caddy/Caddyfile`
- `caddy/entrypoint.sh`
- `nginx/default.template.conf`
- `nginx/setup-htpasswd.sh`
- `nginx/entrypoint.sh`
- `scripts/pull-data.js`
- `scripts/setup-runner-helper.js`
- `scripts/setup-runner-prev.js`
- `scripts/setup-runner-after.js`

### 2) CLI tao Cloudflare tunnel

Dieu kien:

- Da cai `cloudflared` trong may.
- Da login truoc: `cloudflared tunnel login`.

Khai bao bien moi truong theo kieu: 1 tunnel name + nhieu domain:

- `CLOUDFLARED_TUNNEL_NAME=ten-tunnel` (uu tien key nay)
- `CLOUDFLARED_TUNNEL_NAME_00=ten-tunnel` (fallback neu key tren khong co)
- `CLOUDFLARED_TUNNEL_DOMAIN_00=subdomain.domain.com`
- `CLOUDFLARED_TUNNEL_DOMAIN_01=ssh-subdomain.domain.com`
- `CLOUDFLARED_TUNNEL_DOMAIN_02=sub3.domain.com`
- `SSH_PORT=2222` (chi dung cho hostname bat dau bang `ssh`)

PowerShell sample:

```powershell
$env:CLOUDFLARED_TUNNEL_NAME = "ten-tunnel"
$env:CLOUDFLARED_TUNNEL_DOMAIN_00 = "subdomain.domain.com"
$env:CLOUDFLARED_TUNNEL_DOMAIN_01 = "ssh-sub2.domain.com"
$env:SSH_PORT = "2222"
runner-template-createtunnel
```

Mac dinh CLI se:

- Quet tunnel name theo thu tu uu tien:
  - `CLOUDFLARED_TUNNEL_NAME`
  - neu khong co thi fallback qua prefix `CLOUDFLARED_TUNNEL_NAME_`
- Quet domain tu prefix `CLOUDFLARED_TUNNEL_DOMAIN_`.
- Bat buoc chi co 1 tunnel name hop le, va it nhat 1 domain.
- Hien thi tong so DNS records, sau do hoi confirm truoc khi chay.
- Chay:
  - `cloudflared tunnel create <tunnel-name>` (1 lan)
  - `cloudflared tunnel route dns <tunnel-name> <domain>` (lap lai cho tung domain)
- Neu tunnel name da ton tai, CLI coi nhu thanh cong va tiep tuc.
- Neu DNS record da ton tai, CLI coi nhu thanh cong va tiep tuc.
- Log day du command, stdout/stderr, exit code cho tung lenh.

File tao them:

- `cloudflared-config.yml` trong cwd, format:
  - `tunnel: <TunnelID>`
  - `credentials-file: /etc/cloudflared/credentials.json`
  - `ingress` theo tung domain
  - domain bat dau bang `ssh` se map `ssh://127.0.0.1:${SSH_PORT}`
  - domain khac map mac dinh `http://127.0.0.1:80`
  - dong cuoi: `- service: http_status:404`

Ve file credentials:

- Uu tien doc path `.json` tu output cua `cloudflared tunnel create`.
- Neu output khong co path, fallback tim file `.json` moi/duoc cap nhat trong thu muc mac dinh `~/.cloudflared` (Windows: `%USERPROFILE%\.cloudflared`).
- Neu tunnel da ton tai, CLI se thu uu tien file `./cloudflared-credentials.json` hoac file `<TunnelID>.json` trong `.cloudflared`.
- Neu tunnel da co san ma khong tim thay file credentials local, CLI se goi `cloudflared tunnel token <name>` (Cloudflare API qua cloudflared) de lay thong tin fallback.
- Copy credentials ve cwd:
  - `cloudflared-credentials.json` (luon cap nhat)
- Chen them metadata vao json:
  - `cloudflared_config_yml`
  - `cloudflared_config_file`
  - `tunnel_name`
  - `tunnel_ref`
  - `tunnul_domain`
  - `tunnul_domains`
  - `base64` (base64 cua noi dung json truoc khi them field `base64`)

Neu muon bo qua buoc confirm:

- `runner-template-createtunnel --yes`

### 3) CLI cap nhat Tailscale Access Controls

Muc tieu:

- Goi Tailscale API de cap nhat Access Controls (`/api/v2/tailnet/{tailnet}/acl`).
- Tach body ACL ra file hujson rieng de thay doi rule ma khong sua code.
- Auth mode:
  - bat buoc `TAILSCALE_CLIENT_ID` + `TAILSCALE_CLIENT_SECRET` (hoac alias `TS_CLIENT_ID` + `TS_CLIENT_SECRET`)
  - CLI luon xin OAuth access token truoc, sau do moi goi API cap nhat ACL bang bearer token.

Env co the dung:

- `TAILSCALE_CLIENT_ID` (hoac `TS_CLIENT_ID`)
- `TAILSCALE_CLIENT_SECRET` (hoac `TS_CLIENT_SECRET`)
- `TAILSCALE_TAILNET` (mac dinh `-`)
- `TAILSCALE_ACL_BODY_FILE` (mac dinh tu tim theo thu tu):
  - `./tailscale/access-controls.hujson`
  - `./tailscale-acl.hujson`
  - file bundled trong package
- `TAILSCALE_OAUTH_SCOPE` (optional)
- `TAILSCALE_API_BASE_URL` (optional, mac dinh `https://api.tailscale.com`)
- `TAILSCALE_API_TIMEOUT_MS` (optional, mac dinh `30000`)

Lenh mau:

```powershell
$env:TAILSCALE_CLIENT_ID = "ts-client-id"
$env:TAILSCALE_CLIENT_SECRET = "ts-client-secret"
$env:TAILSCALE_TAILNET = "-"
runner-template-tailscale
```

Dry run (chi validate env + file body, khong goi API):

```powershell
runner-template-tailscale --dry-run
```

Custom body file:

```powershell
runner-template-tailscale --body-file .\tailscale\access-controls.hujson
```

## Runtime pull-data (docker compose)

- Runtime proxy topology:
  - Caddy: HTTP origin gateway (khong ACME, khong cap cert)
  - Nginx: business proxy + mirror logic on plain HTTP (`:8080` mac dinh)
- Endpoint `GET /cwd` tren nginx tra ve JSON:
  - `cwd`: gia tri `HOST_CWD`
  - `startTime`: timestamp UTC khi container nginx khoi dong
- Endpoint `GET /healthz` tren nginx tra ve:
  - `{"status":"ok"}`
- Service `pull-data` se:
  - tu tao OAuth access token tu `TAILSCALE_CLIENT_ID` + `TAILSCALE_CLIENT_SECRET`
  - goi Tailscale API `/api/v2/tailnet/{tailnet}/devices` de lay danh sach may dang active + IPv4
  - goi `http://<peer-ip>:8080/cwd` de lay `cwd` + `startTime`
  - chi chon 1 peer co `startTime` moi nhat trong danh sach hop le
  - rsync tung thu muc trong `PULL_DATA_SYNC_DIRS` ve `HOST_CWD` qua SSH
  - log chi tiet remote path/local path, ten file va stats
  - luon exclude thu muc `.git` trong du lieu sync
- Mirror runtime:
  - Luong chinh proxy vao `MAIN_TARGET_DNS:MAIN_TARGET_PORT` (mac dinh `127.0.0.1:3000`)
  - Mirror 1 chieu qua danh sach `NGINX_MIRROR_URL_PORT_xx` (vd `2026021114.tail8ee506.ts.net:8080`)
  - Khong con fallback theo bien khac; mirror chi doc tu prefix `NGINX_MIRROR_URL_PORT_`
  - Neu `NGINX_MIRROR_URL_PORT_00` rong va co du `DOTENVRTDB_NOW_YYYYDDMMHH` + `TAILSCALE_TAILNET_DNS`, `scripts/setup-runner-prev.js` se tu sinh `NGINX_MIRROR_URL_PORT_00=<nextHour>.TAILSCALE_TAILNET_DNS:NGINX_PORT` truoc khi `docker compose up`
  - `docker-compose.yml` dang expose san cac slot `NGINX_MIRROR_URL_PORT_00..09`; can nhieu hon thi them tiep `..._10`, `..._11`, ...
  - Tat/bat bang `NGINX_MIRROR_ENABLED` (`1` bat, khac `1` la tat)
  - Request mirror se tu gan header `X-Mirror-Request: 1` de tranh loop qua lai

Bien moi truong quan trong:

- `PULL_DATA_SYNC_DIRS=.pocketbase`
- `HOST_CWD=<duong-dan-local-cua-runner>`
- TLS public duoc terminate boi Cloudflare Tunnel/Edge (khong can `CADDY_DOMAIN` cho ACME).
- `MAIN_TARGET_DNS=<upstream chinh, mac dinh 127.0.0.1>`
- `MAIN_TARGET_PORT=<upstream port chinh, mac dinh MAIN_PORT>`
- `NGINX_PORT=8080`
- `TAILSCALE_DNS_CURRENT=<node hien tai>`
- `TAILSCALE_DNS_NEXTHOUR=<node mirror>`
- `NGINX_MIRROR_ENABLED=0`
- `NGINX_MIRROR_URL_PORT_00=<mirror target uu tien cao nhat>`
- DNS host duoc setup trong workflow truoc `docker compose up`
- `TAILSCALE_DNS_NAMESERVER_PRIMARY=100.100.100.100`
- `TAILSCALE_DNS_NAMESERVER_FALLBACK=1.1.1.1`
- `TAILSCALE_DNS_SEARCH_DOMAIN=<tailnet dns optional>`
- `TAILSCALE_CLIENT_ID`, `TAILSCALE_CLIENT_SECRET`
- `TAILSCALE_TAILNET` (vd: `example.com`, mac dinh `-`)

## Giai thich nhanh path filter

- GitHub Actions:
  - `on.push.paths`: workflow chi chay neu file thay doi nam trong danh sach.
  - `on.push.paths-ignore`: bo qua thay doi khong quan trong.
  - `on.pull_request.paths` va `on.pull_request.paths-ignore`: tuong tu cho PR.
- Azure Pipelines:
  - `trigger.paths.include`: chi build khi co thay doi trong path include.
  - `trigger.paths.exclude`: bo qua path khong can build.
  - `pr.paths.include`/`pr.paths.exclude`: tuong tu cho PR validation.

## Bien va secret

- GitHub Actions:
  - Dung `${{ secrets.DOTENVRTDB_URL }}`
  - Co the them `${{ vars.* }}` cho bien khong nhay cam.
- Azure Pipelines:
  - Dung `$(DOTENVRTDB_URL)` va khai bao trong pipeline variables/variable groups.
  - Danh dau secret cho bien nhay cam.

## Versioning

- Xem `CHANGELOG.md` de theo doi thay doi theo tung version template.
- Khuyen nghi tag theo format `vMAJOR.MINOR.PATCH` khi thay doi template.

## Luu y

- Template hien tai uu tien Linux shell (`ubuntu-latest`).
- Neu doi sang Windows runner, can doi syntax script (`: > .env`, quote, command format).
- Co step cleanup `docker compose down -v` de tranh ton tai nguyen sau khi job ket thuc.
