# Quy tắc xây dựng cấu hình Nginx “Shadow / Mirroring” (tổng quát)

✅ Mục tiêu vận hành
- Request chính phải luôn ưu tiên, shadow chỉ là “best effort”
- Danh sách shadow backend thay đổi động (join/leave) nhưng thao tác cập nhật phải đơn giản
- Tránh vòng lặp mirror giữa các node
- Lọc mirror theo METHOD và PATH để giảm tải và tránh “shadow rác”
- Có audit log để biết request nào đã được mirror và đi tới host nào
- Reload phải an toàn, gần như zero-downtime (test trước)

🌿 Cấu trúc thư mục khuyến nghị
- /etc/nginx/conf.d/app.conf
- /etc/nginx/upstreams/{main_upstream.conf,shadow_upstream.conf}
- /etc/nginx/maps/mirror_rules.map
- /etc/nginx/shadow-servers/<ip>.conf

🎒 Mỗi IP = 1 file
- File chỉ chứa 1 dòng: server <ip>:<port> ...;
- Add/remove bằng script, luôn `nginx -t` trước `nginx -s reload`

✨ Anti-loop
- Shadow request phải có header X-Shadow: 1
- Request có X-Shadow=1 tuyệt đối không mirror tiếp
- Shadow endpoint đặt `internal`

🌲 Filter METHOD
- Default: không mirror GET
- Mirror POST/PUT/PATCH/DELETE

🌲 Filter PATH
- Allowlist: /api/
- Blocklist: /health, /metrics, /files, /static, /__shadow*

🧾 Audit log shadow
- Log riêng: /var/log/nginx/shadow.mirror.log
- Trường quan trọng: mirror_id, method, uri, upstream_addr, upstream_status, upstream_response_time
- Dùng X-Mirror-Id để correlation

🛡️ Timeout shadow
- proxy_connect_timeout 200ms
- proxy_read_timeout 1s
- proxy_send_timeout 1s

🔁 Reload an toàn
- nginx -t
- nginx -s reload
