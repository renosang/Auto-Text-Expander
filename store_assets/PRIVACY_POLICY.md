# Chính Sách Bảo Mật (Privacy Policy) - Auto Text Expander

**Cập nhật lần cuối:** 20/09/2026

Tiện ích mở rộng **Auto Text Expander** ("chúng tôi", "tiện ích") tôn trọng và cam kết bảo vệ quyền riêng tư tuyệt đối của người dùng. Bản chính sách bảo mật này giải thích cách tiện ích xử lý dữ liệu của bạn theo đúng các quy định và chính sách của **Google Chrome Web Store Developer Program Policies**.

---

## 1. Thu Thập Dữ Liệu (Data Collection)

**Auto Text Expander KHÔNG thu thập, lưu trữ từ xa, theo dõi, hay truyền tải bất kỳ dữ liệu cá nhân nào của bạn.**

- **Nội dung gõ phím & Phím tắt:** Toàn bộ danh sách từ khóa shortcut, nhãn gợi nhớ, và nội dung văn bản mở rộng bạn tạo được lưu trữ **100% cục bộ (locally)** trên thiết bị của bạn thông qua bộ nhớ `chrome.storage.local` của trình duyệt.
- **Không có máy chủ ngoài (Zero Remote Servers):** Tiện ích hoạt động hoàn toàn ngoại tuyến (offline). Không có bất kỳ máy chủ phân tích (analytics), máy chủ theo dõi (tracking), hoặc máy chủ quảng cáo nào được kết nối.
- **Không theo dõi lịch sử duyệt web:** Tiện ích chỉ kiểm tra URL hiện tại nhằm mục đích so khớp danh sách Bật/Tắt (Blacklist / Whitelist) do chính bạn cài đặt. Chúng tôi không lưu lại bất kỳ lịch sử trang web nào bạn đã truy cập.

---

## 2. Giải Trình Quyền Hạn (Permissions Justification)

Để hoạt động như một công cụ mở rộng văn bản, tiện ích chỉ yêu cầu các quyền hạn tối thiểu sau:

| Quyền | Mục đích sử dụng |
| :--- | :--- |
| `storage` | Lưu trữ danh sách phím tắt, nội dung Markdown và cài đặt cấu hình cục bộ trên máy bạn. |
| `contextMenus` | Cho phép người dùng nhấp chuột phải trên trang web để mở nhanh trang Quản lý phím tắt (Options). |
| `host_permissions: ["<all_urls>"]` | Cho phép tiện ích phát hiện phím tắt và tự động điền văn bản mở rộng khi bạn gõ trên bất kỳ trang web nào (như Gmail, Google Docs, Notion, Facebook,...). Tiện ích chỉ lắng nghe sự kiện gõ phím trên các ô soạn thảo đang được kích hoạt và không gửi dữ liệu ra bên ngoài. |

---

## 3. Bảo Mật và Không Sử Dụng Mã Từ Xa (No Remote Code)

- Tiện ích tuân thủ chuẩn **Manifest V3**.
- Tất cả thư viện (bao gồm trình phân tích Markdown và bộ lọc an toàn DOMPurify) được đóng gói trực tiếp và chạy ngoại tuyến trong tiện ích.
- Tuyệt đối không sử dụng `eval()`, `new Function()` hay bất kỳ nguồn mã nào từ internet.

---

## 4. Chia Sẻ Thông Tin Với Bên Thứ Ba

Vì chúng tôi không thu thập bất kỳ dữ liệu nào, chúng tôi **không bán, không trao đổi, không chia sẻ và không tiết lộ** thông tin người dùng cho bất kỳ bên thứ ba nào dưới bất kỳ hình thức nào.

---

## 5. Quyền Kiểm Soát Dữ Liệu Của Người Dùng

Bạn có toàn quyền kiểm soát dữ liệu của mình:
- **Chỉnh sửa / Xóa:** Bạn có thể thêm, sửa, hoặc xóa từng phím tắt bất kỳ lúc nào trong trang Quản lý.
- **Xuất / Nhập:** Bạn có thể xuất toàn bộ dữ liệu ra file `.json` hoặc `.csv` về máy tính của mình.
- **Gỡ cài đặt:** Khi bạn xóa tiện ích khỏi Chrome, toàn bộ dữ liệu lưu trong `chrome.storage.local` sẽ tự động bị xóa sạch khỏi máy tính.

---

## 6. Thông Tin Liên Hệ

Nếu bạn có bất kỳ câu hỏi hoặc thắc mắc nào liên quan đến Chính sách bảo mật này, xin vui lòng liên hệ qua:
- Email hỗ trợ: `support@autotextexpander.example`
- Trang chủ dự án: `https://github.com/your-username/auto-text-expander`
