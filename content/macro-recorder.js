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
  // SMART SELECTOR GENERATOR
  // -------------------------------------------------------------
  function getSmartSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return null;

    // 1. Kiểm tra thuộc tính name (chuẩn xác cho form inputs)
    if (el.name) {
      const tag = el.tagName.toLowerCase();
      const selector = `${tag}[name="${el.name}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    // 2. Kiểm tra ID nếu không phải là ID ngẫu nhiên động (như react-select-15-input)
    if (el.id && !el.id.match(/^react-select-|^[a-z0-9]{8,}/i)) {
      const selector = `#${CSS.escape(el.id)}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }

    // 3. Kiểm tra Quill Editor
    if (el.classList && el.classList.contains('ql-editor')) {
      return '.ql-editor';
    }
    const qlParent = el.closest('.ql-editor');
    if (qlParent) {
      return '.ql-editor';
    }

    // 4. Kiểm tra data attributes (data-testid, data-id, data-action, data-qa)
    for (const attr of ['data-testid', 'data-id', 'data-action', 'data-qa']) {
      if (el.getAttribute && el.getAttribute(attr)) {
        const selector = `[${attr}="${CSS.escape(el.getAttribute(attr))}"]`;
        if (document.querySelectorAll(selector).length === 1) return selector;
      }
    }

    // 5. Kiểm tra class độc nhất của chính phần tử (loại trừ các class trạng thái như .focused, .active)
    if (el.className && typeof el.className === 'string') {
      const elTag = el.tagName.toLowerCase();
      const cleanElClasses = Array.from(el.classList).filter(isStableClass);

      for (const cls of cleanElClasses) {
        const sel = `${elTag}.${CSS.escape(cls)}`;
        try {
          if (document.querySelectorAll(sel).length === 1) {
            return sel;
          }
        } catch (e) {}
      }
      if (cleanElClasses.length >= 2) {
        const sel = `${elTag}.${cleanElClasses.slice(0, 2).map(c => CSS.escape(c)).join('.')}`;
        try {
          if (document.querySelectorAll(sel).length === 1) {
            return sel;
          }
        } catch (e) {}
      }
    }

    // 6. Kiểm tra nếu là Button có class ổn định
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.classList?.contains('btn')) {
      const cleanClasses = Array.from(el.classList || []).filter(isStableClass).slice(0, 2);
      const btnClass = cleanClasses.length > 0 ? '.' + cleanClasses.map(c => CSS.escape(c)).join('.') : '';
      const sel = `${el.tagName.toLowerCase()}${btnClass}`;
      try {
        if (document.querySelectorAll(sel).length === 1) return sel;
      } catch (e) {}
    }

    // 7. Kiểm tra cấu trúc form-group với nhãn (Label)
    const formGroup = el.closest('.form-group');
    if (formGroup) {
      const label = formGroup.parentElement?.querySelector('.text-bold-600, label');
      if (label && el.name) {
        return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
      }
    }

    // 8. Fallback: Path selector ngắn gọn, lọc sạch các class trạng thái tạm thời (transient state)
    let path = [];
    let curr = el;
    while (curr && curr !== document.body && path.length < 4) {
      let segment = curr.tagName.toLowerCase();
      if (curr.id && !curr.id.match(/^react-select|^[a-z0-9]{8,}/i)) {
        segment += `#${CSS.escape(curr.id)}`;
        path.unshift(segment);
        break;
      } else if (curr.className && typeof curr.className === 'string') {
        const cleanClasses = Array.from(curr.classList)
          .filter(isStableClass)
          .slice(0, 2);
        if (cleanClasses.length > 0) {
          segment += '.' + cleanClasses.map(c => CSS.escape(c)).join('.');
        }
      }
      path.unshift(segment);

      // Thử xem path hiện tại đã đủ để chọn duy nhất chưa để dừng sớm
      try {
        const currentPathSelector = path.join(' > ');
        if (document.querySelectorAll(currentPathSelector).length === 1) {
          return currentPathSelector;
        }
      } catch (e) {}

      curr = curr.parentElement;
    }

    return path.join(' > ');
  }

  // Lấy nhãn mô tả thân thiện của phần tử
  function getElementLabel(el) {
    if (!el) return 'Phần tử';
    if (el.name) return `Trường [${el.name}]`;
    if (el.placeholder) return `Ô "${el.placeholder}"`;
    const label = el.closest('.form-group')?.parentElement?.querySelector('.text-bold-600, label');
    if (label) return `Mục ${label.innerText.trim()}`;
    const text = el.innerText?.trim();
    if (text && text.length < 25) return `Nút "${text}"`;
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

    const selector = getSmartSelector(target);
    if (!selector) return;

    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
      const now = Date.now();
      const delay = lastActionTime === 0 ? 150 : Math.min(now - lastActionTime, 1200);
      lastActionTime = now;

      const isQuill = target.classList?.contains('ql-editor') || Boolean(target.closest('.ql-editor'));
      const value = isQuill ? (target.closest('.ql-editor') || target).innerHTML : target.value;
      const label = getElementLabel(target);

      // Nếu thao tác trước đó cùng selector input thì cập nhật giá trị mới nhất thay vì tạo bước thừa
      const lastStep = recordedSteps[recordedSteps.length - 1];
      if (lastStep && lastStep.selector === selector && (lastStep.type === 'input' || lastStep.type === 'quill')) {
        lastStep.value = value;
      } else {
        recordedSteps.push({
          id: 'step-' + Date.now(),
          type: isQuill ? 'quill' : 'input',
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

    // Bỏ qua click vào ô input vì sự kiện input sẽ lo liệu
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

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
    document.addEventListener('click', handleRecordClick, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    console.log('[Auto Text Expander] Đã bắt đầu ghi thao tác kịch bản...');
  }

  function stopRecordingAndOpenModal() {
    isRecording = false;

    // Gỡ lắng nghe
    document.removeEventListener('input', handleRecordInput, true);
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
