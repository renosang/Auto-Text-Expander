// Auto Text Expander - Macro Recorder Engine (Record Form Actions)
(function () {
  'use strict';

  let isRecording = false;
  let recordedSteps = [];
  let lastActionTime = 0;
  let inputDebounceTimer = null;
  let widgetEl = null;
  let modalEl = null;
  let lastActiveDropdownTrigger = null;

  // -------------------------------------------------------------
  // DYNAMIC / TRANSIENT STATE CLASSES FILTER
  // -------------------------------------------------------------
  const TRANSIENT_CLASS_PATTERN = /^(focused|focus|is-focused|has-focus|active|is-active|open|is-open|opened|show|showing|selected|is-selected|hover|disabled|loading|dirty|touched|valid|invalid)$/i;

  function isStableClass(className) {
    if (!className || typeof className !== 'string') return false;
    const trimmed = className.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('css-') || trimmed.startsWith('ate-') || trimmed.startsWith('ng-')) {
      return false;
    }
    if (TRANSIENT_CLASS_PATTERN.test(trimmed)) {
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------
  // HIGH-PRECISION SMART SELECTOR GENERATOR
  // -------------------------------------------------------------
  function getSmartSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return null;

    // Hàm lấy chuỗi định danh chính xác của 1 node (Tag + ID + Toàn bộ Class ổn định + Thuộc tính phân biệt)
    function getNodeSignature(node, isLeaf = false) {
      if (!node || node === document.body || node === document.documentElement) return '';
      const tag = node.tagName.toLowerCase();
      let sig = tag;

      // 1. Ghi nhớ ID nếu có (bỏ qua ID sinh ngẫu nhiên)
      if (node.id && !node.id.match(/^react-select-|^[a-z0-9]{10,}/i)) {
        sig += `#${CSS.escape(node.id)}`;
      }

      // 2. Ghi nhớ toàn bộ class ổn định (loại trừ các class tạm thời như focused, active)
      if (node.className && typeof node.className === 'string') {
        const cleanClasses = Array.from(node.classList).filter(isStableClass);
        if (cleanClasses.length > 0) {
          sig += '.' + cleanClasses.map(c => CSS.escape(c)).join('.');
        }
      }

      // 3. Nếu là phần tử đích (leaf element), đính kèm thuộc tính phân biệt rõ ràng
      if (isLeaf) {
        if (node.placeholder) {
          sig += `[placeholder="${CSS.escape(node.placeholder)}"]`;
        } else if (node.name) {
          sig += `[name="${CSS.escape(node.name)}"]`;
        } else if (node.getAttribute?.('data-testid')) {
          sig += `[data-testid="${CSS.escape(node.getAttribute('data-testid'))}"]`;
        } else if (node.getAttribute?.('data-qa')) {
          sig += `[data-qa="${CSS.escape(node.getAttribute('data-qa'))}"]`;
        } else if (node.getAttribute?.('data-id')) {
          sig += `[data-id="${CSS.escape(node.getAttribute('data-id'))}"]`;
        } else if (node.getAttribute?.('aria-label')) {
          sig += `[aria-label="${CSS.escape(node.getAttribute('aria-label'))}"]`;
        } else if (node.getAttribute?.('type') && ['submit', 'button', 'checkbox', 'radio'].includes(node.getAttribute('type'))) {
          sig += `[type="${CSS.escape(node.getAttribute('type'))}"]`;
        }
      }

      return sig;
    }

    // Xây dựng chuỗi phân cấp chính xác từ phần tử đích lên các tầng cha (Container, Form, Section)
    let pathSegments = [];
    let curr = el;
    let isTarget = true;

    while (curr && curr !== document.body && curr !== document.documentElement && pathSegments.length < 5) {
      let sig = getNodeSignature(curr, isTarget);
      if (sig) {
        // Đính kèm :nth-of-type nếu phần tử cha có nhiều con cùng loại thẻ (ví dụ các hàng form-row, tr, list-item)
        if (curr.parentElement) {
          const sameTagSiblings = Array.from(curr.parentElement.children).filter(c => c.tagName === curr.tagName);
          if (sameTagSiblings.length > 1) {
            const siblingIndex = sameTagSiblings.indexOf(curr) + 1;
            if (siblingIndex > 0) {
              sig += `:nth-of-type(${siblingIndex})`;
            }
          }
        }

        pathSegments.unshift(sig);

        // Kiểm tra xem đường dẫn hiện tại đã đủ để định vị DUY NHẤT 1 phần tử trên trang chưa
        const currentPath = pathSegments.join(' > ');
        try {
          const matched = document.querySelectorAll(currentPath);
          if (matched.length === 1 && matched[0] === el) {
            return currentPath;
          }
        } catch (e) {}

        // Nếu gặp thẻ cha có ID độc nhất, neo vào ID đó và dừng lại
        if (!isTarget && curr.id && !curr.id.match(/^react-select-|^[a-z0-9]{10,}/i)) {
          break;
        }
      }

      isTarget = false;
      curr = curr.parentElement;
    }

    // Nếu sau khi lên tới 5 cấp cha mà vẫn có phần tử trùng (ví dụ danh sách nhiều item giống hệt nhau)
    const fullPath = pathSegments.join(' > ');
    try {
      const allFound = document.querySelectorAll(fullPath);
      if (allFound.length > 1) {
        for (let idx = 0; idx < allFound.length; idx++) {
          if (allFound[idx] === el) {
            const parent = el.parentElement;
            if (parent) {
              const sameTagSiblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
              const siblingIndex = sameTagSiblings.indexOf(el) + 1;
              if (siblingIndex > 0) {
                pathSegments[pathSegments.length - 1] += `:nth-of-type(${siblingIndex})`;
                return pathSegments.join(' > ');
              }
            }
            break;
          }
        }
      }
    } catch (e) {}

    return fullPath || el.tagName.toLowerCase();
  }

  // -------------------------------------------------------------
  // UNIVERSAL PRODUCTION FRAMEWORK SELECTORS
  // Chuẩn hóa 100% cho mọi Web UI Framework: Bootstrap, Ant Design, Material-UI, Tailwind, Salesforce, CRM
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
    'span.title',
    'strong'
  ].join(', ');

  // -------------------------------------------------------------
  // UNIVERSAL LABEL RESOLVER (HỖ TRỢ MỌI FRAMEWORK: BOOTSTRAP, TAILWIND, ANT-D, MUI, HTML CHUẨN)
  // -------------------------------------------------------------
  function resolveElementLabel(el) {
    if (!el) return '';

    // 1. Kiểm tra qua thẻ <label for="id">
    if (el.id) {
      try {
        const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (forLabel) {
          const txt = (forLabel.innerText || forLabel.textContent || '').trim();
          if (txt) return txt;
        }
      } catch (e) {}
    }

    // 2. Kiểm tra thẻ <label> bao bọc bên ngoài (Wrapping Label)
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const txt = (parentLabel.innerText || parentLabel.textContent || '').trim();
      if (txt) return txt;
    }

    // 3. Kiểm tra thuộc tính Accessibility aria-labelledby hoặc aria-label
    if (el.getAttribute('aria-label')) {
      const ariaTxt = el.getAttribute('aria-label').trim();
      if (ariaTxt) return ariaTxt;
    }
    const ariaLabeledBy = el.getAttribute('aria-labelledby');
    if (ariaLabeledBy) {
      try {
        const lbl = document.getElementById(ariaLabeledBy);
        if (lbl) {
          const txt = (lbl.innerText || lbl.textContent || '').trim();
          if (txt) return txt;
        }
      } catch (e) {}
    }

    // 4. Kiểm tra Form Container đa Framework (Ant Design, MUI, Bootstrap, Tailwind, CRM)
    const container = el.closest(UNIVERSAL_CONTAINER_SELECTOR) || el.parentElement;
    if (container) {
      const lbl = container.querySelector(UNIVERSAL_LABEL_SELECTOR);
      if (lbl && lbl !== el) {
        const txt = (lbl.innerText || lbl.textContent || '').trim();
        if (txt) return txt;
      }
    }

    // 5. Kiểm tra phần tử nhãn nằm liền trước (Preceding Sibling)
    let prev = el.previousElementSibling;
    while (prev) {
      if (['LABEL', 'SPAN', 'P', 'STRONG', 'B'].includes(prev.tagName) || prev.classList?.contains('label')) {
        const txt = (prev.innerText || prev.textContent || '').trim();
        if (txt && txt.length < 50) return txt;
        break;
      }
      prev = prev.previousElementSibling;
    }

    return '';
  }

  // Lấy nhãn mô tả thân thiện của phần tử
  function getElementLabel(el) {
    if (!el) return 'Phần tử';
    const labelText = resolveElementLabel(el);
    if (labelText) return `Mục ${labelText}`;
    if (el.placeholder) return `Ô "${el.placeholder}"`;
    if (el.name) return `Trường [${el.name}]`;
    const isEditor = el.isContentEditable || Boolean(el.closest?.('[contenteditable="true"], .slate-editable-area, .ql-editor'));
    if (isEditor) {
      return 'Khung soạn thảo';
    }
    const isButtonLike = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.classList?.contains('btn');
    const text = el.innerText?.trim();
    if (isButtonLike && text && text.length < 30) return `Nút "${text}"`;
    return el.tagName.toLowerCase();
  }

  function extractTargetInfo(el) {
    if (!el) return null;
    const labelText = resolveElementLabel(el);

    return {
      tagName: el.tagName || '',
      placeholder: el.placeholder || '',
      name: el.name || '',
      id: el.id && !el.id.match(/^react-select-|^[a-z0-9]{10,}/i) ? el.id : '',
      labelText: labelText,
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || ''
    };
  }

  // -------------------------------------------------------------
  // FLOATING WIDGET UI
  // -------------------------------------------------------------
  function showFloatingWidget() {
    if (widgetEl) widgetEl.remove();

    widgetEl = document.createElement('div');
    widgetEl.id = 'ate-recorder-widget';
    widgetEl.className = 'ate-recorder-widget';
    widgetEl.innerHTML = `
      <div class="ate-rec-status">
        <span class="ate-rec-dot"></span>
        <span class="ate-rec-text">Đang Ghi Thao Tác</span>
      </div>
      <span class="ate-step-badge" id="ate-widget-step-count">0 thao tác</span>
      <div class="ate-widget-actions">
        <button type="button" class="ate-btn-widget ate-btn-done" id="ate-btn-stop-rec">
          <span>⏹</span> Dừng & Lưu
        </button>
        <button type="button" class="ate-btn-widget ate-btn-cancel" id="ate-btn-cancel-rec">
          <span>✕</span> Hủy
        </button>
      </div>
    `;

    document.body.appendChild(widgetEl);

    // Kéo thả Widget linh hoạt
    makeDraggable(widgetEl);

    // Event listeners của widget
    document.getElementById('ate-btn-stop-rec').addEventListener('click', (e) => {
      e.stopPropagation();
      stopRecordingAndOpenModal();
    });

    document.getElementById('ate-btn-cancel-rec').addEventListener('click', (e) => {
      e.stopPropagation();
      cancelRecording();
    });
  }

  function updateWidgetCounter() {
    const badge = document.getElementById('ate-widget-step-count');
    if (badge) {
      badge.textContent = `${recordedSteps.length} thao tác`;
    }
  }

  function removeFloatingWidget() {
    if (widgetEl) {
      widgetEl.remove();
      widgetEl = null;
    }
    document.querySelectorAll('.ate-recording-highlight').forEach(el => {
      el.classList.remove('ate-recording-highlight');
    });
  }

  // Kéo thả widget trên màn hình
  function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = function (e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      el.style.top = (el.offsetTop - pos2) + 'px';
      el.style.left = (el.offsetLeft - pos1) + 'px';
      el.style.right = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // -------------------------------------------------------------
  // DROPDOWN & COMBOBOX IDENTIFICATION HELPERS
  // -------------------------------------------------------------
  function cleanOptionText(s) {
    if (!s || typeof s !== 'string') return '';
    return s
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Bỏ zero-width characters
      .replace(/\u00A0/g, ' ')               // Bỏ non-breaking space (&nbsp;)
      .normalize('NFC')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function isDropdownTrigger(el) {
    if (!el || el === document.body || el === document.documentElement) return false;

    // 1. ARIA Combobox pattern
    const role = el.getAttribute?.('role');
    if (role === 'combobox') return true;
    const hasPopup = el.getAttribute?.('aria-haspopup');
    if (hasPopup === 'listbox' || hasPopup === 'menu' || hasPopup === 'true') return true;

    // 2. Element inside a trigger container
    if (el.closest?.('[role="combobox"], [aria-haspopup="listbox"]')) return true;

    // 3. Framework specific trigger classes
    if (el.closest?.(
      '.ant-select-selector, .ant-select-selection-search, ' +
      '.select2-selection, .select2-choice, ' +
      '[class*="select__control"], [class*="Select-control"], ' +
      '.dropdown-toggle, [data-toggle="dropdown"], [data-bs-toggle="dropdown"], ' +
      '.MuiSelect-select, .MuiAutocomplete-root, ' +
      '.choices__inner, .custom-select, [data-radix-collection-item], ' +
      '.searchable-brand-container'
    )) return true;

    // 4. Input with combobox traits or search input in select
    if (el.tagName === 'INPUT') {
      if (el.readOnly && el.closest?.('.form-group, .form-item, [class*="select"], [class*="dropdown"]')) return true;
      if (el.classList?.contains('ant-select-selection-search-input')) return true;
      if (el.getAttribute?.('aria-autocomplete')) return true;
    }

    return false;
  }

  function findDropdownOptionAncestor(el) {
    if (!el || el === document.body || el === document.documentElement) return null;

    // 1. ARIA role option / menuitem
    const roleOpt = el.closest?.('[role="option"], [role="menuitem"]');
    if (roleOpt) return roleOpt;

    // 2. Framework option classes
    const classOpt = el.closest?.(
      '.ant-select-item-option, ' +
      '.ant-select-dropdown-menu-item, ' +
      '.MuiMenuItem-root, ' +
      '.dropdown-item, ' +
      '.select2-results__option, ' +
      '[class*="select__option"], ' +
      '[class*="Select-option"], ' +
      '[class*="option-item"], ' +
      '.select-option, ' +
      '.searchable-brand-item, ' +
      '[data-radix-collection-item], ' +
      '[id*="react-select"][id*="option"], ' +
      '[id*="headlessui-listbox-option"]'
    );
    if (classOpt) return classOpt;

    // 3. Elements inside listbox or dropdown menu container
    const inListbox = el.closest?.('[role="listbox"], .dropdown-menu, .ant-select-dropdown, [class*="dropdown-menu"], [class*="select-dropdown"], [class*="popover"], [class*="menu-list"]');
    if (inListbox) {
      return el.closest?.('li, [role="option"], a, button, div.item') || el;
    }

    return null;
  }

  function findAssociatedDropdownTrigger(optionEl) {
    if (!optionEl) return null;

    // 1. Kiểm tra aria-labelledby hoặc aria-controls trên listbox chứa option
    const listbox = optionEl.closest?.('[role="listbox"], [role="menu"], .ant-select-dropdown, [class*="dropdown-menu"]');
    if (listbox) {
      const labelledby = listbox.getAttribute?.('aria-labelledby');
      if (labelledby) {
        const lblEl = document.getElementById(labelledby);
        if (lblEl) return lblEl;
      }
      const id = listbox.getAttribute?.('id');
      if (id) {
        const ctrl = document.querySelector(`[aria-controls="${CSS.escape(id)}"]`);
        if (ctrl) return ctrl;
      }
    }

    // 2. Tìm trigger đang mở (aria-expanded="true")
    const openTriggers = document.querySelectorAll('[aria-expanded="true"]');
    if (openTriggers.length === 1) {
      return openTriggers[0];
    }

    // 3. Tìm phần tử activeElement hiện tại nếu là trigger
    if (document.activeElement && isDropdownTrigger(document.activeElement)) {
      return document.activeElement;
    }

    return null;
  }

  function handleCustomDropdownOptionClick(optionEl, originalTarget) {
    const rawText = optionEl.innerText || optionEl.textContent || '';
    const optionText = cleanOptionText(rawText);
    const optionValue = optionEl.getAttribute?.('data-value') || 
                        optionEl.getAttribute?.('value') || 
                        optionEl.getAttribute?.('data-key') || 
                        optionText;

    // Tìm trigger tương ứng
    let triggerSelector = '';
    let fieldLabel = '';

    if (lastActiveDropdownTrigger && (Date.now() - lastActiveDropdownTrigger.time < 15000)) {
      triggerSelector = lastActiveDropdownTrigger.selector;
      fieldLabel = lastActiveDropdownTrigger.label;
    } else {
      const triggerEl = findAssociatedDropdownTrigger(optionEl);
      if (triggerEl) {
        triggerSelector = getSmartSelector(triggerEl);
        fieldLabel = getElementLabel(triggerEl);
      }
    }

    if (!fieldLabel) {
      fieldLabel = 'Mục lựa chọn';
    }

    // Làm sạch nhãn (bỏ tiền tố Mở / Bấm / Chọn nếu có)
    const cleanLabel = fieldLabel.replace(/^(Mở|Bấm|Chọn)\s*/i, '').trim();
    const optionSelector = getSmartSelector(optionEl) || getSmartSelector(originalTarget);

    const stepData = {
      id: 'step-' + Date.now(),
      type: 'custom_select',
      selector: triggerSelector || optionSelector,
      triggerSelector: triggerSelector,
      optionSelector: optionSelector,
      value: optionText,
      optionText: optionText,
      optionValue: optionValue,
      label: `Chọn ${cleanLabel ? cleanLabel : 'mục'}: "${optionText}"`,
      targetInfo: {
        isCustomSelect: true,
        fieldLabel: cleanLabel,
        optionText: optionText,
        optionValue: optionValue,
        triggerSelector: triggerSelector
      },
      delay: 250
    };

    // Nếu bước trước đó là bước "Mở dropdown" cùng trigger này thì gộp thành 1 bước DUY NHẤT cực kỳ chuẩn xác!
    const lastStep = recordedSteps[recordedSteps.length - 1];
    if (lastStep && lastStep.type === 'click' && (lastStep.targetInfo?.isDropdownTrigger || (triggerSelector && lastStep.selector === triggerSelector))) {
      recordedSteps[recordedSteps.length - 1] = stepData;
    } else {
      recordedSteps.push(stepData);
    }

    lastActiveDropdownTrigger = null;
    lastActionTime = Date.now();
    updateWidgetCounter();
  }

  // -------------------------------------------------------------
  // EVENT RECORDING HANDLERS
  // -------------------------------------------------------------
  function handleRecordInput(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.closest('#ate-recorder-widget') || target.closest('.ate-macro-overlay')) return;
    if (target.tagName === 'SELECT') return; // Thẻ SELECT được xử lý chuyên biệt ở handleRecordChange

    // Nhận diện vùng soạn thảo (Slate.js, Quill, ContentEditable)
    const isEditor = target.isContentEditable || 
                     Boolean(target.closest?.('[contenteditable="true"], .ql-editor, [data-slate-editor="true"], .slate-editable-area'));
    const editorRoot = isEditor 
      ? (target.closest?.('[contenteditable="true"], .ql-editor, [data-slate-editor="true"], .slate-editable-area') || target) 
      : null;

    const targetForSelector = editorRoot || target;
    const selector = getSmartSelector(targetForSelector);
    if (!selector) return;

    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
      const now = Date.now();
      lastActionTime = now;

      let value = '';
      let stepType = 'input';

      if (editorRoot) {
        if (editorRoot.classList?.contains('ql-editor')) {
          stepType = 'quill';
          value = editorRoot.innerHTML;
        } else {
          stepType = 'contenteditable';
          value = editorRoot.innerText || editorRoot.textContent || '';
        }
      } else {
        stepType = 'input';
        value = target.value || '';
      }

      const label = getElementLabel(targetForSelector);
      const targetInfo = extractTargetInfo(targetForSelector);

      // Nếu thao tác trước đó cùng selector input/editor thì cập nhật giá trị mới nhất thay vì tạo bước thừa
      const lastStep = recordedSteps[recordedSteps.length - 1];
      if (lastStep && lastStep.selector === selector && (lastStep.type === 'input' || lastStep.type === 'quill' || lastStep.type === 'contenteditable')) {
        lastStep.value = value;
        lastStep.label = `Nhập ${label}: "${typeof value === 'string' && value.length > 25 ? value.slice(0, 25) + '...' : value}"`;
        if (targetInfo) lastStep.targetInfo = targetInfo;
      } else {
        recordedSteps.push({
          id: 'step-' + Date.now(),
          type: stepType,
          selector,
          value,
          label: `Nhập ${label}: "${typeof value === 'string' && value.length > 25 ? value.slice(0, 25) + '...' : value}"`,
          targetInfo,
          delay: 180
        });
        updateWidgetCounter();
      }
    }, 280);
  }

  function handleRecordClick(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.closest('#ate-recorder-widget') || target.closest('.ate-macro-overlay')) return;

    // 1. Kiểm tra nếu click vào một Option trong Custom Dropdown (AntD, MUI, React-Select, Radix, Tailwind, Bootstrap,...)
    const optionAncestor = findDropdownOptionAncestor(target);
    if (optionAncestor) {
      handleCustomDropdownOptionClick(optionAncestor, target);
      return;
    }

    // 2. Kiểm tra nếu click vào một Dropdown Trigger (Combobox, Select2, Ant Design Selector, Bootstrap Dropdown,...)
    const isTrigger = isDropdownTrigger(target);
    if (isTrigger) {
      const triggerEl = target.closest?.(
        '[role="combobox"], [aria-haspopup="listbox"], ' +
        '.ant-select-selector, .select2-selection, ' +
        '[class*="select__control"], .dropdown-toggle, ' +
        '.MuiSelect-select, .MuiAutocomplete-root, .searchable-brand-container'
      ) || target;

      const selector = getSmartSelector(triggerEl) || getSmartSelector(target);
      const label = getElementLabel(triggerEl) || getElementLabel(target);

      lastActiveDropdownTrigger = {
        el: triggerEl,
        selector: selector,
        label: label,
        time: Date.now()
      };

      const targetInfo = extractTargetInfo(triggerEl);
      recordedSteps.push({
        id: 'step-' + Date.now(),
        type: 'click',
        selector,
        label: `Mở ${label}`,
        targetInfo: {
          ...targetInfo,
          isDropdownTrigger: true
        },
        delay: 250
      });
      lastActionTime = Date.now();
      updateWidgetCounter();
      return;
    }

    // Bỏ qua click vào ô input, textarea, select, option và vùng soạn thảo thông thường vì sự kiện input/change sẽ lo liệu
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'SELECT' || 
      target.tagName === 'OPTION' || 
      target.isContentEditable || 
      Boolean(target.closest?.('[contenteditable="true"], .ql-editor, [data-slate-editor="true"], .slate-editable-area'))
    ) return;

    const selector = getSmartSelector(target);
    if (!selector) return;

    const now = Date.now();
    lastActionTime = now;

    const label = getElementLabel(target);
    const targetInfo = extractTargetInfo(target);

    recordedSteps.push({
      id: 'step-' + Date.now(),
      type: 'click',
      selector,
      label: `Bấm ${label}`,
      targetInfo,
      delay: 250
    });

    updateWidgetCounter();
  }

  function handleRecordChange(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.closest('#ate-recorder-widget') || target.closest('.ate-macro-overlay')) return;

    if (target.tagName === 'SELECT') {
      const selector = getSmartSelector(target);
      if (!selector) return;

      const selectedOpt = target.selectedOptions?.[0] || target.options?.[target.selectedIndex];
      const optText = cleanOptionText(selectedOpt?.text || selectedOpt?.innerText || selectedOpt?.textContent || '');
      const val = target.value !== undefined ? target.value : optText;
      const displayVal = optText || val;
      const label = getElementLabel(target);
      const targetInfo = extractTargetInfo(target);

      const now = Date.now();
      lastActionTime = now;

      const stepData = {
        id: 'step-' + Date.now(),
        type: 'select',
        selector,
        value: val,
        optionText: optText,
        optionValue: val,
        optionIndex: target.selectedIndex,
        label: `Chọn ${label}: "${displayVal}"`,
        targetInfo: {
          ...targetInfo,
          isSelect: true,
          optionText: optText,
          optionValue: val,
          optionIndex: target.selectedIndex
        },
        delay: 200
      };

      const lastStep = recordedSteps[recordedSteps.length - 1];
      if (lastStep && lastStep.selector === selector && (lastStep.type === 'select' || lastStep.type === 'input')) {
        recordedSteps[recordedSteps.length - 1] = stepData;
      } else {
        recordedSteps.push(stepData);
        updateWidgetCounter();
      }
    }
  }

  function handleMouseOver(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.closest('#ate-recorder-widget') || target.closest('.ate-macro-overlay')) return;
    target.classList.add('ate-recording-highlight');
  }

  function handleMouseOut(e) {
    if (!isRecording) return;
    const target = e.target;
    if (target) target.classList.remove('ate-recording-highlight');
  }

  // -------------------------------------------------------------
  // START / STOP / SAVE FLOW
  // -------------------------------------------------------------
  function startRecording() {
    isRecording = true;
    recordedSteps = [];
    lastActiveDropdownTrigger = null;
    lastActionTime = Date.now();

    showFloatingWidget();

    // Lắng nghe các sự kiện thao tác
    document.addEventListener('input', handleRecordInput, true);
    document.addEventListener('change', handleRecordChange, true);
    document.addEventListener('click', handleRecordClick, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    console.log('[Auto Text Expander] Đã bắt đầu ghi thao tác kịch bản...');
  }

  function stopRecordingAndOpenModal() {
    isRecording = false;
    lastActiveDropdownTrigger = null;

    // Gỡ lắng nghe
    document.removeEventListener('input', handleRecordInput, true);
    document.removeEventListener('change', handleRecordChange, true);
    document.removeEventListener('click', handleRecordClick, true);
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);

    removeFloatingWidget();

    if (recordedSteps.length === 0) {
      alert('Chưa có thao tác nào được ghi nhận. Vui lòng thao tác trên form trước khi lưu.');
      return;
    }

    openSaveModal();
  }

  function cancelRecording() {
    isRecording = false;
    recordedSteps = [];
    lastActiveDropdownTrigger = null;
    document.removeEventListener('input', handleRecordInput, true);
    document.removeEventListener('change', handleRecordChange, true);
    document.removeEventListener('click', handleRecordClick, true);
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    removeFloatingWidget();
  }

  // -------------------------------------------------------------
  // MODAL LƯU KỊCH BẢN MACRO
  // -------------------------------------------------------------
  function openSaveModal() {
    if (modalEl) modalEl.remove();

    modalEl = document.createElement('div');
    modalEl.className = 'ate-macro-overlay';
    modalEl.innerHTML = `
      <div class="ate-macro-modal">
        <div class="ate-modal-header">
          <h3 class="ate-modal-title">⚡ Lưu Kịch Bản Tự Động (Macro)</h3>
        </div>
        <div class="ate-modal-body">
          <div class="ate-field-group">
            <label>Tên Kịch Bản <span style="color:#ef4444;">*</span></label>
            <input type="text" id="ate-macro-name" class="ate-modal-input" placeholder="Ví dụ: Phản hồi & Đóng Ticket" value="Kịch bản ${new Date().toLocaleDateString('vi-VN')}">
          </div>
          <div class="ate-field-group">
            <label>Phím Tắt Kích Hoạt (Từ Khóa) <span style="color:#ef4444;">*</span></label>
            <input type="text" id="ate-macro-shortcut" class="ate-modal-input" placeholder="Ví dụ: :cbreply hoặc :submitticket" value=":macro${Math.floor(Math.random() * 90 + 10)}">
            <p class="ate-field-help">Khi gõ từ khóa này tại ô bất kỳ, kịch bản sẽ tự động chạy.</p>
          </div>
          <div class="ate-field-group">
            <label>Phím Nóng Toàn Cục (Tùy chọn)</label>
            <input type="text" id="ate-macro-hotkey" class="ate-modal-input" placeholder="Ví dụ: Alt+1 hoặc Alt+S" value="Alt+1">
            <p class="ate-field-help">Nhấn tổ hợp phím này trên bàn phím để khởi chạy nhanh tức thì.</p>
          </div>
          <div class="ate-field-group">
            <label>Các bước đã ghi (${recordedSteps.length} bước):</label>
            <div class="ate-steps-preview">
              ${recordedSteps.map((step, idx) => `
                <div class="ate-step-item">
                  <span style="color:#818cf8; font-weight:700;">${idx + 1}.</span>
                  <span>${escapeHtml(step.label)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="ate-modal-footer">
          <button type="button" class="ate-btn-widget ate-btn-cancel" id="ate-btn-discard-modal">Hủy bỏ</button>
          <button type="button" class="ate-btn-widget ate-btn-done" id="ate-btn-save-modal">Lưu Kịch Bản</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    document.getElementById('ate-btn-discard-modal').addEventListener('click', () => {
      modalEl.remove();
      modalEl = null;
    });

    document.getElementById('ate-btn-save-modal').addEventListener('click', async () => {
      const name = document.getElementById('ate-macro-name').value.trim();
      const shortcut = document.getElementById('ate-macro-shortcut').value.trim();
      const hotkey = document.getElementById('ate-macro-hotkey').value.trim();

      if (!name || !shortcut) {
        alert('Vui lòng nhập Tên kịch bản và Từ khóa phím tắt.');
        return;
      }

      const newMacro = {
        id: 'macro_' + Date.now(),
        name,
        shortcut,
        hotkey,
        enabled: true,
        urlPattern: window.location.hostname || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        steps: [...recordedSteps]
      };

      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get(['macros']);
          const macros = res.macros && Array.isArray(res.macros) ? res.macros : [];
          macros.push(newMacro);
          await chrome.storage.local.set({ macros });
        }
      } catch (err) {
        console.error('Lỗi lưu macro:', err);
      }

      modalEl.remove();
      modalEl = null;

      // Toast thông báo lưu thành công
      showSuccessToast(newMacro);
    });
  }

  function showSuccessToast(macro) {
    const toast = document.createElement('div');
    toast.className = 'ate-expansion-toast ate-show';
    toast.innerHTML = `
      <span class="ate-toast-badge">✓</span>
      <span class="ate-toast-text">Đã lưu kịch bản: <strong>${escapeHtml(macro.name)}</strong> (Kích hoạt: <span class="ate-toast-shortcut">${escapeHtml(macro.shortcut)}</span> hoặc ${escapeHtml(macro.hotkey)})</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('ate-show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Lắng nghe thông điệp từ popup hoặc background
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'START_RECORDING') {
        startRecording();
        sendResponse({ status: 'RECORDING_STARTED' });
      } else if (request.action === 'STOP_RECORDING') {
        stopRecordingAndOpenModal();
        sendResponse({ status: 'RECORDING_STOPPED' });
      }
      return true;
    });
  }

  // Phơi API ra window để tiện gọi
  window.AteMacroRecorder = {
    start: startRecording,
    stop: stopRecordingAndOpenModal,
    cancel: cancelRecording,
    isRecording: () => isRecording
  };
})();
