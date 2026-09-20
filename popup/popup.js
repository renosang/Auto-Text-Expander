// Auto Text Expander - Popup Script
(function () {
  'use strict';

  let currentHost = '';
  let currentUrl = '';
  let snippets = [];
  let settings = {
    enabled: true,
    urlMode: 'blacklist',
    urlRules: [],
    triggerType: 'immediate',
    theme: 'dark'
  };

  const siteDisplay = document.getElementById('site-display');
  const sitePulse = document.getElementById('site-pulse');
  const siteStatusTitle = document.getElementById('site-status-title');
  const siteStatusDesc = document.getElementById('site-status-desc');
  const toggleSiteActive = document.getElementById('toggle-site-active');
  const popupSearch = document.getElementById('popup-search');
  const quickSnippetsList = document.getElementById('quick-snippets-list');
  const totalCountLabel = document.getElementById('total-count-label');
  const btnOpenOptions = document.getElementById('btn-open-options');
  const btnManageLink = document.getElementById('btn-manage-link');
  const popupToast = document.getElementById('popup-toast');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const iconSun = document.getElementById('popup-theme-icon-sun');
  const iconMoon = document.getElementById('popup-theme-icon-moon');

  let toastTimer = null;

  async function init() {
    await detectCurrentTab();
    await loadData();
    applyTheme(settings.theme || 'dark');
    renderSiteStatus();
    renderSnippets();

    // Event listeners
    toggleSiteActive.addEventListener('change', handleToggleSite);
    popupSearch.addEventListener('input', renderSnippets);
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', toggleTheme);
    }

    const openOptionsHandler = () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
    };

    btnOpenOptions.addEventListener('click', openOptionsHandler);
    btnManageLink.addEventListener('click', openOptionsHandler);
  }

  async function detectCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        currentUrl = tab.url;
        try {
          const parsed = new URL(tab.url);
          currentHost = parsed.hostname;
          siteDisplay.textContent = currentHost || 'Trang nội bộ';
        } catch (e) {
          currentHost = '';
          siteDisplay.textContent = 'Trang hệ thống';
        }
      }
    } catch (e) {
      siteDisplay.textContent = 'Không xác định';
    }
  }

  async function loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['snippets', 'settings']);
        if (data.snippets && Array.isArray(data.snippets)) {
          snippets = data.snippets;
        }
        if (data.settings) {
          settings = { ...settings, ...data.settings };
        }
      } else {
        const localSnippets = localStorage.getItem('ate_snippets');
        const localSettings = localStorage.getItem('ate_settings');
        if (localSnippets) snippets = JSON.parse(localSnippets);
        if (localSettings) settings = { ...settings, ...JSON.parse(localSettings) };
      }
    } catch (e) {
      console.warn('Lỗi nạp dữ liệu popup:', e);
    }
  }

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    if (iconSun && iconMoon) {
      if (themeName === 'light') {
        iconSun.style.display = 'block';
        iconMoon.style.display = 'none';
      } else {
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block';
      }
    }
  }

  async function toggleTheme() {
    const nextTheme = (settings.theme === 'light') ? 'dark' : 'light';
    settings.theme = nextTheme;
    applyTheme(nextTheme);
    await chrome.storage.local.set({ settings });
    showToast(`Giao diện ${nextTheme === 'light' ? 'Sáng' : 'Tối'}`);
  }

  function isSiteActive() {
    if (!settings.enabled) return false;
    if (!currentHost) return true;

    const rules = settings.urlRules || [];
    const isMatched = rules.some(rule => {
      const r = rule.trim().toLowerCase();
      if (r.includes('*')) {
        const regexStr = '^' + r.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
        return new RegExp(regexStr).test(currentHost) || new RegExp(regexStr).test(currentUrl);
      }
      return currentHost === r || currentHost.endsWith('.' + r);
    });

    if (settings.urlMode === 'whitelist') {
      return isMatched;
    } else {
      // Blacklist: nếu khớp rule là bị tắt
      return !isMatched;
    }
  }

  function renderSiteStatus() {
    const active = isSiteActive();
    toggleSiteActive.checked = active;

    if (active) {
      sitePulse.className = 'status-pulse';
      siteStatusTitle.textContent = 'Hoạt động trên trang này';
      siteStatusDesc.textContent = 'Phím tắt sẵn sàng mở rộng';
    } else {
      sitePulse.className = 'status-pulse disabled';
      siteStatusTitle.textContent = 'Đã tắt trên trang này';
      siteStatusDesc.textContent = 'Phím tắt sẽ không tự bung';
    }
  }

  async function handleToggleSite() {
    if (!currentHost) {
      showToast('Không thể áp dụng quy tắc cho trang này');
      renderSiteStatus();
      return;
    }

    const targetActive = toggleSiteActive.checked;
    if (!settings.urlRules) settings.urlRules = [];

    const host = currentHost.toLowerCase();
    const mode = settings.urlMode || 'blacklist';

    if (mode === 'blacklist') {
      if (targetActive) {
        // Muốn Bật trên trang này -> xóa khỏi blacklist nếu có
        settings.urlRules = settings.urlRules.filter(r => r.toLowerCase() !== host);
        showToast(`Đã bật trên ${host}`);
      } else {
        // Muốn Tắt trên trang này -> thêm vào blacklist
        if (!settings.urlRules.includes(host)) {
          settings.urlRules.push(host);
        }
        showToast(`Đã tắt trên ${host}`);
      }
    } else {
      // Whitelist mode
      if (targetActive) {
        // Muốn Bật -> thêm vào whitelist
        if (!settings.urlRules.includes(host)) {
          settings.urlRules.push(host);
        }
        showToast(`Đã thêm ${host} vào danh sách cho phép`);
      } else {
        // Muốn Tắt -> xóa khỏi whitelist
        settings.urlRules = settings.urlRules.filter(r => r.toLowerCase() !== host);
        showToast(`Đã gỡ ${host} khỏi danh sách`);
      }
    }

    await chrome.storage.local.set({ settings });
    renderSiteStatus();
  }

  function renderSnippets() {
    const query = (popupSearch.value || '').toLowerCase().trim();
    const filtered = snippets.filter(s => {
      if (!query) return true;
      return (
        s.shortcut.toLowerCase().includes(query) ||
        (s.label && s.label.toLowerCase().includes(query)) ||
        (s.content && s.content.toLowerCase().includes(query))
      );
    });

    totalCountLabel.textContent = `${snippets.length} phím tắt`;
    quickSnippetsList.innerHTML = '';

    if (filtered.length === 0) {
      quickSnippetsList.innerHTML = `
        <div style="padding: 20px 10px; text-align: center; color: var(--text-muted); font-size: 11.5px;">
          ${query ? 'Không có phím tắt phù hợp' : 'Chưa có phím tắt nào'}
        </div>
      `;
      return;
    }

    filtered.forEach(s => {
      const item = document.createElement('div');
      item.className = 'quick-item';
      item.innerHTML = `
        <div class="quick-item-left">
          <span class="quick-sc">${escapeHtml(s.shortcut)}</span>
          <span class="quick-lb">${escapeHtml(s.label || s.content.substring(0, 30))}</span>
        </div>
        <span class="quick-item-copy">Sao chép</span>
      `;

      item.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(s.shortcut);
          showToast(`Đã sao chép: ${s.shortcut}`);
        } catch (e) {
          showToast(`Phím tắt: ${s.shortcut}`);
        }
      });

      quickSnippetsList.appendChild(item);
    });
  }

  function showToast(msg) {
    popupToast.textContent = msg;
    popupToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      popupToast.classList.remove('show');
    }, 1800);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
