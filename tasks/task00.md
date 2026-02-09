### Bổ sung cli:

- name: `runner-template-tailscale` (name cli)
- Mục đích: Chạy cập nhật `Access controls` trên tailscale để áp dụng các rule trong body

### Task

- Dựa vào tài liệu của api.tailscale.com để xử lý theo yêu cầu, nếu dùng các `env` phía dưới sẽ cập nhật được thì cập nhật, hông thì thì phải lấy access_token để thực hiện.
- Khi chạy theo lệnh này, nếu thông tin `env` chưa đủ thì cảnh báo và ngưng.
- Có thì thực hiện.
- Viết theo cấu trúc phù hợp với project hiện tại, đồng thời có khả năng mở rộng về sau, đối với cli này, có thể chạy các api khác nếu cần.
- Tách cấu hình body này ở file khác, để có thay đổi khi cần, mà không thay đổi code hiện tại.

### Tailscale API

- env: TAILSCALE_CLIENT_ID
- env: TAILSCALE_CLIENT_SECRET=

```curl
curl --location 'https://api.tailscale.com/api/v2/tailnet/-/acl' \
--header 'Authorization: Bearer *****' \
--header 'Content-Type: application/hujson' \
--data-raw '// Example/default ACLs for unrestricted connections.
{
	// Declare static groups of users. Use autogroups for all users or users with a specific role.
	// "groups": {
	//   "group:example": ["alice@example.com", "bob@example.com"],
	// },
	// Define the tags which can be applied to devices and by which users.
	// "tagOwners": {
	//   "tag:example": ["autogroup:admin"],
	// },
	// Define grants that govern access for users, groups, autogroups, tags,
	// Tailscale IP addresses, and subnet ranges.
	"grants": [
		// Allow all connections.
		// Comment this section out if you want to define specific restrictions.
		{
			"src": [
				"*",
			],
			"dst": [
				"*",
			],
			"ip": [
				"*",
			],
		},
		// Allow users in "group:example" to access "tag:example", but only from
		// devices that are running macOS and have enabled Tailscale client auto-updating.
		// {"src": ["group:example"], "dst": ["tag:example"], "ip": ["*"], "srcPosture":["posture:autoUpdateMac"]},
	],
	// Define postures that will be applied to all rules without any specific
	// srcPosture definition.
	// "defaultSrcPosture": [
	//      "posture:anyMac",
	// ],
	// Define device posture rules requiring devices to meet
	// certain criteria to access parts of your system.
	// "postures": {
	//      // Require devices running macOS, a stable Tailscale
	//      // version and auto update enabled for Tailscale.
	//  "posture:autoUpdateMac": [
	//      "node:os == 'macos'",
	//      "node:tsReleaseTrack == 'stable'",
	//      "node:tsAutoUpdate",
	//  ],
	//      // Require devices running macOS and a stable
	//      // Tailscale version.
	//  "posture:anyMac": [
	//      "node:os == 'macos'",
	//      "node:tsReleaseTrack == 'stable'",
	//  ],
	// },
	// Define users and devices that can use Tailscale SSH.
	"ssh": [
		{
			"action": "accept",
			"src":    ["tag:ci"],
			"dst":    ["tag:ci"],
			"users":  ["autogroup:nonroot", "root"],
		},
	],
	"tagOwners": {
		"tag:ci": ["autogroup:admin"],
	},
	// Test access rules every time they're saved.
	// "tests": [
	//   {
	//       "src": "alice@example.com",
	//       "accept": ["tag:example"],
	//       "deny": ["100.101.102.103:443"],
	//   },
	// ],
}
'
```
