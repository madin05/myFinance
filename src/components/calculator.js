import { formatRupiah } from '../store.js';

let isOpen = false;
let currentInput = '0';
let previousInput = '';
let operation = null;
let calculationHistory = '';
let isResultShown = false;

export function openCalculator() {
  if (document.getElementById('calc-card')) return;
  isOpen = true;

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const calcCard = document.createElement('div');
  calcCard.className = 'modal-card';
  calcCard.id = 'calc-card';
  calcCard.style.cssText = 'position: fixed; top: 150px; right: 40px; width: 340px; height: 510px; min-width: 300px; min-height: 460px; max-width: 600px; max-height: 850px; padding: 1.5rem; border-radius: var(--radius-xl); background: var(--card-bg); box-shadow: 0 20px 50px rgba(0,0,0,0.15); border: 1px solid var(--border); z-index: 2000; user-select: none; overflow: hidden; display: flex; flex-direction: column;';

  const modalHtml = `
      <!-- Drag & Drop Handle Area -->
      <div id="calc-drag-handle" style="margin: -0.75rem -0.75rem 1.25rem -0.75rem; padding: 0.75rem 0.75rem 0.25rem 0.75rem; cursor: move; user-select: none; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0;">
        <!-- iOS Style Drag Pill -->
        <div style="width: 42px; height: 5px; background: var(--border); border-radius: 10px; margin: 0 auto; opacity: 0.6; pointer-events: none;"></div>
        
        <!-- Header Content -->
        <div style="display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
            <i class="ph-fill ph-calculator" style="font-size: 1.5rem;"></i>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-main);">Kalkulator</h3>
          </div>
          <button class="icon-btn" id="btn-close-calc" style="background: var(--border-light); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; pointer-events: auto;"><i class="ph ph-x"></i></button>
        </div>
      </div>

      <!-- Display Screen -->
      <div style="background: var(--bg-color); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem; border: 1px solid var(--border-light); text-align: right; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; word-break: break-all; flex-shrink: 0;">
        <div id="calc-history" style="font-size: 0.8rem; color: var(--text-muted); min-height: 1.2rem; letter-spacing: 0.05em;"></div>
        <div id="calc-display" style="font-size: 1.75rem; font-weight: 700; color: var(--text-main); line-height: 1.1;">0</div>
      </div>

      <!-- Keypad Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(5, 1fr); gap: 0.75rem; flex: 1;">
        <!-- Row 1 -->
        <button class="btn-calc operator" data-val="C" style="color: var(--red); background: var(--red-light);">C</button>
        <button class="btn-calc operator" data-val="back" style="color: var(--text-muted);"><i class="ph ph-backspace"></i></button>
        <button class="btn-calc operator" data-val="%" style="color: var(--primary); font-weight: 600;">%</button>
        <button class="btn-calc operator" data-val="/" style="color: var(--primary); font-weight: 600;">÷</button>

        <!-- Row 2 -->
        <button class="btn-calc num" data-val="7">7</button>
        <button class="btn-calc num" data-val="8">8</button>
        <button class="btn-calc num" data-val="9">9</button>
        <button class="btn-calc operator" data-val="*" style="color: var(--primary); font-weight: 600;">×</button>

        <!-- Row 3 -->
        <button class="btn-calc num" data-val="4">4</button>
        <button class="btn-calc num" data-val="5">5</button>
        <button class="btn-calc num" data-val="6">6</button>
        <button class="btn-calc operator" data-val="-" style="color: var(--primary); font-weight: 600;">−</button>

        <!-- Row 4 -->
        <button class="btn-calc num" data-val="1">1</button>
        <button class="btn-calc num" data-val="2">2</button>
        <button class="btn-calc num" data-val="3">3</button>
        <button class="btn-calc operator" data-val="+" style="color: var(--primary); font-weight: 600;">+</button>

        <!-- Row 5 -->
        <button class="btn-calc num" data-val="0" style="grid-column: span 2;">0</button>
        <button class="btn-calc num" data-val=".">.</button>
        <button class="btn-calc operator" data-val="=" style="background: var(--primary); color: white; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);">=</button>
      </div>

      <!-- Custom Touch-friendly Resize Handle -->
      <div id="calc-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; cursor: se-resize; display: flex; align-items: flex-end; justify-content: flex-end; padding: 6px; z-index: 2001; -webkit-tap-highlight-color: transparent;">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity: 0.6; pointer-events: none;">
          <path d="M10 2L2 10M10 6L6 10M10 9L9 10" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>

    <style>
      .btn-calc {
        height: 100%;
        width: 100%;
        border: none;
        background: var(--border-light);
        color: var(--text-main);
        font-size: clamp(0.95rem, 0.85rem + 0.8vh, 1.45rem);
        font-weight: 500;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .btn-calc:hover {
        transform: scale(1.03);
        filter: brightness(0.95);
      }
      .btn-calc:active {
        transform: scale(0.97);
      }
      [data-theme="dark"] .btn-calc {
        background: rgba(255, 255, 255, 0.05);
      }
      [data-theme="dark"] .btn-calc:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    </style>
  `;

  calcCard.innerHTML = modalHtml;
  modalContainer.appendChild(calcCard);

  // Reset calculator states
  currentInput = '0';
  previousInput = '';
  operation = null;
  calculationHistory = '';
  isResultShown = false;
  updateDisplay();

  // Listeners
  document.getElementById('btn-close-calc').onclick = closeCalculator;

  calcCard.querySelectorAll('.btn-calc').forEach(btn => {
    btn.onclick = () => {
      handleButton(btn.getAttribute('data-val'));
    };
  });

  // Make draggable & resizable
  const calcHeader = document.getElementById('calc-drag-handle');
  const resizeHandle = document.getElementById('calc-resize-handle');
  if (calcHeader) {
    makeDraggable(calcCard, calcHeader);
  }
  if (resizeHandle) {
    makeResizable(calcCard, resizeHandle);
  }

  // Keyboard support
  window.addEventListener('keydown', handleKeyboard);
}

