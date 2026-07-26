import { formatRupiah } from '../store.js';

// State management
const state = {
  isOpen: false,
  currentInput: '0',
  previousInput: '',
  operation: null,
  calculationHistory: '',
  isResultShown: false
};

// Keypad configuration
const BUTTONS = [
  { val: 'C', label: 'C', class: 'operator', style: 'color: var(--red); background: var(--red-light);' },
  { val: 'back', label: '<i class="ph ph-backspace"></i>', class: 'operator', style: 'color: var(--text-muted);' },
  { val: '%', label: '%', class: 'operator', style: 'color: var(--primary); font-weight: 600;' },
  { val: '/', label: '÷', class: 'operator', style: 'color: var(--primary); font-weight: 600;' },

  { val: '7', label: '7', class: 'num' },
  { val: '8', label: '8', class: 'num' },
  { val: '9', label: '9', class: 'num' },
  { val: '*', label: '×', class: 'operator', style: 'color: var(--primary); font-weight: 600;' },

  { val: '4', label: '4', class: 'num' },
  { val: '5', label: '5', class: 'num' },
  { val: '6', label: '6', class: 'num' },
  { val: '-', label: '−', class: 'operator', style: 'color: var(--primary); font-weight: 600;' },

  { val: '1', label: '1', class: 'num' },
  { val: '2', label: '2', class: 'num' },
  { val: '3', label: '3', class: 'num' },
  { val: '+', label: '+', class: 'operator', style: 'color: var(--primary); font-weight: 600;' },

  { val: '0', label: '0', class: 'num', style: 'grid-column: span 2;' },
  { val: '.', label: '.', class: 'num' },
  { val: '=', label: '=', class: 'operator', style: 'background: var(--primary); color: white; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);' }
];

export function openCalculator() {
  if (document.getElementById('calc-card')) return;
  state.isOpen = true;

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const calcCard = document.createElement('div');
  calcCard.className = 'modal-card';
  calcCard.id = 'calc-card';
  calcCard.style.cssText = 'position: fixed; top: 150px; right: 40px; width: 340px; height: 510px; min-width: 300px; min-height: 460px; max-width: 600px; max-height: 850px; padding: 1.5rem; border-radius: var(--radius-xl); background: var(--card-bg); box-shadow: 0 20px 50px rgba(0,0,0,0.15); border: 1px solid var(--border); z-index: 2000; user-select: none; overflow: hidden; display: flex; flex-direction: column;';

  calcCard.innerHTML = `
    <div id="calc-drag-handle" style="margin: -0.75rem -0.75rem 1.25rem -0.75rem; padding: 0.75rem 0.75rem 0.25rem 0.75rem; cursor: move; user-select: none; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0;">
      <div style="width: 42px; height: 5px; background: var(--border); border-radius: 10px; margin: 0 auto; opacity: 0.6; pointer-events: none;"></div>
      <div style="display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
          <i class="ph-fill ph-calculator" style="font-size: 1.5rem;"></i>
          <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-main);">Kalkulator</h3>
        </div>
        <button class="icon-btn" id="btn-close-calc" style="background: var(--border-light); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; pointer-events: auto;"><i class="ph ph-x"></i></button>
      </div>
    </div>

    <div style="background: var(--bg-color); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem; border: 1px solid var(--border-light); text-align: right; min-height: 85px; display: flex; flex-direction: column; justify-content: space-between; word-break: break-all; flex-shrink: 0; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div id="calc-history" style="font-size: 0.8rem; color: var(--text-muted); min-height: 1.2rem; letter-spacing: 0.05em; text-align: left; flex: 1;"></div>
        <button id="btn-copy-calc" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; border-radius: 6px;" title="Copy (Ctrl+C)" onmouseover="this.style.color='var(--primary)'; this.style.background='var(--border-light)';" onmouseout="this.style.color='var(--text-muted)'; this.style.background='none';">
          <i class="ph ph-copy" style="font-size: 1.1rem;"></i>
        </button>
      </div>
      <div id="calc-display" style="font-size: 1.75rem; font-weight: 700; color: var(--text-main); line-height: 1.1; margin-top: 4px;">0</div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(5, 1fr); gap: 0.75rem; flex: 1;">
      ${BUTTONS.map(b => `<button class="btn-calc ${b.class}" data-val="${b.val}" style="${b.style || ''}">${b.label}</button>`).join('')}
    </div>

    <div id="calc-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; cursor: se-resize; display: flex; align-items: flex-end; justify-content: flex-end; padding: 6px; z-index: 2001; -webkit-tap-highlight-color: transparent;">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity: 0.6; pointer-events: none;">
        <path d="M10 2L2 10M10 6L6 10M10 9L9 10" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>

    <style>
      .btn-calc {
        height: 100%; width: 100%; border: none; background: var(--border-light);
        color: var(--text-main); font-size: clamp(0.95rem, 0.85rem + 0.8vh, 1.45rem);
        font-weight: 500; border-radius: 12px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
      }
      .btn-calc:hover { transform: scale(1.03); filter: brightness(0.95); }
      .btn-calc:active { transform: scale(0.97); }
      [data-theme="dark"] .btn-calc { background: rgba(255, 255, 255, 0.05); }
      [data-theme="dark"] .btn-calc:hover { background: rgba(255, 255, 255, 0.1); }
    </style>
  `;

  modalContainer.appendChild(calcCard);

  resetState();
  updateDisplay();

  document.getElementById('btn-close-calc').onclick = closeCalculator;
  calcCard.querySelectorAll('.btn-calc').forEach(btn => {
    btn.onclick = () => handleButton(btn.getAttribute('data-val'));
  });

  makeDraggable(calcCard, document.getElementById('calc-drag-handle'));
  makeResizable(calcCard, document.getElementById('calc-resize-handle'));
  setupCopyButton();

  window.addEventListener('keydown', handleKeyboard);
  window.addEventListener('paste', handlePaste);
  window.addEventListener('copy', handleCopy);
}

