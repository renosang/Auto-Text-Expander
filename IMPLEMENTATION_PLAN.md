# Kế Hoạch Triển Khai Nâng Cấp Tính Năng (Implementation Plan)
**Dự Án:** Auto Text Expander (Chrome Extension MV3)  
**Tác Giả:** RenoSang  
**Cập nhật lần cuối:** 21/09/2026

---

## 📌 Bảng Tiến Độ Tổng Thể (Progress Tracker)

- [x] **Giai Đoạn 1: Nhóm Biến Động & Điền Dữ Liệu Tương Tác (Dynamic Variables & Fill-in)** *(Đã hoàn thành 100%)*
  - [x] Thêm quyền `clipboardRead` vào [manifest.json](file:///c:/Users/RenoSang/Videos/Macro-Vercel/Auto%20Text%20Expander/manifest.json)
  - [x] Bộ xử lý biến động `{{date}}`, `{{time}}`, `{{clipboard}}`, `{{url}}`, `{{domain}}`, `{{title}}` trong [content/content.js](file:///c:/Users/RenoSang/Videos/Macro-Vercel/Auto%20Text%20Expander/content/content.js)
  - [x] Bộ định vị con trỏ thông minh `{{cursor}}` cho Input, Textarea và ContentEditable
  - [x] Popup điền dữ liệu tương tác (Interactive Fill-in Modal) cho biến `{{name}}`, `{{choice:...}}`
  - [x] Cấu trúc dữ liệu Phân loại (Category) & Thẻ (Tags)
  - [x] Giao diện lọc Thư mục / Danh mục trong [options/options.html](file:///c:/Users/RenoSang/Videos/Macro-Vercel/Auto%20Text%20Expander/options/options.html)
  - [x] Thanh công cụ chèn biến nhanh (Variable Toolbar) trong Editor
  - [x] Cập nhật giao diện [popup/popup.html](file:///c:/Users/RenoSang/Videos/Macro-Vercel/Auto%20Text%20Expander/popup/popup.html) hiển thị Category & tìm kiếm theo tag
  - [x] Kiểm thử toàn diện trên React Form, ContentEditable & Test Lab

- [ ] **Giai Đoạn 2: Command Palette Nổi Toàn Cục (Spotlight / Raycast-style)** *(Kế hoạch tiếp theo)*
  - [ ] Thanh tìm kiếm nổi toàn cục (`Alt + S`) trên mọi trang web
  - [ ] Xem trước nội dung Markdown và phím tắt điều hướng nhanh (↑, ↓, Enter)

- [ ] **Giai Đoạn 3: Batch Form Automation & AI Inline Writing** *(Nâng cao)*
  - [ ] Tự động hóa điền form hàng loạt theo danh sách Excel / CSV
  - [ ] Tích hợp AI Trợ lý gõ tắt trực tiếp (`//ai [lệnh]`)
  - [ ] Đồng bộ dữ liệu đám mây qua Chrome Storage Sync

---

## 🎯 Chi Tiết Kỹ Thuật Giai Đoạn 1

### 1. Cú Pháp Biến Động Hỗ Trợ
| Cú Pháp | Mô Tả | Ví Dụ Kết Quả |
| :--- | :--- | :--- |
| `{{date}}` | Ngày hiện tại chuẩn Việt Nam | `21/09/2026` |
| `{{date:YYYY-MM-DD}}` | Ngày theo format tuỳ biến | `2026-09-21` |
| `{{date+7d}}` | Ngày trong tương lai (+7 ngày) | `28/09/2026` |
| `{{time}}` | Giờ hiện tại (HH:mm) | `21:25` |
| `{{clipboard}}` | Nội dung văn bản vừa copy | *(Văn bản trong clipboard)* |
| `{{url}}` | Địa chỉ trang web hiện tại | `https://mail.google.com/...` |
| `{{title}}` | Tiêu đề tab hiện tại | `Hộp thư đến - Gmail` |
| `{{cursor}}` | Vị trí đặt con trỏ sau khi mở rộng | *(Không hiển thị chữ, đặt con trỏ)* |

### 2. Danh Mục Phân Loại Mặc Định
* `general`: Chung
* `work`: Công Việc & Văn Phòng
* `support`: Chăm Sóc Khách Hàng (CSKH)
* `personal`: Cá Nhân
* `dev`: Lập Trình & Kỹ Thuật

---

*Ghi chú: File này được tạo để theo dõi tiến độ trực tiếp trong repository của dự án.*
