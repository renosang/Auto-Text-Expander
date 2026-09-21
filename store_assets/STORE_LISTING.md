# Hướng Dẫn & Nội Dung Đăng Tải Lên Chrome Web Store

Tài liệu này cung cấp sẵn toàn bộ nội dung văn bản, mô tả, từ khóa SEO và bản giải trình quyền hạn (Permission Justification) để bạn chỉ cần sao chép và dán vào **Chrome Web Store Developer Dashboard** khi đăng tải.

---

## 1. Thông Tin Cơ Bản (Store Metadata)

- **Tên tiện ích (Extension Name):** `Auto Text Expander & Form Macro Automation`
- **Tên viết tắt (Short Name):** `Auto Text Expander`
- **Mô tả ngắn tiếng Việt (Dưới 132 ký tự):**
  `Tự động mở rộng từ khóa phím tắt, hỗ trợ Markdown và ghi - chạy kịch bản tự động điền form, chọn dropdown chuẩn xác 100%.`
- **Mô tả ngắn tiếng Anh (Under 132 characters):**
  `Auto text expander with Markdown support and smart form macro recorder/replayer with 100% precision dropdown automation.`
- **Danh mục (Category):** `Productivity` (Năng suất) hoặc `Workflow & Planning` (Quy trình & Lập kế hoạch)

---

## 2. Mô Tả Chi Tiết (Detailed Description - Dưới 16.000 ký tự)

*(Sao chép toàn bộ đoạn dưới đây dán vào ô "Detailed Description" trên Chrome Web Store Developer Console)*

