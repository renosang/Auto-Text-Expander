// Auto Text Expander - Background Service Worker (Manifest V3)

const DEFAULT_SNIPPETS = [
  {
    id: "default-1",
    shortcut: ":email",
    label: "Email cá nhân",
    content: "contact@example.com",
    renderRichText: false,
    category: "personal",
    tags: ["email", "contact"],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-2",
    shortcut: ":sig",
    label: "Chữ ký công việc Markdown",
    content: "**Trân trọng,**\n\n**Nguyễn Văn A** | *Senior Product Specialist*\n- Phone: `+84 987 654 321`\n- Website: [mycompany.vn](https://mycompany.vn)\n\n{{cursor}}",
    renderRichText: true,
    category: "work",
    tags: ["signature", "email", "work"],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-3",
    shortcut: ":cskh",
    label: "Mẫu CSKH - Xác nhận đơn hàng",
    content: "Chào bạn **{{name:Quý khách}}**,\n\nĐơn hàng **#{{order_id:DH-1001}}** của bạn đã được tiếp nhận vào lúc {{time}} ngày {{date}}.\n- Trạng thái vận chuyển: **{{choice:Hỏa tốc 2h|Tiêu chuẩn 2-3 ngày|Giao tiết kiệm}}**\n- Địa chỉ giao hàng: {{cursor}}\n\nCảm ơn bạn đã tin tưởng ủng hộ!",
    renderRichText: true,
    category: "support",
    tags: ["cskh", "order", "support"],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-4",
    shortcut: ":meeting",
    label: "Mẫu mời họp nhanh",
    content: "Chào team,\n\nMình xin phép gửi link tham gia buổi họp thảo luận tiến độ dự án:\n- **Thời gian:** 10:00 AM ({{date+1d:DD/MM/YYYY}})\n- **Phòng họp:** [Google Meet](https://meet.google.com/abc-def-xyz)\n\nNội dung chính:\n{{cursor}}\n\nHẹn gặp lại mọi người!",
    renderRichText: true,
    category: "work",
    tags: ["meeting", "work"],
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-5",
    shortcut: ":addr",
    label: "Địa chỉ văn phòng",
    content: "Tầng 12, Tòa nhà Landmark, 123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    renderRichText: false,
    category: "general",
    tags: ["address", "office"],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

const DEFAULT_SETTINGS = {
  enabled: true,
  urlMode: "blacklist", // 'blacklist' hoặc 'whitelist'
  urlRules: [
    "banking.example.com",
    "*://password-manager.com/*"
  ],
  triggerType: "immediate", // 'immediate' (ngay khi gõ xong từ khóa) hoặc 'delimiter' (khi gõ thêm Space/Enter)
  soundFeedback: false,
  theme: "dark"
};

chrome.runtime.onInstalled.addListener(async (details) => {
  // Khởi tạo dữ liệu mẫu nếu chưa có
  const data = await chrome.storage.local.get(["snippets", "settings"]);
  const updates = {};

  if (!data.snippets || !Array.isArray(data.snippets)) {
    updates.snippets = DEFAULT_SNIPPETS;
  }
  if (!data.settings) {
    updates.settings = DEFAULT_SETTINGS;
  } else {
    // Merge với defaults đề phòng thiếu trường
    updates.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  // Khởi tạo Context Menu
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "open-options",
        title: "Auto Text Expander - Mở Quản lý Phím tắt",
        contexts: ["action", "editable"]
      });
    });
  } catch (err) {
    console.error("Context menu init error:", err);
  }

  console.log("Auto Text Expander đã cài đặt thành công!");
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});