export function closeCalculator() {
  isOpen = false;
  const calcCard = document.getElementById('calc-card');
  if (calcCard) calcCard.remove();
  window.removeEventListener('keydown', handleKeyboard);
}

function makeDraggable(el, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;
  handle.ontouchstart = dragTouchStart;

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.target.closest('#btn-close-calc')) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function dragTouchStart(e) {
    if (e.target.closest('#btn-close-calc')) return;
    if (e.touches) {
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      document.ontouchend = closeDragElement;
      document.ontouchmove = elementTouchDrag;
    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    let newTop = el.offsetTop - pos2;
    let newLeft = el.offsetLeft - pos1;
    
    // Boundary constraints
    const maxLeft = window.innerWidth - el.offsetWidth;
    const maxTop = window.innerHeight - el.offsetHeight;
    
    if (newLeft < 0) newLeft = 0;
    if (newLeft > maxLeft) newLeft = maxLeft;
    if (newTop < 0) newTop = 0;
    if (newTop > maxTop) newTop = maxTop;

    el.style.top = newTop + "px";
    el.style.left = newLeft + "px";
    el.style.bottom = "auto";
    el.style.right = "auto";
  }

  function elementTouchDrag(e) {
    if (e.touches) {
      pos1 = pos3 - e.touches[0].clientX;
      pos2 = pos4 - e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      
      let newTop = el.offsetTop - pos2;
      let newLeft = el.offsetLeft - pos1;
      
      const maxLeft = window.innerWidth - el.offsetWidth;
      const maxTop = window.innerHeight - el.offsetHeight;
      
      if (newLeft < 0) newLeft = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;
      if (newTop < 0) newTop = 0;
      if (newTop > maxTop) newTop = maxTop;

      el.style.top = newTop + "px";
      el.style.left = newLeft + "px";
      el.style.bottom = "auto";
      el.style.right = "auto";
    }
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
  }
}

