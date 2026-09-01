// src/components/tutorial.js
import { store } from '../store.js';
import { navigateTo } from '../router.js';
import { TUTORIAL_STORAGE_KEY, TUTORIAL_TIMING, TUTORIAL_STEPS } from './tutorial/tutorialSteps.js';
import { calculateHighlightGeometry, calculateCardPosition } from './tutorial/tutorialPositioning.js';
import {
  lockUserScroll,
  unlockUserScroll,
  findTutorialTarget,
  createTutorialElements,
  cleanupTutorialElements
} from './tutorial/tutorialDom.js';

export { TUTORIAL_TIMING };

let currentStepIndex = 0;
let overlayEl = null;
let spotlightEl = null;
let cardEl = null;
let keydownHandler = null;
let activeTargetNode = null;
let rafPositionId = null;
let storeUpdateHandler = null;
let isStepTransitioning = false;

import { auth } from '../firebase-config.js';

export async function startProductTutorial(force = false) {
  const userId = store.user?.uid || auth.currentUser?.uid;
  if (!userId && !force) return;

  const key = `${TUTORIAL_STORAGE_KEY}_${userId || 'guest'}`;

  if (!force) {
    // 1. Check if already completed in localStorage for this user
    if (localStorage.getItem(key)) return;

    // 2. Tutorial is strictly for BRAND NEW registered users.
    // If user has existing financial data or is not explicitly a new registration, skip tutorial.
    const hasExistingData = Boolean(
      (store.transactions && store.transactions.length > 0) ||
      (store.saldos && store.saldos.length > 0) ||
      (store.wishlists && store.wishlists.length > 0) ||
      (store.budgets && store.budgets.length > 0)
    );

    if (hasExistingData || !store.user?.isNewUser) {
      localStorage.setItem(key, 'true');
      return;
    }
  }

  // Jump to dashboard if tutorial is triggered from another view (e.g., FAQ / Sidebar)
  const currentPath = window.location.pathname || '/dashboard';
  if (currentPath !== '/dashboard' && currentPath !== '/') {
    navigateTo('/dashboard');
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  currentStepIndex = 0;
  isStepTransitioning = false;
  createTutorialDOM();
  showStep(0);

  keydownHandler = (e) => {
    if (e.key === 'Escape') endTutorial(true);
    else if (e.key === 'ArrowRight') nextStep();
    else if (e.key === 'ArrowLeft') prevStep();
  };
  window.addEventListener('keydown', keydownHandler);
}

function createTutorialDOM() {
  cleanupTutorialDOM();

  document.body.classList.add('tutorial-active');
  document.documentElement.classList.add('tutorial-active');
  lockUserScroll();

  window.addEventListener('resize', updateHighlightPosition, { passive: true });
  window.addEventListener('scroll', updateHighlightPosition, { passive: true });

  storeUpdateHandler = () => {
    if (document.body.classList.contains('tutorial-active')) {
      setTimeout(() => {
        if (document.body.classList.contains('tutorial-active')) {
          renderStepHighlight(currentStepIndex);
        }
      }, 60);
    }
  };
  window.addEventListener('store-updated', storeUpdateHandler);

  const els = createTutorialElements();
  overlayEl = els.overlayEl;
  spotlightEl = els.spotlightEl;
  cardEl = els.cardEl;
}

function restoreActiveTarget() {
  if (activeTargetNode) {
    activeTargetNode.classList.remove('tutorial-target-active');
    activeTargetNode = null;
  }
  if (rafPositionId) {
    cancelAnimationFrame(rafPositionId);
    rafPositionId = null;
  }
}

function showStep(index) {
  if (index < 0 || index >= TUTORIAL_STEPS.length) {
    endTutorial(false);
    return;
  }

  isStepTransitioning = true;
  restoreActiveTarget();
  currentStepIndex = index;
  const step = TUTORIAL_STEPS[index];

  const finishTransition = () => {
    isStepTransitioning = false;
  };

  if (step.route && window.location.pathname !== step.route) {
    navigateTo(step.route);
    setTimeout(() => {
      renderStepHighlight(index);
      finishTransition();
    }, TUTORIAL_TIMING.ROUTE_CHANGE_DELAY);
    return;
  }

  renderStepHighlight(index);
  setTimeout(finishTransition, 80);
}

function updateHighlightPosition() {
  if (!overlayEl || !spotlightEl) return;

  const step = TUTORIAL_STEPS[currentStepIndex];
  if (!step) return;

  // Re-query target node if activeTargetNode is missing or detached from DOM
  if (!activeTargetNode || !activeTargetNode.isConnected) {
    const targetNode = findTutorialTarget(step);
    if (targetNode) {
      if (activeTargetNode) activeTargetNode.classList.remove('tutorial-target-active');
      activeTargetNode = targetNode;
      activeTargetNode.classList.add('tutorial-target-active');
    } else {
      return;
    }
  }

  const rect = activeTargetNode.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const geo = calculateHighlightGeometry(activeTargetNode, rect);
  if (!geo) return;

  const { holeX, holeY, holeW, holeH, rxVal, spotBorderRadius } = geo;

  const maskHole = document.getElementById('tutorial-mask-hole');
  if (maskHole) {
    maskHole.setAttribute('x', holeX);
    maskHole.setAttribute('y', holeY);
    maskHole.setAttribute('width', holeW);
    maskHole.setAttribute('height', holeH);
    maskHole.setAttribute('rx', rxVal);
    maskHole.setAttribute('ry', rxVal);
  }

  spotlightEl.style.top = `${holeY}px`;
  spotlightEl.style.left = `${holeX}px`;
  spotlightEl.style.width = `${holeW}px`;
  spotlightEl.style.height = `${holeH}px`;
  spotlightEl.style.borderRadius = spotBorderRadius;

  if (cardEl && cardEl.classList.contains('active')) {
    positionCard(rect);
  }
}

function renderStepHighlight(index) {
  const step = TUTORIAL_STEPS[index];
  if (!step) return;

  const targetNode = findTutorialTarget(step);

  if (!targetNode) {
    if (index < TUTORIAL_STEPS.length - 1) showStep(index + 1);
    else endTutorial(false);
    return;
  }

  activeTargetNode = targetNode;
  targetNode.classList.add('tutorial-target-active');

  // Scroll target node into view only if not already sufficiently visible in viewport
  const rectBefore = targetNode.getBoundingClientRect();
  const vHeight = window.innerHeight || document.documentElement.clientHeight;
  const vWidth = window.innerWidth || document.documentElement.clientWidth;
  const isTargetVisible = (
    rectBefore.top >= 40 &&
    rectBefore.bottom <= vHeight - 40 &&
    rectBefore.left >= 0 &&
    rectBefore.right <= vWidth
  );

  if (!isTargetVisible) {
    targetNode.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }

  // Use requestAnimationFrame to ensure scroll and layout settled before measuring BoundingClientRect
  requestAnimationFrame(() => {
    if (!activeTargetNode || !activeTargetNode.isConnected) return;

    // Additional scroll check for horizontally swipable parent container (e.g. .stats-cards on mobile)
    const scrollParent = activeTargetNode.closest('.stats-cards');
    if (scrollParent) {
      const cardRect = activeTargetNode.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      if (cardRect.left < parentRect.left || cardRect.right > parentRect.right) {
        scrollParent.scrollLeft += (cardRect.left + cardRect.width / 2) - (parentRect.left + parentRect.width / 2);
      }
    }

    const rect = activeTargetNode.getBoundingClientRect();
    renderTooltipCard(index, rect);
    updateHighlightPosition();

    const startTime = performance.now();
    function syncLoop(now) {
      updateHighlightPosition();
      if (now - startTime < TUTORIAL_TIMING.SYNC_FRAME_DURATION) {
        rafPositionId = requestAnimationFrame(syncLoop);
      } else {
        rafPositionId = null;
      }
    }
    rafPositionId = requestAnimationFrame(syncLoop);
  });
}

function renderTooltipCard(index, targetRect) {
  const step = TUTORIAL_STEPS[index];
  const totalSteps = TUTORIAL_STEPS.length;
  const isLast = index === totalSteps - 1;
  const progressPercent = Math.round(((index + 1) / totalSteps) * 100);

  const dotsOrBarHTML = totalSteps <= 8 ? `
    <div class="tutorial-dots">
      ${TUTORIAL_STEPS.map((_, i) => `<div class="tutorial-dot ${i === index ? 'active' : ''}"></div>`).join('')}
    </div>
  ` : `
    <div class="tutorial-progress-wrapper" title="Langkah ${index + 1} dari ${totalSteps} (${progressPercent}%)">
      <div class="tutorial-progress-fill" style="width: ${progressPercent}%;"></div>
    </div>
  `;

  cardEl.innerHTML = `
    <div class="tutorial-header">
      <span class="tutorial-step-badge">Langkah ${index + 1} dari ${totalSteps}</span>
      <button class="tutorial-skip-link" id="tut-btn-skip">Lewati</button>
    </div>
    
    <h3 class="tutorial-title">${step.title}</h3>
    <p class="tutorial-desc">${step.desc}</p>

    <div class="tutorial-footer">
      ${dotsOrBarHTML}
      <div class="tutorial-actions">
        <button class="tutorial-btn tutorial-btn-prev" id="tut-btn-prev" ${index === 0 ? 'disabled' : ''}>
          <i class="ph ph-caret-left"></i> Kembali
        </button>
        <button class="tutorial-btn tutorial-btn-next" id="tut-btn-next">
          ${isLast ? 'Selesai' : 'Lanjut <i class="ph ph-caret-right"></i>'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('tut-btn-skip')?.addEventListener('click', () => endTutorial(true));
  document.getElementById('tut-btn-prev')?.addEventListener('click', prevStep);
  document.getElementById('tut-btn-next')?.addEventListener('click', nextStep);

  cardEl.classList.add('active');

  // Position card after browser microtask so offsetHeight is accurate
  requestAnimationFrame(() => {
    if (activeTargetNode && activeTargetNode.isConnected) {
      positionCard(activeTargetNode.getBoundingClientRect());
    } else {
      positionCard(targetRect);
    }
  });
}

function positionCard(targetRect) {
  if (!cardEl || !targetRect) return;

  const pos = calculateCardPosition(targetRect, cardEl);
  if (!pos) return;

  cardEl.style.top = `${pos.top}px`;
  cardEl.style.left = `${pos.left}px`;

  // Dynamic Chat Bubble Arrow positioning pointing at target center
  let arrowEl = document.getElementById('tutorial-card-arrow');
  if (!arrowEl) {
    arrowEl = document.createElement('div');
    arrowEl.id = 'tutorial-card-arrow';
    cardEl.appendChild(arrowEl);
  }

  arrowEl.className = 'tutorial-card-arrow';
  arrowEl.style.left = '';
  arrowEl.style.right = '';
  arrowEl.style.top = '';
  arrowEl.style.bottom = '';

  const { placement, targetCenterX, targetCenterY, left, top, cardWidth, cardHeight } = pos;

  if (placement === 'top') {
    arrowEl.classList.add('arrow-bottom');
    let arrowLeft = targetCenterX - left - 7;
    arrowLeft = Math.max(20, Math.min(cardWidth - 34, arrowLeft));
    arrowEl.style.left = `${arrowLeft}px`;
  } else if (placement === 'bottom') {
    arrowEl.classList.add('arrow-top');
    let arrowLeft = targetCenterX - left - 7;
    arrowLeft = Math.max(20, Math.min(cardWidth - 34, arrowLeft));
    arrowEl.style.left = `${arrowLeft}px`;
  } else if (placement === 'right') {
    arrowEl.classList.add('arrow-left');
    let arrowTop = targetCenterY - top - 7;
    arrowTop = Math.max(16, Math.min(cardHeight - 30, arrowTop));
    arrowEl.style.top = `${arrowTop}px`;
  } else if (placement === 'left') {
    arrowEl.classList.add('arrow-right');
    let arrowTop = targetCenterY - top - 7;
    arrowTop = Math.max(16, Math.min(cardHeight - 30, arrowTop));
    arrowEl.style.top = `${arrowTop}px`;
  }
}

function nextStep() {
  if (isStepTransitioning) return;
  showStep(currentStepIndex + 1);
}

function prevStep() {
  if (isStepTransitioning) return;
  showStep(currentStepIndex - 1);
}

function endTutorial(isSkip = false) {
  const userId = store.user?.uid || auth.currentUser?.uid || 'guest';
  const key = `${TUTORIAL_STORAGE_KEY}_${userId}`;
  localStorage.setItem(key, 'true');

  if (store.user && store.user.isNewUser) {
    store.user.isNewUser = false;
    store.save();
  }

  restoreActiveTarget();
  unlockUserScroll();

  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }

  cardEl?.classList.remove('active');
  overlayEl?.classList.remove('active');

  if (window.location.pathname !== '/dashboard') {
    navigateTo('/dashboard');
  }

  setTimeout(() => { cleanupTutorialDOM(); }, TUTORIAL_TIMING.EXIT_CLEANUP_DELAY);
}

function cleanupTutorialDOM() {
  document.body.classList.remove('tutorial-active');
  document.documentElement.classList.remove('tutorial-active');
  unlockUserScroll();
  window.removeEventListener('resize', updateHighlightPosition);
  window.removeEventListener('scroll', updateHighlightPosition);

  if (storeUpdateHandler) {
    window.removeEventListener('store-updated', storeUpdateHandler);
    storeUpdateHandler = null;
  }

  cleanupTutorialElements(overlayEl, spotlightEl, cardEl);
  overlayEl = null;
  spotlightEl = null;
  cardEl = null;
}
