// src/components/tutorial/tutorialDom.js

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

function preventScrollListener(e) {
  if (e.type === 'keydown' && SCROLL_KEYS.has(e.key)) {
    e.preventDefault();
  } else if (e.type === 'wheel' || e.type === 'touchmove') {
    e.preventDefault();
  }
}

export function lockUserScroll() {
  window.addEventListener('wheel', preventScrollListener, { passive: false });
  window.addEventListener('touchmove', preventScrollListener, { passive: false });
  window.addEventListener('keydown', preventScrollListener, { passive: false });
}

export function unlockUserScroll() {
  window.removeEventListener('wheel', preventScrollListener);
  window.removeEventListener('touchmove', preventScrollListener);
  window.removeEventListener('keydown', preventScrollListener);
}

export function findVisibleTarget(selector) {
  if (!selector) return null;
  const parts = selector.split(',').map(s => s.trim());
  for (const part of parts) {
    const nodes = document.querySelectorAll(part);
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
        return el;
      }
    }
  }
  return null;
}

/**
 * Resolves active target node for a tutorial step.
 */
export function findTutorialTarget(step) {
  if (!step) return null;

  let targetNode = findVisibleTarget(step.target);
  if (!targetNode && step.fallback) {
    targetNode = findVisibleTarget(step.fallback);
  }
  if (!targetNode) {
    targetNode = document.querySelector('.main-content, #page-content');
  }

  return targetNode;
}

export function createTutorialElements() {
  const overlayEl = document.createElement('div');
  overlayEl.className = 'tutorial-overlay-container';
  overlayEl.innerHTML = `
    <svg class="tutorial-svg-bg" width="100%" height="100%">
      <defs>
        <mask id="tutorial-mask-cutout">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect id="tutorial-mask-hole" x="0" y="0" width="0" height="0" rx="14" ry="14" fill="black" />
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(8, 10, 20, 0.82)" mask="url(#tutorial-mask-cutout)" />
    </svg>
  `;
  document.body.appendChild(overlayEl);

  const spotlightEl = document.createElement('div');
  spotlightEl.className = 'tutorial-spotlight';
  document.body.appendChild(spotlightEl);

  const cardEl = document.createElement('div');
  cardEl.className = 'tutorial-card';
  document.body.appendChild(cardEl);

  requestAnimationFrame(() => {
    overlayEl.classList.add('active');
  });

  return { overlayEl, spotlightEl, cardEl };
}

export function cleanupTutorialElements(overlayEl, spotlightEl, cardEl) {
  if (overlayEl?.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  if (spotlightEl?.parentNode) spotlightEl.parentNode.removeChild(spotlightEl);
  if (cardEl?.parentNode) cardEl.parentNode.removeChild(cardEl);
}