function makeResizable(el, handle) {
  let startX, startY, startWidth, startHeight;

  handle.addEventListener('mousedown', initResize, false);
  handle.addEventListener('touchstart', initResizeTouch, false);

  function initResize(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(el).height, 10);
    document.documentElement.addEventListener('mousemove', doResize, false);
    document.documentElement.addEventListener('mouseup', stopResize, false);
  }

  function initResizeTouch(e) {
    if (e.touches) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
      startHeight = parseInt(document.defaultView.getComputedStyle(el).height, 10);
      document.documentElement.addEventListener('touchmove', doResizeTouch, false);
      document.documentElement.addEventListener('touchend', stopResizeTouch, false);
    }
  }

  function doResize(e) {
    let newWidth = startWidth + e.clientX - startX;
    let newHeight = startHeight + e.clientY - startY;
    
    if (newWidth < 300) newWidth = 300;
    if (newWidth > 600) newWidth = 600;
    if (newHeight < 460) newHeight = 460;
    if (newHeight > 850) newHeight = 850;

    el.style.width = newWidth + 'px';
    el.style.height = newHeight + 'px';
  }

  function doResizeTouch(e) {
    if (e.touches) {
      let newWidth = startWidth + e.touches[0].clientX - startX;
      let newHeight = startHeight + e.touches[0].clientY - startY;
      
      if (newWidth < 300) newWidth = 300;
      if (newWidth > 600) newWidth = 600;
      if (newHeight < 460) newHeight = 460;
      if (newHeight > 850) newHeight = 850;

      el.style.width = newWidth + 'px';
      el.style.height = newHeight + 'px';
    }
  }

  function stopResize() {
    document.documentElement.removeEventListener('mousemove', doResize, false);
    document.documentElement.removeEventListener('mouseup', stopResize, false);
  }

  function stopResizeTouch() {
    document.documentElement.removeEventListener('touchmove', doResizeTouch, false);
    document.documentElement.removeEventListener('touchend', stopResizeTouch, false);
  }
}

function handleButton(val) {
  if (!isNaN(val) || val === '.') {
    if (isResultShown) {
      currentInput = val === '.' ? '0.' : val;
      isResultShown = false;
    } else {
      if (val === '.' && currentInput.includes('.')) return;
      if (currentInput === '0' && val !== '.') {
        currentInput = val;
      } else {
        currentInput += val;
      }
    }
  } else if (val === 'C') {
    currentInput = '0';
    previousInput = '';
    operation = null;
    calculationHistory = '';
    isResultShown = false;
  } else if (val === 'back') {
    if (isResultShown) {
      calculationHistory = '';
    } else {
      currentInput = currentInput.slice(0, -1);
      if (currentInput === '' || currentInput === '-') currentInput = '0';
    }
  } else if (val === '=') {
    performCalculation();
    operation = null;
    previousInput = '';
    isResultShown = true;
  } else if (val === '%') {
    currentInput = (parseFloat(currentInput) / 100).toString();
    isResultShown = true;
  } else {
    if (operation && !isResultShown) {
      performCalculation();
    }
    previousInput = currentInput;
    operation = val;
    calculationHistory = `${formatNumberForHistory(previousInput)} ${getOpSymbol(operation)}`;
    isResultShown = true;
  }
  updateDisplay();
}

function performCalculation() {
  if (!operation || previousInput === '') return;
  const prev = parseFloat(previousInput);
  const current = parseFloat(currentInput);
  let result = 0;

  switch (operation) {
    case '+': result = prev + current; break;
    case '-': result = prev - current; break;
    case '*': result = prev * current; break;
    case '/': result = current === 0 ? 'Error' : prev / current; break;
  }

  calculationHistory = `${formatNumberForHistory(previousInput)} ${getOpSymbol(operation)} ${formatNumberForHistory(currentInput)} =`;
  currentInput = result.toString();
}

function formatNumberForHistory(numStr) {
  const num = parseFloat(numStr);
  if (isNaN(num)) return numStr;
  return formatNumber(num);
}

function formatNumber(num) {
  if (num % 1 !== 0) {
    return num.toLocaleString('id-ID', { maximumFractionDigits: 4 });
  }
  return num.toLocaleString('id-ID');
}

function getOpSymbol(op) {
  switch (op) {
    case '/': return '÷';
    case '*': return '×';
    case '-': return '−';
    case '+': return '+';
    default: return op;
  }
}

function formatInputString(str) {
  if (str === '-' || str === 'Error') return str;
  const parts = str.split('.');
  const intPart = parseFloat(parts[0]);
  if (isNaN(intPart)) return str;
  const formattedInt = intPart.toLocaleString('id-ID');
  if (parts.length > 1) {
    return formattedInt + ',' + parts[1];
  }
  return formattedInt;
}

function updateDisplay() {
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');
  if (!display || !history) return;

  display.textContent = formatInputString(currentInput);
  history.textContent = calculationHistory;
}

function handleKeyboard(e) {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
    return;
  }
  let key = e.key;
  if (key === 'Enter') key = '=';
  if (key === 'Escape') {
    closeCalculator();
    return;
  }
  if (key === 'Backspace') key = 'back';
  if (key === 'c' || key === 'C') key = 'C';
  if (key === ',') key = '.';

  const validKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/', '%', '=', 'back', 'C'];
  if (validKeys.includes(key)) {
    e.preventDefault();
    handleButton(key);
  }
}
