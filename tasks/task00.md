### Task Ngnix

- Điều chỉnh luồng việc liên quan tới dịch vụ nginx, hiện tại đang code các script .sh để cấu hình conf để start trong docker, rất phức tạp và khó thay đổi khi cần, khó áp dụng qua các dịch vụ khác. Mục tiêu, chuyển nginx sang dạng shadow mirror nhưng với các cấu hình cố định dựa vào các file.
- Vẫn giữ caddy ở luồng đầu vào để thực lấy ssl
- Bước 1, xem các nghiệp vụ liên quan tới nginx để ghi nhận lại các nghiệp vụ liên quan, các cấu hình liên quan.
- Bước 2: xóa các cấu hình, các code liên quan để chuẩn bị thay thế cái mới.
- Bước 3: đọc `@docs\nginx-shadow`: README, RULE và các file mẫu để chuyển qua theo cách mới. Nhớ gắn các nghiệp vụ, các cấu hình hiện tại qua các mẫu, trong đó có các cấu trúc chuẩn để tuân thủ theo.

Lưu ý: không thay đổi gì trong @docs\nginx-shadow=> dùng để làm mẫu.

### Rule xử lý thêm:

- Xử lý thêm: Các nghiệp vụ đã thực hiện phải ghi nhận lại trong @.codex/changelogs, mục đích để ghi nhận lại nhật ký thay đổi của codex thực hiện thôi. (Các luồng khác vẫn bình thường)
- Các thông tin ghi nhận lại:
  - Nội dung yêu cầu thay đổi, có phân theo chi tiết từng phần, -[]....
  - Cấu hình cần thay đổi nếu cần, như .env,....
  - Tóm tắt các nội dung thay đổi, tổng hợp chỉnh gì, bao nhiêu file
  - Ghi nhận chi tiết các thay đổi, có git diff, có mô tả thay đổi làm gì, mục đích làm gì, có file, line thay đổi, ghi nhận thêm link tài liệu nếu có.
  - Viết commit message để cập nhật thay đổi.
- Tổ chức lưu file, quản lý tên file theo ngày `codex-YYYYMMDD-{index trong ngày}.md` và lưu trong `@.codex/changelogs`
