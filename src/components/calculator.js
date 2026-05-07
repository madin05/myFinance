import { formatRupiah } from '../store.js';

let isOpen = false;
let currentInput = '0';
let previousInput = '';
let operation = null;
let calculationHistory = '';
let isResultShown = false;

export function openCalculator() {
  if (isOpen) return;
  isOpen = true;

  // Render modal structure
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const modalHtml = `
    <div class="modal-backdrop" id="calc-backdrop" style="display: flex; align-items: center; justify-content: center; z-index: 2000;">
      <div class="modal-card" id="calc-card" style="width: 340px; padding: 1.5rem; border-radius: var(--radius-xl); background: var(--card-bg); box-shadow: var(--shadow-lg); border: 1px solid var(--border);">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
            <i class="ph-fill ph-calculator" style="font-size: 1.5rem;"></i>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-main);">Kalkulator</h3>
          </div>
          <button class="icon-btn" id="btn-close-calc" style="background: var(--border-light); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"><i class="ph ph-x"></i></button>
        </div>

        <!-- Display Screen -->
        <div style="background: var(--bg-color); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem; border: 1px solid var(--border-light); text-align: right; min-height: 80px; display: flex; flex-direction: column; justify-content: space-between; word-break: break-all;">
          <div id="calc-history" style="font-size: 0.8rem; color: var(--text-muted); min-height: 1.2rem; letter-spacing: 0.05em;"></div>
          <div id="calc-display" style="font-size: 1.75rem; font-weight: 700; color: var(--text-main); line-height: 1.1;">0</div>
        </div>

        <!-- Keypad Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;">
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
      </div>
    </div>

    <style>
      .btn-calc {
        height: 48px;
        border: none;
        background: var(--border-light);
        color: var(--text-main);
        font-size: 1.15rem;
        font-weight: 500;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .btn-calc:hover {
        transform: scale(1.05);
        filter: brightness(0.95);
      }
      .btn-calc:active {
        transform: scale(0.95);
      }
      [data-theme="dark"] .btn-calc {
        background: rgba(255, 255, 255, 0.05);
      }
      [data-theme="dark"] .btn-calc:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    </style>
  `;

  modalContainer.innerHTML = modalHtml;

  // Reset calculator states
  currentInput = '0';
  previousInput = '';
  operation = null;
  calculationHistory = '';
  isResultShown = false;
  updateDisplay();

  // Listeners
  document.getElementById('btn-close-calc').onclick = closeCalculator;
  document.getElementById('calc-backdrop').onclick = (e) => {
    if (e.target === document.getElementById('calc-backdrop')) closeCalculator();
  };

  document.querySelectorAll('.btn-calc').forEach(btn => {
    btn.onclick = () => {
      handleButton(btn.getAttribute('data-val'));
    };
  });

  // Keyboard support
  window.addEventListener('keydown', handleKeyboard);
}

export function closeCalculator() {
  isOpen = false;
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.innerHTML = '';
  window.removeEventListener('keydown', handleKeyboard);
}

function handleButton(val) {
  if (!isNaN(val) || val === '.') {
    // Number Input
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
    // Operation (+, -, *, /)
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

function updateDisplay() {
  const display = document.getElementById('calc-display');
  const history = document.getElementById('calc-history');
  if (!display || !history) return;

  // Format main display beautifully with thousand separators
  const num = parseFloat(currentInput);
  if (isNaN(num) || currentInput.endsWith('.')) {
    display.textContent = currentInput;
  } else {
    display.textContent = formatNumber(num);
  }

  history.textContent = calculationHistory;
}

function handleKeyboard(e) {
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
