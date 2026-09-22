// Auto Text Expander - Spotlight / Raycast-Style Command Palette
(function () {
  'use strict';

  let isOpen = false;
  let activeFilter = 'all'; // 'all' | 'snippets' | 'macros'
  let query = '';
  let filteredItems = [];
  let selectedIndex = 0;
  let lastActiveElement = null;
  let currentTheme = 'dark'; // 'dark' | 'light'

  let overlayEl = null;
  let inputEl = null;
  let listContainerEl = null;
  let previewContainerEl = null;
  let tabBadges = { all: null, snippets: null, macros: null };

  // Đồng bộ theme với thiết lập trong popup / storage
  function syncTheme() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['settings'], (res) => {
          if (res && res.settings && res.settings.theme) {
            applyPaletteTheme(res.settings.theme);
          }
        });
      }
    } catch (e) {}

    const bridge = window.AteContentBridge;
    if (bridge && bridge.getSettings) {
      const s = bridge.getSettings();
      if (s && s.theme) {
        applyPaletteTheme(s.theme);
      }
    }
  }

  function applyPaletteTheme(theme) {
    currentTheme = theme === 'light' ? 'light' : 'dark';
    if (overlayEl) {
      overlayEl.setAttribute('data-theme', currentTheme);
    }
  }

  // Theo dõi phần tử được focus cuối cùng trên trang web
  document.addEventListener('focusin', (e) => {
    if (overlayEl && overlayEl.contains(e.target)) return;
    lastActiveElement = e.target;
  }, true);

  // Chuẩn hóa chuỗi tìm kiếm tiếng Việt không dấu & viết thường
  function normalizeStr(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Khởi tạo khung DOM của Command Palette
  function createPaletteDOM() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'ate-palette-overlay';
    overlayEl.setAttribute('data-theme', currentTheme);
    overlayEl.style.display = 'none';

    overlayEl.innerHTML = `
      <div class="ate-palette-modal" role="dialog" aria-modal="true" aria-label="Command Palette">
        <!-- Top Search Bar -->
        <div class="ate-palette-search-wrap">
          <div class="ate-palette-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input type="text" class="ate-palette-input" placeholder="Tìm phím tắt, nội dung, hoặc kịch bản macro... (gõ để tìm)" autocomplete="off" spellcheck="false">
          <div class="ate-palette-search-esc-hint">
            <span class="ate-kbd-badge">ESC</span>
          </div>
        </div>

        <!-- Filter Tabs Bar -->
        <div class="ate-palette-tabs-bar">
          <button type="button" class="ate-palette-tab-btn active" data-filter="all">
            <span>Tất Cả</span>
            <span class="ate-tab-count" id="ate-count-all">0</span>
          </button>
          <button type="button" class="ate-palette-tab-btn" data-filter="snippets">
            <span>Phím Tắt</span>
            <span class="ate-tab-count" id="ate-count-snippets">0</span>
          </button>
          <button type="button" class="ate-palette-tab-btn" data-filter="macros">
            <span>Macros</span>
            <span class="ate-tab-count" id="ate-count-macros">0</span>
          </button>
        </div>

        <!-- 2-Columns Body: List & Live Preview -->
        <div class="ate-palette-body">
          <div class="ate-palette-list-column">
            <div class="ate-palette-items-wrap" id="ate-palette-items-list">
              <!-- Rendered dynamically -->
            </div>
          </div>
          <div class="ate-palette-preview-column" id="ate-palette-preview-pane">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Footer Keybinding Hints -->
        <div class="ate-palette-footer">
          <div class="ate-palette-footer-hints">
            <span class="ate-footer-hint-item">
              <span class="ate-kbd-badge">↵ Enter</span>
              <span>Chèn / Kích hoạt</span>
            </span>
            <span class="ate-footer-hint-item">
              <span class="ate-kbd-badge">↑↓</span>
              <span>Di chuyển</span>
            </span>
            <span class="ate-footer-hint-item">
              <span class="ate-kbd-badge">Tab</span>
              <span>Đổi bộ lọc</span>
            </span>
            <span class="ate-footer-hint-item">
              <span class="ate-kbd-badge">Esc</span>
              <span>Đóng</span>
            </span>
          </div>
          <div class="ate-palette-brand">
            <span>⚡ Auto Text Expander Pro</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);

    // Gán tham chiếu phần tử
    inputEl = overlayEl.querySelector('.ate-palette-input');
    listContainerEl = overlayEl.querySelector('#ate-palette-items-list');
    previewContainerEl = overlayEl.querySelector('#ate-palette-preview-pane');
    tabBadges.all = overlayEl.querySelector('#ate-count-all');
    tabBadges.snippets = overlayEl.querySelector('#ate-count-snippets');
    tabBadges.macros = overlayEl.querySelector('#ate-count-macros');

    // Sự kiện gõ tìm kiếm
    inputEl.addEventListener('input', (e) => {
      query = e.target.value;
      selectedIndex = 0;
      updateFilterAndRender();
    });

    // Sự kiện điều hướng phím trong ô tìm kiếm
    inputEl.addEventListener('keydown', onPaletteKeyDown);

    // Sự kiện click chuyển tab
    overlayEl.querySelectorAll('.ate-palette-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        setFilter(filter);
      });
    });

    // Click ra ngoài backdrop để đóng
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) {
        closePalette();
      }
    });
  }

  function setFilter(filter) {
    activeFilter = filter;
    selectedIndex = 0;
    if (overlayEl) {
      overlayEl.querySelectorAll('.ate-palette-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
      });
    }
    updateFilterAndRender();
    if (inputEl) inputEl.focus();
  }

  // Thu thập và lọc danh sách phím tắt & macro
  function getRawItems() {
    const bridge = window.AteContentBridge;
    const snippets = (bridge && bridge.getSnippets ? bridge.getSnippets() : []) || [];
    const macros = (bridge && bridge.getMacros ? bridge.getMacros() : []) || [];

    const items = [];

    // Snippets
    snippets.forEach(s => {
      items.push({
        id: 's_' + (s.id || s.shortcut),
        type: 'snippet',
        title: s.label || s.shortcut,
        shortcut: s.shortcut || '',
        category: s.category || 'general',
        tags: s.tags || [],
        content: s.content || '',
        renderRichText: Boolean(s.renderRichText),
        data: s
      });
    });

    // Macros
    macros.forEach(m => {
      items.push({
        id: 'm_' + (m.id || m.shortcut || m.name),
        type: 'macro',
        title: m.name || m.shortcut || 'Kịch bản Macro',
        shortcut: m.shortcut || '',
        category: 'macro',
        tags: ['Macro', `${(m.steps || []).length} bước`],
        content: `Kịch bản tự động hóa gồm ${(m.steps || []).length} bước thực thi trên ${m.urlPattern || 'mọi trang web'}.`,
        stepsCount: (m.steps || []).length,
        speed: m.speed || 'safe',
        urlPattern: m.urlPattern || '*',
        data: m
      });
    });

    return items;
  }

  function updateFilterAndRender() {
    const allItems = getRawItems();
    const cleanQuery = normalizeStr(query);

    // Cập nhật số lượng đếm trên tab
    const totalSnippets = allItems.filter(i => i.type === 'snippet').length;
    const totalMacros = allItems.filter(i => i.type === 'macro').length;
    if (tabBadges.all) tabBadges.all.textContent = allItems.length;
    if (tabBadges.snippets) tabBadges.snippets.textContent = totalSnippets;
    if (tabBadges.macros) tabBadges.macros.textContent = totalMacros;

    // Lọc theo danh mục tab
    let pool = allItems;
    if (activeFilter === 'snippets') {
      pool = allItems.filter(i => i.type === 'snippet');
    } else if (activeFilter === 'macros') {
      pool = allItems.filter(i => i.type === 'macro');
    }

    // Lọc theo từ khóa tìm kiếm (Fuzzy search)
    if (!cleanQuery) {
      filteredItems = pool;
    } else {
      const scored = [];
      pool.forEach(item => {
        const scNorm = normalizeStr(item.shortcut);
        const titleNorm = normalizeStr(item.title);
        const contentNorm = normalizeStr(item.content);
        const tagsNorm = normalizeStr(item.tags.join(' '));

        let score = 0;
        if (scNorm === cleanQuery) score += 100;
        else if (scNorm.startsWith(cleanQuery)) score += 60;
        else if (scNorm.includes(cleanQuery)) score += 40;

        if (titleNorm.startsWith(cleanQuery)) score += 50;
        else if (titleNorm.includes(cleanQuery)) score += 35;

        if (tagsNorm.includes(cleanQuery)) score += 25;
        if (contentNorm.includes(cleanQuery)) score += 15;

        if (score > 0) {
          scored.push({ item, score });
        }
      });

      scored.sort((a, b) => b.score - a.score);
      filteredItems = scored.map(s => s.item);
    }

    if (selectedIndex >= filteredItems.length) {
      selectedIndex = Math.max(0, filteredItems.length - 1);
    }

    renderItemsList();
    renderLivePreview();
  }

  // Render danh sách bên cột trái
  function renderItemsList() {
    if (!listContainerEl) return;

    if (filteredItems.length === 0) {
      listContainerEl.innerHTML = `
        <div class="ate-palette-empty">
          <div class="ate-empty-icon">🔍</div>
          <p class="ate-empty-title">Không tìm thấy kết quả phù hợp</p>
          <p class="ate-empty-desc">Thử tìm theo từ khóa khác hoặc chuyển sang tab bộ lọc Tất Cả.</p>
        </div>
      `;
      return;
    }

    let html = '';
    filteredItems.forEach((item, index) => {
      const isSelected = index === selectedIndex;
      const isMacro = item.type === 'macro';
      const icon = isMacro ? '⚡' : '📄';

      let metaBadge = '';
      if (isMacro) {
        metaBadge = `<span class="ate-item-pill macro-pill">Macro • ${item.stepsCount} bước</span>`;
      } else if (item.category) {
        metaBadge = `<span class="ate-item-pill cat-pill">${escapeHtml(item.category)}</span>`;
      }

      html += `
        <div class="ate-palette-item ${isSelected ? 'ate-selected' : ''}" data-index="${index}">
          <div class="ate-item-left-icon ${isMacro ? 'macro-icon' : ''}">
            <span>${icon}</span>
          </div>
          <div class="ate-item-main-content">
            <div class="ate-item-row-top">
              <span class="ate-item-title">${escapeHtml(item.title)}</span>
              ${item.shortcut ? `<code class="ate-item-shortcut">${escapeHtml(item.shortcut)}</code>` : ''}
            </div>
            <div class="ate-item-row-sub">
              <span class="ate-item-desc-snippet">${escapeHtml(item.content.slice(0, 75).replace(/\n/g, ' '))}...</span>
              ${metaBadge}
            </div>
          </div>
        </div>
      `;
    });

    listContainerEl.innerHTML = html;

    // Gắn sự kiện click và hover
    const itemEls = listContainerEl.querySelectorAll('.ate-palette-item');
    itemEls.forEach(el => {
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (!isNaN(idx) && idx !== selectedIndex) {
          selectedIndex = idx;
          updateSelectedHighlightOnly();
        }
      });

      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          selectedIndex = idx;
          executeSelectedItem();
        }
      });
    });

    // Cuộn mục đang chọn vào tầm nhìn
    const activeEl = listContainerEl.querySelector('.ate-palette-item.ate-selected');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateSelectedHighlightOnly() {
    if (!listContainerEl) return;
    const items = listContainerEl.querySelectorAll('.ate-palette-item');
    items.forEach((el, idx) => {
      el.classList.toggle('ate-selected', idx === selectedIndex);
    });
    renderLivePreview();
  }

  // Render khung xem trước chi tiết bên cột phải
  async function renderLivePreview() {
    if (!previewContainerEl) return;

    const currentItem = filteredItems[selectedIndex];
    if (!currentItem) {
      previewContainerEl.innerHTML = `
        <div class="ate-preview-empty">
          <span>Chọn một mục bên trái để xem trước</span>
        </div>
      `;
      return;
    }

    const bridge = window.AteContentBridge;

    if (currentItem.type === 'macro') {
      const macro = currentItem.data;
      const steps = macro.steps || [];

      let stepsHtml = '';
      steps.slice(0, 8).forEach((step, sIdx) => {
        const actionType = step.action || step.type || 'Hành động';
        const targetDesc = step.selector || step.label || step.name || `Phần tử #${sIdx + 1}`;
        const valDesc = step.value ? `"${escapeHtml(step.value)}"` : '';

        stepsHtml += `
          <div class="ate-macro-preview-step">
            <span class="ate-step-num">${sIdx + 1}</span>
            <div class="ate-step-info">
              <strong>${escapeHtml(actionType)}</strong>
              <code>${escapeHtml(targetDesc)}</code>
              ${valDesc ? `<span class="ate-step-val">${valDesc}</span>` : ''}
            </div>
          </div>
        `;
      });

      if (steps.length > 8) {
        stepsHtml += `<div class="ate-macro-step-more">+ thêm ${steps.length - 8} bước tiếp theo...</div>`;
      }

      previewContainerEl.innerHTML = `
        <div class="ate-preview-header">
          <div class="ate-preview-title-wrap">
            <span class="ate-preview-icon-box macro">⚡</span>
            <div>
              <h4 class="ate-preview-title">${escapeHtml(macro.name || 'Kịch bản Macro')}</h4>
              <div class="ate-preview-meta-row">
                <code class="ate-preview-shortcut">${escapeHtml(macro.shortcut || 'Không có phím tắt')}</code>
                <span class="ate-preview-badge">Tốc độ: ${macro.speed || 'safe'}</span>
                <span class="ate-preview-badge">${steps.length} bước</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ate-preview-scroll-body">
          <div class="ate-preview-section-title">URL Áp Dụng:</div>
          <div class="ate-preview-url-box">${escapeHtml(macro.urlPattern || 'Mọi trang web (*)')}</div>

          <div class="ate-preview-section-title" style="margin-top: 14px;">Quy Trình Tự Động Hóa:</div>
          <div class="ate-macro-steps-list">
            ${stepsHtml}
          </div>
        </div>

        <div class="ate-preview-bottom-action">
          <button type="button" class="ate-btn-preview-action macro-run" id="ate-btn-run-macro">
            <span>⚡ Kích Hoạt Macro Ngay (Enter)</span>
          </button>
        </div>
      `;

      const btnRun = previewContainerEl.querySelector('#ate-btn-run-macro');
      if (btnRun) {
        btnRun.addEventListener('click', executeSelectedItem);
      }
      return;
    }

    // Trường hợp Snippet: Phân giải nội dung xem trước
    const snippet = currentItem.data;
    let previewContent = snippet.content || '';
    if (bridge && bridge.resolveSystemVariables) {
      try {
        previewContent = await bridge.resolveSystemVariables(snippet.content);
      } catch (e) {}
    }

    let renderedHtml = '';
    if (snippet.renderRichText && bridge && bridge.renderMarkdownToHtml) {
      renderedHtml = bridge.renderMarkdownToHtml(previewContent);
    } else {
      renderedHtml = `<pre class="ate-preview-plain">${escapeHtml(previewContent)}</pre>`;
    }

    const tagsHtml = (snippet.tags || []).map(t => `<span class="ate-preview-tag">🏷️ ${escapeHtml(t)}</span>`).join('');

    previewContainerEl.innerHTML = `
      <div class="ate-preview-header">
        <div class="ate-preview-title-wrap">
          <span class="ate-preview-icon-box snippet">📄</span>
          <div>
            <h4 class="ate-preview-title">${escapeHtml(snippet.label || snippet.shortcut)}</h4>
            <div class="ate-preview-meta-row">
              <code class="ate-preview-shortcut">${escapeHtml(snippet.shortcut)}</code>
              <span class="ate-preview-badge">${escapeHtml(snippet.category || 'Chung')}</span>
              ${snippet.renderRichText ? '<span class="ate-preview-badge rich">Rich Text</span>' : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="ate-preview-scroll-body">
        ${tagsHtml ? `<div class="ate-preview-tags-wrap">${tagsHtml}</div>` : ''}
        <div class="ate-preview-section-title">Nội Dung Văn Bản Mở Rộng:</div>
        <div class="ate-preview-content-rendered">
          ${renderedHtml}
        </div>
      </div>

      <div class="ate-preview-bottom-action">
        <button type="button" class="ate-btn-preview-action snippet-insert" id="ate-btn-insert-snippet">
          <span>↵ Chèn Vào Ô Đang Focus (Enter)</span>
        </button>
      </div>
    `;

    const btnInsert = previewContainerEl.querySelector('#ate-btn-insert-snippet');
    if (btnInsert) {
      btnInsert.addEventListener('click', executeSelectedItem);
    }
  }

  // Xử lý sự kiện bàn phím khi Command Palette đang mở
  function onPaletteKeyDown(e) {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const filters = ['all', 'snippets', 'macros'];
      const nextIdx = (filters.indexOf(activeFilter) + (e.shiftKey ? -1 : 1) + filters.length) % filters.length;
      setFilter(filters[nextIdx]);
      return;
    }

    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault();
      if (filteredItems.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredItems.length;
        updateSelectedHighlightOnly();
        scrollSelectedItemIntoView();
      }
      return;
    }

    if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      if (filteredItems.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
        updateSelectedHighlightOnly();
        scrollSelectedItemIntoView();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      executeSelectedItem();
      return;
    }
  }

  function scrollSelectedItemIntoView() {
    if (!listContainerEl) return;
    const selectedEl = listContainerEl.querySelector(`.ate-palette-item[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  // Kích hoạt mục đang được chọn (Chèn snippet hoặc Chạy macro)
  async function executeSelectedItem() {
    const item = filteredItems[selectedIndex];
    if (!item) return;

    const bridge = window.AteContentBridge;
    if (!bridge) {
      closePalette();
      return;
    }

    closePalette();

    if (item.type === 'macro') {
      setTimeout(() => {
        bridge.playMacroDirectly(item.data);
      }, 60);
      return;
    }

    if (item.type === 'snippet') {
      setTimeout(async () => {
        await bridge.insertSnippetDirectly(item.data, lastActiveElement);
      }, 60);
    }
  }

  function openPalette() {
    syncTheme();
    createPaletteDOM();
    if (!overlayEl) return;

    overlayEl.setAttribute('data-theme', currentTheme);
    isOpen = true;
    query = '';
    selectedIndex = 0;
    if (inputEl) inputEl.value = '';

    updateFilterAndRender();

    overlayEl.style.display = 'flex';
    requestAnimationFrame(() => {
      overlayEl.classList.add('ate-open');
      if (inputEl) inputEl.focus();
    });
  }

  function closePalette() {
    if (!overlayEl || !isOpen) return;
    isOpen = false;
    overlayEl.classList.remove('ate-open');
    setTimeout(() => {
      if (overlayEl) overlayEl.style.display = 'none';
    }, 180);

    // Trả lại focus cho ô nhập liệu trước đó
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      try {
        lastActiveElement.focus();
      } catch (e) {}
    }
  }

  function togglePalette() {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }

  let currentShortcut = 'Ctrl+Shift+K';

  // Đồng bộ phím tắt từ Storage
  function syncShortcut() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['settings'], (res) => {
          if (res && res.settings && res.settings.paletteShortcut) {
            currentShortcut = res.settings.paletteShortcut;
          }
        });
      }
    } catch (e) {}

    const bridge = window.AteContentBridge;
    if (bridge && bridge.getSettings) {
      const s = bridge.getSettings();
      if (s && s.paletteShortcut) {
        currentShortcut = s.paletteShortcut;
      }
    }
  }

  syncShortcut();
  syncTheme();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.settings && changes.settings.newValue) {
        if (changes.settings.newValue.theme) {
          applyPaletteTheme(changes.settings.newValue.theme);
        }
        if (changes.settings.newValue.paletteShortcut) {
          currentShortcut = changes.settings.newValue.paletteShortcut;
        }
      }
    });
  }

  function matchShortcut(e, comboStr) {
    if (!comboStr) return false;
    const parts = comboStr.split('+').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return false;

    const mainKey = parts[parts.length - 1].toLowerCase();
    const hasCtrl = parts.some(p => p.toLowerCase() === 'ctrl' || p.toLowerCase() === 'control');
    const hasAlt = parts.some(p => p.toLowerCase() === 'alt');
    const hasShift = parts.some(p => p.toLowerCase() === 'shift');
    const hasMeta = parts.some(p => p.toLowerCase() === 'cmd' || p.toLowerCase() === 'meta' || p.toLowerCase() === 'command');

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrMeta = isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey;
    const targetCtrl = isMac ? (hasCtrl || hasMeta) : hasCtrl;

    if (ctrlOrMeta !== targetCtrl) return false;
    if (e.altKey !== hasAlt) return false;
    if (e.shiftKey !== hasShift) return false;

    if (mainKey === 'space') {
      return e.code === 'Space' || e.key === ' ' || e.keyCode === 32;
    }

    const eventKey = (e.key || '').toLowerCase();
    const eventCode = (e.code || '').toLowerCase();

    if (eventKey === mainKey) return true;
    if (eventCode === ('key' + mainKey)) return true;
    if (eventCode === ('digit' + mainKey)) return true;
    if (eventCode === mainKey) return true;

    return false;
  }

  // Lắng nghe phím tắt toàn cục kích hoạt Command Palette:
  window.addEventListener('keydown', (e) => {
    // 1. Khớp phím tắt tùy chỉnh trong Cài Đặt (hoặc mặc định Ctrl + Shift + K)
    const isCustomMatch = matchShortcut(e, currentShortcut);
    // 2. Dự phòng: luôn cho phép Ctrl + Shift + K
    const isDefaultMatch = matchShortcut(e, 'Ctrl+Shift+K');
    // 3. Alt + Space (Option + Space trên macOS)
    const isAltSpace = e.altKey && (e.code === 'Space' || e.key === ' ' || e.keyCode === 32);

    if (isCustomMatch || isDefaultMatch || isAltSpace) {
      e.preventDefault();
      e.stopPropagation();
      togglePalette();
    }
  }, true);

  // Lắng nghe tín hiệu kích hoạt từ background service worker
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.action === 'toggleCommandPalette') {
        togglePalette();
      }
    });
  }

  // Khởi tạo sẵn DOM sau khi tài liệu sẵn sàng để mở tức thì khi bấm phím tắt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPaletteDOM);
  } else {
    createPaletteDOM();
  }
})();
