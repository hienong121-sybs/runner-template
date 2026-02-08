### Bổ sung cli:

- name: `runner-template-createtunnel` (name cli)
- Mục đích: chạy các lệnh cloudflared để tạo tunnel và dns record
  - `cloudflared tunnel create ten-tunnel`
  - `cloudflared tunnel route dns ten-tunnel subdomain.domain.com`
- Cách thức: viết chung vào `runner-template-copy.js` nhưng bổ sung thêm CLI để thực hiện

### Task

- [ ] Duyệt tất cả biến môi trường cái nào có Prefix là `CLOUDFLARED_TUNNEL_NAME_` và
      `CLOUDFLARED_TUNNEL_DOMAIN_00=` (ví dụ: CLOUDFLARED_TUNNEL_NAME_00= và CLOUDFLARED_TUNNEL_DOMAIN_00=) thì thực hiện tạo tunnel và dns record kèm theo, tương ứng tunnel name và domain. - Khi tạo xong, sẽ lấy file `cloudflared-credentials.json`, để đặt vào cwd hiện tại, hãy tìm tài liệu cloudflare xem có trỏ đường dẫn của file đầu ra này hông, nếu hông thì tìm theo mặc định, file nào mới được tạo sẽ lấy file đó sử dụng, chép qua cwd hiện tại, đồng thời chèn thêm 2 thông tin vào json đó là `tunnel_name` và `tunnul_domain` và file json đó. `{ "AccountTag": "", "TunnelSecret": "", "TunnelID": "", "Endpoint": "" }`. - Cứ chạy lệnh, vì cloudflare đã login rồi. Chạy lệnh nào thì có log lệnh đó và kết quả thế nào để theo dõi. - Khi lấy các thông tin trong process.env rồi, thì có confirm để bắt đầu thực hiện, có thể hiện tổng số tunnel và domain cần tạo.
- [ ] Hướng dẫn để tạo chạy lệnh này (có kèm điều kiện là cloudflared đã được login)
- [ ] Cập nhật change log
- [ ] Bổ sung Readme.md
