// Auto Text Expander - Content Script (React/Vue/Angular & ContentEditable Compatible)
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
      tags: ["email", "contact"]
    },
    {
      id: "default-2",
      shortcut: ":sig",
      label: "Chữ ký công việc Markdown",
      content: "**Trân trọng,**\n\n**Nguyễn Văn A** | *Senior Product Specialist*\n- Phone: `+84 987 654 321`\n- Website: [mycompany.vn](https://mycompany.vn)\n\n{{cursor}}",
      renderRichText: true,
      category: "work",
      tags: ["signature", "email", "work"]
    },
    {
      id: "default-3",
      shortcut: ":cskh",
      label: "Mẫu CSKH - Xác nhận đơn hàng",
      content: "Chào bạn **{{name:Quý khách}}**,\n\nĐơn hàng **#{{order_id:DH-1001}}** của bạn đã được tiếp nhận vào lúc {{time}} ngày {{date}}.\n- Trạng thái vận chuyển: **{{choice:Hỏa tốc 2h|Tiêu chuẩn 2-3 ngày|Giao tiết kiệm}}**\n- Địa chỉ giao hàng: {{cursor}}\n\nCảm ơn bạn đã tin tưởng ủng hộ!",
      renderRichText: true,
      category: "support",
      tags: ["cskh", "order", "support"]
    },
    {
      id: "default-4",
      shortcut: ":meeting",
      label: "Mẫu mời họp nhanh",
      content: "Chào team,\n\nMình xin phép gửi link tham gia buổi họp thảo luận tiến độ dự án:\n- **Thời gian:** 10:00 AM ({{date+1d:DD/MM/YYYY}})\n- **Phòng họp:** [Google Meet](https://meet.google.com/abc-def-xyz)\n\nNội dung chính:\n{{cursor}}\n\nHẹn gặp lại mọi người!",
      renderRichText: true,
      category: "work",
      tags: ["meeting", "work"]
    },
    {
      id: "default-5",
      shortcut: ":addr",
      label: "Địa chỉ văn phòng",
      content: "Tầng 12, Tòa nhà Landmark, 123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
      renderRichText: false,
      category: "general",
      tags: ["address", "office"]
    }
  ];

  let snippets = [...DEFAULT_SNIPPETS];
  let macros = [];
  let settings = {
    enabled: true,
    urlMode: 'blacklist',
    urlRules: [],
    triggerType: 'immediate',
    soundFeedback: false
  };

  let toastElement = null;
  let toastTimer = null;
  let isExpanding = false; // Ngăn chặn vòng lặp sự kiện vô tận

  // Khởi tạo và đồng bộ dữ liệu từ storage
  async function loadData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['snippets', 'settings', 'macros']);
        if (data.snippets && Array.isArray(data.snippets) && data.snippets.length > 0) {
          snippets = data.snippets;
        }
        if (data.macros && Array.isArray(data.macros)) {
          macros = data.macros;
        }
        if (data.settings) {
          settings = { ...settings, ...data.settings };
        }
      }
    } catch (e) {
      console.warn('[Auto Text Expander] Lỗi nạp dữ liệu:', e);
    }
  }

  // Lắng nghe thay đổi từ options hoặc popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        if (changes.snippets && changes.snippets.newValue) {
          snippets = changes.snippets.newValue;
        }
        if (changes.macros && changes.macros.newValue) {
          macros = changes.macros.newValue;
        }
        if (changes.settings && changes.settings.newValue) {
          settings = { ...settings, ...changes.settings.newValue };
        }
      }
    });
  }

  // Kiểm tra URL hiện tại có được phép chạy không
  function isUrlAllowed() {
    if (!settings.enabled) return false;

    const currentUrl = window.location.href.toLowerCase();
    const currentHost = window.location.hostname.toLowerCase();
    const rules = settings.urlRules || [];

    const matchesRule = rules.some((rule) => {
      if (!rule || !rule.trim()) return false;
      const cleanRule = rule.trim().toLowerCase();

      // Hỗ trợ wildcard đơn giản hoặc tên miền
      if (cleanRule.includes('*')) {
        const regexStr = '^' + cleanRule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
        return new RegExp(regexStr).test(currentUrl) || new RegExp(regexStr).test(currentHost);
      }

      // Khớp theo hostname hoặc url chứa rule
      return currentHost === cleanRule || currentHost.endsWith('.' + cleanRule) || currentUrl.includes(cleanRule);
    });

    if (settings.urlMode === 'whitelist') {
      return matchesRule;
    } else {
      // Blacklist: nếu khớp rule thì chặn
      return !matchesRule;
    }
  }

  // Hiển thị toast thông báo mở rộng nhẹ nhàng
  function showToast(snippet) {
    try {
      if (!toastElement) {
        toastElement = document.createElement('div');
        toastElement.className = 'ate-expansion-toast';
        document.body.appendChild(toastElement);
      }

      toastElement.innerHTML = `
        <span class="ate-toast-badge">⚡</span>
        <span class="ate-toast-text">Mở rộng: <span class="ate-toast-shortcut">${escapeHtml(snippet.shortcut)}</span></span>
      `;

      toastElement.classList.add('ate-show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        if (toastElement) {
          toastElement.classList.remove('ate-show');
        }
      }, 1800);
    } catch (e) {}
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // -------------------------------------------------------------
  // DYNAMIC VARIABLES & TEMPLATE SYSTEM
  // -------------------------------------------------------------
  function formatDate(d, fmt = 'DD/MM/YYYY') {
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

  async function resolveSystemVariables(text) {
    if (!text) return '';
    let result = text;
    const now = new Date();

    // 1. Relative dates: {{date+7d}}, {{date-3d}}, {{date+7d:YYYY-MM-DD}}
    result = result.replace(/\{\{date([+-]\d+)d(?::([^}]+))?\}\}/gi, (match, daysStr, fmt) => {
      const days = parseInt(daysStr, 10) || 0;
      const targetDate = new Date(now.getTime() + days * 86400000);
      return formatDate(targetDate, fmt || 'DD/MM/YYYY');
    });

    // 2. Custom formatted date: {{date:FORMAT}}
    result = result.replace(/\{\{date:([^}]+)\}\}/gi, (match, fmt) => {
      return formatDate(now, fmt);
    });

    // 3. Default date: {{date}}
    result = result.replace(/\{\{date\}\}/gi, () => formatDate(now, 'DD/MM/YYYY'));

    // 4. Formatted time: {{time:FORMAT}} or {{time}}
    result = result.replace(/\{\{time:([^}]+)\}\}/gi, (match, fmt) => {
      return formatDate(now, fmt);
    });
    result = result.replace(/\{\{time\}\}/gi, () => formatDate(now, 'HH:mm'));

    // 5. Page context: {{url}}, {{domain}}, {{title}}
    result = result.replace(/\{\{url\}\}/gi, () => window.location.href);
    result = result.replace(/\{\{domain\}\}/gi, () => window.location.hostname);
    result = result.replace(/\{\{title\}\}/gi, () => document.title || '');

    // 6. Clipboard: {{clipboard}}
    if (result.includes('{{clipboard}}')) {
      let clip = '';
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          clip = await navigator.clipboard.readText();
        }
      } catch (e) {
        console.warn('[Auto Text Expander] Không thể đọc clipboard:', e);
      }
      result = result.replace(/\{\{clipboard\}\}/gi, () => clip);
    }

    return result;
  }

  // Trích xuất các biến điền tương tác từ mẫu (loại trừ các biến hệ thống)
  function extractFillInFields(text) {
    if (!text) return [];
    const fields = [];
    const seenKeys = new Set();
    const SYSTEM_TAGS = ['date', 'time', 'clipboard', 'url', 'domain', 'title', 'cursor'];

    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const rawInner = match[1].trim();
      const fullTag = match[0];

      // Bỏ qua nếu là biến hệ thống hoặc cursor
      if (SYSTEM_TAGS.some(tag => rawInner === tag || rawInner.startsWith(tag + ':') || rawInner.startsWith(tag + '+') || rawInner.startsWith(tag + '-'))) {
        continue;
      }

      if (rawInner.startsWith('choice:')) {
        const parts = rawInner.slice(7).split(':');
        let label = 'Tùy chọn';
        let optionsStr = parts[0];
        if (parts.length > 1) {
          label = parts[0];
          optionsStr = parts[1];
        }
        const options = optionsStr.split('|').map(o => o.trim()).filter(Boolean);
        const key = fullTag;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          fields.push({
            type: 'choice',
            key,
            label,
            options,
            defaultValue: options[0] || '',
            raw: fullTag
          });
        }
      } else {
        // Biến nhập liệu: {{name}} hoặc {{name:Gợi ý}}
        const colonIdx = rawInner.indexOf(':');
        let keyName = rawInner;
        let defaultValue = '';
        if (colonIdx !== -1) {
          keyName = rawInner.slice(0, colonIdx).trim();
          defaultValue = rawInner.slice(colonIdx + 1).trim();
        }
        const key = fullTag;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          fields.push({
            type: 'text',
            key,
            label: keyName,
            defaultValue,
            raw: fullTag
          });
        }
      }
    }
    return fields;
  }

  let activeFillInOverlay = null;

  // Hiển thị Popover tương tác điền nhanh dữ liệu
  function showFillInModal(snippet, fields, onConfirm, onCancel) {
    if (activeFillInOverlay) {
      activeFillInOverlay.remove();
      activeFillInOverlay = null;
    }

    const overlay = document.createElement('div');
    overlay.className = 'ate-fillin-overlay';

    const modal = document.createElement('div');
    modal.className = 'ate-fillin-modal';

    const header = document.createElement('div');
    header.className = 'ate-fillin-header';
    header.innerHTML = `
      <h3 class="ate-fillin-title">
        <span>⚡</span>
        <span>Điền thông tin nhanh</span>
        <span class="ate-fillin-shortcut-badge">${escapeHtml(snippet.shortcut)}</span>
      </h3>
      <span style="font-size:12px;color:#94a3b8;">${escapeHtml(snippet.label || '')}</span>
    `;

    const body = document.createElement('div');
    body.className = 'ate-fillin-body';

    const inputsMap = new Map();

    fields.forEach((field) => {
      const fieldEl = document.createElement('div');
      fieldEl.className = 'ate-fillin-field';

      const label = document.createElement('label');
      label.className = 'ate-fillin-label';
      label.innerHTML = `<span>${escapeHtml(field.label)}</span> <span class="var-name">(${escapeHtml(field.type === 'choice' ? 'Lựa chọn' : field.raw)})</span>`;
      fieldEl.appendChild(label);

      if (field.type === 'choice') {
        const select = document.createElement('select');
        select.className = 'ate-fillin-select';
        field.options.forEach(opt => {
          const optionEl = document.createElement('option');
          optionEl.value = opt;
          optionEl.textContent = opt;
          select.appendChild(optionEl);
        });
        fieldEl.appendChild(select);
        inputsMap.set(field.key, select);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ate-fillin-input';
        input.value = field.defaultValue || '';
        input.placeholder = `Nhập ${field.label}...`;
        fieldEl.appendChild(input);
        inputsMap.set(field.key, input);
      }

      body.appendChild(fieldEl);
    });

    const footer = document.createElement('div');
    footer.className = 'ate-fillin-footer';
    footer.innerHTML = `
      <div class="ate-fillin-hint">
        <span>[Tab] Chuyển ô • [Enter] Chèn • [Esc] Hủy</span>
      </div>
      <div class="ate-fillin-actions">
        <button type="button" class="ate-btn-fillin-cancel">Hủy (Esc)</button>
        <button type="button" class="ate-btn-fillin-submit">
          <span>✓</span> Chèn ngay (Enter)
        </button>
      </div>
    `;

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    activeFillInOverlay = overlay;

    // Tự động focus vào ô đầu tiên
    const firstInput = body.querySelector('input, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 60);
    }

    function handleConfirm() {
      const values = {};
      fields.forEach(field => {
        const inputEl = inputsMap.get(field.key);
        values[field.key] = inputEl ? inputEl.value : (field.defaultValue || '');
      });
      cleanup();
      onConfirm(values);
    }

    function handleCancel() {
      cleanup();
      if (onCancel) onCancel();
    }

    function cleanup() {
      window.removeEventListener('keydown', onKeyDown, true);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      activeFillInOverlay = null;
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    footer.querySelector('.ate-btn-fillin-cancel').addEventListener('click', handleCancel);
    footer.querySelector('.ate-btn-fillin-submit').addEventListener('click', handleConfirm);
  }

  // Chuyển đổi Markdown sang Safe HTML
  function renderMarkdownToHtml(markdownText) {
    try {
      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        const rawHtml = marked.parse(markdownText);
        return DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['span'],
          ADD_ATTR: ['id', 'class', 'style', 'target', 'rel']
        });
      }
    } catch (err) {
      console.error('[Auto Text Expander] Lỗi parse markdown:', err);
    }
    return markdownText.replace(/\n/g, '<br/>');
  }

  // Chuyển đổi Markdown sang Plain Text thuần cho các trường không hỗ trợ Markdown (input, textarea)
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
      str = str.replace(/^\s*[-*+]\s+/gm, '');
      str = str.replace(/^\s*\d+\.\s+/gm, '');
      str = str.replace(/\r?\n+/g, ' ');
    } else {
      str = str.replace(/^\s*[-*+]\s+/gm, '• ');
    }

    return str.trim();
  }

  // Tìm snippet khớp với chuỗi văn bản trước con trỏ
  function findMatchingSnippet(text) {
    if (!text || snippets.length === 0) return null;

    const sortedSnippets = [...snippets].sort((a, b) => b.shortcut.length - a.shortcut.length);

    for (const snippet of sortedSnippets) {
      const sc = snippet.shortcut;
      if (!sc) continue;

      if (settings.triggerType === 'immediate') {
        if (text.endsWith(sc) || text.toLowerCase().endsWith(sc.toLowerCase())) {
          return snippet;
        }
      } else {
        if (
          text.endsWith(sc + ' ') || text.toLowerCase().endsWith(sc.toLowerCase() + ' ') ||
          text.endsWith(sc + '\n') || text.toLowerCase().endsWith(sc.toLowerCase() + '\n') ||
          text.endsWith(sc + '\t') || text.toLowerCase().endsWith(sc.toLowerCase() + '\t')
        ) {
          return snippet;
        }

        const matchRegex = new RegExp('(?:^|[\\s.,!?;:\'\"\\(\\[])' + escapeRegExp(sc) + '[\\s\\n]$', 'i');
        if (matchRegex.test(text)) {
          return snippet;
        }
      }
    }
    return null;
  }

  // Tìm macro kịch bản khớp với chuỗi văn bản trước con trỏ
  function findMatchingMacro(text) {
    if (!text || macros.length === 0) return null;
    const activeMacros = macros.filter(m => m.enabled && m.shortcut);
    const sorted = [...activeMacros].sort((a, b) => b.shortcut.length - a.shortcut.length);

    for (const m of sorted) {
      const sc = m.shortcut;
      if (!sc) continue;
      if (text.endsWith(sc) || text.toLowerCase().endsWith(sc.toLowerCase())) {
        return m;
      }
      if (text.endsWith(sc + ' ') || text.toLowerCase().endsWith(sc.toLowerCase() + ' ')) {
        return m;
      }
    }
    return null;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function setNativeInputValue(el, newValue, newCaretPos) {
    const isTextarea = el.tagName === 'TEXTAREA';
    const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    const previousValue = el.value;

    if (prototypeValueSetter) {
      prototypeValueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }

    if (el._valueTracker) {
      el._valueTracker.setValue(previousValue !== newValue ? previousValue : '');
    }

    if (typeof newCaretPos === 'number' && !isNaN(newCaretPos)) {
      try {
        el.setSelectionRange(newCaretPos, newCaretPos);
      } catch (e) {}
    }

    try {
      const inputEvt = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertReplacementText',
        data: newValue
      });
      el.dispatchEvent(inputEvt);
    } catch (err) {
      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    try {
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  // Thực hiện chèn phím tắt cho Input / Textarea
  async function performInputExpansion(el, matchedSnippet, rawContent, caretPos, textBeforeCaret, textAfterCaret, fullValue) {
    try {
      const sc = matchedSnippet.shortcut;
      let removeLen = sc.length;

      if (settings.triggerType !== 'immediate') {
        const lastChar = textBeforeCaret.slice(-1);
        if (lastChar === ' ' || lastChar === '\n' || lastChar === '\t') {
          removeLen = sc.length + 1;
        }
      }

      const startPos = caretPos - removeLen;
      const endPos = caretPos;

      // 1. Giải mã các biến hệ thống (ngày giờ, clipboard, url...)
      const resolvedContent = await resolveSystemVariables(rawContent);

      // 2. Strip Markdown cho trường input/textarea
      const isSingleLine = el.tagName === 'INPUT';
      let replacement = stripMarkdown(resolvedContent, isSingleLine);

      // 3. Xử lý con trỏ thông minh {{cursor}}
      let customCaretIndex = -1;
      const cursorMarker = '{{cursor}}';
      if (replacement.includes(cursorMarker)) {
        customCaretIndex = replacement.indexOf(cursorMarker);
        replacement = replacement.replace(new RegExp(escapeRegExp(cursorMarker), 'g'), '');
      }

      const expectedFullValue = fullValue.slice(0, startPos) + replacement + textAfterCaret;
      const newCaretPos = customCaretIndex !== -1 ? (startPos + customCaretIndex) : (startPos + replacement.length);

      const isControlledFramework = Boolean(
        el._valueTracker ||
        Object.keys(el).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps') || k.startsWith('__vue'))
      );

      if (isControlledFramework) {
        setNativeInputValue(el, expectedFullValue, newCaretPos);
      } else {
        el.focus();
        el.setSelectionRange(startPos, endPos);

        let execSucceeded = false;
        try {
          execSucceeded = document.execCommand('insertText', false, replacement);
        } catch (e) {
          execSucceeded = false;
        }

        if (!execSucceeded || el.value !== expectedFullValue) {
          setNativeInputValue(el, expectedFullValue, newCaretPos);
        } else {
          try {
            el.setSelectionRange(newCaretPos, newCaretPos);
          } catch (e) {}
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      showToast(matchedSnippet);
    } catch (err) {
      console.error('[Auto Text Expander] Lỗi khi chèn text:', err);
    } finally {
      setTimeout(() => {
        isExpanding = false;
      }, 60);
    }
  }

  // Xử lý mở rộng trong Input và Textarea
  function handleInputTextarea(el) {
    if (isExpanding) return;
    if (!isUrlAllowed()) return;
    if (el.readOnly || el.disabled) return;

    const caretPos = el.selectionEnd;
    if (caretPos === undefined || caretPos === null) return;

    const fullValue = el.value || '';
    const textBeforeCaret = fullValue.slice(0, caretPos);
    const textAfterCaret = fullValue.slice(caretPos);

    // 1. Kiểm tra kịch bản Macro
    const matchedMacro = findMatchingMacro(textBeforeCaret);
    if (matchedMacro) {
      isExpanding = true;
      try {
        const sc = matchedMacro.shortcut;
        const removeLen = textBeforeCaret.endsWith(' ') ? sc.length + 1 : sc.length;
        const startPos = caretPos - removeLen;
        const expectedFullValue = fullValue.slice(0, startPos) + textAfterCaret;
        setNativeInputValue(el, expectedFullValue, startPos);

        setTimeout(() => {
          if (window.AteMacroReplayer) {
            window.AteMacroReplayer.play(matchedMacro);
          }
        }, 80);
      } catch (e) {
        console.error('Lỗi khởi chạy macro từ phím tắt:', e);
      } finally {
        setTimeout(() => { isExpanding = false; }, 120);
      }
      return;
    }

    // 2. Kiểm tra phím tắt Snippet
    const matchedSnippet = findMatchingSnippet(textBeforeCaret);
    if (!matchedSnippet) return;

    // Kiểm tra có chứa biến điền tương tác không ({{name}}, {{choice:...}})
    const fillInFields = extractFillInFields(matchedSnippet.content);
    if (fillInFields.length > 0) {
      isExpanding = true;
      showFillInModal(
        matchedSnippet,
        fillInFields,
        async (values) => {
          let content = matchedSnippet.content;
          for (const [key, val] of Object.entries(values)) {
            content = content.split(key).join(val);
          }
          await performInputExpansion(el, matchedSnippet, content, caretPos, textBeforeCaret, textAfterCaret, fullValue);
        },
        () => {
          isExpanding = false;
          el.focus();
        }
      );
      return;
    }

    isExpanding = true;
    performInputExpansion(el, matchedSnippet, matchedSnippet.content, caretPos, textBeforeCaret, textAfterCaret, fullValue);
  }

  // Thực hiện chèn phím tắt cho ContentEditable
  async function performContentEditableExpansion(rootEl, matchedSnippet, rawContent, node, caretPos, textBeforeCaret, removeLen) {
    try {
      rootEl.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();

      const range = document.createRange();
      range.setStart(node, caretPos - removeLen);
      range.setEnd(node, caretPos);
      sel.addRange(range);

      // 1. Giải mã các biến hệ thống
      const resolvedContent = await resolveSystemVariables(rawContent);
      const hasCursorMarker = resolvedContent.includes('{{cursor}}');
      const isRich = matchedSnippet.renderRichText;

      if (isRich) {
        // Chèn marker định vị con trỏ trước khi parse Markdown
        const CURSOR_MARKER_HTML = '<span id="ate-cursor-marker" style="display:inline;line-height:0;font-size:0;">\u200B</span>';
        let contentWithMarker = resolvedContent;
        if (hasCursorMarker) {
          contentWithMarker = contentWithMarker.replace('{{cursor}}', CURSOR_MARKER_HTML);
        }

        const htmlContent = renderMarkdownToHtml(contentWithMarker);
        let success = false;
        try {
          success = document.execCommand('insertHTML', false, htmlContent);
        } catch (e) {
          success = false;
        }

        if (!success) {
          range.deleteContents();
          const template = document.createElement('template');
          template.innerHTML = htmlContent;
          const frag = template.content;
          const lastChild = frag.lastChild;
          range.insertNode(frag);
          if (lastChild) {
            range.setStartAfter(lastChild);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }

        // Định vị lại con trỏ chuột tại vị trí {{cursor}}
        if (hasCursorMarker) {
          const marker = rootEl.querySelector('#ate-cursor-marker');
          if (marker) {
            const caretRange = document.createRange();
            caretRange.setStartBefore(marker);
            caretRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(caretRange);
            marker.remove();
          }
        }
      } else {
        let plainText = stripMarkdown(resolvedContent, false);
        let cursorIdx = -1;
        if (hasCursorMarker) {
          cursorIdx = plainText.indexOf('{{cursor}}');
          plainText = plainText.replace('{{cursor}}', '');
        }

        let success = false;
        try {
          success = document.execCommand('insertText', false, plainText);
        } catch (e) {
          success = false;
        }

        if (!success) {
          range.deleteContents();
          const textNode = document.createTextNode(plainText);
          range.insertNode(textNode);
          if (cursorIdx !== -1) {
            range.setStart(textNode, cursorIdx);
            range.collapse(true);
          } else {
            range.setStartAfter(textNode);
            range.collapse(true);
          }
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      rootEl.dispatchEvent(new Event('input', { bubbles: true }));
      showToast(matchedSnippet);
    } catch (err) {
      console.error('[Auto Text Expander] Lỗi khi chèn contenteditable:', err);
    } finally {
      setTimeout(() => {
        isExpanding = false;
      }, 60);
    }
  }

  // Xử lý mở rộng trong ContentEditable
  function handleContentEditable(rootEl) {
    if (isExpanding) return;
    if (!isUrlAllowed()) return;

    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode) return;

    const node = sel.anchorNode;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const caretPos = sel.anchorOffset;
    const textBeforeCaret = node.nodeValue.slice(0, caretPos);
    const matchedSnippet = findMatchingSnippet(textBeforeCaret);

    if (!matchedSnippet) return;

    let removeLen = matchedSnippet.shortcut.length;
    if (settings.triggerType !== 'immediate') {
      const lastChar = textBeforeCaret.slice(-1);
      if (lastChar === ' ' || lastChar === '\n' || lastChar === '\t') {
        removeLen = matchedSnippet.shortcut.length + 1;
      }
    }

    const fillInFields = extractFillInFields(matchedSnippet.content);
    if (fillInFields.length > 0) {
      isExpanding = true;
      showFillInModal(
        matchedSnippet,
        fillInFields,
        async (values) => {
          let content = matchedSnippet.content;
          for (const [key, val] of Object.entries(values)) {
            content = content.split(key).join(val);
          }
          await performContentEditableExpansion(rootEl, matchedSnippet, content, node, caretPos, textBeforeCaret, removeLen);
        },
        () => {
          isExpanding = false;
          rootEl.focus();
        }
      );
      return;
    }

    isExpanding = true;
    performContentEditableExpansion(rootEl, matchedSnippet, matchedSnippet.content, node, caretPos, textBeforeCaret, removeLen);
  }

  // Điều hướng kiểm tra phần tử đang gõ
  function onTextInputEvent(e) {
    if (e && e.isComposing) return; // Không can thiệp khi đang gõ tiếng Việt Telex/VNI

    const target = e ? e.target : null;
    if (!target) return;

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (target.type === 'password' || target.type === 'hidden') return;
      handleInputTextarea(target);
    } else if (target.isContentEditable || target.closest('[contenteditable="true"]') || target.classList?.contains('ql-editor')) {
      const editableRoot = target.isContentEditable ? target : (target.closest('[contenteditable="true"]') || target.closest('.ql-editor'));
      if (editableRoot) {
        handleContentEditable(editableRoot);
      }
    }
  }

  // Lắng nghe cả input (bắt chuẩn IME), keyup (bắt ngay lập tức mọi framework) và compositionend (hoàn tất gõ dấu tiếng Việt)
  document.addEventListener('input', onTextInputEvent, true);
  document.addEventListener('keyup', (e) => {
    // Không xử lý các phím điều hướng hoặc chức năng
    if (['Shift', 'Control', 'Alt', 'Meta', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(e.key)) {
      return;
    }
    onTextInputEvent(e);
  }, true);
  document.addEventListener('compositionend', onTextInputEvent, true);

  // Khởi động
  loadData();
})();
