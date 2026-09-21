// Auto Text Expander - Macro Replayer Engine (Automated Form Execution)
(function () {
  'use strict';

  let isPlaying = false;
  let emergencyStop = false;
  let progressToastEl = null;

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizeStr(str) {
    if (!str || typeof str !== 'string') return '';
    return str.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function stripVietnameseAccents(str) {
    if (!str) return '';
    return normalizeStr(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  function cleanOptionText(s) {
    if (!s || typeof s !== 'string') return '';
    return s
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Bỏ zero-width characters
      .replace(/\u00A0/g, ' ')               // Bỏ non-breaking space (&nbsp;)
      .normalize('NFC')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // -------------------------------------------------------------
  // VISUAL ELEMENT HIGHLIGHTER (HIỂN THỊ TRỰC QUAN KHI THỰC THI)
  // -------------------------------------------------------------
  function highlightElement(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return () => {};
    const prevOutline = el.style.outline;
    const prevBoxShadow = el.style.boxShadow;
    const prevTransition = el.style.transition;

    try {
      el.style.transition = 'all 0.15s ease-in-out';
      el.style.outline = '2px solid #6366f1';
      el.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.7)';
    } catch (e) {}

    return () => {
      try {
        el.style.outline = prevOutline;
        el.style.boxShadow = prevBoxShadow;
        el.style.transition = prevTransition;
      } catch (e) {}
    };
  }

  // -------------------------------------------------------------
  // UNIVERSAL PRODUCTION FRAMEWORK SELECTORS
  // Hỗ trợ chuẩn hóa 100% mọi Web Framework: Bootstrap, Ant Design, Material-UI, Tailwind, Salesforce, CRM
  // -------------------------------------------------------------
  const UNIVERSAL_CONTAINER_SELECTOR = [
    '.form-group',
    '.form-item',
    '.ant-form-item',
    '.MuiFormControl-root',
    '.form-floating',
    '.field',
    '.form-row',
    '[class*="form-group"]',
    '[class*="form-item"]',
    '[class*="form-field"]',
    '[class*="form-row"]',
    '[class*="field"]',
    'fieldset',
    'tr',
    'td'
  ].join(', ');

  const UNIVERSAL_LABEL_SELECTOR = [
    'label',
    '.form-label',
    '.control-label',
    '.ant-form-item-label',
    '.MuiFormLabel-root',
    '[class*="form-label"]',
    '[class*="label"]',
    '[class*="title"]',
    'legend',
    '.text-bold-600',
    'span',
    'strong'
  ].join(', ');

  const UNIVERSAL_MODAL_SELECTOR = [
    '[role="dialog"]',
    'dialog',
    '[aria-modal="true"]',
    '.modal',
    '.modal-body',
    '.ant-modal',
    '.ant-modal-body',
    '.MuiDialog-root',
    '.MuiDialogContent-root',
    '.swal2-modal',
    '[class*="modal-body"]',
    '[class*="modal"]',
    '[class*="dialog"]'
  ].join(', ');

  const UNIVERSAL_ROW_SELECTOR = [
    '[class*="form-row"]',
    '[class*="row"]',
    'tr',
    '[role="row"]'
  ].join(', ');

  // -------------------------------------------------------------
  // DYNAMIC / TRANSIENT STATE CLASSES PATTERN
  // -------------------------------------------------------------
  const TRANSIENT_CLASS_REGEX = /\.(focused|is-focused|has-focus|active|is-active|open|is-open|opened|show|showing|selected|is-selected|hover|focus|disabled|loading|dirty|touched|valid|invalid)\b/gi;

  // -------------------------------------------------------------
  // STRICT SEMANTIC VALIDATOR (CHẶN ĐỨNG 100% ĐIỀN NHẦM TRƯỜNG KHÁC)
  // -------------------------------------------------------------
  function isElementMatchingStep(candidate, step) {
    if (!candidate || !step) return false;

    // Chặn nghiêm ngặt: Nếu bước YÊU CẦU THẺ SELECT NATIVE nhưng candidate không phải select -> Loại ngay!
    const isExplicitNativeSelectStep = (step.type === 'select') || 
                                       (step.targetInfo?.isSelect === true) || 
                                       (step.targetInfo?.tagName === 'SELECT');
    if (isExplicitNativeSelectStep && candidate.tagName !== 'SELECT') {
      return false;
    }

    // 1. Kiểm tra qua targetInfo nếu có (Metadata trích xuất chính xác lúc ghi)
    if (step.targetInfo) {
      const ti = step.targetInfo;
      if (ti.tagName && candidate.tagName !== ti.tagName) return false;
      if (ti.id && candidate.id && candidate.id !== ti.id) return false;
      if (ti.name && candidate.name && candidate.name !== ti.name) return false;
      if (ti.placeholder && candidate.placeholder) {
        const p1 = normalizeStr(candidate.placeholder.replace(/[\.…\s]+$/g, ''));
        const p2 = normalizeStr(ti.placeholder.replace(/[\.…\s]+$/g, ''));
        if (p1 && p2 && p1 !== p2 && !p1.includes(p2) && !p2.includes(p1)) {
          return false; // Mâu thuẫn placeholder rõ ràng -> Loại ngay!
        }
      }
    }

    // 2. Kiểm tra qua step.label
    if (step.label) {
      // Trích xuất placeholder mục tiêu từ nhãn: Ô "..."
      const phMatch = step.label.match(/Ô\s*["']([^"']+)["']/i);
      if (phMatch && phMatch[1] && candidate.placeholder) {
        const targetPh = normalizeStr(phMatch[1].replace(/[\.…\s]+$/g, ''));
        const candPh = normalizeStr(candidate.placeholder.replace(/[\.…\s]+$/g, ''));
        if (targetPh && candPh && targetPh !== candPh && !targetPh.includes(candPh) && !candPh.includes(targetPh)) {
          return false; // Mâu thuẫn placeholder -> Loại ngay!
        }
      }

      // Trích xuất tên [name] mục tiêu từ nhãn: Trường [...]
      const nameMatch = step.label.match(/Trường\s*\[([^\]]+)\]/i);
      if (nameMatch && nameMatch[1] && candidate.name) {
        if (candidate.name.toLowerCase() !== nameMatch[1].toLowerCase()) {
          return false;
        }
      }
    }

    return true;
  }

  // -------------------------------------------------------------
  // REACT FIBER EVENT DISPATCHER (HỖ TRỢ REACT PORTAL & CONTROLLED COMPONENTS)
  // -------------------------------------------------------------
  function triggerReactEvent(el, eventType, syntheticEvent) {
    if (!el) return;

    // 1. Thử qua __reactProps$ trên chính phần tử
    const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
    if (propsKey && el[propsKey]) {
      const props = el[propsKey];
      if (typeof props[eventType] === 'function') {
        try { props[eventType](syntheticEvent); } catch (e) {}
      }
    }

    // 2. Thử duyệt ngược Fiber tree (đặc biệt quan trọng cho React 17/18 Portal modals)
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (fiberKey && el[fiberKey]) {
      let curr = el[fiberKey];
      let depth = 0;
      while (curr && depth < 8) {
        if (curr.memoizedProps && typeof curr.memoizedProps[eventType] === 'function') {
          try { curr.memoizedProps[eventType](syntheticEvent); } catch (e) {}
          break;
        }
        curr = curr.return;
        depth++;
      }
    }
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

    // 2. Slate.js / React-Controlled ContentEditable:
    const sel = window.getSelection();
    if (sel) {
      try {
        const range = document.createRange();
        range.selectNodeContents(editor);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }

    try {
      editor.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: 'insertText',
        data: newValue
      }));
    } catch (e) {}

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
  // TRÍCH XUẤT CÁC CHUỖI MỤC TIÊU CẦN TÌM TRONG DROPDOWN SELECT
  // -------------------------------------------------------------
  function getSelectSearchTargets(step, val) {
    const targets = [];
    const addTarget = (t) => {
      if (!t || typeof t !== 'string') return;
      const clean = t.trim();
      if (clean && clean !== 'undefined' && clean !== 'null' && !targets.includes(clean)) {
        targets.push(clean);
      }
    };

    // 1. Ưu tiên số 1: Giá trị tường minh từ step.optionText và targetInfo
    if (step) {
      if (step.optionText) addTarget(step.optionText);
      if (step.targetInfo?.optionText) addTarget(step.targetInfo.optionText);
      if (step.optionValue) addTarget(step.optionValue);
      if (step.targetInfo?.optionValue) addTarget(step.targetInfo.optionValue);
    }

    // 2. Giá trị trong ngoặc kép từ nhãn (ví dụ: Chọn Trạng thái: "Đang xử lý")
    if (step && step.label) {
      const quotes = Array.from(step.label.matchAll(/["']([^"']+)["']/g)).map(m => m[1]);
      quotes.forEach(addTarget);
    }

    // 3. Kế tiếp mới tới val và step.value
    addTarget(val);
    if (step) {
      addTarget(step.value);
    }

    return targets;
  }

  // -------------------------------------------------------------
  // THUẬT TOÁN TÌM KIẾM OPTION CHÍNH XÁC CAO TRONG THẺ SELECT
  // -------------------------------------------------------------
  function findOptionInSelect(el, searchTargets) {
    if (!el || !el.options || el.options.length === 0) return null;
    const opts = Array.from(el.options);

    for (const target of searchTargets) {
      const cleanTarget = cleanOptionText(target);
      const normTarget = cleanTarget.toLowerCase();
      const strippedTarget = stripVietnameseAccents(cleanTarget);

      // Cấp 1: Khớp chính xác value hoặc text
      let matched = opts.find(o => {
        const v = cleanOptionText(o.value);
        const t = cleanOptionText(o.text || o.innerText || o.textContent);
        return (v && v === cleanTarget) || (t && t === cleanTarget);
      });
      if (matched) return matched;

      // Cấp 2: Khớp chữ thường (Case-insensitive & NFC normalized)
      matched = opts.find(o => {
        const v = cleanOptionText(o.value).toLowerCase();
        const t = cleanOptionText(o.text || o.innerText || o.textContent).toLowerCase();
        return (v && v === normTarget) || (t && t === normTarget);
      });
      if (matched) return matched;

      // Cấp 3: Khớp bỏ tiền tố số hoặc gạch đầu dòng (ví dụ "1. Đang kiểm tra", "- Đang kiểm tra")
      matched = opts.find(o => {
        const t = cleanOptionText(o.text || o.innerText || o.textContent).toLowerCase();
        const withoutPrefix = t.replace(/^[0-9\.\-\–\—\•\s\(\)\[\]\:\#]+/, '').trim();
        return withoutPrefix === normTarget;
      });
      if (matched) return matched;

      // Cấp 4: Khớp không dấu tiếng Việt
      if (strippedTarget.length >= 3) {
        matched = opts.find(o => {
          const v = stripVietnameseAccents(cleanOptionText(o.value));
          const t = stripVietnameseAccents(cleanOptionText(o.text || o.innerText || o.textContent));
          const tWithoutPrefix = t.replace(/^[0-9\.\-\–\—\•\s\(\)\[\]\:\#]+/, '').trim();
          return (v && v === strippedTarget) || (t && t === strippedTarget) || (tWithoutPrefix === strippedTarget);
        });
        if (matched) return matched;
      }

      // Cấp 5: Khớp chuỗi con (nếu chuỗi >= 3 ký tự, ví dụ: "Đang kiểm tra (In Progress)" khớp "Đang kiểm tra")
      if (normTarget.length >= 3) {
        matched = opts.find(o => {
          const t = cleanOptionText(o.text || o.innerText || o.textContent).toLowerCase();
          const v = cleanOptionText(o.value).toLowerCase();
          return (t && (t.includes(normTarget) || normTarget.includes(t))) ||
                 (v && (v.includes(normTarget) || normTarget.includes(v)));
        });
        if (matched) return matched;
      }

      // Cấp 6: Khớp toàn bộ các từ khóa cấu thành (Ví dụ: "đang", "kiểm", "tra" cùng xuất hiện trong text)
      const words = normTarget.split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 2) {
        matched = opts.find(o => {
          const t = cleanOptionText(o.text || o.innerText || o.textContent).toLowerCase();
          return words.every(w => t.includes(w));
        });
        if (matched) return matched;
      }
    }

    return null;
  }

  // -------------------------------------------------------------
  // THẺ SELECT BẤT ĐỒNG BỘ (ASYNC OPTION POLLING & COMPREHENSIVE SETTER)
  // -------------------------------------------------------------
  async function setSelectValue(el, val, step = null) {
    if (!el || el.tagName !== 'SELECT') return false;

    const searchTargets = getSelectSearchTargets(step, val);
    if (searchTargets.length === 0) return false;

    // 1. Polling tìm kiếm option trong tối đa 3.5 giây (35 lần x 100ms)
    let matchedOpt = null;
    for (let attempt = 0; attempt < 35; attempt++) {
      if (emergencyStop) return false;

      matchedOpt = findOptionInSelect(el, searchTargets);

      // Nếu tìm thấy option và không phải option placeholder mặc định rỗng (value="" && text có chữ 'chọn')
      if (matchedOpt && !(matchedOpt.value === '' && (matchedOpt.text || '').toLowerCase().includes('chọn'))) {
        break;
      }

      await wait(100);
    }

    // Fallback theo optionIndex nếu có trong step và chưa tìm được option khớp
    if (!matchedOpt && step && typeof step.optionIndex === 'number' && step.optionIndex >= 0 && step.optionIndex < el.options.length) {
      matchedOpt = el.options[step.optionIndex];
    }

    if (matchedOpt) {
      console.log(`[Auto Text Expander] [SELECT MATCHED] Đã khớp option: index=${matchedOpt.index}, value="${matchedOpt.value}", text="${matchedOpt.text}" cho phần tử:`, el);

      // 1. Gán trạng thái selected trên từng option
      for (let i = 0; i < el.options.length; i++) {
        el.options[i].selected = (el.options[i] === matchedOpt);
      }
      matchedOpt.selected = true;
      el.selectedIndex = matchedOpt.index;

      // 2. Focus phần tử
      try { el.focus(); } catch (e) {}

      // 3. React _valueTracker: gán giá trị khác đi TRƯỚC để React updateValueIfChanged nhận diện thay đổi
      if (el._valueTracker) {
        el._valueTracker.setValue('__ate_prev_state__');
      }

      // 4. Gán giá trị qua native prototype setter (cho React HTMLSelectElement)
      const selectProto = window.HTMLSelectElement.prototype;
      const protoSetter = Object.getOwnPropertyDescriptor(selectProto, 'value')?.set;
      if (protoSetter) {
        protoSetter.call(el, matchedOpt.value);
      } else {
        el.value = matchedOpt.value;
      }

      // 5. Hỗ trợ Vue 3 internal _value binding
      if (matchedOpt._value !== undefined) {
        try { el._value = matchedOpt._value; } catch (e) {}
      }

      // 6. Chuẩn bị syntheticEvent cho React
      const syntheticEvent = {
        target: el,
        currentTarget: el,
        nativeEvent: new Event('change'),
        value: matchedOpt.value,
        bubbles: true,
        cancelable: true,
        defaultPrevented: false,
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist: () => {},
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      // 7. Kích hoạt trực tiếp React Fiber props.onChange (đặc biệt quan trọng cho React Portal Modals)
      triggerReactEvent(el, 'onChange', syntheticEvent);
      triggerReactEvent(el, 'onInput', syntheticEvent);

      // 8. Dispatch sự kiện input và change chuẩn W3C có composed: true
      try {
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
      } catch (e) {}

      try {
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
      } catch (e) {}

      // 9. Nếu ứng dụng có React Root container ở body (#root hoặc #app), dispatch lên container để React nhận
      const reactRoot = document.getElementById('root') || document.getElementById('app') || document.querySelector('[data-reactroot]');
      if (reactRoot && reactRoot !== el) {
        try {
          reactRoot.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
        } catch (e) {}
      }

      // 10. Hỗ trợ jQuery / Select2 / Chosen
      try {
        if (typeof window.jQuery === 'function') {
          window.jQuery(el).val(matchedOpt.value).trigger('change');
        } else if (typeof window.$ === 'function' && typeof window.$.fn?.trigger === 'function') {
          window.$(el).val(matchedOpt.value).trigger('change');
        }
      } catch (e) {}

      // 11. Cập nhật UI render của Select2 hoặc Bootstrap-select nếu có
      try {
        const group = el.closest(UNIVERSAL_CONTAINER_SELECTOR) || el.parentElement;
        if (group) {
          const s2Rendered = group.querySelector('.select2-selection__rendered');
          if (s2Rendered) {
            s2Rendered.textContent = matchedOpt.text;
            s2Rendered.title = matchedOpt.text;
          }
          const bsInner = group.querySelector('.filter-option-inner-inner');
          if (bsInner) {
            bsInner.textContent = matchedOpt.text;
          }
        }
      } catch (e) {}

      // 12. Chờ 120ms để React commit Virtual DOM và cập nhật state
      await wait(120);

      // 13. Kiểm tra lại lần cuối: nếu React bị reset về trường mặc định, ép chọn lại option
      if (el.selectedIndex !== matchedOpt.index) {
        console.warn(`[Auto Text Expander] Cảnh báo: Select bị reset về index ${el.selectedIndex}, đang ép chọn lại option ${matchedOpt.index} ("${matchedOpt.text}")...`);
        el.selectedIndex = matchedOpt.index;
        matchedOpt.selected = true;
        if (el._valueTracker) el._valueTracker.setValue('__ate_prev_state__');
        if (protoSetter) protoSetter.call(el, matchedOpt.value);
        triggerReactEvent(el, 'onChange', syntheticEvent);
        try { el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true })); } catch (e) {}
      }

      return true;
    } else {
      console.warn(`[Auto Text Expander] Không tìm thấy option nào khớp với ${JSON.stringify(searchTargets)} trong thẻ select:`, el, `Options hiện có:`, Array.from(el.options).map(o => `[${o.value}] ${o.text}`));
      return false;
    }
  }

  // -------------------------------------------------------------
  // UNIVERSAL CUSTOM DROPDOWN ENGINE (ANT DESIGN, MUI, REACT-SELECT, RADIX, TAILWIND, BOOTSTRAP, SELECT2)
  // -------------------------------------------------------------
  const CUSTOM_DROPDOWN_MENU_SELECTORS = [
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
    '.MuiPopover-root',
    '.MuiMenu-paper',
    '[role="listbox"]:not([aria-hidden="true"])',
    '.select2-dropdown',
    '.dropdown-menu.show',
    '[class*="select__menu"]',
    '[class*="Select-menu"]',
    '.searchable-brand-dropdown',
    '[data-radix-popper-content-wrapper]',
    '.choices__list--dropdown.is-active',
    '[role="menu"]:not([aria-hidden="true"])'
  ].join(', ');

  const CUSTOM_DROPDOWN_OPTION_SELECTORS = [
    '[role="option"]',
    '.ant-select-item-option-content',
    '.ant-select-item-option',
    '.ant-select-dropdown-menu-item',
    '.MuiMenuItem-root',
    '.dropdown-item',
    '.select2-results__option',
    '[class*="select__option"]',
    '[class*="Select-option"]',
    '[class*="option-item"]',
    '.select-option',
    '.searchable-brand-item',
    '[data-radix-collection-item]',
    'li.active',
    'li'
  ].join(', ');

  function isElementVisible(el) {
    if (!el) return false;
    // 1. Kiểm tra thuộc tính ẩn cơ bản
    if (el.hidden || el.style?.display === 'none' || el.style?.visibility === 'hidden') return false;
    if (el.getAttribute?.('aria-hidden') === 'true') return false;

    // 2. Computed style nếu có
    if (typeof window.getComputedStyle === 'function') {
      try {
        const style = window.getComputedStyle(el);
        if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
      } catch (e) {}
    }

    // 3. Trong trình duyệt thực tế (DOM có layout box)
    if (el.offsetParent !== null) return true;
    if (typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) return true;
    }

    // 4. Fallback môi trường Node.js / JSDOM không có layout engine
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return true;
    }
    if (typeof navigator !== 'undefined') {
      const ua = (navigator.userAgent || '').toLowerCase();
      if (ua.includes('jsdom') || ua.includes('node')) return true;
    }

    return false;
  }

  function findActiveDropdownMenu() {
    const menus = document.querySelectorAll(CUSTOM_DROPDOWN_MENU_SELECTORS);
    for (const m of menus) {
      if (isElementVisible(m)) {
        return m;
      }
    }
    return null;
  }

  async function openDropdownTrigger(triggerEl) {
    if (!triggerEl) return false;
    try { triggerEl.focus?.(); } catch (e) {}

    const rect = triggerEl.getBoundingClientRect();
    const clickOpts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };

    try { triggerEl.dispatchEvent(new PointerEvent('pointerdown', clickOpts)); } catch (e) {}
    try { triggerEl.dispatchEvent(new MouseEvent('mousedown', clickOpts)); } catch (e) {}
    try { triggerEl.dispatchEvent(new PointerEvent('pointerup', clickOpts)); } catch (e) {}
    try { triggerEl.dispatchEvent(new MouseEvent('mouseup', clickOpts)); } catch (e) {}
    try { triggerEl.click(); } catch (e) {}

    triggerReactEvent(triggerEl, 'onClick', { target: triggerEl, currentTarget: triggerEl });

    // Nếu trigger là ô nhập hoặc combobox, kích hoạt phím ArrowDown
    try {
      triggerEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
    } catch (e) {}

    return true;
  }

  function findOptionInCustomScope(scope, searchTargets) {
    if (!scope) return null;
    const candidates = Array.from(scope.querySelectorAll(CUSTOM_DROPDOWN_OPTION_SELECTORS)).filter(el => {
      return isElementVisible(el) && !el.hasAttribute('disabled') && !el.classList.contains('disabled');
    });

    for (const target of searchTargets) {
      const cleanTarget = cleanOptionText(target);
      const normTarget = cleanTarget.toLowerCase();
      const strippedTarget = stripVietnameseAccents(cleanTarget);

      // Cấp 1: Khớp chính xác tuyệt đối text hoặc data-value
      let matched = candidates.find(el => {
        const t = cleanOptionText(el.innerText || el.textContent);
        const v = el.getAttribute?.('data-value') || el.getAttribute?.('value') || '';
        return (t && t === cleanTarget) || (v && v === cleanTarget);
      });
      if (matched) return matched;

      // Cấp 2: Khớp chữ thường (Case-insensitive & NFC normalized)
      matched = candidates.find(el => {
        const t = cleanOptionText(el.innerText || el.textContent).toLowerCase();
        const v = (el.getAttribute?.('data-value') || el.getAttribute?.('value') || '').toLowerCase();
        return (t && t === normTarget) || (v && v === normTarget);
      });
      if (matched) return matched;

      // Cấp 3: Khớp bỏ tiền tố số hoặc gạch đầu dòng (ví dụ "1. Đang xử lý", "- Đang xử lý")
      matched = candidates.find(el => {
        const t = cleanOptionText(el.innerText || el.textContent).toLowerCase();
        const withoutPrefix = t.replace(/^[0-9\.\-\–\—\•\s\(\)\[\]\:\#]+/, '').trim();
        return withoutPrefix === normTarget;
      });
      if (matched) return matched;

      // Cấp 4: Khớp không dấu tiếng Việt
      if (strippedTarget.length >= 3) {
        matched = candidates.find(el => {
          const t = stripVietnameseAccents(cleanOptionText(el.innerText || el.textContent));
          const tWithoutPrefix = t.replace(/^[0-9\.\-\–\—\•\s\(\)\[\]\:\#]+/, '').trim();
          return (t && t === strippedTarget) || (tWithoutPrefix === strippedTarget);
        });
        if (matched) return matched;
      }

      // Cấp 5: Khớp chuỗi con (nếu length >= 3)
      if (normTarget.length >= 3) {
        matched = candidates.find(el => {
          const t = cleanOptionText(el.innerText || el.textContent).toLowerCase();
          return t && (t.includes(normTarget) || normTarget.includes(t));
        });
        if (matched) return matched;
      }

      // Cấp 6: Khớp toàn bộ từ khóa cấu thành
      const words = normTarget.split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 2) {
        matched = candidates.find(el => {
          const t = cleanOptionText(el.innerText || el.textContent).toLowerCase();
          return words.every(w => t.includes(w));
        });
        if (matched) return matched;
      }
    }
    return null;
  }

  async function selectCustomDropdownOption(optionEl) {
    if (!optionEl) return false;
    try {
      optionEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } catch (e) {}

    const rect = optionEl.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    };

    try { optionEl.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (e) {}
    try { optionEl.dispatchEvent(new MouseEvent('mousedown', opts)); } catch (e) {}
    try { optionEl.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (e) {}
    try { optionEl.dispatchEvent(new MouseEvent('mouseup', opts)); } catch (e) {}
    try { optionEl.click(); } catch (e) {}

    triggerReactEvent(optionEl, 'onClick', { target: optionEl, currentTarget: optionEl });
    triggerReactEvent(optionEl, 'onMouseDown', { target: optionEl, currentTarget: optionEl });

    await wait(150);
    return true;
  }

  async function handleCustomDropdownSelection(step, knownEl = null) {
    const searchTargets = getSelectSearchTargets(step, step.value || step.optionText);
    if (searchTargets.length === 0) return false;

    console.log(`[Auto Text Expander] Đang thực thi chọn Custom Dropdown với mục tiêu:`, searchTargets);

    // 1. Kiểm tra xem Menu Dropdown đã mở sẵn chưa
    let menuEl = findActiveDropdownMenu();

    // 2. Nếu Menu chưa mở, tiến hành tìm kiếm Trigger và click để mở menu
    if (!menuEl) {
      let triggerEl = knownEl;
      if (!triggerEl && step.triggerSelector) {
        try { triggerEl = document.querySelector(step.triggerSelector); } catch (e) {}
      }
      if (!triggerEl) {
        triggerEl = findElementWithFallback(step);
      }

      if (triggerEl) {
        console.log(`[Auto Text Expander] Đang mở Dropdown Trigger:`, triggerEl);
        await openDropdownTrigger(triggerEl);

        // Chờ menu xuất hiện sau khi click trigger (polling 25 lần x 60ms = 1.5s)
        for (let attempt = 0; attempt < 25; attempt++) {
          if (emergencyStop) return false;
          menuEl = findActiveDropdownMenu();
          if (menuEl) break;
          await wait(60);
        }
      }
    }

    // 3. Tìm kiếm option mục tiêu trong menu (hoặc toàn trang document.body nếu menu là portal)
    let matchedOption = null;
    const searchScopes = menuEl ? [menuEl, document.body] : [document.body];

    for (let attempt = 0; attempt < 15; attempt++) {
      if (emergencyStop) return false;
      for (const scope of searchScopes) {
        matchedOption = findOptionInCustomScope(scope, searchTargets);
        if (matchedOption) break;
      }
      if (matchedOption) break;
      await wait(80);
    }

    // 4. Nếu chưa tìm thấy và có ô tìm kiếm (Searchable Input / Autocomplete)
    if (!matchedOption) {
      const searchInput = (menuEl || document).querySelector(
        '.ant-select-selection-search-input, .select2-search__field, input[role="combobox"], [class*="search-input"]'
      );
      if (searchInput && searchTargets[0]) {
        try {
          searchInput.focus();
          searchInput.value = searchTargets[0];
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          await wait(180);
          for (const scope of searchScopes) {
            matchedOption = findOptionInCustomScope(scope, searchTargets);
            if (matchedOption) break;
          }
        } catch (e) {}
      }
    }

    // 5. Nếu tìm thấy option: Thực hiện click chọn
    if (matchedOption) {
      const optLabel = (matchedOption.innerText || matchedOption.textContent || '').trim();
      console.log(`[Auto Text Expander] [CUSTOM DROPDOWN MATCHED] Đã tìm thấy option: "${optLabel}"`, matchedOption);
      await selectCustomDropdownOption(matchedOption);
      return true;
    } else {
      console.warn(`[Auto Text Expander] Không tìm thấy option nào khớp với ${JSON.stringify(searchTargets)} trong Custom Dropdown.`);
      return false;
    }
  }

  // -------------------------------------------------------------
  // REACT / VUE COMPATIBLE VALUE SETTER
  // -------------------------------------------------------------
  async function setElementValue(el, newValue, step = null) {
    if (!el) return;

    // 1. Thẻ SELECT native
    if (el.tagName === 'SELECT') {
      return await setSelectValue(el, newValue, step);
    }

    // 2. Slate.js / Quill / ContentEditable
    const isContentEditable = el.isContentEditable ||
                              el.getAttribute('contenteditable') === 'true' ||
                              Boolean(el.closest('[contenteditable="true"], [data-slate-editor="true"], .slate-editable-area, .ql-editor')) ||
                              el.classList?.contains('slate-editable-area');

    if (isContentEditable && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
      setContentEditableValue(el, newValue);
      return true;
    }

    // 3. Chuẩn Input / Textarea
    const isTextarea = el.tagName === 'TEXTAREA';
    const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    const previousValue = el.value;

    try { el.focus(); } catch (e) {}

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

    // Kích hoạt trực tiếp React Fiber props.onChange
    const syntheticEvent = {
      target: el,
      currentTarget: el,
      nativeEvent: new Event('input'),
      value: newValue,
      bubbles: true,
      cancelable: true
    };
    triggerReactEvent(el, 'onChange', syntheticEvent);
    triggerReactEvent(el, 'onInput', syntheticEvent);

    // 4. Nếu là Custom Searchable Dropdown (Brand, Combobox...)
    const isSearchable = el.classList?.contains('searchable-brand-inner-input') ||
                         Boolean(el.closest('.searchable-brand-container, .ant-select-selection-search, [role="combobox"]'));
    if (isSearchable) {
      await handleCustomDropdownSelection(step || { value: newValue, selector: getSmartSelector(el) }, el);
    }

    return true;
  }

  // -------------------------------------------------------------
  // ELEMENT FINDER VỚI SMART FALLBACK & PRECISE ISOLATION
  // -------------------------------------------------------------
  function findElementWithFallback(step) {
    if (!step) return null;

    // 0. Nếu là Custom Select: Tìm bằng triggerSelector trước tiên
    if (step.type === 'custom_select' || step.targetInfo?.isCustomSelect) {
      const trigSel = step.triggerSelector || step.targetInfo?.triggerSelector;
      if (trigSel) {
        try {
          const byTrig = document.querySelector(trigSel);
          if (byTrig && isElementMatchingStep(byTrig, step)) return byTrig;
        } catch (e) {}
      }
    }

    // 1. Ưu tiên hàng đầu: Tìm bằng TargetInfo (chính xác tuyệt đối 100%)
    if (step.targetInfo) {
      const ti = step.targetInfo;
      if (ti.id) {
        const byId = document.getElementById(ti.id);
        if (byId && isElementMatchingStep(byId, step)) return byId;
      }
      if (ti.name) {
        const byName = document.querySelector(`${ti.tagName || ''}[name="${CSS.escape(ti.name)}"]`);
        if (byName && isElementMatchingStep(byName, step)) return byName;
      }
      if (ti.placeholder) {
        const cleanTargetPh = normalizeStr(ti.placeholder.replace(/[\.…\s]+$/g, ''));
        const allInputs = document.querySelectorAll('input, textarea');
        for (const input of allInputs) {
          if (input.placeholder) {
            const p = normalizeStr(input.placeholder.replace(/[\.…\s]+$/g, ''));
            if (p === cleanTargetPh || p.includes(cleanTargetPh) || cleanTargetPh.includes(p)) {
              if (isElementMatchingStep(input, step)) return input;
            }
          }
        }
      }
      if (ti.labelText) {
        const normLbl = normalizeStr(ti.labelText);
        const allLabels = document.querySelectorAll(UNIVERSAL_LABEL_SELECTOR);
        for (const lbl of allLabels) {
          const txt = normalizeStr(lbl.innerText || lbl.textContent || '');
          if (txt && (txt === normLbl || txt.includes(normLbl) || normLbl.includes(txt))) {
            const container = lbl.closest(UNIVERSAL_CONTAINER_SELECTOR) || lbl.parentElement;
            if (container) {
              const candidates = container.querySelectorAll('select, input, textarea, .ql-editor, .slate-editable-area');
              for (const cand of candidates) {
                if (isElementMatchingStep(cand, step)) return cand;
              }
            }
          }
        }
      }
    }

    // 2. Tìm theo Placeholder từ nhãn step.label (Tránh nhầm giữa các ô input cùng form!)
    if (step.label) {
      const matchPlaceholder = step.label.match(/Ô\s*["']([^"']+)["']/i);
      if (matchPlaceholder && matchPlaceholder[1]) {
        const rawTarget = matchPlaceholder[1].trim();
        try {
          const byExact = document.querySelector(`[placeholder="${CSS.escape(rawTarget)}"]`);
          if (byExact && isElementMatchingStep(byExact, step)) return byExact;
        } catch (e) {}

        const cleanTarget = normalizeStr(rawTarget.replace(/[\.…\s]+$/g, ''));
        const allInputs = document.querySelectorAll('input, textarea');
        // Pass 1: exact normalized
        for (const input of allInputs) {
          if (input.placeholder) {
            const pNorm = normalizeStr(input.placeholder.replace(/[\.…\s]+$/g, ''));
            if (pNorm === cleanTarget) {
              if (isElementMatchingStep(input, step)) return input;
            }
          }
        }
        // Pass 2: substring
        if (cleanTarget.length >= 4) {
          for (const input of allInputs) {
            if (input.placeholder) {
              const pNorm = normalizeStr(input.placeholder.replace(/[\.…\s]+$/g, ''));
              if (pNorm.includes(cleanTarget) || cleanTarget.includes(pNorm)) {
                if (isElementMatchingStep(input, step)) return input;
              }
            }
          }
        }
      }

      // 3. Tìm theo tiêu đề Mục / Trường (Label) - Sửa lỗi regex bắt đúng tên trường kể cả khi nhãn là 'Chọn Mục Trạng thái:'
      const matchLabel = step.label.match(/(?:Chọn|Nhập|Bấm)?\s*(?:Mục|Trường|Ô)?\s*["']?([^:"]+?)["']?\s*:/i);
      if (matchLabel && matchLabel[1]) {
        const cleanTitle = normalizeStr(matchLabel[1].replace(/["'\[\]]/g, ''));
        const allLabels = document.querySelectorAll(UNIVERSAL_LABEL_SELECTOR);
        for (const lbl of allLabels) {
          const txt = normalizeStr(lbl.innerText || lbl.textContent || '');
          if (txt && (txt === cleanTitle || txt.includes(cleanTitle) || (cleanTitle.length >= 4 && cleanTitle.includes(txt)))) {
            const container = lbl.closest(UNIVERSAL_CONTAINER_SELECTOR) || lbl.parentElement;
            if (container) {
              const candidates = container.querySelectorAll('select, input, textarea, .ql-editor, .slate-editable-area');
              for (const cand of candidates) {
                if (isElementMatchingStep(cand, step)) return cand;
              }
            }
          }
        }
      }

      // 4. Tìm theo [name] nếu có trong nhãn
      const matchField = step.label.match(/Trường\s*\[([^\]]+)\]/i);
      if (matchField && matchField[1]) {
        try {
          const byName = document.querySelector(`[name="${CSS.escape(matchField[1])}"]`);
          if (byName && isElementMatchingStep(byName, step)) return byName;
        } catch (e) {}
      }
    }

    if (!step.selector) return null;

    // 5. Thử trực tiếp bằng selector nguyên bản (nếu chỉ có duy nhất 1 phần tử trên trang)
    try {
      const allFound = document.querySelectorAll(step.selector);
      if (allFound.length === 1 && isElementMatchingStep(allFound[0], step)) return allFound[0];
    } catch (e) {}

    // 6. Thử loại bỏ các dynamic state classes khỏi selector
    try {
      const cleanedSelector = step.selector
        .replace(TRANSIENT_CLASS_REGEX, '')
        .replace(/\s*>\s*>\s*/g, ' > ')
        .replace(/>\s*$/g, '')
        .trim();

      if (cleanedSelector && cleanedSelector !== step.selector) {
        const allClean = document.querySelectorAll(cleanedSelector);
        if (allClean.length === 1 && isElementMatchingStep(allClean[0], step)) return allClean[0];
      }
    } catch (e) {}

    // 7. Thử tìm bằng quan hệ phân cấp tổ tiên (Ancestor Scoped)
    try {
      const descendantSelector = step.selector
        .replace(TRANSIENT_CLASS_REGEX, '')
        .replace(/\s*>\s*/g, ' ')
        .trim();

      if (descendantSelector && descendantSelector !== step.selector) {
        const allDesc = document.querySelectorAll(descendantSelector);
        if (allDesc.length === 1 && isElementMatchingStep(allDesc[0], step)) return allDesc[0];
      }
    } catch (e) {}

    // 8. Tìm kiếm thông minh trong Modal / Dialog
    const activeModal = document.querySelector(UNIVERSAL_MODAL_SELECTOR);
    if (step.selector.includes('modal') || activeModal) {
      try {
        const modalContainer = activeModal || document.querySelector(UNIVERSAL_MODAL_SELECTOR);
        if (modalContainer) {
          const subSelector = step.selector
            .replace(/.*(?:modal-body|modal|dialog)[^>]*>\s*/i, '')
            .replace(TRANSIENT_CLASS_REGEX, '')
            .trim();
          if (subSelector) {
            const foundInModal = modalContainer.querySelectorAll(subSelector);
            if (foundInModal.length === 1 && isElementMatchingStep(foundInModal[0], step)) return foundInModal[0];
            const foundDesc = modalContainer.querySelectorAll(subSelector.replace(/\s*>\s*/g, ' '));
            if (foundDesc.length === 1 && isElementMatchingStep(foundDesc[0], step)) return foundDesc[0];
          }
        }
      } catch (e) {}
    }

    // 9. Nếu selector tìm thấy nhiều phần tử trùng lặp trên trang:
    // PHÂN BIỆT DỰA VÀO ĐIỂM SỐ NGỮ CẢNH (ROW CONTEXT) VÀ CHẶN HOÀN TOÀN VIỆC LẤY BỪA allMatches[0]
    try {
      const allMatches = document.querySelectorAll(step.selector);
      if (allMatches.length > 1) {
        let labelPart = step.label || '';
        const lastColonIdx = labelPart.lastIndexOf(':');
        if (lastColonIdx > 0) {
          labelPart = labelPart.substring(0, lastColonIdx);
        }

        const keywords = labelPart
          .replace(/^(Nhập|Bấm|Chọn)\s*/i, '')
          .replace(/["'\[\]\(\)]/g, ' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length >= 3 && !['mục', 'trường', 'nút', 'vào', 'phần', 'tử', 'thao', 'tác'].includes(w));

        let bestCandidate = null;
        let highestScore = -1;

        for (const candidate of allMatches) {
          if (!isElementMatchingStep(candidate, step)) continue;

          let score = 0;
          const groupEl = candidate.closest(UNIVERSAL_CONTAINER_SELECTOR) || candidate.parentElement;
          const rowEl = candidate.closest(UNIVERSAL_ROW_SELECTOR) || groupEl;
          const contextText = (
            (candidate.placeholder || '') + ' ' +
            (candidate.name || '') + ' ' +
            (groupEl ? (groupEl.innerText || '') : '') + ' ' +
            (rowEl ? (rowEl.innerText || '') : '')
          ).toLowerCase();

          const matchCount = keywords.filter(kw => contextText.includes(kw)).length;
          score += matchCount * 10;

          if (score > highestScore && score > 0) {
            highestScore = score;
            bestCandidate = candidate;
          }
        }

        if (bestCandidate) {
          return bestCandidate;
        }
      }
    } catch (e) {}

    return null;
  }

  // Chờ đợi và thử lại tìm kiếm phần tử
  async function findElementWithRetry(step, maxRetries = 25, interval = 50) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (emergencyStop) return null;
      const el = findElementWithFallback(step);
      if (el) return el;
      if (attempt < maxRetries) {
        await wait(interval);
      }
    }
    return null;
  }

  // -------------------------------------------------------------
  // FLOATING PROGRESS TOAST & EMERGENCY CONTROLS
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
      <button type="button" id="ate-toast-abort-btn" style="margin-left:12px; background:rgba(239,68,68,0.25); border:1px solid #ef4444; color:#fca5a5; border-radius:4px; padding:2px 8px; font-size:11px; cursor:pointer; font-weight:600; line-height:1.5;">Dừng (Esc)</button>
    `;

    const abortBtn = document.getElementById('ate-toast-abort-btn');
    if (abortBtn) {
      abortBtn.onclick = (e) => {
        e.stopPropagation();
        emergencyStop = true;
        hideProgressToast('Đã dừng khẩn cấp kịch bản!', true);
      };
    }
  }

  function hideProgressToast(msg, isError = false) {
    if (progressToastEl) {
      if (msg) {
        progressToastEl.style.background = isError ? 'rgba(127, 29, 29, 0.96)' : 'rgba(15, 23, 42, 0.95)';
        progressToastEl.style.border = isError ? '1px solid #ef4444' : '1px solid #10b981';
        progressToastEl.innerHTML = `
          <span class="ate-toast-badge" style="background:${isError ? '#ef4444' : '#10b981'};">${isError ? '✕' : '✓'}</span>
          <span class="ate-toast-text" style="color:${isError ? '#fecaca' : '#ffffff'}; font-weight:${isError ? '600' : 'normal'};">${escapeHtml(msg)}</span>
        `;
        setTimeout(() => {
          if (progressToastEl) {
            progressToastEl.classList.remove('ate-show');
            setTimeout(() => {
              progressToastEl?.remove();
              progressToastEl = null;
            }, 300);
          }
        }, isError ? 4500 : 2500);
      } else {
        progressToastEl.remove();
        progressToastEl = null;
      }
    }
  }

  // -------------------------------------------------------------
  // EMERGENCY ESCAPE KEY LISTENER
  // -------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (isPlaying && e.key === 'Escape') {
      emergencyStop = true;
      console.warn('[Auto Text Expander] Người dùng đã nhấn phím ESC để dừng kịch bản!');
      hideProgressToast('Đã dừng khẩn cấp kịch bản (Phím ESC)!', true);
    }
  }, true);

  // -------------------------------------------------------------
  // MACRO SPEED & SETTINGS SYNCHRONIZER
  // -------------------------------------------------------------
  let cachedMacroSpeed = 'safe';

  async function syncMacroSpeed() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get(['settings']);
        if (data && data.settings && data.settings.macroSpeed) {
          cachedMacroSpeed = data.settings.macroSpeed;
        }
      }
    } catch (e) {}
  }

  syncMacroSpeed();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.settings && changes.settings.newValue?.macroSpeed) {
        cachedMacroSpeed = changes.settings.newValue.macroSpeed;
      }
    });
  }

  // -------------------------------------------------------------
  // EXECUTE MACRO SEQUENCE (PRODUCTION-GRADE ENGINE)
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
    emergencyStop = false;
    await syncMacroSpeed();

    let baseDelay = 200;
    let modalDelay = 350;
    let retryInterval = 50;
    let maxRetries = 25;

    if (cachedMacroSpeed === 'turbo') {
      baseDelay = 40;
      modalDelay = 150;
      retryInterval = 30;
      maxRetries = 25;
    } else if (cachedMacroSpeed === 'balanced') {
      baseDelay = 100;
      modalDelay = 250;
      retryInterval = 40;
      maxRetries = 25;
    } else {
      // safe (Khuyên dùng cho Production)
      baseDelay = 200;
      modalDelay = 350;
      retryInterval = 50;
      maxRetries = 30;
    }

    console.log(`[Auto Text Expander] Bắt đầu chạy kịch bản: "${macro.name}" (${macro.steps.length} bước) [Chế độ: ${cachedMacroSpeed}]...`);

    try {
      const steps = macro.steps;
      for (let i = 0; i < steps.length; i++) {
        if (emergencyStop) {
          console.warn('[Auto Text Expander] Kịch bản đã bị hủy bởi người dùng.');
          break;
        }

        const step = steps[i];
        showProgressToast(macro.name, i + 1, steps.length, step.label || step.type);

        // 1. Cách ly trường nhập (Field Isolation): Gỡ focus khỏi trường trước đó để kích hoạt validation và tránh chồng chéo text
        if (document.activeElement && typeof document.activeElement.blur === 'function' && document.activeElement !== document.body) {
          try { document.activeElement.blur(); } catch (e) {}
        }

        let el = await findElementWithRetry(step, maxRetries, retryInterval);

        const isCustomSelect = step.type === 'custom_select' || Boolean(step.targetInfo?.isCustomSelect);
        const isLegacyDropdownOption = step.type === 'click' && (
          step.label?.startsWith('Chọn') ||
          step.selector?.includes('option') ||
          step.selector?.includes('dropdown-item')
        );

        if (!el) {
          // Nếu là bước chọn dropdown (Custom Select hoặc Option click cũ), tự động tìm mở trigger và chọn option
          if (isCustomSelect || isLegacyDropdownOption) {
            console.log(`[Auto Text Expander] Phần tử option chưa xuất hiện trong DOM, tự động kích hoạt handleCustomDropdownSelection...`);
            const customSuccess = await handleCustomDropdownSelection(step, null);
            if (customSuccess) {
              let delayTime = Math.max(baseDelay, 180);
              await wait(delayTime);
              continue; // Đã hoàn thành bước này thành công!
            }
          }

          // BẢO VỆ DỮ LIỆU PRODUCTION: Nếu không tìm thấy phần tử, DỪNG NGAY LẬP TỨC để tránh điền nhầm vào ô khác!
          console.error(`[Auto Text Expander] [DỪNG AN TOÀN] Không tìm thấy phần tử cho bước ${i + 1}: ${step.label || step.selector}`);
          hideProgressToast(`[Dừng An Toàn] Bước ${i + 1}: Không tìm thấy "${step.label || step.selector}". Đã dừng để bảo vệ dữ liệu!`, true);
          return;
        }

        // Hiển thị trực quan trường đang thực thi (Visual Highlight)
        const unhighlight = highlightElement(el);

        // Cuộn tới phần tử nếu nằm ngoài khung nhìn
        try {
          const rect = el.getBoundingClientRect();
          const isInView = rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
          if (!isInView) {
            el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        } catch (e) {}

        let val = step.value;
        // Tự động phục hồi giá trị nếu bị undefined
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

        const isSelect = el.tagName === 'SELECT' || step.type === 'select' || Boolean(step.targetInfo?.isSelect);

        if (isCustomSelect) {
          const success = await handleCustomDropdownSelection(step, el);
          if (success === false) {
            hideProgressToast(`[Dừng An Toàn] Bước ${i + 1}: Không tìm thấy lựa chọn trong dropdown "${step.label}". Đã dừng để bảo vệ dữ liệu!`, true);
            return;
          }
        } else if (isSelect) {
          const success = await setSelectValue(el, val || '', step);
          if (success === false) {
            // Dừng an toàn nếu không chọn được dropdown để không lưu form với trạng thái sai!
            hideProgressToast(`[Dừng An Toàn] Bước ${i + 1}: Không tìm thấy lựa chọn trong dropdown "${step.label}". Đã dừng để bảo vệ dữ liệu!`, true);
            return;
          }
        } else if (step.type === 'input' || step.type === 'contenteditable' || step.type === 'change') {
          await setElementValue(el, val || '', step);
        } else if (step.type === 'quill') {
          setContentEditableValue(el, val || '');
        } else if (step.type === 'click') {
          // Nếu là click option của dropdown (kịch bản cũ):
          if (isLegacyDropdownOption) {
            const customSuccess = await handleCustomDropdownSelection(step, el);
            if (!customSuccess) {
              try { el.click(); } catch(e) {}
            }
          } else {
            try {
              if (typeof el.focus === 'function') el.focus();
            } catch (e) {}

            try {
              // Chặn submit form ngoài ý muốn ở các bước trung gian
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
              try { el.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch(e) {}
              el.dispatchEvent(new MouseEvent('mousedown', opts));
              try { el.dispatchEvent(new PointerEvent('pointerup', opts)); } catch(e) {}
              el.dispatchEvent(new MouseEvent('mouseup', opts));
              el.click();
            } catch (e) {
              try { el.click(); } catch (err) {}
            }
          }
        }

        // Tự động chờ mở modal/popup nếu thao tác là bấm nút mở form/hộp thoại
        const isModalTrigger = step.type === 'click' && (
          /tạo|thêm|mới|mở|popup|modal|dialog|drawer|form|sheet/i.test(step.label || '') ||
          el.getAttribute?.('data-toggle') === 'modal' ||
          el.getAttribute?.('aria-haspopup') === 'dialog'
        );

        let delayTime = isModalTrigger ? modalDelay : baseDelay;
        if (isSelect || isCustomSelect) {
          delayTime = Math.max(delayTime, 180); // Đảm bảo các trường phụ thuộc vào dropdown có đủ thời gian cập nhật
        }
        await wait(delayTime);

        unhighlight();
      }

      if (!emergencyStop) {
        hideProgressToast(`Hoàn tất kịch bản: "${macro.name}"!`);
        console.log(`[Auto Text Expander] Hoàn thành kịch bản "${macro.name}"!`);
      }
    } catch (err) {
      console.error('[Auto Text Expander] Lỗi khi chạy macro:', err);
      hideProgressToast(`Lỗi khi chạy kịch bản: ${err.message || 'Không xác định'}`, true);
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

    if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) return null;

    const modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    if (e.metaKey) modifiers.push('meta');

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
