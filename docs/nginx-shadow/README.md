# Nginx Shadow/Mirror Template (Tailscale IPs) - v2 (with audit logs)

Có sẵn:
- Mirror traffic (shadow) không ảnh hưởng request chính
- Shadow backends động: mỗi IP là 1 file
- Chống loop bằng header X-Shadow
- Filter theo METHOD/PATH
- Audit log riêng: /var/log/nginx/shadow.mirror.log

Quick start:
- Copy vào /etc/nginx/ theo cấu trúc trong zip
- Sửa upstream chính ở upstreams/main_upstream.conf
- Sửa rules ở maps/mirror_rules.map
- Add IP: scripts/shadow-add.sh 100.64.12.34 3000
- Remove IP: scripts/shadow-rm.sh 100.64.12.34

Audit:
- tail -f /var/log/nginx/shadow.mirror.log
