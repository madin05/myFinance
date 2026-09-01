// src/components/tutorial/tutorialPositioning.js

/**
 * Calculates high-precision cutout dimensions and border radii for SVG mask & spotlight halo.
 * Enforces mathematically centered perfect circles for circular target triggers (e.g., FAB, icon buttons).
 */
export function calculateHighlightGeometry(targetNode, rect, padding = 4) {
  if (!targetNode || !rect) return null;

  const computedStyle = window.getComputedStyle(targetNode);
  const rawRadius = computedStyle.borderRadius || '12px';
  const parsedRadius = parseFloat(rawRadius) || 12;

  const isCircle = (rawRadius.includes('50%') && rect.width < 120) || 
                   targetNode.classList.contains('fam-trigger') ||
                   targetNode.classList.contains('bottom-nav-fab-btn') ||
                   targetNode.classList.contains('icon-btn') ||
                   targetNode.id === 'notif-trigger' ||
                   targetNode.closest('#notif-trigger') !== null ||
                   (rect.width < 90 && rect.height < 90 && Math.abs(rect.width - rect.height) < 16 && (parsedRadius >= 18 || rawRadius.includes('50%')));

  const isPill = (rawRadius.includes('100px') || rawRadius.includes('999')) && rect.width > rect.height * 1.4;

  let holeX, holeY, holeW, holeH, rxVal, spotBorderRadius;

  if (isCircle) {
    // For circular elements, force equal width/height & center align to guarantee a perfect circle ring
    const diameter = Math.max(rect.width, rect.height) + (padding * 2);
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);

    holeW = diameter;
    holeH = diameter;
    holeX = centerX - (diameter / 2);
    holeY = centerY - (diameter / 2);
    rxVal = `${diameter / 2}`;
    spotBorderRadius = '50%';
  } else if (isPill) {
    holeX = rect.left - padding;
    holeY = rect.top - padding;
    holeW = rect.width + (padding * 2);
    holeH = rect.height + (padding * 2);
    rxVal = `${holeH / 2}`;
    spotBorderRadius = '100px';
  } else {
    holeX = rect.left - padding;
    holeY = rect.top - padding;
    holeW = rect.width + (padding * 2);
    holeH = rect.height + (padding * 2);
    rxVal = `${Math.min(parsedRadius + padding, 24)}`;
    spotBorderRadius = `${rxVal}px`;
  }

  return { holeX, holeY, holeW, holeH, rxVal, spotBorderRadius };
}

/**
 * Calculates optimal top/left coordinates for tooltip dialog card and arrow placement.
 */
export function calculateCardPosition(targetRect, cardEl) {
  if (!cardEl || !targetRect) return null;

  const isMobile = window.innerWidth <= 768;
  const maxCardW = isMobile ? 310 : 360;
  const cardWidth = Math.min(window.innerWidth - 32, maxCardW);
  const cardHeight = cardEl.offsetHeight || (isMobile ? 160 : 210);
  const margin = isMobile ? 14 : 20;

  let top, left;
  let placement = 'bottom';
  const spaceAbove = targetRect.top;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = window.innerWidth - targetRect.right;

  if (spaceAbove >= cardHeight + margin && (targetRect.top > window.innerHeight * 0.55 || spaceBelow < cardHeight + margin)) {
    top = targetRect.top - cardHeight - margin;
    left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
    placement = 'top';
  } else if (!isMobile && spaceRight >= cardWidth + margin) {
    left = targetRect.right + margin;
    top = targetRect.top;
    placement = 'right';
  } else if (!isMobile && spaceLeft >= cardWidth + margin) {
    left = targetRect.left - cardWidth - margin;
    top = targetRect.top;
    placement = 'left';
  } else {
    top = targetRect.bottom + margin;
    left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
    placement = 'bottom';
  }

  // Constrain to viewport boundaries with 12px margin
  if (left < 12) left = 12;
  if (left + cardWidth > window.innerWidth - 12) left = window.innerWidth - cardWidth - 12;
  if (top < 12) top = 12;
  if (top + cardHeight > window.innerHeight - 12) top = window.innerHeight - cardHeight - 12;

  const targetCenterX = targetRect.left + (targetRect.width / 2);
  const targetCenterY = targetRect.top + (targetRect.height / 2);

  return { top, left, placement, targetCenterX, targetCenterY, cardWidth, cardHeight };
}
