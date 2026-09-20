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

    // 1. Quill Editor (Quill quản lý DOM độc lập không phụ thuộc React state)
    if (editor.classList?.contains('ql-editor')) {
      editor.innerHTML = `<p>${escapeHtml(newValue)}</p>`;
      try {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (e) {}
      return;
    }

    // 2. Slate.js / React-Controlled ContentEditable:
    // CỰC KỲ QUAN TRỌNG: Tuyệt đối KHÔNG gọi range.deleteContents() hoặc gán innerText trực tiếp
    // vì việc tự ý xóa sửa DOM tree sẽ khiến React ném lỗi Invariant Violation và CRASH TRẮNG TRANG!
    const sel = window.getSelection();
    if (sel) {
      try {
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }

    // Gửi sự kiện beforeinput chuẩn W3C Input Events Level 2
    try {
      editor.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: newValue
      }));
    } catch (e) {}

    // Dùng execCommand('insertText') để Slate và React tiếp nhận văn bản an toàn 100%
    try {
      document.execCommand('insertText', false, newValue);
    } catch (e) {}

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
  }

  // -------------------------------------------------------------
  // REACT / VUE COMPATIBLE VALUE SETTER
  // -------------------------------------------------------------
  function setElementValue(el, newValue) {
    if (!el) return;

    // 1. Hỗ trợ thẻ SELECT
    if (el.tagName === 'SELECT') {
      const cleanTarget = (newValue || '').trim().toLowerCase();
      
      let matchedOpt = Array.from(el.options).find(o => {
        const val = (o.value || '').trim().toLowerCase();
        const text = (o.text || o.innerText || o.textContent || '').trim().toLowerCase();
        return (val && val === cleanTarget) || (text && text === cleanTarget);
      });

      if (!matchedOpt) {
        matchedOpt = Array.from(el.options).find(o => {
          const val = (o.value || '').trim().toLowerCase();
          const text = (o.text || o.innerText || o.textContent || '').trim().toLowerCase();
          return (text && (text.includes(cleanTarget) || cleanTarget.includes(text))) ||
                 (val && (val.includes(cleanTarget) || cleanTarget.includes(val)));
        });
      }

      const targetVal = matchedOpt ? matchedOpt.value : newValue;

      if (matchedOpt) {
        for (let i = 0; i < el.options.length; i++) {
          el.options[i].selected = (el.options[i] === matchedOpt);
        }
        matchedOpt.selected = true;
        el.selectedIndex = matchedOpt.index;
      }

      try { el.focus(); } catch (e) {}

      // React / Vue native setter cho HTMLSelectElement (cực kỳ quan trọng để React cập nhật state!)
      const selectProto = window.HTMLSelectElement.prototype;
      const protoSetter = Object.getOwnPropertyDescriptor(selectProto, 'value')?.set;
      if (protoSetter) {
        protoSetter.call(el, targetVal);
      } else {
        el.value = targetVal;
      }

      if (el._valueTracker) {
        el._valueTracker.setValue('');
      }

      try {
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } catch (e) {}

      try {
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      } catch (e) {}

      try { el.blur(); } catch (e) {}

      return;
    }

    // 2. Kiểm tra nếu là ContentEditable hoặc Slate / Rich-text Editor
    const isContentEditable = el.isContentEditable ||
                              el.getAttribute('contenteditable') === 'true' ||
                              Boolean(el.closest('[contenteditable="true"], [data-slate-editor="true"], .slate-editable-area, .ql-editor')) ||
                              el.classList?.contains('slate-editable-area');

    if (isContentEditable && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
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
  // ELEMENT FINDER VỚI SMART FALLBACK (CHÍNH XÁC CAO - KHÔNG NHẬP NHẦM)
  // -------------------------------------------------------------
  function findElementWithFallback(step) {
    if (!step) return null;

    // 1. Ưu tiên cao nhất: Tìm theo Placeholder nếu nhãn bước có ghi nhận (Chính xác 100% tránh nhầm lẫn giữa các ô input cùng form!)
    // Ví dụ: Bước 8 có nhãn 'Nhập Ô "VD: Nguyễn Văn A / Team Leader...": "Brand"' -> tìm đúng ô Leader, không bao giờ nhầm vào ô Ticket!
    // Ví dụ: Bước 2 có nhãn 'Nhập Ô "Nhập mã ticket": "123"' -> tìm đúng ô Ticket!
    if (step.label) {
      const matchPlaceholder = step.label.match(/Ô\s*["']([^"']+)["']/);
      if (matchPlaceholder && matchPlaceholder[1]) {
        const rawTarget = matchPlaceholder[1].trim();
        try {
          const byExact = document.querySelector(`[placeholder="${CSS.escape(rawTarget)}"]`);
          if (byExact) return byExact;
        } catch (e) {}

        const normalizePh = (s) => (s || '').toLowerCase().replace(/[\.…\s]+$/g, '').trim();
        const cleanTarget = normalizePh(rawTarget);

        const allInputs = document.querySelectorAll('input, textarea');
        for (const input of allInputs) {
          if (input.placeholder && normalizePh(input.placeholder) === cleanTarget) {
            return input;
          }
        }
        if (cleanTarget.length >= 4) {
          for (const input of allInputs) {
            if (input.placeholder) {
              const pNorm = normalizePh(input.placeholder);
              if (pNorm.includes(cleanTarget) || cleanTarget.includes(pNorm)) {
                return input;
              }
            }
          }
        }
      }

      // Tìm theo tiêu đề Mục label (Ví dụ: 'Mục Nguồn thông tin (Source): "Đang kiểm tra"' -> tìm thẻ select/input trong form group đó!)
      const matchLabel = step.label.match(/(?:Mục|Trường|Chọn)\s+([^:]+):?/i);
      if (matchLabel && matchLabel[1]) {
        const cleanTitle = matchLabel[1].replace(/["'\[\]]/g, '').trim().toLowerCase();
        const allLabels = document.querySelectorAll('label, .text-bold-600, .form-label, .faq-form-label, .control-label, [class*="label"], span, strong');
        for (const lbl of allLabels) {
          const txt = (lbl.innerText || lbl.textContent || '').trim().toLowerCase();
          if (txt && (txt === cleanTitle || txt.includes(cleanTitle) || (cleanTitle.length > 5 && cleanTitle.includes(txt)))) {
            const container = lbl.closest('.form-group, .faq-form-group, .faq-form-row') || lbl.parentElement;
            if (container) {
              const elInside = container.querySelector('select, input, textarea, .ql-editor, .slate-editable-area');
              if (elInside) return elInside;
            }
          }
        }
      }

      // Tìm theo tên [name] nếu có trong nhãn
      const matchField = step.label.match(/Trường\s*\[([^\]]+)\]/);
      if (matchField && matchField[1]) {
        try {
          const byName = document.querySelector(`[name="${CSS.escape(matchField[1])}"]`);
          if (byName) return byName;
        } catch (e) {}
      }
    }

    if (!step.selector) return null;

    // 2. Thử trực tiếp bằng selector nguyên bản (nếu chỉ có duy nhất 1 phần tử trên trang)
    try {
      const allFound = document.querySelectorAll(step.selector);
      if (allFound.length === 1) return allFound[0];
    } catch (e) {}

    // 3. Thử loại bỏ các dynamic state classes khỏi selector
    try {
      const cleanedSelector = step.selector
        .replace(TRANSIENT_CLASS_REGEX, '')
        .replace(/\s*>\s*>\s*/g, ' > ')
        .replace(/>\s*$/g, '')
        .trim();

      if (cleanedSelector && cleanedSelector !== step.selector) {
        const allClean = document.querySelectorAll(cleanedSelector);
        if (allClean.length === 1) return allClean[0];
      }
    } catch (e) {}

    // 4. Thử tìm bằng quan hệ phân cấp tổ tiên (Ancestor Scoped)
    try {
      const descendantSelector = step.selector
        .replace(TRANSIENT_CLASS_REGEX, '')
        .replace(/\s*>\s*/g, ' ')
        .trim();

      if (descendantSelector && descendantSelector !== step.selector) {
        const allDesc = document.querySelectorAll(descendantSelector);
        if (allDesc.length === 1) return allDesc[0];
      }
    } catch (e) {}

    // 5. Tìm kiếm thông minh trong Modal
    if (step.selector.includes('modal')) {
      try {
        const modalContainer = document.querySelector('.faq-modal-body, .modal-body, [role="dialog"], .modal.show');
        if (modalContainer) {
          const subSelector = step.selector
            .replace(/.*(?:modal-body|modal)[^>]*>\s*/i, '')
            .replace(TRANSIENT_CLASS_REGEX, '')
            .trim();
          if (subSelector) {
            const foundInModal = modalContainer.querySelectorAll(subSelector);
            if (foundInModal.length === 1) return foundInModal[0];
            const foundDesc = modalContainer.querySelectorAll(subSelector.replace(/\s*>\s*/g, ' '));
            if (foundDesc.length === 1) return foundDesc[0];
          }
        }
      } catch (e) {}
    }

    // 6. Nếu có name attribute trong selector
    const matchName = step.selector.match(/\[name="([^"]+)"\]/);
    if (matchName && matchName[1]) {
      const byName = document.querySelectorAll(`[name="${matchName[1]}"]`);
      if (byName.length === 1) {
        return byName[0];
      }
    }

    // 7. Nếu có ID trong selector
    const matchId = step.selector.match(/#([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1] && !matchId[1].match(/^react-select/)) {
      const byId = document.getElementById(matchId[1]);
      if (byId) return byId;
    }

    // 8. Nếu là click button và có label text độc nhất
    if (step.type === 'click' && step.label) {
      const cleanLabel = step.label.replace(/^Bấm Nút\s*["']?|["']?$/g, '').trim().toLowerCase();
      const buttons = document.querySelectorAll('button, a, [role="button"], input[type="submit"]');
      const matched = [];
      for (const btn of buttons) {
        if (btn.innerText && btn.innerText.trim().toLowerCase().includes(cleanLabel)) {
          matched.push(btn);
        }
      }
      if (matched.length === 1) {
        return matched[0];
      }
    }

    // 9. Nếu selector tìm thấy nhiều phần tử trùng lặp trên trang (ví dụ form có nhiều hàng div.faq-form-row giống hệt nhau):
    // TẬP TRUNG phân biệt dựa theo ngữ cảnh nhãn của hàng (row/group text) thay vì lấy bừa phần tử đầu tiên làm điền nhầm!
    try {
      const allMatches = document.querySelectorAll(step.selector);
      if (allMatches.length === 1) return allMatches[0];

      if (allMatches.length > 1 && step.label) {
        const keywords = step.label
          .replace(/^(Nhập|Bấm|Chọn)\s*/i, '')
          .replace(/:.*$/, '')
          .replace(/["'\[\]\(\)]/g, ' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length >= 3 && !['mục', 'trường', 'nút', 'vào', 'phần', 'tử'].includes(w));

        for (const candidate of allMatches) {
          const rowText = (
            (candidate.placeholder || '') + ' ' +
            (candidate.name || '') + ' ' +
            (candidate.closest('.faq-form-row, .faq-form-group, .form-group, tr')?.innerText || '')
          ).toLowerCase();

          const matchCount = keywords.filter(kw => rowText.includes(kw)).length;
          if (matchCount > 0) {
            return candidate;
          }
        }

        // Nếu không khớp từ khóa, trả về phần tử đầu tiên nếu chưa có cách phân biệt khác
        return allMatches[0];
      }
    } catch (e) {}

    return null;
  }

  // Chờ đợi và thử lại tìm kiếm phần tử (cho phép DOM / Modal / Animation cập nhật hiển thị lên đến 3 giây)
  async function findElementWithRetry(step, maxRetries = 12, interval = 200) {
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

        const el = await findElementWithRetry(step, 12, 200);

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
              if (typeof el.focus === 'function') el.focus();
            } catch (e) {}

            try {
              // Nếu là một button bên trong form nhưng chưa phải bước cuối cùng của macro
              // (Ví dụ click mở modal, chọn tab), chặn browser tự động submit form làm tải lại trang (trắng trang)
              const formParent = el.closest('form');
              const isLastStep = i === steps.length - 1;
              if (formParent && !isLastStep) {
                const preventFormSubmit = (evt) => {
                  evt.preventDefault();
                  evt.stopPropagation();
                };
                formParent.addEventListener('submit', preventFormSubmit, { once: true, capture: true });
                setTimeout(() => {
                  formParent.removeEventListener('submit', preventFormSubmit, { capture: true });
                }, 150);
              }

              const opts = { bubbles: true, cancelable: true, view: window };
              el.dispatchEvent(new MouseEvent('mousedown', opts));
              el.dispatchEvent(new MouseEvent('mouseup', opts));
              el.click();
            } catch (e) {
              try { el.click(); } catch (err) {}
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
  // CACHED MACROS & HOTKEY SYNCHRONIZER
  // -------------------------------------------------------------
  let cachedMacros = [];

  async function syncMacrosCache() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['macros']);
        if (data && Array.isArray(data.macros)) {
          cachedMacros = data.macros;
        }
      }
    } catch (e) {}
  }

  syncMacrosCache();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.macros && changes.macros.newValue) {
        cachedMacros = changes.macros.newValue;
      }
    });
  }

  // Chuẩn hóa chuỗi hotkey để so sánh không phân biệt hoa/thường, khoảng trắng và thứ tự phím
  function normalizeHotkeyStr(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/control/g, 'ctrl')
      .replace(/option/g, 'alt')
      .replace(/command/g, 'meta')
      .replace(/cmd/g, 'meta')
      .split('+')
      .map(part => part.replace(/^(digit|numpad|key)/, ''))
      .sort()
      .join('+');
  }

  function findMatchingMacroByKeyEvent(e) {
    if (!cachedMacros || cachedMacros.length === 0) return null;

    // Không bắt nếu phím nhấn chính là phím bổ trợ
    if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) return null;

    const modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    if (e.metaKey) modifiers.push('meta');

    // Hỗ trợ phím Function F1-F12 kể cả khi không bấm kèm phím bổ trợ
    const isFKey = /^F([1-9]|1[0-2])$/i.test(e.key);
    if (modifiers.length === 0 && !isFKey) return null;

    const keyClean = (e.key || '').toLowerCase().replace(/^(digit|numpad|key)/, '');
    const codeClean = e.code ? e.code.toLowerCase().replace(/^(digit|numpad|key)/, '') : '';

    const combo1 = [...modifiers, keyClean].sort().join('+');
    const combo2 = codeClean ? [...modifiers, codeClean].sort().join('+') : '';

    for (const m of cachedMacros) {
      if (!m.enabled || !m.hotkey) continue;
      const normTarget = normalizeHotkeyStr(m.hotkey);
      if (normTarget && (normTarget === combo1 || (combo2 && normTarget === combo2))) {
        return m;
      }
    }
    return null;
  }

  // Lắng nghe sự kiện bàn phím toàn cục trên window ở capture phase
  window.addEventListener('keydown', async (e) => {
    let matched = findMatchingMacroByKeyEvent(e);
    if (!matched && cachedMacros.length === 0) {
      await syncMacrosCache();
      matched = findMatchingMacroByKeyEvent(e);
    }

    if (matched) {
      e.preventDefault();
      e.stopPropagation();
      console.log(`[Auto Text Expander] Kích hoạt kịch bản bằng phím nóng "${matched.hotkey}": ${matched.name}`);
      playMacro(matched);
    }
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
