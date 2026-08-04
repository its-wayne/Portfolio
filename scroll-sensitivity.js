// Global scroll sensitivity control.
// Intercepts mouse-wheel / trackpad wheel events and scales the scroll distance
// down so the whole site feels less "twitchy". A light smoothing pass keeps it
// from feeling stepped. Touch scrolling is left untouched.

(function () {
    // 1 = browser default. Lower = less sensitive.
    // 0.6 ≈ 40% reduction in scroll distance per wheel tick.
    const SENSITIVITY = 0.6;

    const prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let targetY = window.scrollY;
    let animating = false;

    // Other scripts lock the page while running their own scroll-driven
    // animations (about.js pins with position:fixed, the hero uses .no-scroll).
    // When that happens we get out of the way completely.
    function isLocked() {
        const b = document.body;
        return b.style.position === 'fixed' || b.classList.contains('no-scroll');
    }

    function maxScroll() {
        return document.documentElement.scrollHeight - window.innerHeight;
    }

    function animate() {
        const current = window.scrollY;
        const diff = targetY - current;
        if (isLocked() || Math.abs(diff) < 0.5) {
            animating = false;
            return;
        }
        // Ease toward the target so scaled scrolling still feels smooth.
        window.scrollTo(0, current + diff * 0.22);
        requestAnimationFrame(animate);
    }

    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) return;          // pinch-to-zoom — leave alone
        if (e.defaultPrevented) return; // another handler already owns this event
        if (isLocked()) return;

        // Normalize line/page delta modes (e.g. Firefox mouse wheel) to pixels.
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= window.innerHeight;

        e.preventDefault();

        if (prefersReducedMotion) {
            window.scrollBy(0, dy * SENSITIVITY);
            return;
        }

        // Resync to the real position before extending the target so it never
        // drifts away from where the page actually is.
        if (!animating) targetY = window.scrollY;
        targetY = Math.max(0, Math.min(maxScroll(), targetY + dy * SENSITIVITY));

        if (!animating) {
            animating = true;
            requestAnimationFrame(animate);
        }
    }, { passive: false });

    // Keep the target in sync when the page is scrolled by other means
    // (keyboard, anchor jumps, programmatic scrolls, resizes).
    window.addEventListener('scroll', () => {
        if (!animating) targetY = window.scrollY;
    }, { passive: true });
})();
