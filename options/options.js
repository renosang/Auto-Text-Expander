// Auto Text Expander - Options & Dashboard Logic
(function () {
  'use strict';

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

  const DEFAULT_CATEGORIES = [
    { id: 'general', label: 'Chung', icon: 'folder' },
    { id: 'work', label: 'Công việc', icon: 'briefcase' },
    { id: 'support', label: 'CSKH', icon: 'message' },
    { id: 'personal', label: 'Cá nhân', icon: 'user' },
    { id: 'dev', label: 'Lập trình', icon: 'code' }
  ];

  const CATEGORY_ICONS = {
    grid: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    folder: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    briefcase: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    message: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    user: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    code: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    tag: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    star: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    zap: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    heart: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    shopping: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
    bookmark: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
    shield: '<svg class="cat-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
  };

  let categories = [...DEFAULT_CATEGORIES];
  let snippets = [];
  let macros = [];
  let currentEditingMacro = null;
  let settings = {
    enabled: true,
    urlMode: 'blacklist',
    urlRules: [
      "banking.example.com",
      "*://password-manager.com/*"
    ],
    triggerType: 'immediate',
    theme: 'light',
    macroSpeed: 'safe'
  };

  let currentEditingId = null;
  let currentCategoryFilter = 'all';
  let currentSortMode = 'az';
  let importedFileData = null;
  let toastTimer = null;

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const badgeTotalSnippets = document.getElementById('badge-total-snippets');
  const snippetCardsList = document.getElementById('snippet-cards-list');
  const searchInput = document.getElementById('search-input');
  const btnCreateNew = document.getElementById('btn-create-new');
  const listCounter = document.getElementById('list-counter');
  const categoryFilterBar = document.getElementById('category-filter-bar');
  const btnSortList = document.getElementById('btn-sort-list');

  // Form Elements
  const editSnippetId = document.getElementById('edit-snippet-id');
  const inputShortcut = document.getElementById('input-shortcut');
  const inputLabel = document.getElementById('input-label');
  const selectCategory = document.getElementById('select-category');
  const inputTags = document.getElementById('input-tags');
  const inputContent = document.getElementById('input-content');
  const checkRichText = document.getElementById('check-rich-text');
  const editorTitle = document.getElementById('editor-title');
  const btnSaveSnippet = document.getElementById('btn-save-snippet');
  const btnDeleteSnippet = document.getElementById('btn-delete-snippet');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const tabWrite = document.getElementById('tab-write');
  const tabPreview = document.getElementById('tab-preview');
  const previewContainer = document.getElementById('preview-container');

  // Inline Test
  const inlineTestInput = document.getElementById('inline-test-input');
  const inlineTestStatus = document.getElementById('inline-test-status');
  const btnClearInlineTest = document.getElementById('btn-clear-inline-test');

  // Test Lab Elements
  const btnClearTestLab = document.getElementById('btn-clear-test-lab');
  const testSingleInput = document.getElementById('test-single-input');
  const testMultiTextarea = document.getElementById('test-multi-textarea');
  const testRichEditor = document.getElementById('test-rich-editor');

  // Macro Automation Elements
  const badgeTotalMacros = document.getElementById('badge-total-macros');
  const macrosListContainer = document.getElementById('macros-list-container');
  const btnCreateMacroGuide = document.getElementById('btn-create-macro-guide');
  const macroStepModal = document.getElementById('macro-step-modal');
  const stepModalTitle = document.getElementById('step-modal-title');
  const stepModalList = document.getElementById('step-modal-list');
  const btnCloseStepModal = document.getElementById('btn-close-step-modal');
  const btnCancelStepModal = document.getElementById('btn-cancel-step-modal');
  const btnSaveStepModal = document.getElementById('btn-save-step-modal');

  // URL Rules Elements
  const modeBlacklist = document.getElementById('mode-blacklist');
  const modeWhitelist = document.getElementById('mode-whitelist');
  const inputNewRule = document.getElementById('input-new-rule');
  const btnAddRule = document.getElementById('btn-add-rule');
  const rulesTagsList = document.getElementById('rules-tags-list');
  const ruleCount = document.getElementById('rule-count');

  // Backup Elements
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileImport = document.getElementById('file-import');
  const fileChosenName = document.getElementById('file-chosen-name');
  const btnProcessImport = document.getElementById('btn-process-import');

  // Settings Elements
  const checkGlobalEnable = document.getElementById('check-global-enable');
  const triggerImmediate = document.getElementById('trigger-immediate');
  const triggerDelimiter = document.getElementById('trigger-delimiter');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const themeBtnLight = document.getElementById('theme-btn-light');
  const themeBtnDark = document.getElementById('theme-btn-dark');
  const themeRadioDark = document.getElementById('theme-radio-dark');
  const themeRadioLight = document.getElementById('theme-radio-light');

  // -------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------
  async function init() {
    await loadData();
    setupTheme();
    setupNavigation();
    renderCategories();
    setupCategoryModal();
    setupSorting();
    setupVariableToolbar();
    setupEditor();
    setupMarkdownToolbar();
    setupInlineTest();
    setupTestLab();
    setupMacrosTab();
    setupUrlRules();
    setupBackup();
    setupSettingsTab();
    renderSnippets();
    renderMacrosList();
    renderUrlRules();
  }

  async function loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['snippets', 'settings', 'macros', 'categories']);
        if (data.snippets && Array.isArray(data.snippets) && data.snippets.length > 0) {
          snippets = data.snippets;
        } else {
          snippets = [...DEFAULT_SNIPPETS];
          await chrome.storage.local.set({ snippets });
        }
        if (data.macros && Array.isArray(data.macros)) {
          macros = data.macros;
        }
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          categories = data.categories;
        } else {
          categories = [...DEFAULT_CATEGORIES];
        }
        if (data.settings) {
          settings = { ...settings, ...data.settings };
        }
      } else {
        // Fallback localStorage cho môi trường preview/test ngoài extension
        const localSnippets = localStorage.getItem('ate_snippets');
        const localMacros = localStorage.getItem('ate_macros');
        const localSettings = localStorage.getItem('ate_settings');
        const localCats = localStorage.getItem('ate_categories');
        if (localSnippets) {
          try { snippets = JSON.parse(localSnippets); } catch (e) { snippets = [...DEFAULT_SNIPPETS]; }
        } else {
          snippets = [...DEFAULT_SNIPPETS];
          localStorage.setItem('ate_snippets', JSON.stringify(snippets));
        }
        if (localMacros) {
          try { macros = JSON.parse(localMacros); } catch (e) { macros = []; }
        }
        if (localCats) {
          try { categories = JSON.parse(localCats); } catch (e) { categories = [...DEFAULT_CATEGORIES]; }
        } else {
          categories = [...DEFAULT_CATEGORIES];
          localStorage.setItem('ate_categories', JSON.stringify(categories));
        }
        if (localSettings) {
          try { settings = { ...settings, ...JSON.parse(localSettings) }; } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Nạp dữ liệu dự phòng:', e);
      snippets = [...DEFAULT_SNIPPETS];
      categories = [...DEFAULT_CATEGORIES];
    }
  }

  async function saveData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ snippets, settings, macros, categories });
      } else {
        localStorage.setItem('ate_snippets', JSON.stringify(snippets));
        localStorage.setItem('ate_settings', JSON.stringify(settings));
        localStorage.setItem('ate_macros', JSON.stringify(macros));
        localStorage.setItem('ate_categories', JSON.stringify(categories));
      }
      updateBadge();
    } catch (e) {
      console.error('Lỗi khi lưu dữ liệu:', e);
      showToast('Có lỗi xảy ra khi lưu vào bộ nhớ!', 'error');
    }
  }

  function updateBadge() {
    if (badgeTotalSnippets) {
      badgeTotalSnippets.textContent = snippets.length;
    }
    if (badgeTotalMacros) {
      badgeTotalMacros.textContent = macros.length;
    }
    if (listCounter) {
      listCounter.textContent = `${snippets.length} phím tắt đã lưu`;
    }
  }

  // -------------------------------------------------------------
  // TOAST NOTIFICATION
  // -------------------------------------------------------------
  function showToast(message, type = 'success') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `app-toast ${type}`;
    toast.style.display = 'block';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 2800);
  }

  // -------------------------------------------------------------
  // NAVIGATION TABS
  // -------------------------------------------------------------
  function setupNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        navItems.forEach(n => n.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        item.classList.add('active');
        const activePane = document.getElementById(`tab-${targetTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });
  }

  // -------------------------------------------------------------
  // DYNAMIC VARIABLE & PREVIEW HELPERS
  // -------------------------------------------------------------
  function formatDatePreview(d, fmt = 'DD/MM/YYYY') {
    if (!fmt) fmt = 'DD/MM/YYYY';
    const YYYY = String(d.getFullYear());
    const YY = YYYY.slice(-2);
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    return fmt
      .replace(/YYYY/g, YYYY)
      .replace(/YY/g, YY)
      .replace(/MM/g, MM)
      .replace(/DD/g, DD)
      .replace(/HH/g, HH)
      .replace(/mm/g, mm)
      .replace(/ss/g, ss);
  }

  function resolveVariablesPreview(text) {
    if (!text) return '';
    let result = text;
    const now = new Date();

    result = result.replace(/\{\{date([+-]\d+)d(?::([^}]+))?\}\}/gi, (match, daysStr, fmt) => {
      const days = parseInt(daysStr, 10) || 0;
      const targetDate = new Date(now.getTime() + days * 86400000);
      return formatDatePreview(targetDate, fmt || 'DD/MM/YYYY');
    });

    result = result.replace(/\{\{date:([^}]+)\}\}/gi, (match, fmt) => formatDatePreview(now, fmt));
    result = result.replace(/\{\{date\}\}/gi, () => formatDatePreview(now, 'DD/MM/YYYY'));
    result = result.replace(/\{\{time:([^}]+)\}\}/gi, (match, fmt) => formatDatePreview(now, fmt));
    result = result.replace(/\{\{time\}\}/gi, () => formatDatePreview(now, 'HH:mm'));
    result = result.replace(/\{\{url\}\}/gi, () => window.location.href);
    result = result.replace(/\{\{domain\}\}/gi, () => window.location.hostname || 'chrome-extension');
    result = result.replace(/\{\{title\}\}/gi, () => document.title || 'Auto Text Expander');
    result = result.replace(/\{\{clipboard\}\}/gi, '[Nội dung Clipboard]');
    result = result.replace(/\{\{cursor\}\}/gi, '');

    result = result.replace(/\{\{choice:(?:[^:]+:)?([^}]+)\}\}/gi, (match, optionsStr) => {
      const opts = optionsStr.split('|');
      return opts[0] ? opts[0].trim() : match;
    });

    result = result.replace(/\{\{([a-zA-Z0-9_\u00C0-\u1EF9]+)(?::([^}]+))?\}\}/gi, (match, fieldName, defaultVal) => {
      return defaultVal ? defaultVal.trim() : `[${fieldName}]`;
    });

    return result;
  }

  // -------------------------------------------------------------
  // DYNAMIC CATEGORIES (SVG ICONS & USER-CREATED CATEGORIES)
  // -------------------------------------------------------------
  function renderCategories() {
    if (!categoryFilterBar) return;

    let html = `
      <button type="button" class="btn-cat-pill ${currentCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">
        ${CATEGORY_ICONS.grid}
        <span>Tất cả</span>
      </button>
    `;

    categories.forEach(cat => {
      const iconSvg = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS.folder;
      html += `
        <button type="button" class="btn-cat-pill ${currentCategoryFilter === cat.id ? 'active' : ''}" data-cat="${cat.id}">
          ${iconSvg}
          <span>${escapeHtml(cat.label)}</span>
        </button>
      `;
    });

    html += `
      <button type="button" class="btn-add-cat-pill" id="btn-open-category-modal" title="Tạo thêm danh mục mới">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Danh mục</span>
      </button>
    `;

    categoryFilterBar.innerHTML = html;

    // Attach click events
    categoryFilterBar.querySelectorAll('.btn-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        categoryFilterBar.querySelectorAll('.btn-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategoryFilter = pill.getAttribute('data-cat') || 'all';
        renderSnippets();
      });
    });

    const btnOpenModal = document.getElementById('btn-open-category-modal');
    if (btnOpenModal) {
      btnOpenModal.addEventListener('click', openCategoryModal);
    }

    // Sync selectCategory dropdown
    if (selectCategory) {
      const currentSelected = selectCategory.value || 'general';
      selectCategory.innerHTML = categories.map(cat => 
        `<option value="${cat.id}">${escapeHtml(cat.label)}</option>`
      ).join('');
      selectCategory.value = currentSelected;
      if (!selectCategory.value && categories.length > 0) {
        selectCategory.value = categories[0].id;
      }
    }
  }

  function setupCategoryModal() {
    const categoryModal = document.getElementById('category-modal');
    const btnCloseCatModal = document.getElementById('btn-close-category-modal');
    const btnCancelCatModal = document.getElementById('btn-cancel-category-modal');
    const btnSaveCat = document.getElementById('btn-save-new-category');
    const inputNewCatName = document.getElementById('input-new-cat-name');
    const catIconPicker = document.getElementById('cat-icon-picker');
    const inputNewCatIcon = document.getElementById('input-new-cat-icon');

    if (!categoryModal) return;

    // Populate icon choices
    const availableIcons = ['folder', 'briefcase', 'message', 'user', 'code', 'tag', 'star', 'zap', 'heart', 'shopping', 'bookmark', 'shield'];
    if (catIconPicker) {
      catIconPicker.innerHTML = availableIcons.map((ic, i) => `
        <button type="button" class="cat-icon-choice ${i === 0 ? 'selected' : ''}" data-icon="${ic}" title="${ic}">
          ${CATEGORY_ICONS[ic]}
        </button>
      `).join('');

      catIconPicker.querySelectorAll('.cat-icon-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          catIconPicker.querySelectorAll('.cat-icon-choice').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          if (inputNewCatIcon) inputNewCatIcon.value = btn.getAttribute('data-icon');
        });
      });
    }

    if (btnCloseCatModal) btnCloseCatModal.addEventListener('click', closeCategoryModal);
    if (btnCancelCatModal) btnCancelCatModal.addEventListener('click', closeCategoryModal);

    if (btnSaveCat) {
      btnSaveCat.addEventListener('click', async () => {
        const name = (inputNewCatName ? inputNewCatName.value : '').trim();
        if (!name) {
          showToast('Vui lòng nhập tên danh mục!', 'error');
          if (inputNewCatName) inputNewCatName.focus();
          return;
        }

        const icon = (inputNewCatIcon && inputNewCatIcon.value) ? inputNewCatIcon.value : 'folder';
        const slug = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);

        categories.push({
          id: slug,
          label: name,
          icon: icon
        });

        await saveData();
        renderCategories();
        renderSnippets();
        closeCategoryModal();
        showToast(`Đã tạo danh mục "${name}" thành công!`, 'success');
      });
    }
  }

  function openCategoryModal() {
    const categoryModal = document.getElementById('category-modal');
    const inputNewCatName = document.getElementById('input-new-cat-name');
    if (!categoryModal) return;
    if (inputNewCatName) {
      inputNewCatName.value = '';
      inputNewCatName.focus();
    }
    categoryModal.style.display = 'flex';
  }

  function closeCategoryModal() {
    const categoryModal = document.getElementById('category-modal');
    if (categoryModal) categoryModal.style.display = 'none';
  }

  function setupSorting() {
    if (!btnSortList) return;
    const sortModes = [
      { id: 'az', label: 'Sắp xếp: A-Z' },
      { id: 'za', label: 'Sắp xếp: Z-A' },
      { id: 'newest', label: 'Sắp xếp: Mới nhất' }
    ];
    let currentIndex = 0;

    btnSortList.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % sortModes.length;
      currentSortMode = sortModes[currentIndex].id;
      const span = btnSortList.querySelector('span');
      if (span) span.textContent = sortModes[currentIndex].label;
      renderSnippets();
    });
  }

  function setupVariableToolbar() {
    const varChips = document.querySelectorAll('.btn-var-chip');
    varChips.forEach(btn => {
      btn.addEventListener('click', () => {
        const varTag = btn.getAttribute('data-var');
        if (!varTag || !inputContent) return;

        const start = inputContent.selectionStart;
        const end = inputContent.selectionEnd;
        const text = inputContent.value;

        inputContent.value = text.slice(0, start) + varTag + text.slice(end);
        const newPos = start + varTag.length;
        inputContent.setSelectionRange(newPos, newPos);
        inputContent.focus();

        if (tabPreview.classList.contains('active')) {
          switchToPreviewTab();
        }
      });
    });
  }

  // -------------------------------------------------------------
  // SNIPPETS CRUD & RENDER
  // -------------------------------------------------------------
  function renderSnippets() {
    updateBadge();
    const query = (searchInput.value || '').toLowerCase().trim();
    const filtered = snippets.filter(s => {
      // 1. Lọc theo danh mục
      if (currentCategoryFilter !== 'all') {
        const cat = s.category || 'general';
        if (cat !== currentCategoryFilter) return false;
      }

      // 2. Lọc theo từ khóa tìm kiếm (shortcut, label, content, tags)
      if (!query) return true;
      const tagsStr = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : '';
      return (
        s.shortcut.toLowerCase().includes(query) ||
        (s.label && s.label.toLowerCase().includes(query)) ||
        (s.content && s.content.toLowerCase().includes(query)) ||
        tagsStr.includes(query)
      );
    });

    snippetCardsList.innerHTML = '';
    if (filtered.length === 0) {
      snippetCardsList.innerHTML = `
        <div style="padding: 30px 10px; text-align: center; color: var(--text-muted); font-size: 13px;">
          ${query || currentCategoryFilter !== 'all' ? 'Không tìm thấy phím tắt phù hợp trong mục này.' : 'Chưa có phím tắt nào. Hãy bấm "Tạo Phím Tắt Mới"!'}
        </div>
      `;
      return;
    }

    // Sắp xếp
    filtered.sort((a, b) => {
      if (currentSortMode === 'az') {
        return (a.shortcut || '').localeCompare(b.shortcut || '');
      } else if (currentSortMode === 'za') {
        return (b.shortcut || '').localeCompare(a.shortcut || '');
      } else if (currentSortMode === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return 0;
    });

    filtered.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = `snippet-item-card ${s.id === currentEditingId ? 'selected' : ''}`;
      card.style.animationDelay = `${Math.min(idx * 0.035, 0.4)}s`;
      const cat = s.category || 'general';
      const catObj = categories.find(c => c.id === cat) || { label: 'Chung', icon: 'folder' };
      const catSvg = (CATEGORY_ICONS[catObj.icon] || CATEGORY_ICONS.folder).replace('class="cat-pill-svg"', 'class="cat-badge-icon"');
      const catBadgeHtml = `<span class="item-badge-category">${catSvg}<span>${escapeHtml(catObj.label)}</span></span>`;
      const tags = Array.isArray(s.tags) ? s.tags : [];
      const tagsHtml = tags.length > 0
        ? `<div class="item-tags-list">${tags.map(t => `
            <span class="item-tag-badge">
              <svg class="tag-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              <span>${escapeHtml(t)}</span>
            </span>`).join('')}</div>`
        : '';

      card.innerHTML = `
        <div class="item-card-top">
          <span class="item-shortcut">${escapeHtml(s.shortcut)}</span>
          <div style="display:flex;align-items:center;gap:5px;">
            ${catBadgeHtml}
            ${s.renderRichText ? '<span class="item-badge-rich">Rich Text</span>' : ''}
          </div>
        </div>
        <div class="item-label">${escapeHtml(s.label || 'Không có tên gợi nhớ')}</div>
        <div class="item-preview-text">${escapeHtml(s.content || '')}</div>
        ${tagsHtml}
      `;

      card.addEventListener('click', () => loadSnippetIntoEditor(s.id));
      snippetCardsList.appendChild(card);
    });

    if (!currentEditingId && filtered.length > 0) {
      loadSnippetIntoEditor(filtered[0].id);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderSnippets());
  }

  let currentEditorTags = [];

  function renderEditorTags() {
    const editorTagBadges = document.getElementById('editor-tag-badges');
    if (!editorTagBadges) return;
    editorTagBadges.innerHTML = currentEditorTags.map(t => `
      <span class="editor-tag-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
        <span>${escapeHtml(t)}</span>
        <button type="button" class="btn-remove-tag" data-tag="${escapeHtml(t)}" title="Xóa thẻ">&times;</button>
      </span>
    `).join('');

    editorTagBadges.querySelectorAll('.btn-remove-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tagToRemove = btn.getAttribute('data-tag');
        currentEditorTags = currentEditorTags.filter(t => t !== tagToRemove);
        renderEditorTags();
        if (inputTags) inputTags.focus();
      });
    });
  }

  function resetEditor() {
    currentEditingId = null;
    editSnippetId.value = '';
    inputShortcut.value = '';
    inputLabel.value = '';
    if (selectCategory) selectCategory.value = 'general';
    currentEditorTags = [];
    renderEditorTags();
    if (inputTags) inputTags.value = '';
    inputContent.value = '';
    checkRichText.checked = true;
    editorTitle.textContent = 'Tạo Phím Tắt Mới';
    btnDeleteSnippet.style.display = 'none';
    btnCancelEdit.style.display = 'none';

    switchToWriteTab();
    if (inlineTestInput) inlineTestInput.value = '';
    setInlineTestStatus('Chưa gõ thử');

    document.querySelectorAll('.snippet-item-card').forEach(c => c.classList.remove('selected'));
  }

  function loadSnippetIntoEditor(id) {
    const s = snippets.find(item => item.id === id);
    if (!s) return;

    currentEditingId = s.id;
    editSnippetId.value = s.id;
    inputShortcut.value = s.shortcut;
    inputLabel.value = s.label || '';
    if (selectCategory) selectCategory.value = s.category || 'general';
    currentEditorTags = Array.isArray(s.tags) ? [...s.tags] : (s.tags ? String(s.tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    renderEditorTags();
    if (inputTags) inputTags.value = '';
    inputContent.value = s.content || '';
    checkRichText.checked = s.renderRichText !== false;
    editorTitle.textContent = `Chỉnh Sửa: ${s.shortcut}`;
    btnDeleteSnippet.style.display = 'inline-flex';
    btnCancelEdit.style.display = 'inline-flex';

    switchToWriteTab();
    if (inlineTestInput) inlineTestInput.value = '';
    setInlineTestStatus(`Sẵn sàng test phím tắt "${s.shortcut}"`);

    renderSnippets();
  }

  // CONFIRM DELETE MODAL (LIQUID GLASS)
  function openConfirmDeleteModal({ title, message, onConfirm }) {
    const modal = document.getElementById('confirm-delete-modal');
    const titleEl = document.getElementById('confirm-delete-title');
    const msgEl = document.getElementById('confirm-delete-message');
    const btnExecute = document.getElementById('btn-execute-confirm-delete');
    const btnCancel = document.getElementById('btn-cancel-confirm-delete');
    const btnClose = document.getElementById('btn-close-confirm-delete');

    if (!modal) return;
    if (titleEl && title) titleEl.textContent = title;
    if (msgEl && message) msgEl.innerHTML = message;

    function closeModal() {
      modal.style.display = 'none';
      if (btnExecute) btnExecute.onclick = null;
    }

    if (btnCancel) btnCancel.onclick = closeModal;
    if (btnClose) btnClose.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    if (btnExecute) {
      btnExecute.onclick = async () => {
        closeModal();
        if (onConfirm) await onConfirm();
      };
    }

    modal.style.display = 'flex';
  }

  function setupEditor() {
    btnCreateNew.addEventListener('click', () => {
      resetEditor();
      inputShortcut.focus();
    });

    btnCancelEdit.addEventListener('click', () => {
      resetEditor();
    });

    btnDeleteSnippet.addEventListener('click', () => {
      if (!currentEditingId) return;
      const target = snippets.find(s => s.id === currentEditingId);
      if (!target) return;

      openConfirmDeleteModal({
        title: 'Xác Nhận Xóa Phím Tắt',
        message: `Bạn có chắc chắn muốn xóa phím tắt <strong>${escapeHtml(target.shortcut)}</strong> (${escapeHtml(target.label || 'Không có nhãn')})?<br><span style="color:var(--accent-rose);font-size:12px;display:inline-block;margin-top:6px;">⚠️ Thao tác này sẽ xóa vĩnh viễn phím tắt khỏi hệ thống và không thể hoàn tác.</span>`,
        onConfirm: async () => {
          snippets = snippets.filter(s => s.id !== currentEditingId);
          await saveData();
          resetEditor();
          renderSnippets();
          showToast(`Đã xóa phím tắt "${target.shortcut}"`, 'success');
        }
      });
    });

    btnSaveSnippet.addEventListener('click', async () => {
      const shortcut = inputShortcut.value.trim();
      const label = inputLabel.value.trim();
      const category = selectCategory ? selectCategory.value : 'general';

      // Collect any pending tag from inputTags
      const pendingTag = (inputTags ? inputTags.value : '').replace(/,/g, '').trim();
      if (pendingTag && !currentEditorTags.includes(pendingTag)) {
        currentEditorTags.push(pendingTag);
        renderEditorTags();
        if (inputTags) inputTags.value = '';
      }
      const tags = [...currentEditorTags];

      const content = inputContent.value;
      const renderRichText = checkRichText.checked;

      if (!shortcut) {
        showToast('Vui lòng nhập từ khóa phím tắt (Trigger Shortcut)', 'error');
        inputShortcut.focus();
        return;
      }

      if (!content) {
        showToast('Vui lòng nhập nội dung văn bản mở rộng', 'error');
        inputContent.focus();
        return;
      }

      const duplicate = snippets.find(s => s.shortcut === shortcut && s.id !== currentEditingId);
      if (duplicate) {
        showToast(`Phím tắt "${shortcut}" đã tồn tại! Vui lòng chọn từ khóa khác.`, 'error');
        inputShortcut.focus();
        return;
      }

      const now = Date.now();
      if (currentEditingId) {
        const index = snippets.findIndex(s => s.id === currentEditingId);
        if (index !== -1) {
          snippets[index] = {
            ...snippets[index],
            shortcut,
            label,
            category,
            tags,
            content,
            renderRichText,
            updatedAt: now
          };
          showToast(`Đã cập nhật phím tắt "${shortcut}"`, 'success');
        }
      } else {
        const newSnippet = {
          id: 'snip_' + now + '_' + Math.random().toString(36).substring(2, 7),
          shortcut,
          label,
          category,
          tags,
          content,
          renderRichText,
          createdAt: now,
          updatedAt: now
        };
        snippets.unshift(newSnippet);
        currentEditingId = newSnippet.id;
        showToast(`Đã tạo thành công phím tắt "${shortcut}"`, 'success');
      }

      await saveData();
      renderSnippets();
      loadSnippetIntoEditor(currentEditingId);
    });

    const propTagsBox = document.getElementById('prop-tags-box');
    if (propTagsBox && inputTags) {
      propTagsBox.addEventListener('click', (e) => {
        if (e.target !== inputTags && !e.target.closest('.btn-remove-tag')) {
          inputTags.focus();
        }
      });

      inputTags.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = inputTags.value.replace(/,/g, '').trim();
          if (val && !currentEditorTags.includes(val)) {
            currentEditorTags.push(val);
            renderEditorTags();
          }
          inputTags.value = '';
        } else if (e.key === 'Backspace' && inputTags.value === '' && currentEditorTags.length > 0) {
          currentEditorTags.pop();
          renderEditorTags();
        }
      });

      inputTags.addEventListener('blur', () => {
        const val = inputTags.value.replace(/,/g, '').trim();
        if (val && !currentEditorTags.includes(val)) {
          currentEditorTags.push(val);
          renderEditorTags();
          inputTags.value = '';
        }
      });
    }
  }

  // -------------------------------------------------------------
  // MARKDOWN TOOLBAR & PREVIEW
  // -------------------------------------------------------------
  function setupMarkdownToolbar() {
    const tools = document.querySelectorAll('.btn-tool');
    tools.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-md');
        applyMarkdownFormat(type);
      });
    });

    tabWrite.addEventListener('click', switchToWriteTab);
    tabPreview.addEventListener('click', switchToPreviewTab);
  }

  function switchToWriteTab() {
    tabWrite.classList.add('active');
    tabPreview.classList.remove('active');
    inputContent.style.display = 'block';
    previewContainer.style.display = 'none';
  }

  function switchToPreviewTab() {
    tabPreview.classList.add('active');
    tabWrite.classList.remove('active');
    inputContent.style.display = 'none';
    previewContainer.style.display = 'block';

    const raw = inputContent.value || '*Không có nội dung để xem trước.*';
    const previewContent = resolveVariablesPreview(raw);
    previewContainer.innerHTML = renderMarkdownToHtml(previewContent);
  }

  function renderMarkdownToHtml(markdownText) {
    if (!markdownText) return '';
    try {
      const md = (typeof marked !== 'undefined' && marked) ? marked : (typeof window !== 'undefined' ? window.marked : null);
      if (md) {
        let rawHtml = '';
        if (typeof md.parse === 'function') {
          rawHtml = md.parse(markdownText);
        } else if (typeof md === 'function') {
          rawHtml = md(markdownText);
        }
        if (rawHtml) {
          const purifier = (typeof DOMPurify !== 'undefined' && DOMPurify) ? DOMPurify : (typeof window !== 'undefined' ? window.DOMPurify : null);
          if (purifier && typeof purifier.sanitize === 'function') {
            return purifier.sanitize(rawHtml);
          }
          return rawHtml;
        }
      }
    } catch (err) {
      console.warn('Marked.js parse error, using fallback:', err);
    }
    return parseBasicMarkdown(markdownText);
  }

  function parseBasicMarkdown(md) {
    if (!md) return '';
    let out = escapeHtml(md);

    // Code blocks ```lang\ncode\n```
    out = out.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre class="preview-pre"><code>${code.trim()}</code></pre>`;
    });

    // Inline code `code`
    out = out.replace(/`([^`]+)`/g, '<code class="preview-code">$1</code>');

    // Headers (# h1 .. #### h4)
    out = out.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    out = out.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    out = out.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    out = out.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Bold & Italic
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Blockquote
    out = out.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');

    // Lists (- item)
    out = out.replace(/^[*-] (.*?)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

    // Links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    out = out.replace(/\n/g, '<br/>');

    // Clean up adjacent list tags
    out = out.replace(/<\/ul><br\/><ul>/g, '');
    out = out.replace(/<\/ul><ul>/g, '');

    return out;
  }

  function applyMarkdownFormat(type) {
    const textarea = inputContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'in đậm'}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'in nghiêng'}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'heading':
        replacement = `\n## ${selected || 'Tiêu đề'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'link':
        replacement = `[${selected || 'Tiêu đề link'}](https://example.com)`;
        cursorOffset = replacement.length;
        break;
      case 'code':
        replacement = `\`${selected || 'code'}\``;
        cursorOffset = selected ? replacement.length : 1;
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'Mục danh sách'}\n`;
        cursorOffset = replacement.length;
        break;
      case 'table':
        replacement = `\n| Tiêu đề 1 | Tiêu đề 2 |\n| :--- | :--- |\n| Dữ liệu A | Dữ liệu B |\n`;
        cursorOffset = replacement.length;
        break;
    }

    textarea.setRangeText(replacement, start, end, 'end');
    textarea.focus();
    if (!selected) {
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }
  }

  // -------------------------------------------------------------
  // HELPER: STRIP MARKDOWN CHO CÁC TRƯỜNG INPUT / TEXTAREA
  // -------------------------------------------------------------
  function stripMarkdown(text, isSingleLine = false) {
    if (!text) return '';
    let str = text;

    // 1. Khối mã ```code``` -> code
    str = str.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
    });

    // 2. Inline code `code` -> code
    str = str.replace(/`([^`]+)`/g, '$1');

    // 3. Hình ảnh ![alt](url) -> alt
    str = str.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

    // 4. Link [text](url) -> text
    str = str.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 5. In đậm & nghiêng kết hợp: ***text*** hoặc ___text___
    str = str.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
    str = str.replace(/___(.*?)___/g, '$1');

    // 6. In đậm: **text** hoặc __text__ -> text
    str = str.replace(/\*\*(.*?)\*\*/g, '$1');
    str = str.replace(/__(.*?)__/g, '$1');

    // 7. In nghiêng: *text* hoặc _text_ -> text
    str = str.replace(/(^|[^\w])\*([^\s*].*?[^\s*]|[^\s*])\*([^\w]|$)/g, '$1$2$3');
    str = str.replace(/(^|[^\w])_([^\s_].*?[^\s_]|[^\s_])_([^\w]|$)/g, '$1$2$3');

    // 8. Gạch ngang: ~~text~~ -> text
    str = str.replace(/~~(.*?)~~/g, '$1');

    // 9. Tiêu đề: # H1 -> H1
    str = str.replace(/^#{1,6}\s+(.*)$/gm, '$1');

    // 10. Trích dẫn: > quote -> quote
    str = str.replace(/^\s*>\s+(.*)$/gm, '$1');

    // 11. Đường kẻ ngang: --- hoặc ***
    str = str.replace(/^\s*[-*_]{3,}\s*$/gm, '');

    if (isSingleLine) {
      // Với input 1 dòng: xóa bullet danh sách và thay thế xuống dòng bằng khoảng trắng
      str = str.replace(/^\s*[-*+]\s+/gm, '');
      str = str.replace(/^\s*\d+\.\s+/gm, '');
      str = str.replace(/\r?\n+/g, ' ');
    } else {
      // Với textarea: chuyển bullet markdown thành dấu chấm tròn unicode •
      str = str.replace(/^\s*[-*+]\s+/gm, '• ');
    }

    return str.trim();
  }

  function setInlineTestStatus(message, isSuccess = false) {
    if (!inlineTestStatus) return;
    inlineTestStatus.className = `inline-test-status ${isSuccess ? 'success' : ''}`;
    inlineTestStatus.innerHTML = `<span class="status-icon-dot"></span><span>${escapeHtml(message)}</span>`;
  }

  // -------------------------------------------------------------
  // INLINE TEST BOX (TEST TRƯỚC KHI SAVE)
  // -------------------------------------------------------------
  function setupInlineTest() {
    if (!inlineTestInput) return;

    inlineTestInput.addEventListener('input', () => {
      const val = inlineTestInput.value;
      const draftShortcut = inputShortcut.value.trim();
      const draftContent = inputContent.value;

      // 1. Kiểm tra nếu khớp phím tắt nháp hiện tại đang sửa/tạo
      if (draftShortcut && val.endsWith(draftShortcut)) {
        const rawContent = draftContent || '(Nội dung phím tắt đang trống)';
        const previewContent = resolveVariablesPreview(rawContent);
        let expanded = stripMarkdown(previewContent, true);
        const cursorIdx = expanded.indexOf('{{cursor}}');
        if (cursorIdx !== -1) expanded = expanded.replace('{{cursor}}', '');

        const start = val.length - draftShortcut.length;
        inlineTestInput.value = val.substring(0, start) + expanded;
        setInlineTestStatus(`Đã bung phím tắt thử nghiệm "${draftShortcut}" (Đã phân giải biến)!`, true);
        return;
      }

      // 2. Kiểm tra nếu khớp bất kỳ phím tắt nào đã lưu
      for (const s of snippets) {
        if (s.shortcut && val.endsWith(s.shortcut)) {
          const start = val.length - s.shortcut.length;
          const previewContent = resolveVariablesPreview(s.content);
          let expanded = stripMarkdown(previewContent, true);
          const cursorIdx = expanded.indexOf('{{cursor}}');
          if (cursorIdx !== -1) expanded = expanded.replace('{{cursor}}', '');

          inlineTestInput.value = val.substring(0, start) + expanded;
          setInlineTestStatus(`Đã bung phím tắt "${s.shortcut}" (Đã phân giải biến)!`, true);
          return;
        }
      }

      setInlineTestStatus('Đang theo dõi phím gõ...');
    });

    btnClearInlineTest.addEventListener('click', () => {
      inlineTestInput.value = '';
      setInlineTestStatus('Đã xóa. Sẵn sàng thử lại!');
      inlineTestInput.focus();
    });
  }

  // -------------------------------------------------------------
  // TEST LAB (PLAYGROUND HOÀN CHỈNH)
  // -------------------------------------------------------------
  function setupTestLab() {
    const handleExpandInField = (field, isRich = false) => {
      if (!isRich) {
        const caret = field.selectionEnd;
        const textBefore = field.value.slice(0, caret);

        for (const s of snippets) {
          if (s.shortcut && textBefore.endsWith(s.shortcut)) {
            const start = caret - s.shortcut.length;
            const isSingleLine = field.tagName === 'INPUT';
            const previewContent = resolveVariablesPreview(s.content);
            let cleanText = stripMarkdown(previewContent, isSingleLine);
            let cursorIdx = cleanText.indexOf('{{cursor}}');
            if (cursorIdx !== -1) cleanText = cleanText.replace('{{cursor}}', '');

            field.setRangeText(cleanText, start, caret, 'end');
            if (cursorIdx !== -1) {
              const targetPos = start + cursorIdx;
              field.setSelectionRange(targetPos, targetPos);
            }
            showToast(`Đã mở rộng "${s.shortcut}" trong Test Lab (Đã phân giải biến)`, 'success');
            return;
          }
        }
      }
    };

    if (testSingleInput) {
      testSingleInput.addEventListener('input', () => handleExpandInField(testSingleInput, false));
    }
    if (testMultiTextarea) {
      testMultiTextarea.addEventListener('input', () => handleExpandInField(testMultiTextarea, false));
    }

    // Rich editor expansion
    if (testRichEditor) {
      testRichEditor.addEventListener('input', () => {
        const sel = window.getSelection();
        if (!sel || !sel.isCollapsed || !sel.anchorNode) return;
        const node = sel.anchorNode;
        if (node.nodeType !== Node.TEXT_NODE) return;

        const caret = sel.anchorOffset;
        const textBefore = node.nodeValue.slice(0, caret);

        for (const s of snippets) {
          if (s.shortcut && textBefore.endsWith(s.shortcut)) {
            const range = document.createRange();
            range.setStart(node, caret - s.shortcut.length);
            range.setEnd(node, caret);
            sel.removeAllRanges();
            sel.addRange(range);

            const previewContent = resolveVariablesPreview(s.content);
            if (s.renderRichText && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
              const html = DOMPurify.sanitize(marked.parse(previewContent));
              document.execCommand('insertHTML', false, html);
              showToast(`Đã mở rộng Rich Text "${s.shortcut}" trong Test Lab`, 'success');
            } else {
              const plainText = stripMarkdown(previewContent, false).replace('{{cursor}}', '');
              document.execCommand('insertText', false, plainText);
              showToast(`⚡ Đã mở rộng "${s.shortcut}" (Plain Text)`, 'success');
            }
            return;
          }
        }
      });
    }

    // Xử lý Custom Combobox trong Test Lab
    const comboboxTrigger = document.getElementById('test-combobox-trigger');
    const comboboxMenu = document.getElementById('test-combobox-menu');
    const comboboxText = document.getElementById('test-combobox-text');
    const prioritySelect = document.getElementById('test-priority-select');
    const statusSelect = document.getElementById('test-status-select');
    const btnTestSubmit = document.getElementById('btn-test-submit-form');
    const dropdownStatus = document.getElementById('test-dropdown-status');

    if (comboboxTrigger && comboboxMenu) {
      comboboxTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = comboboxMenu.style.display !== 'none';
        comboboxMenu.style.display = isOpen ? 'none' : 'block';
        comboboxTrigger.setAttribute('aria-expanded', String(!isOpen));
      });

      comboboxMenu.querySelectorAll('.custom-combobox-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.getAttribute('data-value');
          const text = opt.innerText.trim();
          if (comboboxText) comboboxText.textContent = text;
          comboboxTrigger.setAttribute('data-value', val);
          comboboxMenu.querySelectorAll('.custom-combobox-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          comboboxMenu.style.display = 'none';
          comboboxTrigger.setAttribute('aria-expanded', 'false');
          if (dropdownStatus) {
            dropdownStatus.textContent = `Đã chọn phòng ban: "${text}"`;
          }
        });
      });

      document.addEventListener('click', () => {
        if (comboboxMenu && comboboxMenu.style.display !== 'none') {
          comboboxMenu.style.display = 'none';
          comboboxTrigger?.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (btnTestSubmit) {
      btnTestSubmit.addEventListener('click', () => {
        const pVal = prioritySelect ? prioritySelect.options[prioritySelect.selectedIndex]?.text : '';
        const sVal = statusSelect ? statusSelect.options[statusSelect.selectedIndex]?.text : '';
        const dVal = comboboxText ? comboboxText.textContent : '';
        const msg = `✓ Đã nhận form: [Độ ưu tiên: ${pVal || 'Chưa chọn'}] | [Trạng thái: ${sVal || 'Chưa chọn'}] | [Phòng ban: ${dVal}]`;
        if (dropdownStatus) {
          dropdownStatus.textContent = msg;
          dropdownStatus.style.color = 'var(--primary)';
        }
        showToast('✓ Đã gửi dữ liệu biểu mẫu thử nghiệm thành công!', 'success');
      });
    }

    if (btnClearTestLab) {
      btnClearTestLab.addEventListener('click', () => {
        if (testSingleInput) testSingleInput.value = '';
        if (testMultiTextarea) testMultiTextarea.value = '';
        if (testRichEditor) testRichEditor.innerHTML = '';
        if (prioritySelect) prioritySelect.selectedIndex = 0;
        if (statusSelect) statusSelect.selectedIndex = 0;
        if (comboboxText) comboboxText.textContent = '-- Chọn phòng ban --';
        if (comboboxTrigger) comboboxTrigger.removeAttribute('data-value');
        if (comboboxMenu) {
          comboboxMenu.style.display = 'none';
          comboboxMenu.querySelectorAll('.custom-combobox-option').forEach(o => o.classList.remove('selected'));
        }
        if (dropdownStatus) dropdownStatus.textContent = 'Đã xóa trắng dữ liệu biểu mẫu';
        showToast('Đã xóa trắng các ô thử nghiệm!', 'success');
      });
    }
  }

  // -------------------------------------------------------------
  // MACROS AUTOMATION TAB
  // -------------------------------------------------------------
  function setupMacrosTab() {
    const macroGuideModal = document.getElementById('macro-guide-modal');
    const btnCloseMacroGuide = document.getElementById('btn-close-macro-guide-modal');
    const btnConfirmMacroGuide = document.getElementById('btn-confirm-macro-guide');

    function openMacroGuide() {
      if (macroGuideModal) macroGuideModal.style.display = 'flex';
    }

    function closeMacroGuide() {
      if (macroGuideModal) macroGuideModal.style.display = 'none';
    }

    if (btnCreateMacroGuide) {
      btnCreateMacroGuide.addEventListener('click', openMacroGuide);
    }

    if (btnCloseMacroGuide) btnCloseMacroGuide.addEventListener('click', closeMacroGuide);
    if (btnConfirmMacroGuide) btnConfirmMacroGuide.addEventListener('click', closeMacroGuide);
    if (macroGuideModal) {
      macroGuideModal.addEventListener('click', (e) => {
        if (e.target === macroGuideModal) closeMacroGuide();
      });
    }

    if (btnCloseStepModal) btnCloseStepModal.addEventListener('click', closeStepModal);
    if (btnCancelStepModal) btnCancelStepModal.addEventListener('click', closeStepModal);
    if (btnSaveStepModal) btnSaveStepModal.addEventListener('click', saveStepModalChanges);
    if (macroStepModal) {
      macroStepModal.addEventListener('click', (e) => {
        if (e.target === macroStepModal) closeStepModal();
      });
    }

    // Macro Speed Radio Sync
    const currentSpeed = settings.macroSpeed || 'safe';
    const activeSpeedRadio = document.querySelector(`input[name="macro-speed"][value="${currentSpeed}"]`);
    if (activeSpeedRadio) activeSpeedRadio.checked = true;

    document.querySelectorAll('input[name="macro-speed"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        settings.macroSpeed = e.target.value;
        await saveData();
        const modeLabels = {
          safe: 'An Toàn & Chuẩn Xác (200ms - Khuyên dùng cho Production)',
          balanced: 'Cân Bằng (100ms)',
          turbo: 'Siêu Tốc (40ms)'
        };
        showToast(`Đã chuyển sang chế độ: ${modeLabels[settings.macroSpeed] || settings.macroSpeed}`, 'success');
      });
    });
  }

  function renderMacrosList() {
    if (!macrosListContainer) return;
    updateBadge();
    macrosListContainer.innerHTML = '';

    if (macros.length === 0) {
      macrosListContainer.innerHTML = `
        <div class="macro-empty-state">
          <div class="macro-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3>Chưa có kịch bản tự động hóa nào</h3>
          <p class="macro-empty-text">
            Hãy mở bất kỳ trang web nào và bấm "Ghi Thao Tác" trong Popup tiện ích để tạo kịch bản tự động điền form và gửi đầu tiên của bạn!
          </p>
          <button type="button" class="btn-glass-primary" onclick="document.getElementById('btn-create-macro-guide')?.click()">
            Xem Hướng Dẫn Ghi Kịch Bản
          </button>
        </div>
      `;
      return;
    }

    macros.forEach(macro => {
      const card = document.createElement('div');
      card.className = 'macro-card';

      const stepsCount = macro.steps ? macro.steps.length : 0;
      const stepsHtml = (macro.steps || []).slice(0, 3).map((st, i) => `
        <div class="macro-step-row-summary" title="${escapeHtml(st.label || st.type)}">
          <span class="macro-step-row-idx">${i + 1}</span>
          <span class="macro-step-row-label">${escapeHtml(st.label || st.type)}</span>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="macro-card-inner">
          <div class="macro-card-top">
            <div class="macro-title-group">
              <div class="macro-card-title">${escapeHtml(macro.name)}</div>
              <div class="macro-badges-row">
                ${macro.shortcut ? `
                  <span class="macro-badge-trigger" title="Từ khóa kích hoạt">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>${escapeHtml(macro.shortcut)}</span>
                  </span>` : ''}
                ${macro.hotkey ? `
                  <span class="macro-badge-hotkey" title="Phím nóng bàn phím">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                      <line x1="6" y1="8" x2="6.01" y2="8"></line>
                      <line x1="10" y1="8" x2="10.01" y2="8"></line>
                      <line x1="14" y1="8" x2="14.01" y2="8"></line>
                      <line x1="18" y1="8" x2="18.01" y2="8"></line>
                    </svg>
                    <span>${escapeHtml(macro.hotkey)}</span>
                  </span>` : ''}
                <span class="macro-badge-count">${stepsCount} bước thao tác</span>
              </div>
            </div>
            <label class="liquid-switch-label" title="Bật/Tắt kịch bản này">
              <input type="checkbox" class="macro-toggle-checkbox" ${macro.enabled !== false ? 'checked' : ''}>
              <span class="liquid-switch-track"></span>
            </label>
          </div>

          <div class="macro-steps-preview-wrap">
            <div class="macro-steps-summary">
              ${stepsHtml}
              ${stepsCount > 3 ? `<div class="macro-steps-more">+ ${stepsCount - 3} thao tác tiếp theo...</div>` : ''}
            </div>
          </div>
        </div>

        <div class="macro-card-actions">
          <button type="button" class="btn-macro-edit btn-edit-steps">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Sửa các bước</span>
          </button>
          <button type="button" class="btn-macro-delete btn-delete-macro" title="Xóa kịch bản này">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Xóa</span>
          </button>
        </div>
      `;

      // Toggle status
      const toggleCheck = card.querySelector('.macro-toggle-checkbox');
      toggleCheck.addEventListener('change', async () => {
        macro.enabled = toggleCheck.checked;
        await saveData();
        showToast(`Đã ${macro.enabled ? 'bật' : 'tắt'} kịch bản "${macro.name}"`);
      });

      // Edit steps
      card.querySelector('.btn-edit-steps').addEventListener('click', () => {
        openStepModal(macro);
      });

      // Delete macro
      card.querySelector('.btn-delete-macro').addEventListener('click', () => {
        openConfirmDeleteModal({
          title: 'Xác Nhận Xóa Kịch Bản',
          message: `Bạn có chắc muốn xóa kịch bản <strong>${escapeHtml(macro.name)}</strong>?<br><span style="color:var(--accent-rose);font-size:12px;display:inline-block;margin-top:6px;">⚠️ Toàn bộ ${macro.steps ? macro.steps.length : 0} bước thao tác đã ghi sẽ bị xóa vĩnh viễn.</span>`,
          onConfirm: async () => {
            macros = macros.filter(m => m.id !== macro.id);
            await saveData();
            renderMacrosList();
            showToast(`Đã xóa kịch bản "${macro.name}"`, 'success');
          }
        });
      });

      macrosListContainer.appendChild(card);
    });
  }

  function openStepModal(macro) {
    currentEditingMacro = macro;
    stepModalTitle.textContent = `Các Bước: ${macro.name} (${macro.steps.length} bước)`;
    stepModalList.innerHTML = '';

    const scInput = document.getElementById('step-modal-shortcut');
    const hkInput = document.getElementById('step-modal-hotkey');
    if (scInput) scInput.value = macro.shortcut || '';
    if (hkInput) hkInput.value = macro.hotkey || '';

    macro.steps.forEach((st, idx) => {
      const stepRow = document.createElement('div');
      stepRow.className = 'step-edit-card';
      stepRow.dataset.stepIndex = idx;

      const isInput = st.type === 'input' || st.type === 'quill' || st.type === 'contenteditable';
      const isSelect = st.type === 'select' || st.type === 'custom_select';
      const isClick = st.type === 'click';

      const typeBadgeClass = isInput ? 'type-input' : (isSelect ? 'type-select' : 'type-click');
      const typeBadgeLabel = isInput ? 'Điền Văn Bản' : (isSelect ? 'Chọn Dropdown' : 'Nhấp Chuột');

      stepRow.innerHTML = `
        <div class="step-edit-left">
          <span class="step-index-badge">${idx + 1}</span>
          <div class="step-info-col">
            <div class="step-title-row">
              <span class="step-type-pill ${typeBadgeClass}">${typeBadgeLabel}</span>
              <strong class="step-title-text">${escapeHtml(st.label || st.type)}</strong>
            </div>
            <div class="step-selector-code" title="${escapeHtml(st.selector || '')}">
              <code>${escapeHtml(st.selector || '')}</code>
            </div>
            ${isInput || isSelect ? `
              <div class="step-val-row">
                <span class="step-val-label">${isSelect ? 'Giá trị chọn:' : 'Văn bản điền:'}</span>
                <input type="text" class="step-val-input" value="${escapeHtml(st.value || st.optionText || '')}" placeholder="${isSelect ? 'Lựa chọn cần chọn...' : 'Giá trị điền...'}">
              </div>
            ` : ''}
          </div>
        </div>
        <button type="button" class="btn-step-delete btn-delete-single-step" title="Xóa bước này">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Xóa</span>
        </button>
      `;

      stepRow.querySelector('.btn-delete-single-step').addEventListener('click', () => {
        stepRow.remove();
        // Cập nhật lại số thứ tự
        stepModalList.querySelectorAll('.step-edit-card').forEach((el, i) => {
          el.querySelector('.step-index-badge').textContent = i + 1;
        });
      });

      stepModalList.appendChild(stepRow);
    });

    macroStepModal.style.display = 'flex';
  }

  function closeStepModal() {
    if (macroStepModal) macroStepModal.style.display = 'none';
    currentEditingMacro = null;
  }

  async function saveStepModalChanges() {
    if (!currentEditingMacro) return;

    const scInput = document.getElementById('step-modal-shortcut');
    const hkInput = document.getElementById('step-modal-hotkey');
    if (scInput && scInput.value.trim()) {
      currentEditingMacro.shortcut = scInput.value.trim();
    }
    if (hkInput) {
      currentEditingMacro.hotkey = hkInput.value.trim();
    }

    const remainingStepCards = stepModalList.querySelectorAll('.step-edit-card');
    const newSteps = [];

    remainingStepCards.forEach((card) => {
      const origIdx = parseInt(card.dataset.stepIndex, 10);
      const origStep = currentEditingMacro.steps[origIdx];
      if (origStep) {
        const valInput = card.querySelector('.step-val-input');
        const updatedVal = valInput ? valInput.value : origStep.value;
        const updatedStep = {
          ...origStep,
          value: updatedVal
        };
        if (origStep.type === 'select' || origStep.type === 'custom_select') {
          updatedStep.optionText = updatedVal;
          updatedStep.optionValue = updatedVal;
          if (origStep.label && origStep.label.includes(':')) {
            const prefix = origStep.label.split(':')[0];
            updatedStep.label = `${prefix}: "${updatedVal}"`;
          }
        }
        newSteps.push(updatedStep);
      }
    });

    currentEditingMacro.steps = newSteps;
    currentEditingMacro.updatedAt = Date.now();

    await saveData();
    closeStepModal();
    renderMacrosList();
    showToast('Đã lưu các thay đổi cho kịch bản!', 'success');
  }

  // -------------------------------------------------------------
  // URL RULES
  // -------------------------------------------------------------
  function setupUrlRules() {
    if (settings.urlMode === 'whitelist') {
      modeWhitelist.checked = true;
    } else {
      modeBlacklist.checked = true;
    }

    const onModeChange = async (e) => {
      settings.urlMode = e.target.value;
      await saveData();
      showToast(`Đã chuyển sang chế độ: ${settings.urlMode === 'blacklist' ? 'Blacklist' : 'Whitelist'}`, 'success');
    };

    modeBlacklist.addEventListener('change', onModeChange);
    modeWhitelist.addEventListener('change', onModeChange);

    btnAddRule.addEventListener('click', addNewRule);
    inputNewRule.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addNewRule();
    });
  }

  async function addNewRule() {
    const val = inputNewRule.value.trim().toLowerCase();
    if (!val) return;

    if (!settings.urlRules) settings.urlRules = [];
    if (settings.urlRules.includes(val)) {
      showToast('Quy tắc này đã có trong danh sách!', 'error');
      return;
    }

    settings.urlRules.push(val);
    inputNewRule.value = '';
    await saveData();
    renderUrlRules();
    showToast(`Đã thêm quy tắc: "${val}"`, 'success');
  }

  function renderUrlRules() {
    const rules = settings.urlRules || [];
    ruleCount.textContent = rules.length;
    rulesTagsList.innerHTML = '';

    if (rules.length === 0) {
      rulesTagsList.innerHTML = '<span style="color:var(--text-muted);font-size:12.5px;">Chưa có quy tắc nào. Danh sách đang trống.</span>';
      return;
    }

    rules.forEach((r, idx) => {
      const tag = document.createElement('span');
      tag.className = 'rule-tag';
      tag.innerHTML = `
        <span>${escapeHtml(r)}</span>
        <button class="btn-remove-rule" title="Xóa quy tắc">&times;</button>
      `;
      tag.querySelector('.btn-remove-rule').addEventListener('click', async () => {
        settings.urlRules.splice(idx, 1);
        await saveData();
        renderUrlRules();
        showToast(`Đã xóa quy tắc "${r}"`, 'success');
      });
      rulesTagsList.appendChild(tag);
    });
  }

  // -------------------------------------------------------------
  // BACKUP (IMPORT / EXPORT)
  // -------------------------------------------------------------
  function setupBackup() {
    // Export JSON
    btnExportJson.addEventListener('click', () => {
      const exportData = {
        version: '7.6',
        exportedAt: new Date().toISOString(),
        settings,
        snippets,
        categories,
        macros
      };
      downloadFile(JSON.stringify(exportData, null, 2), 'auto-text-expander-backup.json', 'application/json');
      showToast('Đã xuất thành công file JSON!', 'success');
    });

    // Export CSV
    btnExportCsv.addEventListener('click', () => {
      let csv = '\uFEFFShortcut,Label,Content,RichText\n'; // BOM cho Excel tiếng Việt
      snippets.forEach(s => {
        const sc = `"${(s.shortcut || '').replace(/"/g, '""')}"`;
        const lb = `"${(s.label || '').replace(/"/g, '""')}"`;
        const ct = `"${(s.content || '').replace(/"/g, '""')}"`;
        const rt = s.renderRichText ? '1' : '0';
        csv += `${sc},${lb},${ct},${rt}\n`;
      });
      downloadFile(csv, 'auto-text-expander-snippets.csv', 'text/csv;charset=utf-8;');
      showToast('Đã xuất thành công file CSV!', 'success');
    });

    // File Drag & Drop / Click
    fileDropzone.addEventListener('click', () => fileImport.click());
    fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });
    fileDropzone.addEventListener('dragleave', () => fileDropzone.classList.remove('dragover'));
    fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleSelectedFile(e.dataTransfer.files[0]);
      }
    });

    fileImport.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleSelectedFile(e.target.files[0]);
      }
    });

    btnProcessImport.addEventListener('click', processImport);
  }

  function handleSelectedFile(file) {
    if (!file) return;
    const name = file.name;
    const isJson = name.endsWith('.json');
    const isCsv = name.endsWith('.csv');

    if (!isJson && !isCsv) {
      showToast('Chỉ hỗ trợ file định dạng .json hoặc .csv', 'error');
      return;
    }

    fileChosenName.textContent = `Đã chọn: ${name} (${Math.round(file.size / 1024)} KB)`;
    btnProcessImport.disabled = false;

    const reader = new FileReader();
    reader.onload = (e) => {
      importedFileData = {
        name,
        type: isJson ? 'json' : 'csv',
        content: e.target.result
      };
    };
    reader.readAsText(file);
  }

  async function processImport() {
    // Tự động đọc file trực tiếp nếu importedFileData chưa sẵn sàng
    if ((!importedFileData || !importedFileData.content) && fileImport && fileImport.files && fileImport.files.length > 0) {
      const file = fileImport.files[0];
      const name = file.name;
      const isJson = name.endsWith('.json');
      const isCsv = name.endsWith('.csv');
      if (isJson || isCsv) {
        try {
          const text = await file.text();
          importedFileData = {
            name,
            type: isJson ? 'json' : 'csv',
            content: text
          };
        } catch (e) {
          console.warn('Lỗi đọc file trực tiếp:', e);
        }
      }
    }

    if (!importedFileData || !importedFileData.content) {
      showToast('Vui lòng chọn tệp .json hoặc .csv để nhập dữ liệu!', 'error');
      return;
    }

    const importModeRadio = document.querySelector('input[name="importMode"]:checked');
    const mode = importModeRadio ? importModeRadio.value : 'merge';
    let newSnippets = [];

    try {
      if (importedFileData.type === 'json') {
        const parsed = JSON.parse(importedFileData.content);
        if (Array.isArray(parsed)) {
          newSnippets = parsed;
        } else if (parsed.snippets && Array.isArray(parsed.snippets)) {
          newSnippets = parsed.snippets;
          if (parsed.settings) {
            settings = { ...settings, ...parsed.settings };
          }
          if (parsed.categories && Array.isArray(parsed.categories)) {
            for (const cat of parsed.categories) {
              if (!categories.some(c => c.id === cat.id)) {
                categories.push(cat);
              }
            }
          }
          if (parsed.macros && Array.isArray(parsed.macros)) {
            if (mode === 'overwrite') {
              macros = parsed.macros;
            } else {
              for (const m of parsed.macros) {
                const idx = macros.findIndex(x => x.id === m.id || x.shortcut === m.shortcut);
                if (idx !== -1) {
                  macros[idx] = { ...macros[idx], ...m };
                } else {
                  macros.push(m);
                }
              }
            }
          }
        } else {
          throw new Error('Cấu trúc tệp JSON không hợp lệ');
        }
      } else {
        // Parse CSV
        newSnippets = parseCsvSnippets(importedFileData.content);
      }

      if (!newSnippets || newSnippets.length === 0) {
        showToast('Không tìm thấy phím tắt hợp lệ trong tệp', 'error');
        return;
      }

      if (mode === 'overwrite') {
        snippets = newSnippets;
      } else {
        // Merge: cập nhật nếu trùng shortcut, thêm nếu chưa có
        for (const item of newSnippets) {
          const idx = snippets.findIndex(s => s.shortcut === item.shortcut);
          if (idx !== -1) {
            snippets[idx] = { ...snippets[idx], ...item };
          } else {
            snippets.push({
              ...item,
              id: item.id || ('snip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6))
            });
          }
        }
      }

      await saveData();
      renderCategories();
      renderSnippets();
      renderUrlRules();
      renderMacrosList();
      resetEditor();

      showToast(`Nhập dữ liệu thành công (${newSnippets.length} phím tắt)!`, 'success');
      btnProcessImport.disabled = true;
      fileChosenName.textContent = 'Nhập hoàn tất';
      importedFileData = null;
      fileImport.value = '';
    } catch (err) {
      console.error('Lỗi phân tích file import:', err);
      showToast('Lỗi khi đọc file: ' + err.message, 'error');
    }
  }

  function parseCsvSnippets(csvText) {
    const lines = csvText.split(/\r?\n/);
    const result = [];
    let startIdx = 0;

    // Bỏ qua header nếu có
    if (lines[0] && lines[0].toLowerCase().includes('shortcut')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Regex đơn giản parse CSV có quote
      const matches = line.match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g);
      if (!matches || matches.length < 2) continue;

      const cells = matches.map(cell => {
        let clean = cell.replace(/^,/, '');
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.slice(1, -1).replace(/""/g, '"');
        }
        return clean;
      });

      const [sc, lb, ct, rt] = cells;
      if (sc) {
        result.push({
          id: 'snip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          shortcut: sc.trim(),
          label: lb ? lb.trim() : '',
          content: ct || '',
          renderRichText: rt === '1' || rt === 'true',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }
    return result;
  }

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // -------------------------------------------------------------
  // THEME MANAGEMENT (DARK / LIGHT)
  // -------------------------------------------------------------
  function setupTheme() {
    settings.theme = 'light';
    applyTheme('light');

    if (themeBtnLight) {
      themeBtnLight.addEventListener('click', () => setTheme('light'));
    }
    if (themeBtnDark) {
      themeBtnDark.addEventListener('click', () => setTheme('dark'));
    }
  }

  async function setTheme(themeName) {
    settings.theme = themeName;
    applyTheme(themeName);
    await saveData();
    showToast(`Đã chuyển sang Giao diện ${themeName === 'light' ? 'Sáng' : 'Tối'}`, 'success');
  }

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);

    if (themeBtnLight && themeBtnDark) {
      if (themeName === 'light') {
        themeBtnLight.classList.add('active');
        themeBtnDark.classList.remove('active');
      } else {
        themeBtnDark.classList.add('active');
        themeBtnLight.classList.remove('active');
      }
    }

    if (themeRadioDark && themeRadioLight) {
      if (themeName === 'light') {
        themeRadioLight.checked = true;
      } else {
        themeRadioDark.checked = true;
      }
    }
  }

  // -------------------------------------------------------------
  // SETTINGS TAB
  // -------------------------------------------------------------
  function setupSettingsTab() {
    checkGlobalEnable.checked = settings.enabled !== false;
    if (settings.triggerType === 'delimiter') {
      triggerDelimiter.checked = true;
    } else {
      triggerImmediate.checked = true;
    }

    if (settings.theme === 'light') {
      if (themeRadioLight) themeRadioLight.checked = true;
    } else {
      if (themeRadioDark) themeRadioDark.checked = true;
    }

    btnSaveSettings.addEventListener('click', async () => {
      settings.enabled = checkGlobalEnable.checked;
      settings.triggerType = document.querySelector('input[name="triggerType"]:checked').value;

      const selectedTheme = document.querySelector('input[name="themeSetting"]:checked');
      if (selectedTheme) {
        settings.theme = selectedTheme.value;
        applyTheme(settings.theme);
      }

      await saveData();
      showToast('Đã lưu cấu hình hoạt động!', 'success');
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // -------------------------------------------------------------
  // LIQUID GLASS INTERACTIVE TOUCH & SPECULAR TRACKING
  // (haider-nawaz/liquid-glass-skill)
  // -------------------------------------------------------------
  function setupLiquidInteractions() {
    // Touch & pointer illumination radiating across glass surfaces
    window.addEventListener('pointermove', (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
    }, { passive: true });

    // Tactile spring feedback on glass interactive elements
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.nav-item, .btn-create-liquid, .btn-var-chip, .btn-cat-pill, .btn-glass-primary, .btn-glass-ghost, .btn-tool, .snippet-item-card, .btn-glass-sort');
      if (!btn) return;
      btn.style.transition = 'transform 0.08s ease';
      btn.style.transform = 'scale(0.94)';
      const onPointerUp = () => {
        btn.style.transform = '';
        setTimeout(() => { btn.style.transition = ''; }, 150);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });
  }

  // Khởi chạy an toàn (hỗ trợ cả DOMContentLoaded lẫn khi script tải sau)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      setupLiquidInteractions();
    });
  } else {
    init();
    setupLiquidInteractions();
  }
})();
