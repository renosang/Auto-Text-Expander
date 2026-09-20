// Auto Text Expander - Content Script (React/Vue/Angular & ContentEditable Compatible)
(function () {
  'use strict';

  const DEFAULT_SNIPPETS = [
    {
      id: "default-1",
      shortcut: ":email",
      label: "Email cá nhân",
      content: "contact@example.com",
      renderRichText: false
    },
    {
      id: "default-2",
      shortcut: ":sig",
      label: "Chữ ký công việc Markdown",
      content: "**Trân trọng,**\n\n**Nguyễn Văn A** | *Senior Product Specialist*\n- Phone: `+84 987 654 321`\n- Website: [mycompany.vn](https://mycompany.vn)",
      renderRichText: true
    },
    {
      id: "default-3",
      shortcut: ":meeting",
      label: "Mẫu mời họp nhanh",
      content: "Chào bạn,\n\nMình xin phép gửi link tham gia buổi họp thảo luận tiến độ dự án:\n- **Thời gian:** 10:00 AM (Thứ Hai)\n- **Phòng họp:** [Google Meet](https://meet.google.com/abc-def-xyz)\n\nHẹn gặp lại bạn!",
      renderRichText: true
    },
    {
      id: "default-4",
      shortcut: ":addr",
      label: "Địa chỉ văn phòng",
      content: "Tầng 12, Tòa nhà Landmark, 123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
      renderRichText: false
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

  // Chuyển đổi Markdown sang Safe HTML
  function renderMarkdownToHtml(markdownText) {
    try {
      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        const rawHtml = marked.parse(markdownText);
        return DOMPurify.sanitize(rawHtml);
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

  // Tìm snippet khớp với chuỗi văn bản trước con trỏ
  function findMatchingSnippet(text) {
    if (!text || snippets.length === 0) return null;

    // Sắp xếp theo độ dài giảm dần để ưu tiên từ khóa dài hơn
    const sortedSnippets = [...snippets].sort((a, b) => b.shortcut.length - a.shortcut.length);

    for (const snippet of sortedSnippets) {
      const sc = snippet.shortcut;
      if (!sc) continue;

      if (settings.triggerType === 'immediate') {
        if (text.endsWith(sc) || text.toLowerCase().endsWith(sc.toLowerCase())) {
          return snippet;
        }
      } else {
        // Delimiter mode: phím tắt nằm trước dấu cách hoặc enter
        // 1. Khớp nếu kết thúc bằng phím tắt + khoảng trắng / tab / xuống dòng
        if (
          text.endsWith(sc + ' ') || text.toLowerCase().endsWith(sc.toLowerCase() + ' ') ||
          text.endsWith(sc + '\n') || text.toLowerCase().endsWith(sc.toLowerCase() + '\n') ||
          text.endsWith(sc + '\t') || text.toLowerCase().endsWith(sc.toLowerCase() + '\t')
        ) {
          return snippet;
        }

        // 2. Regex hỗ trợ ranh giới từ hoặc đầu chuỗi
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

  /**
   * Cập nhật giá trị cho các input / textarea được quản lý bởi React, Vue, Angular và plain HTML.
   * Sử dụng native prototype setter để bypass setter của framework và cập nhật _valueTracker.
   */
  function setNativeInputValue(el, newValue, newCaretPos) {
    const isTextarea = el.tagName === 'TEXTAREA';
    const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    const previousValue = el.value;

    // 1. Gán giá trị thông qua prototype setter để bypass getter/setter của React
    if (prototypeValueSetter) {
      prototypeValueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }

    // 2. Cập nhật React _valueTracker nếu tồn tại
    // Đặt giá trị tracker khác với newValue để React's updateValueIfChanged() phát hiện sự thay đổi và kích hoạt onChange
    if (el._valueTracker) {
      el._valueTracker.setValue(previousValue !== newValue ? previousValue : '');
    }

    // 3. Đặt lại con trỏ chuột đúng vị trí
    if (typeof newCaretPos === 'number' && !isNaN(newCaretPos)) {
      try {
        el.setSelectionRange(newCaretPos, newCaretPos);
      } catch (e) {}
    }

    // 4. Phát sự kiện input (chuẩn cho React 16-19, Vue, Angular)
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

    // 5. Phát sự kiện change cho các form validation (Formik, React Hook Form, Yup)
    try {
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  // Xử lý mở rộng trong Input và Textarea (Hỗ trợ 100% React Controlled Inputs)
  function handleInputTextarea(el) {
    if (isExpanding) return;
    if (!isUrlAllowed()) return;
    if (el.readOnly || el.disabled) return;

    const caretPos = el.selectionEnd;
    if (caretPos === undefined || caretPos === null) return;

    const fullValue = el.value || '';
    const textBeforeCaret = fullValue.slice(0, caretPos);
    const textAfterCaret = fullValue.slice(caretPos);

    // 1. Kiểm tra nếu khớp với phím tắt của kịch bản Macro
    const matchedMacro = findMatchingMacro(textBeforeCaret);
    if (matchedMacro) {
      isExpanding = true;
      try {
        const sc = matchedMacro.shortcut;
        const removeLen = textBeforeCaret.endsWith(' ') ? sc.length + 1 : sc.length;
        const startPos = caretPos - removeLen;
        const expectedFullValue = fullValue.slice(0, startPos) + textAfterCaret;
        setNativeInputValue(el, expectedFullValue, startPos);

        // Kích hoạt chạy Macro tự động
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

    const matchedSnippet = findMatchingSnippet(textBeforeCaret);
    if (!matchedSnippet) return;

    isExpanding = true;

    try {
      const sc = matchedSnippet.shortcut;
      let removeLen = sc.length;

      // Nếu ở chế độ delimiter, trừ thêm 1 ký tự dấu cách / enter
      if (settings.triggerType !== 'immediate') {
        const lastChar = textBeforeCaret.slice(-1);
        if (lastChar === ' ' || lastChar === '\n' || lastChar === '\t') {
          removeLen = sc.length + 1;
        }
      }

      const startPos = caretPos - removeLen;
      const endPos = caretPos;
      
      // Tự động loại bỏ cú pháp Markdown (in đậm, in nghiêng, link...) khi chèn vào trường không hỗ trợ (input, textarea)
      const isSingleLine = el.tagName === 'INPUT';
      const replacement = stripMarkdown(matchedSnippet.content, isSingleLine);

      const expectedFullValue = fullValue.slice(0, startPos) + replacement + textAfterCaret;
      const newCaretPos = startPos + replacement.length;

      // Nhận diện xem phần tử có thuộc React / Vue hay framework kiểm soát không
      const isControlledFramework = Boolean(
        el._valueTracker ||
        Object.keys(el).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps') || k.startsWith('__vue'))
      );

      if (isControlledFramework) {
        // Đối với React/Vue/Angular: Sử dụng trực tiếp setNativeInputValue để đồng bộ state hoàn hảo
        setNativeInputValue(el, expectedFullValue, newCaretPos);
      } else {
        // Với form HTML truyền thống: Thử execCommand để giữ Ctrl+Z Undo stack
        el.focus();
        el.setSelectionRange(startPos, endPos);

        let execSucceeded = false;
        try {
          execSucceeded = document.execCommand('insertText', false, replacement);
        } catch (e) {
          execSucceeded = false;
        }

        // Nếu execCommand không thành công hoặc kết quả không đúng, fallback sang native setter
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
      }, 50);
    }
  }

  // Xử lý mở rộng trong ContentEditable (Gmail, Notion, Quill, Slack,...)
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

    isExpanding = true;

    try {
      const sc = matchedSnippet.shortcut;
      let removeLen = sc.length;
      if (settings.triggerType !== 'immediate') {
        const lastChar = textBeforeCaret.slice(-1);
        if (lastChar === ' ' || lastChar === '\n' || lastChar === '\t') {
          removeLen = sc.length + 1;
        }
      }

      const range = document.createRange();
      range.setStart(node, caretPos - removeLen);
      range.setEnd(node, caretPos);

      sel.removeAllRanges();
      sel.addRange(range);

      const isRich = matchedSnippet.renderRichText;
      if (isRich) {
        const htmlContent = renderMarkdownToHtml(matchedSnippet.content);
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
      } else {
        const plainText = stripMarkdown(matchedSnippet.content, false);
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
          range.setStartAfter(textNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }

      rootEl.dispatchEvent(new Event('input', { bubbles: true }));
      showToast(matchedSnippet);
    } catch (err) {
      console.error('[Auto Text Expander] Lỗi khi chèn contenteditable:', err);
    } finally {
      isExpanding = false;
    }
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