export function closeCalculator() {
  state.isOpen = false;
  document.getElementById('calc-card')?.remove();
  window.removeEventListener('keydown', handleKeyboard);
  window.removeEventListener('paste', handlePaste);
  window.removeEventListener('copy', handleCopy);
}

function resetState() {
  state.currentInput = '0';
  state.previousInput = '';
  state.operation = null;
  state.calculationHistory = '';
  state.isResultShown = false;
}

// Unified Pointer Position Helper
function getPointerPos(e) {
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  return { x: touch ? touch.clientX : e.clientX, y: touch ? touch.clientY : e.clientY };
}

function makeDraggable(el, handle) {
  if (!handle) return;
  let startX = 0, startY = 0;

  const onStart = (e) => {
    if (e.target.closest('#btn-close-calc')) return;
    const pos = getPointerPos(e);
    startX = pos.x;
    startY = pos.y;

    const onMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentPos = getPointerPos(moveEvent);
      const dx = startX - currentPos.x;
      const dy = startY - currentPos.y;
      startX = currentPos.x;
      startY = currentPos.y;

      let newLeft = Math.max(0, Math.min(el.offsetLeft - dx, window.innerWidth - el.offsetWidth));
      let newTop = Math.max(0, Math.min(el.offsetTop - dy, window.innerHeight - el.offsetHeight));

      el.style.left = `${newLeft}px`;
      el.style.top = `${newTop}px`;
      el.style.bottom = 'auto';
      el.style.right = 'auto';
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  handle.addEventListener('mousedown', onStart);
  handle.addEventListener('touchstart', onStart);
}

function makeResizable(el, handle) {
  if (!handle) return;

  const onStart = (e) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    const startX = pos.x;
    const startY = pos.y;
    const startWidth = parseInt(getComputedStyle(el).width, 10);
    const startHeight = parseInt(getComputedStyle(el).height, 10);

    const onMove = (moveEvent) => {
      const currentPos = getPointerPos(moveEvent);
      const newWidth = Math.max(300, Math.min(600, startWidth + currentPos.x - startX));
      const newHeight = Math.max(460, Math.min(850, startHeight + currentPos.y - startY));

      el.style.width = `${newWidth}px`;
      el.style.height = `${newHeight}px`;
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  handle.addEventListener('mousedown', onStart);
  handle.addEventListener('touchstart', onStart);
}

function setupCopyButton() {
  const btnCopy = document.getElementById('btn-copy-calc');
  if (!btnCopy) return;

  btnCopy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(state.currentInput);
      btnCopy.innerHTML = '<i class="ph-fill ph-check" style="color: var(--green); font-size: 1.1rem;"></i>';
      setTimeout(() => {
        btnCopy.innerHTML = '<i class="ph ph-copy" style="font-size: 1.1rem;"></i>';
      }, 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };
}

function handleButton(val) {
  if (!isNaN(val) || val === '.') {
    if (state.isResultShown) {
      state.currentInput = val === '.' ? '0.' : val;
      state.isResultShown = false;
    } else {
      if (val === '.' && state.currentInput.includes('.')) return;
      state.currentInput = (state.currentInput === '0' && val !== '.') ? val : state.currentInput + val;
    }
  } else if (val === 'C') {
    resetState();
  } else if (val === 'back') {
    if (state.isResultShown) {
      state.calculationHistory = '';
    } else {
      state.currentInput = state.currentInput.slice(0, -1);
      if (state.currentInput === '' || state.currentInput === '-') state.currentInput = '0';
    }
  } else if (val === '=') {
    performCalculation();
    state.operation = null;
    state.previousInput = '';
    state.isResultShown = true;
  } else if (val === '%') {
    state.currentInput = (parseFloat(state.currentInput) / 100).toString();
    state.isResultShown = true;
  } else {
    if (state.operation && !state.isResultShown) performCalculation();
    state.previousInput = state.currentInput;
    state.operation = val;
    state.calculationHistory = `${formatNumberForHistory(state.previousInput)} ${getOpSymbol(state.operation)}`;
    state.isResultShown = true;
  }
  updateDisplay();
}

function performCalculation() {
  if (!state.operation || state.previousInput === '') return;
  const prev = parseFloat(state.previousInput);
  const current = parseFloat(state.currentInput);
  let result = 0;

  switch (state.operation) {
    case '+': result = prev + current; break;
    case '-': result = prev - current; break;
    case '*': result = prev * current; break;
    case '/': result = current === 0 ? 'Error' : prev / current; break;
  }

  state.calculationHistory = `${formatNumberForHistory(state.previousInput)} ${getOpSymbol(state.operation)} ${formatNumberForHistory(state.currentInput)} =`;
  state.currentInput = result.toString();
}

function formatNumberForHistory(numStr) {
  const num = parseFloat(numStr);
  return isNaN(num) ? numStr : formatNumber(num);
}

function formatNumber(num) {
  return num.toLocaleString('id-ID', num % 1 !== 0 ? { maximumFractionDigits: 4 } : undefined);
}

function getOpSymbol(op) {
  const map = { '/': '÷', '*': '×', '-': '−', '+': '+' };
  return map[op] || op;
}

function formatInputString(str) {
  if (str === '-' || str === 'Error') return str;
  const parts = str.split('.');
  const intPart = parseFloat(parts[0]);
  if (isNaN(intPart)) return str;
  const formattedInt = intPart.toLocaleString('id-ID');
  return parts.length > 1 ? `${formattedInt},${parts[1]}` : formattedInt;
}

function updateDisplay() {
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');
  if (display) display.textContent = formatInputString(state.currentInput);
  if (history) history.textContent = state.calculationHistory;
}

function handleKeyboard(e) {
  if (document.activeElement && (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement?.isContentEditable)) {
    return;
  }

  if ((e.ctrlKey || e.metaKey) && ['c', 'v'].includes(e.key.toLowerCase())) return;

  let key = e.key;
  if (key === 'Enter') key = '=';
  if (key === 'Escape') return closeCalculator();
  if (key === 'Backspace') key = 'back';
  if (key === 'Delete' || key.toLowerCase() === 'c') key = 'C';
  if (key === ',') key = '.';

  const validKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/', '%', '=', 'back', 'C'];
  if (validKeys.includes(key)) {
    e.preventDefault();
    handleButton(key);
  }
}

function handlePaste(e) {
  if (document.activeElement && (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement?.isContentEditable)) {
    return;
  }
  const pasteData = (e.clipboardData || window.clipboardData)?.getData('text');
  if (!pasteData) return;

  let cleaned = pasteData.replace(/[^0-9.,-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  cleaned = lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');

  const num = parseFloat(cleaned);
  if (!isNaN(num)) {
    e.preventDefault();
    state.currentInput = num.toString();
    state.isResultShown = true;
    updateDisplay();
  }
}

function handleCopy(e) {
  if (document.activeElement && (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement?.isContentEditable)) {
    return;
  }
  if (window.getSelection().toString()) return;

  e.preventDefault();
  const copyValue = state.currentInput.includes('.') ? state.currentInput.replace('.', ',') : state.currentInput;
  e.clipboardData.setData('text/plain', copyValue);
}
