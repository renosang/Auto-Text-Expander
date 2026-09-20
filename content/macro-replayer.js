// Auto Text Expander - Macro Replayer Engine (Automated Form Execution)
(function () {
  'use strict';

  let isPlaying = false;
  let progressToastEl = null;

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // -------------------------------------------------------------
  // CONTENTEDITABLE / SLATE / QUILL / RICH-TEXT SETTER
  // -------------------------------------------------------------
  function setContentEditableValue(el, newValue) {
    if (!el) return;

    const editor = el.closest('[contenteditable="true"], [data-slate-editor="true"], .slate-editable-area, .ql-editor') || el;
    try {
      editor.focus();
    } catch (e) {}

    // 1. Quill Editor
    if (editor.classList?.contains('ql-editor')) {
      editor.innerHTML = `<p>${escapeHtml(newValue)}</p>`;
      try {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
      return;
    }

    // 2. Slate.js / Standard ContentEditable
    const sel = window.getSelection();
    if (sel) {
      try {
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }

    // Gửi sự kiện beforeinput (chuẩn để Slate.js nhận diện và cập nhật React internal state)
    try {
      editor.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: newValue
      }));
    } catch (e) {}

    let execOk = false;
    try {
      execOk = document.execCommand('insertText', false, newValue);
    } catch (e) {
      execOk = false;
    }

    // Nếu execCommand không thành công hoặc editor chưa nhận nội dung
    if (!execOk || !editor.innerText?.includes(newValue)) {
      try {
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(newValue);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          editor.innerText = newValue;
        }
      } catch (e) {
        editor.innerText = newValue;
      }
    }

    try {
      editor.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: newValue
      }));
    } catch (e) {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    try {
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // REACT / VUE COMPATIBLE VALUE SETTER
  // -------------------------------------------------------------
  function setElementValue(el, newValue) {
    if (!el) return;

    // Kiểm tra nếu là ContentEditable hoặc Slate / Rich-text Editor
    const isContentEditable = el.isContentEditable ||
                              el.getAttribute('contenteditable') === 'true' ||
                              Boolean(el.closest('[contenteditable="true"], [data-slate-editor="true"], .slate-editable-area, .ql-editor')) ||
                              el.classList?.contains('slate-editable-area') ||
                              (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA');

    if (isContentEditable) {
      setContentEditableValue(el, newValue);
      return;
    }

    const isTextarea = el.tagName === 'TEXTAREA';
    const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    const previousValue = el.value;

    el.focus();

    if (prototypeValueSetter) {
      prototypeValueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }

    if (el._valueTracker) {
      el._valueTracker.setValue(previousValue !== newValue ? previousValue : '');
    }

    try {
      el.setSelectionRange(newValue.length, newValue.length);
    } catch (e) {}

    try {
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertReplacementText',
        data: newValue
      }));
    } catch (e) {
      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    try {
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } catch (e) {}

    try {
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // DYNAMIC / TRANSIENT STATE CLASSES PATTERN
  // -------------------------------------------------------------
  const TRANSIENT_CLASS_REGEX = /\.(focused|is-focused|has-focus|active|is-active|open|is-open|opened|show|showing|selected|is-selected|hover|focus|disabled|loading|dirty|touched|valid|invalid)\b/gi;

  // -------------------------------------------------------------
  // ELEMENT FINDER VỚI SMART FALLBACK
  // -------------------------------------------------------------
  function findElementWithFallback(step) {
    if (!step) return null;

    // 1. Thử trực tiếp bằng selector nguyên bản
    if (step.selector) {
      try {
        const found = document.querySelector(step.selector);
        if (found) return found;
      } catch (e) {}

      // 2. Thử loại bỏ các dynamic state classes khỏi selector
      // Ví dụ: .searchable-brand-input-box.focused -> .searchable-brand-input-box
      try {
        const cleanedSelector = step.selector
          .replace(TRANSIENT_CLASS_REGEX, '')
          .replace(/\s*>\s*>\s*/g, ' > ')
          .replace(/>\s*$/g, '')
          .trim();

        if (cleanedSelector && cleanedSelector !== step.selector) {
          const found = document.querySelector(cleanedSelector);
          if (found) return found;
        }
      } catch (e) {}

      // 3. Thử tìm bằng phần tử lá cuối cùng trong selector (Leaf element)
      // Ví dụ: "div.faq-form-group > ... > input.searchable-brand-inner-input" -> "input.searchable-brand-inner-input"
      try {
        const segments = step.selector.split(/\s*>\s*/).map(s => s.trim()).filter(Boolean);
        if (segments.length > 1) {
          let lastPart = segments[segments.length - 1];
          lastPart = lastPart.replace(TRANSIENT_CLASS_REGEX, '').trim();
          if (lastPart) {
            const matches = document.querySelectorAll(lastPart);
            if (matches.length === 1) {
              return matches[0];
            } else if (matches.length > 1) {
              // Thử kết hợp với phần tử gốc đầu tiên (top container)
              const firstPart = segments[0].replace(TRANSIENT_CLASS_REGEX, '').trim();
              try {
                const scoped = document.querySelector(`${firstPart} ${lastPart}`);
                if (scoped) return scoped;
              } catch (e) {}

              // Hoặc ưu tiên phần tử đang hiển thị trên màn hình
              for (const m of matches) {
                if (m.offsetParent !== null || m.offsetWidth > 0 || m.offsetHeight > 0) return m;
              }
              return matches[0];
            }
          }
        }
      } catch (e) {}
    }

    // 4. Thử tìm theo name
    const matchName = step.selector?.match(/\[name="([^"]+)"\]/);
    if (matchName && matchName[1]) {
      const el = document.querySelector(`[name="${matchName[1]}"]`);
      if (el) return el;
    }

    // 5. Thử tìm theo placeholder hoặc label đã lưu
    if (step.label) {
      const matchPlaceholder = step.label.match(/Ô\s*["']([^"']+)["']/);
      if (matchPlaceholder && matchPlaceholder[1]) {
        const el = document.querySelector(`[placeholder="${matchPlaceholder[1]}"]`);
        if (el) return el;
      }
      const matchField = step.label.match(/Trường\s*\[([^\]]+)\]/);
      if (matchField && matchField[1]) {
        const el = document.querySelector(`[name="${matchField[1]}"]`);
        if (el) return el;
      }
    }

    // 6. Nếu là click button và có text
    if (step.type === 'click' && step.label) {
      const cleanLabel = step.label.replace(/^Bấm Nút\s*["']?|["']?$/g, '').trim().toLowerCase();
      const buttons = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
      for (const btn of buttons) {
        if (btn.innerText && btn.innerText.trim().toLowerCase().includes(cleanLabel)) {
          return btn;
        }
      }
    }

    // 7. Nếu là Quill Editor
    if (step.type === 'quill') {
      const ql = document.querySelector('.ql-editor');
      if (ql) return ql;
    }

    return null;
  }

  // Chờ đợi và thử lại tìm kiếm phần tử (cho phép DOM cập nhật/hiển thị)
  async function findElementWithRetry(step, maxRetries = 3, interval = 200) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const el = findElementWithFallback(step);
      if (el) return el;
      if (attempt < maxRetries) {
        await wait(interval);
      }
    }
    return null;
  }

  // Chờ đợi thời gian mili-giây
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // -------------------------------------------------------------
  // FLOATING PROGRESS TOAST
  // -------------------------------------------------------------
  function showProgressToast(macroName, currentStep, totalSteps, stepLabel) {
    if (!progressToastEl) {
      progressToastEl = document.createElement('div');
      progressToastEl.className = 'ate-expansion-toast ate-show';
      document.body.appendChild(progressToastEl);
    }

    progressToastEl.style.background = 'rgba(15, 23, 42, 0.95)';
    progressToastEl.style.border = '1px solid rgba(99, 102, 241, 0.6)';
    progressToastEl.innerHTML = `
      <span class="ate-toast-badge" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">▶</span>
      <span class="ate-toast-text">
        <strong>${escapeHtml(macroName)}</strong> (${currentStep}/${totalSteps}): 
        <span style="color:#a5b4fc;">${escapeHtml(stepLabel)}</span>
      </span>
    `;
  }

  function hideProgressToast(successMsg) {
    if (progressToastEl) {
      if (successMsg) {
        progressToastEl.innerHTML = `
          <span class="ate-toast-badge" style="background:#10b981;">✓</span>
          <span class="ate-toast-text">${escapeHtml(successMsg)}</span>
        `;
        setTimeout(() => {
          if (progressToastEl) {
            progressToastEl.classList.remove('ate-show');
            setTimeout(() => {
              progressToastEl?.remove();
              progressToastEl = null;
            }, 300);
          }
        }, 2500);
      } else {
        progressToastEl.remove();
        progressToastEl = null;
      }
    }
  }

  // -------------------------------------------------------------
  // EXECUTE MACRO SEQUENCE
  // -------------------------------------------------------------
  async function playMacro(macro) {
    if (!macro || !macro.steps || macro.steps.length === 0) {
      console.warn('[Auto Text Expander] Kịch bản không có bước thao tác nào.');
      return;
    }

    if (isPlaying) {
      console.warn('[Auto Text Expander] Một kịch bản khác đang chạy.');
      return;
    }

    isPlaying = true;
    console.log(`[Auto Text Expander] Bắt đầu chạy kịch bản: "${macro.name}" (${macro.steps.length} bước)...`);

    try {
      const steps = macro.steps;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        showProgressToast(macro.name, i + 1, steps.length, step.label || step.type);

        const el = await findElementWithRetry(step, 3, 200);

        if (el) {
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (e) {}

          let val = step.value;
          // Tự động phục hồi giá trị nếu bị undefined khi ghi phím tắt hoặc contenteditable
          if (val === undefined || val === null || val === 'undefined' || val === '') {
            const matchButton = step.label?.match(/Nút\s*["']([^"']+)["']/i);
            if (matchButton && matchButton[1] && matchButton[1] !== 'undefined') {
              val = matchButton[1];
            } else {
              const allQuotes = Array.from(step.label?.matchAll(/["']([^"']+)["']/g) || []).map(m => m[1]);
              const validQuote = allQuotes.find(q => q && q !== 'undefined');
              if (validQuote) {
                val = validQuote;
              }
            }
          }

          if (step.type === 'input' || step.type === 'contenteditable') {
            setElementValue(el, val || '');
          } else if (step.type === 'quill') {
            setContentEditableValue(el, val || '');
          } else if (step.type === 'click') {
            try {
              const opts = { bubbles: true, cancelable: true, view: window };
              el.dispatchEvent(new MouseEvent('mousedown', opts));
              el.dispatchEvent(new MouseEvent('mouseup', opts));
              if (typeof el.focus === 'function') el.focus();
              el.click();
            } catch (e) {
              el.click();
            }
          }
        } else {
          console.warn(`[Auto Text Expander] Không tìm thấy phần tử cho bước ${i + 1}: ${step.selector}`);
        }

        // Chờ độ trễ giữa các bước
        const delayTime = typeof step.delay === 'number' ? step.delay : 250;
        await wait(Math.max(delayTime, 120));
      }

      hideProgressToast(`Hoàn tất kịch bản: "${macro.name}"!`);
      console.log(`[Auto Text Expander] Hoàn thành kịch bản "${macro.name}"!`);
    } catch (err) {
      console.error('[Auto Text Expander] Lỗi khi chạy macro:', err);
      hideProgressToast(`Lỗi khi chạy kịch bản: ${err.message || 'Không xác định'}`);
    } finally {
      isPlaying = false;
    }
  }

  // -------------------------------------------------------------
  // GLOBAL HOTKEY TRIGGER LISTENER (e.g. Alt+1, Alt+S)
  // -------------------------------------------------------------
  document.addEventListener('keydown', async (e) => {
    // Tạo chuỗi tổ hợp phím hiện tại (ví dụ: "Alt+1", "Ctrl+Shift+S")
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Meta');

    // Chỉ bắt nếu có phím bổ trợ (Ctrl/Alt/Meta) để tránh nhầm với gõ phím thường
    if (keys.length === 0) return;

    // Không xử lý nếu phím nhấn chính là phím bổ trợ
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    keys.push(e.key.toUpperCase());
    const pressedCombo = keys.join('+');

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['macros']);
        const macros = data.macros || [];
        const matched = macros.find(m => m.enabled && m.hotkey && m.hotkey.trim().toUpperCase() === pressedCombo);

        if (matched) {
          e.preventDefault();
          e.stopPropagation();
          playMacro(matched);
        }
      }
    } catch (err) {}
  }, true);

  // Lắng nghe thông điệp từ popup hoặc background
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'PLAY_MACRO' && request.macro) {
        playMacro(request.macro);
        sendResponse({ status: 'MACRO_STARTED' });
      }
      return true;
    });
  }

  // Phơi API ra window
  window.AteMacroReplayer = {
    play: playMacro,
    isPlaying: () => isPlaying
  };
})();
