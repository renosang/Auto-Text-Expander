# Hướng Dẫn & Nội Dung Đăng Tải Lên Chrome Web Store

Tài liệu này cung cấp sẵn toàn bộ nội dung văn bản, mô tả, từ khóa SEO và bản giải trình quyền hạn (Permission Justification) để bạn chỉ cần sao chép và dán vào **Chrome Web Store Developer Dashboard** khi đăng tải.

---

## 1. Thông Tin Cơ Bản (Store Metadata)

- **Tên tiện ích (Extension Name):** `Auto Text Expander - Shortcut & Markdown Text Replacer`
- **Tên viết tắt (Short Name):** `Auto Text Expander`
- **Mô tả ngắn (Short Description - Dưới 132 ký tự):**
  `Tự động mở rộng từ khóa phím tắt thành văn bản, hỗ trợ Markdown, Rich Text, bật/tắt theo URL và kiểm tra trước khi lưu.`
- **Danh mục (Category):** `Productivity` (Năng suất) hoặc `Workflow & Planning`

---

## 2. Mô Tả Chi Tiết (Detailed Description)

*(Sao chép toàn bộ đoạn dưới đây dán vào mục "Detailed Description" trên Chrome Web Store)*

```text
⚡ Tiết kiệm hàng giờ gõ văn bản lặp đi lặp lại với Auto Text Expander!

Auto Text Expander là tiện ích mở rộng thông minh giúp bạn tự động thay thế các từ khóa viết tắt ngắn thành đoạn văn bản dài, email mẫu, chữ ký công việc hoặc tin nhắn chăm sóc khách hàng chỉ trong chớp mắt.

Điểm đặc biệt: Hỗ trợ hoàn hảo cú pháp Markdown và chuyển đổi sang Rich Text đẹp mắt trên các trình soạn thảo phong phú như Gmail, Notion, Google Docs, Slack, Facebook,...

---------------------------------------------------
🌟 CÁC TÍNH NĂNG NỔI BẬT:
---------------------------------------------------

1. TẠO VÀ QUẢN LÝ PHÍM TẮT DỄ DÀNG (CRUD):
- Thêm, sửa, xóa và lưu phím tắt với giao diện Dashboard trực quan, hiện đại.
- Tìm kiếm nhanh chóng theo từ khóa, nhãn hoặc nội dung.
- Không giới hạn số lượng phím tắt.

2. HỖ TRỢ ĐỊNH DẠNG VĂN BẢN MARKDOWN & RICH TEXT:
- Soạn thảo nội dung phím tắt bằng cú pháp Markdown tiện lợi: In đậm (**text**), In nghiêng (*text*), Tiêu đề (##), Gạch đầu dòng, Bảng biểu, Chèn link,...
- Thanh công cụ định dạng nhanh tích hợp sẵn.
- Xem trước trực tiếp (Live Markdown Preview) theo thời gian thực.
- Tự động chuyển đổi thành Rich Text (HTML an toàn) khi gõ trên Gmail, Notion, Slack.

3. Ô THỬ NGHIỆM TƯƠNG TÁC (TEST PLAYGROUND):
- Cho phép bạn gõ thử ngay phím tắt vừa nhập để kiểm tra xem nó có mở rộng chính xác không TRƯỚC KHI BẤM LƯU.
- Phòng thử nghiệm riêng biệt (Test Lab) với cả ô nhập tiêu chuẩn và trình soạn thảo phong phú.

4. BẬT VÀ TẮT LINH HOẠT THEO TỪNG URL:
- Hỗ trợ 2 chế độ: Blacklist (Chặn các trang nhạy cảm như ngân hàng) hoặc Whitelist (Chỉ chạy trên các trang được chọn).
- Nút gạt bật/tắt 1-click ngay trên thanh công cụ duyệt web (Popup) cho từng website cụ thể.

5. SAO LƯU & KHÔI PHỤC DỮ LIỆU (IMPORT / EXPORT):
- Xuất dữ liệu ra file JSON để sao lưu trọn vẹn cài đặt.
- Xuất dữ liệu ra file CSV tương thích với Microsoft Excel / Google Sheets để dễ dàng chỉnh sửa hàng loạt.
- Nhập dữ liệu với 2 tùy chọn: Hợp nhất (Merge) hoặc Ghi đè (Overwrite).

6. BẢO MẬT & RIÊNG TƯ TUYỆT ĐỐI:
- Tuân thủ chuẩn Manifest V3 mới nhất.
- 100% dữ liệu được lưu cục bộ trên máy tính của bạn (Local Storage).
- Hoạt động offline, KHÔNG thu thập dữ liệu, KHÔNG máy chủ từ xa, KHÔNG quảng cáo.

---------------------------------------------------
💡 VÍ DỤ ỨNG DỤNG NHANH:
---------------------------------------------------
- Gõ `:email` ➔ Tự động bung ra `contact@example.com`
- Gõ `:sig` ➔ Tự động bung ra chữ ký Markdown có định dạng in đậm, email, số điện thoại
- Gõ `:meeting` ➔ Tự động bung ra link Google Meet và lịch họp dự án
- Gõ `:addr` ➔ Tự động bung ra địa chỉ công ty chi tiết

Cài đặt ngay Auto Text Expander để nhân đôi tốc độ soạn thảo văn bản của bạn!
```

---

## 3. Bản Giải Trình Quyền Cho Reviewer (Permission Justification)

Google Chrome Store yêu cầu bạn giải thích vì sao cần từng quyền. Hãy dán nội dung sau vào các ô tương ứng trong tab **Privacy Practices**:

### Quyền `storage`:
`Used exclusively to store user-defined text snippets, shortcuts, markdown templates, and URL whitelist/blacklist rules locally on the user's browser device. No data is transmitted externally.`

### Quyền `contextMenus`:
`Provides a convenient context menu item when right-clicking on editable fields or web pages to allow users to quickly open the Options/Dashboard management page.`

### Quyền `host_permissions: ["<all_urls>"]`:
`Required to inject a lightweight content script across web pages where users type text (such as email clients, word processors, CMS, and chat applications). The extension listens to keystrokes solely to detect user-configured shortcut triggers and replace them with expanded text/rich text templates. No keystrokes or browsing activities are monitored, stored remotely, or transmitted to any third party.`

### Mục đích đơn nhất (Single Purpose Description):
`The single purpose of this extension is to provide a customizable text expansion and typing shortcut tool that automatically expands user-defined keywords into full text or markdown-formatted content across web input fields.`

---

## 4. Hướng Dẫn Đóng Gói (Package & Zip) Để Tải Lên

1. Đảm bảo thư mục extension chứa đầy đủ:
   - `manifest.json`
   - `background.js`
   - `content/` (content.js, content.css)
   - `popup/` (popup.html, popup.css, popup.js)
   - `options/` (options.html, options.css, options.js)
   - `lib/` (marked.min.js, purify.min.js)
   - `icons/` (icon16.png, icon32.png, icon48.png, icon128.png)
2. **Loại bỏ** các thư mục không cần thiết cho Store build như `node_modules/`, `package.json`, `package-lock.json`, `generate-icons.js`.
3. Nén tất cả các file trong thư mục tiện ích thành file `auto-text-expander.zip`.
4. Truy cập [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), nhấn **Add new item** và tải file `.zip` lên!
