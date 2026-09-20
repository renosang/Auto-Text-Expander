# Auto Text Expander (Chrome Extension - Manifest V3)

Tiện ích mở rộng Google Chrome giúp tự động mở rộng từ khóa phím tắt thành văn bản, hỗ trợ định dạng **Markdown**, chuyển đổi **Rich Text**, hoạt động trên mọi trang web và tương thích hoàn toàn với các biểu mẫu phức tạp (**React**, **Vue**, **Angular**, **Quill Editor**).

---

## ✨ Tính Năng Nổi Bật

1. **Tự động mở rộng từ khóa (Shortcut Expansion)**:
   - Hỗ trợ cả 2 chế độ: **Kích hoạt tức thì (Immediate)** hoặc **Kích hoạt bằng phím cách/Enter (Delimiter)**.
   - Nhận diện linh hoạt tiền tố như `:email`, `/sig`, `:addr` ngay cả khi gõ nối tiếp sau nội dung có sẵn.

2. **Hỗ trợ Markdown & Rich Text**:
   - Tự động chuyển đổi Markdown thành văn bản định dạng phong phú (in đậm, in nghiêng, tiêu đề, liên kết, danh sách) trong các trình soạn thảo HTML/Rich Text (Gmail, Notion, Google Docs, Quill editor...).
   - **Tự động làm sạch Markdown (Strip Markdown)**: Khi chèn vào các ô văn bản thuần không hỗ trợ HTML (như `<input>`, `<textarea>`), tiện ích tự động loại bỏ các cú pháp Markdown thừa (`**BPLQ**` $\rightarrow$ `BPLQ`), giữ văn bản sạch đẹp và chuyên nghiệp.

3. **Tương thích 100% với React Controlled Inputs**:
   - Sử dụng cơ chế Native Prototype Value Setter và cập nhật `_valueTracker` của React, phát đồng thời `InputEvent` và `ChangeEvent` giúp đồng bộ state Formik, React Hook Form, Redux Form...

4. **Quản Lý Danh Sách Toàn Diện (CRUD)**:
   - Thêm, sửa, xóa, tìm kiếm nhanh danh sách phím tắt với giao diện bảng điều khiển Dashboard hiện đại.
   - Thanh công cụ Markdown nhanh (B, I, H, Link, Code, List, Table) và bộ xem trước (Live Preview).
   - Tích hợp ô thử nghiệm nhanh (**Inline Test Box**) và khu vực **Test Lab** trước khi lưu.

5. **Bộ Lọc URL (Blacklist / Whitelist)**:
   - Cho phép bật hoặc tắt tiện ích đối với URL/tên miền bất kỳ.
   - Nút bật/tắt nhanh ngay trên popup trình duyệt theo domain hiện tại.

6. **Sao Lưu & Phục Hồi Dữ Liệu**:
   - Hỗ trợ Xuất/Nhập dữ liệu với 2 định dạng: **JSON** và **CSV (UTF-8 BOM hỗ trợ Excel tiếng Việt)**.
   - Tùy chọn Nhập gộp (Merge) hoặc Ghi đè toàn bộ (Overwrite).

7. **Giao Diện Kép (Dual Theme - Sáng & Tối)**:
   - Hỗ trợ 2 chế độ màu: **Giao diện Tối (Dark Obsidian)** và **Giao diện Sáng (Light Snow)** với độ tương phản cao, chuyển đổi mượt mà.

---

## 📁 Cấu Trúc Dự Án

```text
├── manifest.json         # Cấu hình Manifest V3 chuẩn Chrome Web Store
├── background.js          # Service worker khởi tạo dữ liệu và Context Menus
├── content/               # Content scripts chạy trên các trang web
│   ├── content.js         # Logic bắt phím, React bypass, strip markdown, rich text
│   └── content.css        # Toast thông báo mở rộng phím tắt
├── options/               # Trang quản trị cài đặt & Dashboard
│   ├── options.html
│   ├── options.css
│   └── options.js
├── popup/                 # Menu popup nhanh trên thanh công cụ
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── lib/                   # Thư viện offline (Tuân thủ CSP)
│   ├── marked.min.js
│   └── purify.min.js
├── icons/                 # Bộ icon chuẩn kích thước (16, 32, 48, 128)
├── store_assets/          # Tài liệu đăng tải Store (Privacy Policy, Listing)
├── build-zip.js           # Script tự động đóng gói file zip tải lên Store
└── package.json
```

---

## 🚀 Hướng Dẫn Cài Đặt Dành Cho Lập Trình Viên

1. **Clone repository về máy**:
   ```bash
   git clone https://github.com/renosang/Auto-Text-Expander.git
   cd Auto-Text-Expander
   ```

2. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

3. **Cài đặt vào Google Chrome**:
   - Mở Google Chrome và truy cập `chrome://extensions/`
   - Bật **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
   - Nhấn nút **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục `Auto-Text-Expander`.

4. **Đóng gói file ZIP tải lên Chrome Web Store**:
   ```bash
   npm run package
   ```
   File nén sẽ được tạo tự động tại `dist/auto-text-expander-v1.0.0.zip`.

---

## 📄 Bản Quyền & Giấy Phép

Phát triển bởi [RenoSang](https://github.com/renosang). Giấy phép MIT.
