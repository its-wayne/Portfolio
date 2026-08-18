// =============================================================
//  Landing hero — pinned scroll-story
//  Intro → beats (typewriter delete/retype) → drag-drop returns.
//  Beat visuals (emoji orbit, etc.) are layered in later rounds.
// =============================================================

// Where each identity sends you when dropped (final scene).
const pageRedirects = {
    // "Friend" and "Explorer" have no destination yet — they just drop in place.
    "Programmer": "projects.html",
    "Student": "students.html"
};

// The story, in order. `big` is the large headline; `eyebrow` is the small line.
// `line` is typed into the SAME typewriter element as "Hi, I'm".
// `name` (only the intro) shows the big bold headline underneath.
const SCENES = [
    { id: 'intro',    line: "Hi, I'm",                        name: 'Wayne' },
    { id: 'sports',   line: 'I can play\n8 sports!',          weight: 2.8 },
    { id: 'pokemon',  line: 'I love collecting\nPokémon cards!', weight: 2.8 },
    { id: 'teaching', line: 'I love teaching!',               weight: 2.8 },
    { id: 'final',    line: "Hi! I'm a",                    weight: 4 },
];

// Relative scroll length per scene (each beat gets a long hold so it isn't rushed).
const SCENE_WEIGHTS = SCENES.map(s => s.weight || 1);
const SCENE_TOTAL = SCENE_WEIGHTS.reduce((a, b) => a + b, 0);
const SCENE_BOUNDS = (() => {
    let acc = 0;
    return SCENE_WEIGHTS.map(w => { const start = acc / SCENE_TOTAL; acc += w; return [start, acc / SCENE_TOTAL]; });
})();

const TYPE_SPEED = 40;   // ms per character typed (beats)
const ERASE_SPEED = 22;  // ms per character erased (beats)

// Intro typewriter — slow, mirrors the reference repo's "Hi, I'm".
const INTRO_TYPE_SPEED = 100;                       // ms per character
const INTRO_WORD_DELAY = Math.random() * 50 + 150;  // extra pause after a space (150–200ms)

// === DOM refs ===
let heroEl, bigEl, eyebrowEl, avatarEl, dropZoneEl, categorySelectEl, placeholderEl, scrollHintEl, pokemonCardsEl, teachingCardsEl;
let draggableItems = null;
let initialOrder = [];

// === State ===
let currentScene = -1;
let typeToken = 0;      // cancels in-flight typewriter when the scene changes
let introDone = false;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

// --- Sports-beat emoji orbit ---
const SPORT_EMOJIS = ['🏃', '🚣', '🏀', '🏐', '🏊', '🏸', '🏈', '🚴'];
const ORBIT_TURNS = 0.65;   // clockwise turns across the sports beat (lower = slower spin)
let emojiFieldEl = null;
let emojiEls = [];

function buildEmojis() {
    emojiFieldEl = document.querySelector('.emoji-field');
    if (!emojiFieldEl) return;
    SPORT_EMOJIS.forEach((e, i) => {
        const el = document.createElement('div');
        el.className = 'emoji';
        const inner = document.createElement('span');
        inner.className = 'emoji-inner';
        inner.textContent = e;
        inner.style.animationDelay = (i * 0.22) + 's';  // stagger the hover float
        el.appendChild(inner);
        emojiFieldEl.appendChild(el);
        emojiEls.push(el);
    });
}

// sp = sub-progress (0→1) within the sports beat, or null to hide.
function updateEmojis(sp) {
    if (!emojiFieldEl || prefersReducedMotion) return;
    if (sp === null) { emojiFieldEl.style.opacity = '0'; return; }
    emojiFieldEl.style.opacity = '1';
    const R = Math.min(window.innerWidth * 0.34, window.innerHeight * 0.36, 360);
    const expand = smooth(clamp(sp / 0.18, 0, 1));          // shoot out
    const collapse = smooth(clamp((sp - 0.82) / 0.18, 0, 1)); // collapse back
    const rf = expand * (1 - collapse);                     // radius factor 0→1→0
    const radius = rf * R;
    const turn = sp * ORBIT_TURNS * Math.PI * 2;            // clockwise progression
    emojiEls.forEach((el, i) => {
        const a = turn + (i / emojiEls.length) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        el.style.transform =
            `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.6 + 0.4 * rf).toFixed(2)})`;
        el.style.opacity = rf.toFixed(2);
    });
}

// ---- Typewriter helpers (token-guarded so a scene change cancels them) ----
async function typeInto(el, text, token) {
    el.textContent = '';
    for (const ch of text) {
        if (token !== typeToken) return;
        el.textContent += ch;
        await sleep(TYPE_SPEED);
    }
}

