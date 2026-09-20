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
    theme: 'dark'
  };

  let currentEditingId = null;
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

  // Form Elements
  const editSnippetId = document.getElementById('edit-snippet-id');
  const inputShortcut = document.getElementById('input-shortcut');
  const inputLabel = document.getElementById('input-label');
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
        const data = await chrome.storage.local.get(['snippets', 'settings', 'macros']);
        if (data.snippets && Array.isArray(data.snippets) && data.snippets.length > 0) {
          snippets = data.snippets;
        } else {
          snippets = [...DEFAULT_SNIPPETS];
          await chrome.storage.local.set({ snippets });
        }
        if (data.macros && Array.isArray(data.macros)) {
          macros = data.macros;
        }
        if (data.settings) {
          settings = { ...settings, ...data.settings };
        }
      } else {
        // Fallback localStorage cho môi trường preview/test ngoài extension
        const localSnippets = localStorage.getItem('ate_snippets');
        const localMacros = localStorage.getItem('ate_macros');
        const localSettings = localStorage.getItem('ate_settings');
        if (localSnippets) {
          try { snippets = JSON.parse(localSnippets); } catch (e) { snippets = [...DEFAULT_SNIPPETS]; }
        } else {
          snippets = [...DEFAULT_SNIPPETS];
          localStorage.setItem('ate_snippets', JSON.stringify(snippets));
        }
        if (localMacros) {
          try { macros = JSON.parse(localMacros); } catch (e) { macros = []; }
        }
        if (localSettings) {
          try { settings = { ...settings, ...JSON.parse(localSettings) }; } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Nạp dữ liệu dự phòng:', e);
      snippets = [...DEFAULT_SNIPPETS];
    }
  }

  async function saveData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ snippets, settings, macros });
      } else {
        localStorage.setItem('ate_snippets', JSON.stringify(snippets));
        localStorage.setItem('ate_settings', JSON.stringify(settings));
        localStorage.setItem('ate_macros', JSON.stringify(macros));
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
  // SNIPPETS CRUD & RENDER
  // -------------------------------------------------------------
  function renderSnippets() {
    updateBadge();
    const query = (searchInput.value || '').toLowerCase().trim();
    const filtered = snippets.filter(s => {
      if (!query) return true;
      return (
        s.shortcut.toLowerCase().includes(query) ||
        (s.label && s.label.toLowerCase().includes(query)) ||
        (s.content && s.content.toLowerCase().includes(query))
      );
    });

    snippetCardsList.innerHTML = '';
    if (filtered.length === 0) {
      snippetCardsList.innerHTML = `
        <div style="padding: 30px 10px; text-align: center; color: var(--text-muted); font-size: 13px;">
          ${query ? 'Không tìm thấy phím tắt phù hợp.' : 'Chưa có phím tắt nào. Hãy bấm "Tạo Phím Tắt Mới"!'}
        </div>
      `;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = `snippet-item-card ${s.id === currentEditingId ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-card-top">
          <span class="item-shortcut">${escapeHtml(s.shortcut)}</span>
          ${s.renderRichText ? '<span class="item-badge-rich">Rich Text</span>' : ''}
        </div>
        <div class="item-label">${escapeHtml(s.label || 'Không có tên gợi nhớ')}</div>
        <div class="item-preview-text">${escapeHtml(s.content || '')}</div>
      `;

      card.addEventListener('click', () => loadSnippetIntoEditor(s.id));
      snippetCardsList.appendChild(card);
    });

    // Nếu chưa chọn snippet nào và có sẵn danh sách, tự động nạp snippet đầu tiên vào form
    if (!currentEditingId && filtered.length > 0) {
      loadSnippetIntoEditor(filtered[0].id);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderSnippets());
  }

  function resetEditor() {
    currentEditingId = null;
    editSnippetId.value = '';
    inputShortcut.value = '';
    inputLabel.value = '';
    inputContent.value = '';
    checkRichText.checked = true;
    editorTitle.textContent = 'Tạo Phím Tắt Mới';
    btnDeleteSnippet.style.display = 'none';
    btnCancelEdit.style.display = 'none';

    switchToWriteTab();
    if (inlineTestInput) inlineTestInput.value = '';
    if (inlineTestStatus) {
      inlineTestStatus.textContent = 'Chưa gõ thử';
      inlineTestStatus.className = 'inline-test-status';
    }

    document.querySelectorAll('.snippet-item-card').forEach(c => c.classList.remove('selected'));
  }

  function loadSnippetIntoEditor(id) {
    const s = snippets.find(item => item.id === id);
    if (!s) return;

    currentEditingId = s.id;
    editSnippetId.value = s.id;
    inputShortcut.value = s.shortcut;
    inputLabel.value = s.label || '';
    inputContent.value = s.content || '';
    checkRichText.checked = s.renderRichText !== false;
    editorTitle.textContent = `Chỉnh Sửa: ${s.shortcut}`;
    btnDeleteSnippet.style.display = 'inline-flex';
    btnCancelEdit.style.display = 'inline-flex';

    switchToWriteTab();
    if (inlineTestInput) inlineTestInput.value = '';
    if (inlineTestStatus) {
      inlineTestStatus.textContent = `Sẵn sàng test phím tắt "${s.shortcut}"`;
      inlineTestStatus.className = 'inline-test-status';
    }

    renderSnippets();
  }

  function setupEditor() {
    btnCreateNew.addEventListener('click', () => {
      resetEditor();
      inputShortcut.focus();
    });

    btnCancelEdit.addEventListener('click', () => {
      resetEditor();
    });

    btnDeleteSnippet.addEventListener('click', async () => {
      if (!currentEditingId) return;
      const target = snippets.find(s => s.id === currentEditingId);
      if (!target) return;

      if (confirm(`Bạn có chắc chắn muốn xóa phím tắt "${target.shortcut}"?`)) {
        snippets = snippets.filter(s => s.id !== currentEditingId);
        await saveData();
        resetEditor();
        renderSnippets();
        showToast(`Đã xóa phím tắt "${target.shortcut}"`, 'success');
      }
    });

    btnSaveSnippet.addEventListener('click', async () => {
      const shortcut = inputShortcut.value.trim();
      const label = inputLabel.value.trim();
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

      // Kiểm tra trùng lặp phím tắt
      const duplicate = snippets.find(s => s.shortcut === shortcut && s.id !== currentEditingId);
      if (duplicate) {
        showToast(`Phím tắt "${shortcut}" đã tồn tại! Vui lòng chọn từ khóa khác.`, 'error');
        inputShortcut.focus();
        return;
      }

      const now = Date.now();
      if (currentEditingId) {
        // Cập nhật
        const index = snippets.findIndex(s => s.id === currentEditingId);
        if (index !== -1) {
          snippets[index] = {
            ...snippets[index],
            shortcut,
            label,
            content,
            renderRichText,
            updatedAt: now
          };
          showToast(`Đã cập nhật phím tắt "${shortcut}"`, 'success');
        }
      } else {
        // Tạo mới
        const newSnippet = {
          id: 'snip_' + now + '_' + Math.random().toString(36).substring(2, 7),
          shortcut,
          label,
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
    let cleanHtml = '';
    try {
      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        cleanHtml = DOMPurify.sanitize(marked.parse(raw));
      } else {
        cleanHtml = escapeHtml(raw).replace(/\n/g, '<br/>');
      }
    } catch (e) {
      cleanHtml = escapeHtml(raw).replace(/\n/g, '<br/>');
    }
    previewContainer.innerHTML = cleanHtml;
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

  // -------------------------------------------------------------
  // INLINE TEST BOX (TEST TRƯỚC KHI SAVE)
  // -------------------------------------------------------------
  function setupInlineTest() {
    if (!inlineTestInput) return;

    inlineTestInput.addEventListener('input', () => {
      const val = inlineTestInput.value;
      const draftShortcut = inputShortcut.value.trim();
      const draftContent = inputContent.value;

      // 1. Kiểm tra nếu khớp phím tắt nháp hiện tại đang sửa/tạo (loại bỏ markdown vì inlineTestInput là input 1 dòng)
      if (draftShortcut && val.endsWith(draftShortcut)) {
        const rawContent = draftContent || '(Nội dung phím tắt đang trống)';
        const expanded = stripMarkdown(rawContent, true);
        const start = val.length - draftShortcut.length;
        inlineTestInput.value = val.substring(0, start) + expanded;
        inlineTestStatus.textContent = `✓ Đã bung phím tắt thử nghiệm "${draftShortcut}" (Đã lọc Markdown thành Plain Text)!`;
        inlineTestStatus.className = 'inline-test-status success';
        return;
      }

      // 2. Kiểm tra nếu khớp bất kỳ phím tắt nào đã lưu
      for (const s of snippets) {
        if (s.shortcut && val.endsWith(s.shortcut)) {
          const start = val.length - s.shortcut.length;
          const expanded = stripMarkdown(s.content, true);
          inlineTestInput.value = val.substring(0, start) + expanded;
          inlineTestStatus.textContent = `✓ Đã bung phím tắt "${s.shortcut}" (Plain Text)!`;
          inlineTestStatus.className = 'inline-test-status success';
          return;
        }
      }

      inlineTestStatus.textContent = 'Đang theo dõi phím gõ...';
      inlineTestStatus.className = 'inline-test-status';
    });

    btnClearInlineTest.addEventListener('click', () => {
      inlineTestInput.value = '';
      inlineTestStatus.textContent = 'Đã xóa. Sẵn sàng thử lại!';
      inlineTestStatus.className = 'inline-test-status';
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
            const cleanText = stripMarkdown(s.content, isSingleLine);
            field.setRangeText(cleanText, start, caret, 'end');
            showToast(`⚡ Đã mở rộng "${s.shortcut}" trong Test Lab (Plain Text)`, 'success');
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

            if (s.renderRichText && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
              const html = DOMPurify.sanitize(marked.parse(s.content));
              document.execCommand('insertHTML', false, html);
              showToast(`⚡ Đã mở rộng Rich Text "${s.shortcut}" trong Test Lab`, 'success');
            } else {
              const plainText = stripMarkdown(s.content, false);
              document.execCommand('insertText', false, plainText);
              showToast(`⚡ Đã mở rộng "${s.shortcut}" (Plain Text)`, 'success');
            }
            return;
          }
        }
      });
    }

    if (btnClearTestLab) {
      btnClearTestLab.addEventListener('click', () => {
        if (testSingleInput) testSingleInput.value = '';
        if (testMultiTextarea) testMultiTextarea.value = '';
        if (testRichEditor) testRichEditor.innerHTML = '';
        showToast('Đã xóa trắng các ô thử nghiệm!', 'success');
      });
    }
  }

  // -------------------------------------------------------------
  // MACROS AUTOMATION TAB
  // -------------------------------------------------------------
  function setupMacrosTab() {
    if (btnCreateMacroGuide) {
      btnCreateMacroGuide.addEventListener('click', () => {
        alert(
          'HƯỚNG DẪN GHI KỊCH BẢN MACRO:\n\n' +
          '1. Mở trang web bạn muốn thực hiện tự động hóa (ví dụ trang Ticket, CRM, Form).\n' +
          '2. Bấm vào icon tiện ích Auto Text Expander trên thanh công cụ Chrome.\n' +
          '3. Nhấn nút màu đỏ "⏺️ Ghi Thao Tác".\n' +
          '4. Thao tác bình thường trên form: gõ tiêu đề, chọn dropdown, nhập nội dung, bấm submit.\n' +
          '5. Bấm "⏹️ Dừng & Lưu", đặt tên kịch bản và phím tắt (ví dụ :cbreply hoặc Alt+1).\n\n' +
          'Sau đó bạn có thể kích hoạt kịch bản mọi lúc bằng phím tắt vừa đặt!'
        );
      });
    }

    if (btnCloseStepModal) btnCloseStepModal.addEventListener('click', closeStepModal);
    if (btnCancelStepModal) btnCancelStepModal.addEventListener('click', closeStepModal);
    if (btnSaveStepModal) btnSaveStepModal.addEventListener('click', saveStepModalChanges);
  }

  function renderMacrosList() {
    if (!macrosListContainer) return;
    updateBadge();
    macrosListContainer.innerHTML = '';

    if (macros.length === 0) {
      macrosListContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: var(--card-bg); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 36px; margin-bottom: 10px;">⚡</div>
          <h3 style="color: var(--text-primary); margin-bottom: 6px;">Chưa có kịch bản tự động hóa nào</h3>
          <p class="help-text" style="max-width: 480px; margin: 0 auto 16px auto;">
            Hãy mở bất kỳ trang web nào và bấm "Ghi Thao Tác" trong Popup tiện ích để tạo kịch bản tự động điền form và gửi đầu tiên của bạn!
          </p>
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
          <strong style="color:var(--primary); font-size:11px;">${i + 1}.</strong>
          <span>${escapeHtml(st.label || st.type)}</span>
        </div>
      `).join('');

      card.innerHTML = `
        <div>
          <div class="macro-card-top">
            <div>
              <div class="macro-card-title">${escapeHtml(macro.name)}</div>
              <div class="macro-badges-row">
                ${macro.shortcut ? `<span class="macro-badge-trigger" title="Từ khóa kích hoạt">${escapeHtml(macro.shortcut)}</span>` : ''}
                ${macro.hotkey ? `<span class="macro-badge-hotkey" title="Phím nóng bàn phím">${escapeHtml(macro.hotkey)}</span>` : ''}
                <span class="badge-tag">${stepsCount} bước thao tác</span>
              </div>
            </div>
            <label class="toggle-switch" title="Bật/Tắt kịch bản này">
              <input type="checkbox" class="macro-toggle-checkbox" ${macro.enabled !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div style="margin-top: 12px;">
            <div class="macro-steps-summary">
              ${stepsHtml}
              ${stepsCount > 3 ? `<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">+ ${stepsCount - 3} thao tác tiếp theo...</div>` : ''}
            </div>
          </div>
        </div>

        <div class="macro-card-actions">
          <div class="macro-actions-left">
            <button type="button" class="btn btn-secondary btn-edit-steps" style="padding:5px 10px; font-size:12px;">
              ✏️ Sửa các bước
            </button>
          </div>
          <button type="button" class="btn btn-danger-soft btn-delete-macro" style="padding:5px 10px; font-size:12px;">
            🗑️ Xóa
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
      card.querySelector('.btn-delete-macro').addEventListener('click', async () => {
        if (confirm(`Bạn có chắc muốn xóa kịch bản "${macro.name}"?`)) {
          macros = macros.filter(m => m.id !== macro.id);
          await saveData();
          renderMacrosList();
          showToast(`Đã xóa kịch bản "${macro.name}"`, 'success');
        }
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

      stepRow.innerHTML = `
        <div class="step-edit-left">
          <span class="step-index-badge">${idx + 1}</span>
          <div class="step-info-col">
            <div style="font-weight:600; font-size:13px; color:var(--text-primary);">${escapeHtml(st.label || st.type)}</div>
            <div class="step-selector-code">${escapeHtml(st.selector || '')}</div>
            ${isInput ? `
              <div style="margin-top:4px;">
                <input type="text" class="step-val-input" value="${escapeHtml(st.value || '')}" placeholder="Giá trị điền...">
              </div>
            ` : ''}
          </div>
        </div>
        <button type="button" class="btn btn-danger-soft btn-delete-single-step" title="Xóa bước này" style="padding:4px 8px; font-size:11px;">
          ✕ Xóa
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
        newSteps.push({
          ...origStep,
          value: updatedVal
        });
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
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings,
        snippets,
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
    if (!importedFileData || !importedFileData.content) {
      showToast('Vui lòng chọn file hợp lệ để nhập!', 'error');
      return;
    }

    const mode = document.querySelector('input[name="importMode"]:checked').value;
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
          throw new Error('Cấu trúc file JSON không hợp lệ');
        }
      } else {
        // Parse CSV
        newSnippets = parseCsvSnippets(importedFileData.content);
      }

      if (!newSnippets || newSnippets.length === 0) {
        showToast('Không tìm thấy phím tắt hợp lệ trong file', 'error');
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
      renderSnippets();
      renderUrlRules();
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
    const currentTheme = settings.theme || 'dark';
    applyTheme(currentTheme);

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

  // Khởi chạy an toàn (hỗ trợ cả DOMContentLoaded lẫn khi script tải sau)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
