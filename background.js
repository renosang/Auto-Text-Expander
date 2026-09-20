// Auto Text Expander - Background Service Worker (Manifest V3)

const DEFAULT_SNIPPETS = [
  {
    id: "default-1",
    shortcut: ":email",
    label: "Email cá nhân",
    content: "contact@example.com",
    renderRichText: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-2",
    shortcut: ":sig",
    label: "Chữ ký công việc Markdown",
    content: "**Trân trọng,**\n\n**Nguyễn Văn A** | *Senior Product Specialist*\n- Phone: `+84 987 654 321`\n- Website: [mycompany.vn](https://mycompany.vn)",
    renderRichText: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-3",
    shortcut: ":meeting",
    label: "Mẫu mời họp nhanh",
    content: "Chào bạn,\n\nMình xin phép gửi link tham gia buổi họp thảo luận tiến độ dự án:\n- **Thời gian:** 10:00 AM (Thứ Hai)\n- **Phòng họp:** [Google Meet](https://meet.google.com/abc-def-xyz)\n\nHẹn gặp lại bạn!",
    renderRichText: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "default-4",
    shortcut: ":addr",
    label: "Địa chỉ văn phòng",
    content: "Tầng 12, Tòa nhà Landmark, 123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    renderRichText: false,
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
