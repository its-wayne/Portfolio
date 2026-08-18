/*
  students.js — reveals the resource photocards and drives the hover cursor.

  The Projects page ties its card entrances to the accordion open/close.
  Here the cards live in a flat grid, so we reveal them with an
  IntersectionObserver as they scroll into view, then reuse the same
  "follow cursor" hover label used on the Projects page.
*/

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// #region Card entrances
const cards = [...document.querySelectorAll('.project-card')];

if (prefersReducedMotion) {
  cards.forEach(card => card.classList.add('card-visible'));
} else {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      const i = cards.indexOf(card);
      card.style.transitionDelay = `${Math.max(i, 0) * 90}ms`;
      card.classList.add('card-visible');
      obs.unobserve(card);
    });
  }, { threshold: 0.15 });

  cards.forEach(card => observer.observe(card));
}

// #region Card hover cursor (mirrors projects.js)
const cardCursor = document.querySelector('.card-cursor');

if (cardCursor) {
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let cursorRAF = null;
  const LERP = 0.18;
  const DEFAULT_CTA = 'View';

  function tickCursor() {
    currentX += (targetX - currentX) * LERP;
    currentY += (targetY - currentY) * LERP;
    cardCursor.style.left = `${currentX}px`;
    cardCursor.style.top = `${currentY}px`;

    if (cardCursor.classList.contains('visible')) {
      cursorRAF = requestAnimationFrame(tickCursor);
    } else {
      cursorRAF = null;
    }
  }

  document.querySelectorAll('.project-card').forEach((card) => {
    // Placeholder cards have no link — skip the "View" affordance.
    if (card.classList.contains('project-card--soon')) return;

    card.addEventListener('mouseenter', (e) => {
      cardCursor.textContent = card.dataset.cta || DEFAULT_CTA;
      targetX = currentX = e.clientX;
      targetY = currentY = e.clientY;
      cardCursor.style.left = `${currentX}px`;
      cardCursor.style.top = `${currentY}px`;
      cardCursor.classList.add('visible');
      if (!cursorRAF) cursorRAF = requestAnimationFrame(tickCursor);
    });

    card.addEventListener('mouseleave', () => {
      cardCursor.classList.remove('visible');
    });

    card.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });
  });
}
