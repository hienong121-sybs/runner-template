# Shadow Check Guide

Tai lieu nay gom cac lenh thuong dung de kiem tra luong mirror/shadow trong topology:

`cloudflared -> caddy -> nginx -> main_upstream` va `nginx -> shadow_upstream`

## 1) Dieu kien truoc khi kiem tra

- Nginx va docker-manager dang chay.
- Da co auth cho `dockerapi`:
  - `NGINX_AUTH_USER_00`
  - `NGINX_AUTH_PASS_00`
- Da co peer shadow trong `./.nginx/runtime/shadow-servers/*.conf` (neu khong se khong co dich de mirror den).

## 2) Kiem tra bang API (qua nginx)

Thay `admin:admin@123` va host theo moi truong cua ban.

### 2.1 Health va policy

```bash
curl -u admin:admin@123 http://127.0.0.1:8080/dockerapi/healthz
curl -u admin:admin@123 http://127.0.0.1:8080/dockerapi/help
```

Hop le khi:
- `healthz` tra `status=ok`
- `help` hien danh sach command va policy env (`DOCKER_MANAGER_ALLOWED_*`)

### 2.2 Kiem tra tailscale/nginx qua dockerapi

```bash
curl -u admin:admin@123 "http://127.0.0.1:8080/dockerapi/tailscale/status?format=json"
curl -u admin:admin@123 http://127.0.0.1:8080/dockerapi/nginx/test
curl -u admin:admin@123 http://127.0.0.1:8080/dockerapi/nginx/version
```

Hop le khi:
- `tailscale/status` co peer `online`
- `nginx/test` exit=0

### 2.3 Kiem tra log qua dockerapi

```bash
curl -u admin:admin@123 "http://127.0.0.1:8080/dockerapi/nginx/logs/error?tail=100"
curl -u admin:admin@123 "http://127.0.0.1:8080/dockerapi/nginx/logs/shadow?tail=100"
```

### 2.4 Kiem tra file shadow trong container nginx

Dung single-quote de tranh shell expand sai bien `$f`:

```bash
curl -u admin:admin@123 -X POST "http://127.0.0.1:8080/dockerapi/nginx/exec" \
  --data 'ls -la /etc/nginx/shadow-servers && for f in /etc/nginx/shadow-servers/*.conf; do [ -e "$f" ] && echo "===== $f =====" && cat "$f"; done'
```

## 3) Kiem tra truc tiep tren may remote (SSH)

### 3.1 Trang thai compose

```bash
docker compose --env-file .env ps
```

### 3.2 Xac dinh ten container theo compose service

```bash
docker ps --filter "label=com.docker.compose.service=nginx" --format "{{.Names}}"
docker ps --filter "label=com.docker.compose.service=tailscale" --format "{{.Names}}"
```

### 3.3 Xem realtime log file nginx (host mount)

```bash
mkdir -p .nginx/logs
tail -F .nginx/logs/app.access.log .nginx/logs/app.error.log .nginx/logs/shadow.mirror.log
```

### 3.4 Xem runtime config da render tren host

```bash
mkdir -p .nginx/runtime/conf.d .nginx/runtime/upstreams .nginx/runtime/auth .nginx/runtime/shadow-servers
ls -la .nginx/runtime/conf.d .nginx/runtime/upstreams .nginx/runtime/auth .nginx/runtime/shadow-servers
cat .nginx/runtime/conf.d/app.conf
cat .nginx/runtime/upstreams/main_upstream.conf
cat .nginx/runtime/upstreams/shadow_upstream.conf
cat .nginx/runtime/auth/.htpasswd
ls -la .nginx/runtime/shadow-servers
```

### 3.5 Xem log truc tiep trong container nginx

```bash
NGX=$(docker ps --filter "label=com.docker.compose.service=nginx" --format '{{.Names}}' | head -n1)
docker exec -it "$NGX" sh -lc 'ls -lah /var/log/nginx && tail -n 120 /var/log/nginx/app.error.log'
```

## 4) Kich ban test mirror end-to-end

### 4.1 Tao request hop rule mirror

Rule hien tai mirror cho method ghi (`POST/PUT/PATCH/DELETE`) va route `/api/`.

```bash
curl -i -X POST http://127.0.0.1:8080/api/mirror-check \
  -H "Content-Type: application/json" \
  -d '{"check":"mirror"}'
```

Public domain:

```bash
curl -i -X POST https://<your-domain>/api/mirror-check \
  -H "Content-Type: application/json" \
  -d '{"check":"mirror"}'
```

### 4.2 Doi chieu ket qua

- `app.error.log` co `subrequest: "/__shadow"` => mirror da trigger.
- `shadow.mirror.log` co dong moi => subrequest da duoc access-log.
- Neu co `connect() failed` hoac `timed out` cho upstream `100.x.x.x:port` => shadow target chua reachable.

## 5) Cach doc ket qua (dung va hop le)

### Truong hop A: Main app die, mirror van chay

Dau hieu:
- `app.error.log` co loi `upstream: "http://127.0.0.1:3000/..."` (main fail)
- Dong cung request co them `subrequest: "/__shadow"`

Ket luan:
- Mirror van chay, nhung response client van theo main request (co the 502/504).

### Truong hop B: Mirror trigger nhung shadow die

Dau hieu:
- Co `subrequest: "/__shadow"`
- Co loi `connect() failed`/`timed out` den `100.x.x.x:<port>`

Ket luan:
- Co mirror, nhung peer shadow khong nghe dung port hoac network chua thong.

### Truong hop C: Khong co dong `subrequest: "/__shadow"`

Ket luan:
- Request khong khop rule mirror, hoac config mirror chua duoc reload.

## 6) Danh sach lenh xem cau hinh nginx trong container

```bash
NGX=$(docker ps --filter "label=com.docker.compose.service=nginx" --format '{{.Names}}' | head -n1)

docker exec -it "$NGX" sh -lc 'nginx -t'
docker exec -it "$NGX" sh -lc 'nginx -T | sed -n "1,240p"'
docker exec -it "$NGX" sh -lc 'cat /etc/nginx/conf.d/app.conf'
docker exec -it "$NGX" sh -lc 'cat /etc/nginx/maps/mirror_rules.map'
docker exec -it "$NGX" sh -lc 'cat /etc/nginx/upstreams/main_upstream.conf'
docker exec -it "$NGX" sh -lc 'cat /etc/nginx/upstreams/shadow_upstream.conf'
docker exec -it "$NGX" sh -lc 'ls -la /etc/nginx/shadow-servers && for f in /etc/nginx/shadow-servers/*.conf; do [ -e "$f" ] && echo "===== $f =====" && cat "$f"; done'
```

## 7) Reload an toan sau khi sua config

```bash
docker compose --env-file .env up -d --force-recreate nginx
```

Neu chi can reload trong container:

```bash
NGX=$(docker ps --filter "label=com.docker.compose.service=nginx" --format '{{.Names}}' | head -n1)
docker exec -it "$NGX" sh -lc 'nginx -t && nginx -s reload'
```

## 8) Checklist nhanh

- [ ] Co peer file trong `./.nginx/runtime/shadow-servers/*.conf`
- [ ] `nginx -t` pass
- [ ] POST `/api/...` tao duoc request test
- [ ] `app.error.log` co `subrequest: "/__shadow"`
- [ ] Shadow target khong bi `connect refused`/`timeout`
- [ ] `shadow.mirror.log` co dong moi
