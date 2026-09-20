// Auto Text Expander - Macro Recorder Engine (Record Form Actions)
(function () {
  'use strict';

  let isRecording = false;
  let recordedSteps = [];
  let lastActionTime = 0;
  let inputDebounceTimer = null;
  let widgetEl = null;
  let modalEl = null;

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
        // Đính kèm :nth-of-type nếu phần tử cha có nhiều con cùng loại thẻ (ví dụ các hàng div.faq-form-row)
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

  // Lấy nhãn mô tả thân thiện của phần tử
  function getElementLabel(el) {
    if (!el) return 'Phần tử';
    if (el.placeholder) return `Ô "${el.placeholder}"`;
    if (el.name) return `Trường [${el.name}]`;
    const formGroup = el.closest('.form-group, .faq-form-group, .faq-form-row');
    if (formGroup) {
      const label = formGroup.querySelector('.text-bold-600, label, .form-label, .faq-form-label, [class*="label"]') ||
                    formGroup.parentElement?.querySelector('.text-bold-600, label, .form-label');
      if (label) {
        const text = (label.innerText || label.textContent || '').trim();
        if (text) return `Mục ${text}`;
      }
    }
    const isEditor = el.isContentEditable || Boolean(el.closest?.('[contenteditable="true"], .slate-editable-area, .ql-editor'));
    if (isEditor) {
      return 'Khung soạn thảo';
    }
    const isButtonLike = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.classList?.contains('btn');
    const text = el.innerText?.trim();
    if (isButtonLike && text && text.length < 25) return `Nút "${text}"`;
    return el.tagName.toLowerCase();
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
  // EVENT RECORDING HANDLERS
  // -------------------------------------------------------------
  function handleRecordInput(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.closest('#ate-recorder-widget') || target.closest('.ate-macro-overlay')) return;

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
      const delay = lastActionTime === 0 ? 150 : Math.min(now - lastActionTime, 1200);
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

      // Nếu thao tác trước đó cùng selector input/editor thì cập nhật giá trị mới nhất thay vì tạo bước thừa
      const lastStep = recordedSteps[recordedSteps.length - 1];
      if (lastStep && lastStep.selector === selector && (lastStep.type === 'input' || lastStep.type === 'quill' || lastStep.type === 'contenteditable')) {
        lastStep.value = value;
        lastStep.label = `Nhập ${label}: "${typeof value === 'string' && value.length > 25 ? value.slice(0, 25) + '...' : value}"`;
      } else {
        recordedSteps.push({
          id: 'step-' + Date.now(),
          type: stepType,
          selector,
          value,
          label: `Nhập ${label}: "${typeof value === 'string' && value.length > 25 ? value.slice(0, 25) + '...' : value}"`,
          delay: Math.max(delay, 150)
        });
        updateWidgetCounter();
      }
    }, 280);
  }

  function handleRecordClick(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.closest('#ate-recorder-widget') || target.closest('.ate-macro-overlay')) return;

    // Bỏ qua click vào ô input, textarea, select, option và vùng soạn thảo vì sự kiện input/change sẽ lo liệu
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
    const delay = lastActionTime === 0 ? 200 : Math.min(now - lastActionTime, 1500);
    lastActionTime = now;

    const label = getElementLabel(target);

    recordedSteps.push({
      id: 'step-' + Date.now(),
      type: 'click',
      selector,
      label: `Bấm ${label}`,
      delay: Math.max(delay, 200)
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
      const optText = (selectedOpt?.text || selectedOpt?.innerText || selectedOpt?.textContent || '').trim();
      const val = target.value || optText;
      const displayVal = optText || val;
      const label = getElementLabel(target);

      const now = Date.now();
      const delay = lastActionTime === 0 ? 200 : Math.min(now - lastActionTime, 1200);
      lastActionTime = now;

      const lastStep = recordedSteps[recordedSteps.length - 1];
      if (lastStep && lastStep.selector === selector && (lastStep.type === 'input' || lastStep.type === 'select')) {
        lastStep.value = displayVal;
        lastStep.label = `Chọn ${label}: "${displayVal}"`;
      } else {
        recordedSteps.push({
          id: 'step-' + Date.now(),
          type: 'input',
          selector,
          value: displayVal,
          label: `Chọn ${label}: "${displayVal}"`,
          delay: Math.max(delay, 200)
        });
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
