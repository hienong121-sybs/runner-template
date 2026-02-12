### Task NodeJS: docker-manager

- Bổ sung service: `docker-manager` để quản lý các machines join vào mạng tailscale, cấu hình vào nginx và reload lại. Đồng thời bổ sung các api để theo dõi logs của các services đang chạy trong dockers hiện tại.
- Service này phải điều khiển các lệnh được đối với các services khác, có log lưu trữ mount ra repo để có thể xem log. Tổ chức theo các chức năng dễ theo dõi.
- Nếu cần các cấu hình .env thì sẽ cấu hình với prefix: `DOCKER_MANAGER_{tên cần cấu hình}`
- Các code đặt trong `docker-manager` và app mount ra `.docker-manager`. Tổ chức code giống như file `@docker-manager\template.js`, nhưng có try catch rõ ràng, log lỗi để bug... Và có khả năng mở rộng theo cấu trúc khi cần.
- Các chức năng liên quan tới `tailscale`
  - Có .env định giờ để kiểm tra các machine join vào mạng bằng lệnh `tailscale status --json`. Lấy danh sách các machine đang active, bỏ qua xử lý `self`, chỉ xử lý các máy khác.
  - Dựa vào kiến trúc của `@nginx` để cập nhật các ip vào các tệp shawdow (mỗi ip 1 file).
  - Nếu có thay đổi, ip remove, ip add thì tiến hành reload lại `nginx`, có check trước khi reload, ok mới reload.
  - Có log theo lần kiểm tra, các ip cũ, các ip mới.
- Các chức năng liên quan tới `dockers`
  - Bổ sung các `api` để kiểm tra trạng thái, xem log đối với các dịch vụ chạy trong docker, hỗ trợ các lệnh thao tác với các container có trong đó.
  - Các api này phải auth thông qua `.htpasswd` của `nginx`
  - Tổ chức dưới path `dockerapi/`, có thể theo cú pháp `dockerapi/{container_name}/{Các lệnh kèm theo}?{tùy chọn}={giá trị}`
  - Kết quả trả về, có text plain, giống như log trong command line.

Lưu ý: Các yêu cầu thực hiện theo:

- Xử lý không `downtime`

- # Mount Docker socket để điều khiển các container khác

```docker
/var/run/docker.sock:/var/run/docker.sock
```

- # 📋 API Endpoints - mẫu, dựa vào đây để thêm các lệnh thường sử dụng

```
Ví dụ: tailscale, ngnix
  - GET: /dockerapi/tailscale/status
  - GET: /dockerapi/tailscale/status?format=json
  - POST: /dockerapi/tailscale/ping
  - GET: /dockerapi/nginx/test
  - GET: /dockerapi/nginx/version
  - GET: /dockerapi/nginx/version
  - GET: /dockerapi/healthz
```

### Rule xử lý thêm:

- Xử lý thêm: Các nghiệp vụ đã thực hiện phải ghi nhận lại trong @.codex/changelogs, mục đích để ghi nhận lại nhật ký thay đổi của codex thực hiện thôi. (Các luồng khác vẫn bình thường)
- Các thông tin ghi nhận lại:
  - Nội dung yêu cầu thay đổi, có phân theo chi tiết từng phần, -[]....
  - Cấu hình cần thay đổi nếu cần, như .env,....
  - Tóm tắt các nội dung thay đổi, tổng hợp chỉnh gì, bao nhiêu file
  - Ghi nhận chi tiết các thay đổi, có git diff, có mô tả thay đổi làm gì, mục đích làm gì, có file, line thay đổi, ghi nhận thêm link tài liệu nếu có.
  - Viết commit message để cập nhật thay đổi.
- Tổ chức lưu file, quản lý tên file theo ngày `codex-YYYYMMDD-{index trong ngày}.md` và lưu trong `@.codex/changelogs`