async function eraseFrom(el, token) {
    while (el.textContent.length) {
        if (token !== typeToken) return;
        el.textContent = el.textContent.slice(0, -1);
        await sleep(ERASE_SPEED);
    }
}

// Slow intro typewriter (reference cadence): brief pause after each space.
async function typeIntroLine(el, text, token) {
    el.textContent = '';
    for (const ch of text) {
        if (token !== typeToken) return;
        el.textContent += ch;
        let delay = INTRO_TYPE_SPEED;
        if (ch === ' ') delay += INTRO_WORD_DELAY;
        await sleep(delay);
    }
}

// ---- Scene transition ----
async function goToScene(i) {
    if (i === currentScene) return;
    currentScene = i;
    const scene = SCENES[i];
    const token = ++typeToken;

    const isIntro = scene.id === 'intro';
    const isFinal = scene.id === 'final';

    // Per-scene chrome (toggle immediately so it feels responsive to scroll)
    avatarEl.classList.toggle('avatar-in', isIntro || isFinal);
    scrollHintEl.classList.toggle('visible', isIntro);
    categorySelectEl.classList.toggle('visible', isFinal);
    dropZoneEl.classList.toggle('scrolled', isFinal);
    eyebrowEl.classList.toggle('multiline', scene.line.includes('\n'));
    if (pokemonCardsEl) pokemonCardsEl.classList.toggle('in', scene.id === 'pokemon');
    if (teachingCardsEl) teachingCardsEl.classList.toggle('in', scene.id === 'teaching');

    // Big bold headline only shows the name on the intro.
    bigEl.textContent = scene.name || '';
    bigEl.style.opacity = scene.name ? '1' : '0';

    // Final scene ("Hi! I'm a" + drop zone): no typewriter — set the line
    // instantly, matching how the reference repo reveals the drag-drop.
    if (isFinal) {
        typeToken++;                       // cancel any in-flight typing
        eyebrowEl.textContent = scene.line;
        return;
    }

    // The 3 beats keep the typewriter (erase the old line, type the new one).
    if (prefersReducedMotion) {
        typeToken++;
        eyebrowEl.textContent = scene.line;
        return;
    }
    await eraseFrom(eyebrowEl, token);
    if (token !== typeToken) return;
    await typeInto(eyebrowEl, scene.line, token);
}

// ---- Map scroll position within #hero to a scene index ----
function onScroll() {
    if (!introDone || !heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    const total = heroEl.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const p = scrolled / total;                       // 0 → 1 through the track

    // Which scene are we in (weighted lengths)?
    let idx = 0;
    for (let i = SCENES.length - 1; i >= 0; i--) {
        if (p >= SCENE_BOUNDS[i][0]) { idx = i; break; }
    }
    goToScene(idx);

    // Name ("Wayne") slides up and fades as you scroll off the top — like Dylan's.
    // Scroll-linked (no transition) so it tracks the wheel directly.
    if (bigEl) {
        const f = clamp(scrolled / 220, 0, 1);
        bigEl.style.transition = 'none';
        bigEl.style.transform = `translateY(${(-90 * f).toFixed(1)}px)`;
        bigEl.style.opacity = (1 - f).toFixed(3);
    }

    // Drive the sports emoji orbit with sub-progress inside the sports beat.
    const sportsIdx = SCENES.findIndex(s => s.id === 'sports');
    if (idx === sportsIdx) {
        const [a, b] = SCENE_BOUNDS[sportsIdx];
        updateEmojis(clamp((p - a) / (b - a), 0, 1));
    } else {
        updateEmojis(null);
    }
}

// ---- Opening animation (mirrors the reference repo) ----
// "Hi, I'm" types out slowly; then the name and the waving avatar both
// fade in and slide up; finally the scroll hint fades in and scroll unlocks.
function setIntroInitialState() {
    bigEl.textContent = 'Wayne';
    bigEl.style.opacity = '0';
    bigEl.style.transform = 'translateY(200px)';   // start below, slides up
    scrollHintEl.classList.remove('visible');
}

async function runIntro() {
    window.scrollTo(0, 0);
    document.body.classList.add('no-scroll');
    setIntroInitialState();

    // Reduced motion: show everything immediately, no typing or sliding.
    if (prefersReducedMotion) {
        eyebrowEl.textContent = "Hi, I'm";
        bigEl.style.transform = 'translateY(0)';
        bigEl.style.opacity = '1';
        avatarEl.classList.add('avatar-in');
        scrollHintEl.classList.add('visible');
        document.body.classList.remove('no-scroll');
        currentScene = 0;
        introDone = true;
        return;
    }

    const token = ++typeToken;

    // Brief hold, then type the eyebrow line slowly.
    await sleep(250);
    if (token !== typeToken) return;
    await typeIntroLine(eyebrowEl, "Hi, I'm", token);
    if (token !== typeToken) return;

    // Then bring in the name + avatar (fade + slide up), after a short beat.
    await sleep(250);
    if (token !== typeToken) return;

    bigEl.style.transition = 'transform 0.7s cubic-bezier(0.2, 1.2, 0.6, 1), opacity 0.5s';
    bigEl.style.transform = 'translateY(0)';
    bigEl.style.opacity = '1';

    avatarEl.classList.add('avatar-in');   // avatar fades + slides up (CSS)

    // Once the name has slid into place, unlock scroll and reveal the hint.
    bigEl.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'transform') return;
        document.body.classList.remove('no-scroll');
        scrollHintEl.classList.add('visible');
        currentScene = 0;
        introDone = true;
        bigEl.removeEventListener('transitionend', handler);
    });
}

