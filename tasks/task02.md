### Task: Thêm CLI runner-template-patch-env

- Dựa vào cli hiện tại, `runner-template.js`,`runner-template-tailscale.js`,...
- Thêm `runner-template-patch-env.js` để thực hiện các nghiệp vụ sau:
  - Truyền file `.env` trong args
  - Tìm các giá trị trong file nếu có ghi chú base64 từ file nào, thì xử lý theo, đọc file, chuyển nội dung thành base64, rồi gán lại file `.env`
  - Ví dụ: # Path: ./cloudflared-config.yml => đây là cú pháp đường dẫn

  ```
    # Path: ./cloudflared-config.yml
    CLOUDFLARED_CONFIG_YML_BASE64=
    # Path: ./cloudflared-credentials.json
    CLOUDFLARED_CREDENTIALS_JSON_BASE64=
  ```

  - Có log các env đã cập nhật, từ file nào.

Lưu ý: Các yêu cầu thực hiện theo:

### Rule xử lý thêm:

- Xử lý thêm: Các nghiệp vụ đã thực hiện phải ghi nhận lại trong @.codex/changelogs, mục đích để ghi nhận lại nhật ký thay đổi của codex thực hiện thôi. (Các luồng khác vẫn bình thường)
- Các thông tin ghi nhận lại:
  - Nội dung yêu cầu thay đổi, có phân theo chi tiết từng phần, -[]....
  - Cấu hình cần thay đổi nếu cần, như .env,....
  - Tóm tắt các nội dung thay đổi, tổng hợp chỉnh gì, bao nhiêu file
  - Ghi nhận chi tiết các thay đổi, có git diff, có mô tả thay đổi làm gì, mục đích làm gì, có file, line thay đổi, ghi nhận thêm link tài liệu nếu có.
  - Viết commit message để cập nhật thay đổi.
- Tổ chức lưu file, quản lý tên file theo ngày `codex-YYYYMMDD-{index trong ngày}.md` và lưu trong `@.codex/changelogs`
