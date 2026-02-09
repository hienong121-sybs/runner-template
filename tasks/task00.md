### Task

- Điều chỉnh `nginx\default.conf.template`, khi vào location /cwd sẽ trả về json như sau:

```
{
	cwd: ${HOST_CWD},
	startTime: lấy ngày giờ hiện tại khi khởi động lên
}
```

- Thêm service: `docker-compose.yml`: `pull-data`, dùng để lấy data của runner trước đó về làm ddataa để chạy lên.
  - Xác định runner trước đó, dùng `tailscale status --json` để lấy tất cả máy đang chạy (có loại trừ chính nó), đang active, nghĩa là đang chạy, xác định được ip của tailscale, dùng curl tới ip đó để lấy cwd, curl: http://ip/cwd => trả về json ở bước trên.
  - Dùng rsync để lấy toàn bộ dữ liệu về thư mục cwd hiện tại, dùng ssh ip để sao chạy, có cấu hình danh sách các thư mục cần sync, ví dụ: .pocketbase, thì remote sẽ dựa vào cwd lấy ở bước trên, và pull về cùng tên, .pocketbase. (danh sách thư mục này cấu hình trong env)
  - Có chi tiết log các file nào, đường dẫn remote, đường dẫn local, có size, ... (có loại trừ thư mục .git phía bên trong).