```text
⚡ TIẾT KIỆM HÀNG GIỜ GÕ PHÍM VÀ NHẬP LIỆU LẶP LẠI VỚI AUTO TEXT EXPANDER & FORM AUTOMATION!

Bạn có đang mệt mỏi vì phải gõ đi gõ lại cùng một câu trả lời email, cùng một đoạn tin nhắn chăm sóc khách hàng, hay phải điền đi điền lại hàng chục trường thông tin trên biểu mẫu web mỗi ngày? 

Auto Text Expander là giải pháp toàn diện thế hệ mới kết hợp giữa:
1. Trình mở rộng phím tắt văn bản thông minh (Text Expansion & Rich Markdown).
2. Công cụ ghi và tự động hóa thao tác biểu mẫu chuẩn Production (Form Macro Automation).

Chỉ cần gõ một từ khóa viết tắt ngắn (ví dụ: :email, :sig, :cbreply), tiện ích sẽ lập tức thay thế thành văn bản hoàn chỉnh hoặc tự động điền form, chọn dropdown và bấm gửi thay cho bạn!

---------------------------------------------------
🚀 CÁC TÍNH NĂNG ĐỘT PHÁ NỔI BẬT:
---------------------------------------------------

1. TỰ ĐỘNG HÓA BIỂU MẪU CHUẨN PRODUCTION (FORM MACRO RECORD & REPLAY):
- Ghi thao tác 1-Click: Bấm "Ghi Thao Tác" và tương tác trên trang web như bình thường (nhập tiêu đề, điền nội dung, lựa chọn dropdown, bấm nút gửi).
- Thuật toán Dropdown chuẩn xác tối đa 100%:
  + Hỗ trợ hoàn hảo cả thẻ <select> chuẩn HTML5 lẫn các thư viện Custom Dropdown / ARIA Combobox hiện đại: Ant Design, Material-UI, React-Select, Radix UI / Shadcn, Tailwind Headless UI, Bootstrap, Select2, Choices.js,...
  + Cơ chế Tự Mở Trigger Thông Minh (Autonomous Triggering): Tự động tìm kiếm và mở menu dropdown nếu menu đang đóng.
  + Thuật toán so khớp Option 6 cấp: Khớp chính xác, chuẩn hóa Unicode NFC, tự động loại bỏ tiền tố số thứ tự (1., 2.), tự động so khớp tiếng Việt không dấu, khớp chuỗi con và từ khóa.
  + Tương thích sâu với các Framework lớn: React 16-19 (Bypass ValueTracker), Vue 2/3, Angular Reactive Forms.
- Chế độ kiểm soát tốc độ & an toàn: Tùy chọn 3 chế độ thực thi:
  + An Toàn & Chuẩn Xác (Safe Mode - 200ms): Khuyên dùng cho Production, tự động đợi tải dữ liệu API.
  + Cân Bằng (Balanced - 100ms): Nhanh gọn cho các form nội bộ.
  + Siêu Tốc (Turbo - 40ms): Xử lý tức thì trong nháy mắt.
- Cơ chế Dừng An Toàn & Phím Thoát Khẩn Cấp (ESC): Luôn hiển thị thanh tiến trình trực quan (Visual Highlight) và cho phép nhấn ESC để dừng ngay lập tức, ngăn ngừa tối đa việc điền nhầm dữ liệu.

2. MỞ RỘNG TỪ KHÓA THÔNG MINH (TEXT EXPANSION):
- Tạo không giới hạn số lượng phím tắt viết tắt.
- Chèn nhanh email mẫu, câu trả lời hỗ trợ khách hàng, đoạn code lập trình, thông tin thanh toán, địa chỉ công ty,...
- Kích hoạt tức thì ngay khi vừa gõ xong từ khóa hoặc kích hoạt sau dấu cách / phím Enter.
- Giao diện Popup & Dashboard quản lý tìm kiếm phím tắt cực nhanh.

3. HỖ TRỢ ĐỊNH DẠNG MARKDOWN & RICH TEXT CAO CẤP:
- Soạn thảo phím tắt với cú pháp Markdown tiện lợi: In đậm (**text**), In nghiêng (*text*), Tiêu đề (##), Gạch đầu dòng, Bảng biểu (Table), Mã code, Chèn liên kết,...
- Thanh công cụ định dạng trực quan (Toolbar) tích hợp sẵn.
- Xem trước trực tiếp theo thời gian thực (Live Markdown Preview).
- Tự động chuyển đổi thành Rich Text (HTML định dạng chuẩn) khi gõ trên các trình soạn thảo phong phú như Gmail, Google Docs, Notion, Slack, Zendesk, Jira,...

4. PHÒNG THỬ NGHIỆM TƯƠNG TÁC TRỰC QUAN (TEST LAB):
- Cho phép bạn kiểm tra ngay phím tắt hoặc kịch bản biểu mẫu vừa tạo TRƯỚC KHI LƯU.
- Tích hợp sẵn: Ô nhập 1 dòng, khung văn bản nhiều dòng, trình soạn thảo phong phú WYSIWYG và các loại Dropdown mẫu (Native Select & Custom Combobox).

5. KIỂM SOÁT BẬT/TẮT LINH HOẠT THEO TỪNG TRANG WEB (URL RULES):
- Chế độ Blacklist: Hoạt động trên mọi trang web, ngoại trừ danh sách các trang bạn muốn bảo vệ (như cổng ngân hàng, ví điện tử).
- Chế độ Whitelist: Chỉ hoạt động duy nhất trên các trang web và tên miền được bạn chỉ định (ví dụ: crm.company.com, mail.google.com).
- Công tắc bật/tắt nhanh 1-Click ngay trên Popup tiện ích.

6. SAO LƯU & ĐỒNG BỘ DỮ LIỆU DỄ DÀNG (IMPORT / EXPORT):
- Xuất dữ liệu ra file JSON để sao lưu hoặc chuyển đổi sang máy tính khác.
- Xuất dữ liệu ra file CSV tương thích hoàn hảo với Microsoft Excel và Google Sheets để chỉnh sửa hàng loạt nhanh chóng.
- Nhập dữ liệu linh hoạt: Hỗ trợ chế độ Hợp nhất (Merge) hoặc Ghi đè (Overwrite).

7. AN TOÀN, BẢO MẬT & TÔN TRỌNG QUYỀN RIÊNG TƯ TUYỆT ĐỐI:
- Tuân thủ nghiêm ngặt tiêu chuẩn bảo mật Google Chrome Manifest V3.
- 100% dữ liệu được lưu trữ cục bộ (Local Storage) trên máy tính của bạn.
- Hoạt động hoàn toàn Offline: KHÔNG gửi dữ liệu ra máy chủ bên ngoài, KHÔNG theo dõi hành vi người dùng, KHÔNG chứa quảng cáo.

---------------------------------------------------
💡 VÍ DỤ ỨNG DỤNG THỰC TẾ:
---------------------------------------------------

- Chăm sóc khách hàng & Bán hàng:
  + Gõ `:cbreply` ➔ Tự động mở ticket CRM, điền lời chào, đổi trạng thái sang "Đang xử lý", gán phòng ban "Hỗ trợ kỹ thuật" và bấm cập nhật.
  + Gõ `:thanks` ➔ Tự động bung ra: "Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!"
- Nhân sự & Tuyển dụng:
  + Gõ `:interview` ➔ Bung ra thư mời phỏng vấn có đầy đủ ngày giờ, link Google Meet và tài liệu đính kèm.
- Kỹ sư phần mềm & IT:
  + Gõ `:standup` ➔ Tự động bung ra mẫu báo cáo tiến độ Daily Meeting định dạng Markdown.
- Cá nhân & Văn phòng:
  + Gõ `:email` ➔ contact@mycompany.vn
  + Gõ `:bank` ➔ Thông tin tài khoản ngân hàng chi tiết kèm cú pháp chuyển khoản.

---------------------------------------------------
🛠️ HƯỚNG DẪN BẮT ĐẦU NHANH TRONG 3 BƯỚC:
---------------------------------------------------

1. Cài đặt tiện ích và bấm vào biểu tượng Auto Text Expander trên thanh công cụ trình duyệt.
2. Quản lý phím tắt: Bấm "Mở Trang Quản Lý" để thêm các từ khóa viết tắt bạn hay dùng.
3. Tự động hóa biểu mẫu: Mở trang web cần điền form ➔ Bấm icon tiện ích ➔ Chọn "Ghi Thao Tác" ➔ Thao tác trên form và bấm "Dừng & Lưu". Từ nay về sau, kịch bản sẽ tự động chạy mỗi khi bạn gõ từ khóa!

Cài đặt ngay Auto Text Expander & Form Automation để giải phóng đôi tay và tối ưu hóa năng suất làm việc của bạn ngay hôm nay!
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