// =============== Drag & Drop (final scene) ===============
const vowelRegex = /^[aeiouAEIOU]$/;

function updateEyebrowArticle(text) {
    const article = vowelRegex.test((text || '').charAt(0)) ? "Hi! I'm an" : "Hi! I'm a";
    eyebrowEl.textContent = article;
}

function handleDragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.id);
    const occupied = dropZoneEl.querySelector('.draggable-item');
    if (!occupied && placeholderEl) {
        placeholderEl.textContent = event.target.id;
        updateEyebrowArticle(event.target.id);
        event.currentTarget.style.opacity = '0';
    }
}

function handleDragEnd(event) {
    if (placeholderEl) placeholderEl.textContent = '';
    event.currentTarget.style.opacity = '1';
}

function handleDragOver(event) {
    event.preventDefault();
    if (placeholderEl) updateEyebrowArticle(placeholderEl.textContent);
}

function handleDrop(event) {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    const dragged = document.getElementById(draggedId);
    const zone = event.currentTarget;

    const existing = zone.querySelector('.draggable-item');
    if (existing) handleReturnDrop({ preventDefault() {}, currentTarget: categorySelectEl, dataTransfer: { getData: () => existing.id } });

    zone.appendChild(dragged);
    updateEyebrowArticle(dragged.id);

    const redirectUrl = pageRedirects[draggedId];
    if (redirectUrl) {
        document.body.classList.add('fade-out');
        setTimeout(() => { window.location.href = redirectUrl; }, 500);
    }
}

function handleReturnDrop(event) {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    const dragged = document.getElementById(draggedId);
    const zone = event.currentTarget;
    if (!dragged) return;

    const droppedIndex = initialOrder.indexOf(dragged.id);
    let nextSibling = null;
    for (let i = droppedIndex + 1; i < initialOrder.length; i++) {
        const sib = zone.querySelector('#' + initialOrder[i]);
        if (sib) { nextSibling = sib; break; }
    }
    if (nextSibling) zone.insertBefore(dragged, nextSibling);
    else zone.appendChild(dragged);

    if (!dropZoneEl.querySelector('.draggable-item')) eyebrowEl.textContent = "Hi! I'm a";
}

// =============== Init ===============
window.addEventListener('DOMContentLoaded', () => {
    heroEl = document.getElementById('hero');
    bigEl = document.getElementById('scroll-title');
    eyebrowEl = document.querySelector('.typewriter-animation');
    avatarEl = document.querySelector('.bottom-gif');
    dropZoneEl = document.getElementById('category-drop-zone');
    categorySelectEl = document.querySelector('.categorySelect');
    placeholderEl = document.querySelector('.placeholder-text');
    scrollHintEl = document.querySelector('.scroll-down-text');
    pokemonCardsEl = document.querySelector('.pokemon-cards');
    teachingCardsEl = document.querySelector('.teaching-cards');
    draggableItems = document.querySelectorAll('.draggable-item');
    buildEmojis();

    // Drag & drop wiring
    if (dropZoneEl) {
        dropZoneEl.addEventListener('dragover', handleDragOver);
        dropZoneEl.addEventListener('drop', handleDrop);
    }
    if (categorySelectEl) {
        draggableItems.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
            initialOrder.push(item.id);
        });
        categorySelectEl.addEventListener('dragover', handleDragOver);
        categorySelectEl.addEventListener('drop', handleReturnDrop);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    runIntro();
});
