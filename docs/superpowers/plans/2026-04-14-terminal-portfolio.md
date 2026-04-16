# Terminal Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page portfolio website styled as a full terminal simulation with matrix rain, typing animations, glitch effects, and scroll-triggered reveals — pure HTML/CSS/JS, no frameworks.

**Architecture:** Single `index.html` loads one CSS file and four focused JS modules. A full-viewport canvas renders the matrix rain background. All content sections live inside a terminal window wrapper. IntersectionObserver drives scroll-triggered animations, and requestAnimationFrame powers the canvas and typing effects.

**Tech Stack:** HTML5, CSS3 (custom properties, keyframes, pseudo-elements), vanilla JavaScript (Canvas API, IntersectionObserver, requestAnimationFrame)

---

## File Structure

```
portfolio/
├── index.html          # Single page — all sections, semantic markup
├── css/
│   └── style.css       # All styles: layout, theme, animations, responsive
├── js/
│   ├── matrix.js       # Canvas matrix rain effect
│   ├── typing.js       # Typing animation engine (reusable)
│   ├── scroll.js       # IntersectionObserver scroll triggers + nav tracking
│   └── effects.js      # Glitch, flicker, scanlines, hover enhancements
├── assets/
│   └── Pradeep_Sr_Engineer_Resume.pdf
```

- `index.html` — all HTML structure, section content, script/link tags
- `style.css` — CSS variables (color palette), base reset, terminal chrome, section layouts, keyframe animations, hover states, media queries for mobile
- `matrix.js` — owns the `<canvas>`, draws falling characters, responds to scroll speed, self-disables on mobile
- `typing.js` — exports a `typeText(element, text, speed)` function returning a Promise; used by hero on load and by scroll.js for section headers
- `scroll.js` — sets up IntersectionObserver for all sections, triggers typing + reveal animations, tracks active nav link
- `effects.js` — glitch effect on name, CRT scanline overlay, random screen flicker, hover glow enhancements

---

### Task 1: Project scaffolding and CSS foundation

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p css js assets
```

- [ ] **Step 2: Create `index.html` with full HTML structure**

Create `index.html` with all sections stubbed out. Every section includes its content — no placeholders. The HTML is the complete page; only animations/interactivity come later via JS.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pradeep Prakash — Backend Engineer</title>
  <meta name="description" content="Backend engineer with 7+ years building fault-tolerant data pipelines, event-driven services, and multi-tenant platforms.">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Matrix rain canvas (behind everything) -->
  <canvas id="matrix-canvas"></canvas>

  <!-- CRT scanline overlay -->
  <div class="scanlines"></div>

  <!-- Navigation -->
  <nav class="nav" id="nav">
    <div class="nav-logo"><span class="prompt-symbol">❯</span> <span class="nav-logo-text">pp</span><span class="nav-logo-dim">.dev</span></div>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-links" id="nav-links">
      <a href="#about" class="nav-link active">./about</a>
      <a href="#experience" class="nav-link">./experience</a>
      <a href="#skills" class="nav-link">./skills</a>
      <a href="#contact" class="nav-link">./contact</a>
    </div>
  </nav>

  <!-- Terminal window wrapper -->
  <div class="terminal">
    <!-- Title bar -->
    <div class="terminal-titlebar">
      <div class="terminal-dots">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <span class="terminal-title">pradeep@portfolio ~ </span>
    </div>

    <!-- Terminal body (all sections) -->
    <div class="terminal-body">

      <!-- HERO -->
      <section class="section hero" id="hero">
        <div class="terminal-line faded">Last login: Mon Apr 14 09:32:01 on ttys001</div>
        <div class="prompt-line">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="typed-command" data-text="whoami"></span>
        </div>
        <div class="hero-name">
          <span class="glitch" data-text="Pradeep Prakash">> Pradeep Prakash</span>
        </div>
        <div class="hero-subtitle">Backend Engineer · Distributed Systems · 7+ Years</div>
        <div class="prompt-line">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="typed-command" data-text="cat mission.txt"></span>
        </div>
        <div class="hero-mission">
          Building fault-tolerant data pipelines, event-driven<br>
          services, and multi-tenant platforms at scale.
        </div>
        <div class="prompt-line">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="cursor">▋</span>
        </div>
      </section>

      <!-- ABOUT -->
      <section class="section" id="about">
        <div class="prompt-line section-trigger">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="typed-command" data-text="cat about.json"></span>
        </div>
        <div class="section-content about-json">
          <pre class="json-block"><span class="json-bracket">{</span>
  <span class="json-key">"name"</span>: <span class="json-string">"Pradeep Prakash"</span>,
  <span class="json-key">"role"</span>: <span class="json-string">"Software Engineer III"</span>,
  <span class="json-key">"company"</span>: <span class="json-string">"Fynd (Reliance Retail)"</span>,
  <span class="json-key">"location"</span>: <span class="json-string">"Bengaluru, India"</span>,
  <span class="json-key">"experience"</span>: <span class="json-string">"7+ years"</span>,
  <span class="json-key">"focus"</span>: [
    <span class="json-string">"fault-tolerant data pipelines"</span>,
    <span class="json-string">"event-driven services"</span>,
    <span class="json-string">"multi-tenant platforms"</span>
  ],
  <span class="json-key">"status"</span>: <span class="json-status">"open_to_opportunities"</span>
<span class="json-bracket">}</span></pre>
        </div>
      </section>

      <!-- EXPERIENCE -->
      <section class="section" id="experience">
        <div class="prompt-line section-trigger">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="typed-command" data-text="history --verbose"></span>
        </div>
        <div class="section-content experience-timeline">
          <!-- Fynd -->
          <div class="exp-card exp-card-current">
            <div class="exp-dot"></div>
            <div class="exp-header">
              <div class="exp-title-row">
                <span class="exp-role">Software Engineer III</span>
                <span class="exp-company">@ Fynd (Reliance Retail)</span>
              </div>
              <span class="exp-date">Sep 2022 → Present</span>
            </div>
            <div class="exp-tags">
              <span class="tag">Node.js</span>
              <span class="tag">TypeScript</span>
              <span class="tag">MongoDB</span>
              <span class="tag">Redis</span>
              <span class="tag">Kafka</span>
              <span class="tag">RabbitMQ</span>
              <span class="tag">Kubernetes</span>
              <span class="tag">GCP</span>
            </div>
            <div class="exp-bullets">
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Architected 6-stage fault-tolerant ingestion pipeline — 200–500 rec/s at p99 200–400ms, 1M+ records migrated with zero duplication</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Cut peak pod memory ~80% (1.5 GB → 300 MB) via cursor-based streaming and adaptive chunk sizing</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Designed worker orchestration — token-bucket concurrency, back-pressure, priority queuing for 5–10 concurrent migrations</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Tech-led Fynd Migrate (Shopify → Fynd) across 3–5 engineers; serves 50+ merchants, removed ~70% operational effort</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Owned Fynd Coupons 0 → 97K MAU; 200–500 req/s at p99 150–300ms, 99.9% availability</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Reduced production incidents by 40% via circuit breakers, health-signal probes, bounded error propagation</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Established design-doc and code-review standards; mentored 3–6 engineers on distributed-systems fundamentals</div>
              <div class="exp-bullet exp-award"><span class="bullet-arrow">★</span> Fynd Star 2023, 2024, 2025, 2026</div>
            </div>
          </div>
          <!-- Byju's -->
          <div class="exp-card exp-card-past">
            <div class="exp-header">
              <div class="exp-title-row">
                <span class="exp-role">Senior Software Engineer</span>
                <span class="exp-company">@ Byju's</span>
              </div>
              <span class="exp-date">Jul 2021 → Aug 2022</span>
            </div>
            <div class="exp-tags">
              <span class="tag tag-dim">Node.js</span>
              <span class="tag tag-dim">PostgreSQL</span>
              <span class="tag tag-dim">Redis</span>
              <span class="tag tag-dim">Microservices</span>
            </div>
            <div class="exp-bullets">
              <div class="exp-bullet"><span class="bullet-arrow dim">→</span> Designed Teacher Tech — onboarding, scheduling, payroll for 10,000+ tutors; payroll 3–4 days → 1 day</div>
              <div class="exp-bullet"><span class="bullet-arrow dim">→</span> Built Tutor CMS — dozens of eng-tickets/month → near-zero manual dependency</div>
            </div>
          </div>
          <!-- Earlier roles -->
          <div class="exp-card exp-card-early">
            <div class="exp-early-line">Software Engineer <span class="exp-company-dim">@ Acube Tech</span> <span class="exp-date-dim">May 2020 – Jun 2021</span></div>
            <div class="exp-early-line">Product Engineer <span class="exp-company-dim">@ Codingmart</span> <span class="exp-date-dim">Oct 2018 – May 2020</span></div>
          </div>
        </div>
      </section>

      <!-- SKILLS -->
      <section class="section" id="skills">
        <div class="prompt-line section-trigger">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="typed-command" data-text="top -systems"></span>
        </div>
        <div class="section-content skills-monitor">
          <div class="skills-header">SYSTEM PROFICIENCY MONITOR — updated in real-time</div>
          <div class="skills-grid">
            <div class="skill-category">
              <div class="skill-category-label">▸ LANGUAGES</div>
              <div class="skill-bar" data-skill="Node.js" data-level="90"></div>
              <div class="skill-bar" data-skill="TypeScript" data-level="85"></div>
              <div class="skill-bar" data-skill="SQL" data-level="75"></div>
            </div>
            <div class="skill-category">
              <div class="skill-category-label">▸ DATA & INFRA</div>
              <div class="skill-bar" data-skill="MongoDB" data-level="90"></div>
              <div class="skill-bar" data-skill="PostgreSQL" data-level="80"></div>
              <div class="skill-bar" data-skill="Redis" data-level="85"></div>
            </div>
            <div class="skill-category">
              <div class="skill-category-label">▸ STREAMING</div>
              <div class="skill-bar" data-skill="Kafka" data-level="85"></div>
              <div class="skill-bar" data-skill="RabbitMQ" data-level="75"></div>
            </div>
            <div class="skill-category">
              <div class="skill-category-label">▸ PLATFORM</div>
              <div class="skill-bar" data-skill="Kubernetes" data-level="80"></div>
              <div class="skill-bar" data-skill="Docker" data-level="90"></div>
              <div class="skill-bar" data-skill="GCP/AWS" data-level="75"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- CONTACT -->
      <section class="section" id="contact">
        <div class="prompt-line section-trigger">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="typed-command" data-text="whoami --contact"></span>
        </div>
        <div class="section-content contact-output">
          <div class="contact-line"><span class="contact-label">EMAIL</span><a href="mailto:pradeep00327@gmail.com" class="contact-value contact-link">pradeep00327@gmail.com</a></div>
          <div class="contact-line"><span class="contact-label">LINKEDIN</span><a href="https://linkedin.com/in/pradeep-prakash24" target="_blank" rel="noopener" class="contact-value contact-link">linkedin.com/in/pradeep-prakash24</a></div>
          <div class="contact-line"><span class="contact-label">GITHUB</span><a href="https://github.com/pradeeprakash" target="_blank" rel="noopener" class="contact-value contact-link">github.com/pradeeprakash</a></div>
          <div class="contact-line"><span class="contact-label">RESUME</span><a href="assets/Pradeep_Sr_Engineer_Resume.pdf" download class="contact-value contact-link contact-resume">📄 download resume.pdf</a></div>
        </div>
        <div class="contact-farewell">
          <span class="prompt">pradeep@portfolio<span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-dollar">$ </span></span>
          <span class="farewell-text">Connection closed. Thanks for visiting.</span>
          <span class="cursor">▋</span>
        </div>
      </section>

    </div><!-- /terminal-body -->
  </div><!-- /terminal -->

  <script src="js/matrix.js"></script>
  <script src="js/typing.js"></script>
  <script src="js/effects.js"></script>
  <script src="js/scroll.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `css/style.css` with complete styles**

Create `css/style.css` with: CSS variables (full color palette from spec), base reset, terminal chrome (window, title bar, dots), nav bar (fixed, file-path links, hamburger for mobile), hero section styles (prompt lines, name with glow, subtitle), about section (JSON block with syntax colors), experience section (timeline, cards with green/gray borders, tags, bullets, awards), skills section (monitor header, 2-col grid, bar containers), contact section (label/value pairs, farewell), all keyframe animations (`@keyframes blink`, `@keyframes glitch`, `@keyframes shimmer`, `@keyframes fadeIn`, `@keyframes slideInLeft`, `@keyframes fillBar`, `@keyframes scanline`), scanline overlay, hover states (nav underline, card glow, contact link shift), utility classes (`.hidden`, `.visible`), and full mobile responsive `@media (max-width: 768px)` rules (single-col skills, hamburger menu, no title bar, full-width cards).

This is one large file. All animations, layouts, and responsive rules in a single `style.css`. Every class referenced in the HTML above must be styled here.

- [ ] **Step 4: Verify static page renders**

```bash
open index.html
```

Expected: dark terminal page with all content visible (no animations yet — that comes from JS). Nav bar at top, terminal window with title bar, all five sections with their content. Styled but static.

---

### Task 2: Matrix rain canvas (`js/matrix.js`)

**Files:**
- Create: `js/matrix.js`

- [ ] **Step 1: Create `js/matrix.js`**

This module owns the `<canvas id="matrix-canvas">` element. On load:

1. Get the canvas, set it to `window.innerWidth` x `window.innerHeight`
2. Create an array of columns (one per ~14px of width). Each column tracks its current y-position.
3. On each `requestAnimationFrame` tick:
   - Fill the canvas with `rgba(10, 10, 10, 0.05)` to create the fade trail
   - For each column, draw a random character (mix of katakana `0x30A0-0x30FF` and latin `A-Z, 0-9`) in `rgba(0, 255, 136, 0.03-0.05)` at the column's current y
   - Advance y; reset to top with random probability when it exceeds canvas height
4. Listen to `resize` events to update canvas dimensions
5. Listen to `scroll` events: temporarily increase the alpha/speed of falling characters, then decay back to normal over 500ms
6. On mobile (`window.innerWidth < 768`): skip the animation loop entirely, hide the canvas via CSS class

The canvas should have `position: fixed; top: 0; left: 0; z-index: 0; pointer-events: none;` (set via CSS in Task 1).

- [ ] **Step 2: Test in browser**

```bash
open index.html
```

Expected: faint green characters falling behind the terminal content. Scrolling briefly makes them fall faster/brighter. On mobile viewport (DevTools responsive mode, <768px), canvas is hidden.

---

### Task 3: Typing animation engine (`js/typing.js`)

**Files:**
- Create: `js/typing.js`

- [ ] **Step 1: Create `js/typing.js`**

Export a reusable `typeText` function to the global scope (`window.typeText`):

```javascript
/**
 * Types text into an element character by character.
 * @param {HTMLElement} element - Target element to type into
 * @param {string} text - Text to type
 * @param {number} speed - Base ms per character (default 60)
 * @returns {Promise<void>} Resolves when typing is complete
 */
function typeText(element, text, speed = 60) {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = '';
    function tick() {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
        // Randomize speed: 40-80ms range around the base
        const jitter = speed + (Math.random() * 40 - 20);
        setTimeout(tick, jitter);
      } else {
        resolve();
      }
    }
    tick();
  });
}
```

Also define the hero boot sequence function that runs on `DOMContentLoaded`:

```javascript
async function runHeroSequence() {
  // 1. Fade in "Last login" line (add .visible class)
  // 2. Type "whoami" into the first .typed-command
  // 3. Show name with glitch (add .glitch-active class, remove after 300ms)
  // 4. Fade in subtitle
  // 5. Type "cat mission.txt" into second .typed-command
  // 6. Reveal mission text line by line
  // 7. Show final blinking cursor
}

document.addEventListener('DOMContentLoaded', runHeroSequence);
```

The hero sequence uses `typeText` for the two commands, CSS classes (`.visible`, `.glitch-active`) for reveals, and `setTimeout`/`await` delays between steps. All content elements start with `.hidden` class (opacity: 0) and transition to `.visible` (opacity: 1).

- [ ] **Step 2: Test in browser**

```bash
open index.html
```

Expected: On load, the hero types out "whoami", name appears with a brief glitch, subtitle fades in, "cat mission.txt" types out, mission text streams in, blinking cursor appears at the end. Total sequence takes ~4-5 seconds.

---

### Task 4: Scroll triggers and nav tracking (`js/scroll.js`)

**Files:**
- Create: `js/scroll.js`

- [ ] **Step 1: Create `js/scroll.js`**

This module handles two things:

**1. Section scroll-triggered animations:**

Set up an IntersectionObserver (threshold 0.2) on every `.section-trigger` element. When a section enters the viewport:
- Type out its `$ command` using `window.typeText` on the `.typed-command` child
- After typing completes, add `.visible` class to the `.section-content` sibling to trigger CSS fade/slide-in
- For about: each line in `.json-block` gets `.visible` with staggered 50ms delays
- For experience: each `.exp-card` gets `.visible` with staggered 100ms delays (slide-in-left animation)
- For skills: each `.skill-bar` triggers its fill animation (set CSS custom property `--bar-width` and add `.fill` class)
- For contact: each `.contact-line` gets `.visible` with staggered delays
- Each section only triggers once (`observer.unobserve` after activation)

**2. Active nav link tracking:**

Set up a separate IntersectionObserver (threshold 0.3) on each `<section>` to track which section is in view. Update `.nav-link.active` class accordingly.

**3. Smooth scroll:**

Add click handlers to `.nav-link` elements that call `element.scrollIntoView({ behavior: 'smooth' })` and close mobile hamburger menu if open.

**4. Mobile hamburger:**

Toggle `.nav-links.open` class on `#nav-hamburger` click. Close on nav link click or outside click.

- [ ] **Step 2: Test in browser**

```bash
open index.html
```

Expected: Scrolling down triggers each section — command types out, then content reveals with appropriate animation (JSON lines appear one by one, experience cards slide in from left, skill bars fill up, contact lines fade in). Nav links highlight as you scroll through sections. Clicking a nav link smooth-scrolls to that section.

---

### Task 5: Effects — glitch, flicker, scanlines, hover (`js/effects.js`)

**Files:**
- Create: `js/effects.js`

- [ ] **Step 1: Create `js/effects.js`**

This module adds the spectacle layer:

**1. Glitch effect on hover for section headings:**

Add `mouseenter`/`mouseleave` handlers to elements with `.glitch` class. On hover, add `.glitch-active` which triggers the CSS glitch animation (defined in style.css — uses `clip-path` and `text-shadow` to create RGB split).

**2. Random screen flicker:**

Set an interval that fires every 15–30 seconds (randomized). On fire, add `.flicker` class to `<body>` (CSS: `filter: brightness(0.5)` for 50ms), then remove it. Disabled on mobile (check `window.innerWidth < 768` and `prefers-reduced-motion`).

**3. Resume download animation:**

Add click handler to `.contact-resume`. On click, change text to `"downloading..."` with a dot animation (cycle through `.`, `..`, `...` every 200ms for 1 second), then restore original text. The actual download proceeds via the `<a download>` attribute naturally.

**4. Skill bar rendering:**

On `DOMContentLoaded`, render each `.skill-bar` element's inner HTML based on its `data-skill` and `data-level` attributes:
- Label text (skill name, padded to align)
- Green filled blocks (`█`) — count based on level percentage of 22 total blocks
- Dark unfilled blocks (`█` in dark color) for remainder

**5. Respect `prefers-reduced-motion`:**

If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, disable flicker and reduce all animation durations.

- [ ] **Step 2: Test in browser — full integration**

```bash
open index.html
```

Expected: Complete experience — matrix rain background, hero typing sequence, scroll-triggered section reveals, glitch on name hover, faint scanlines across the page, occasional screen flicker, skill bars with block characters that fill on scroll, resume download animation on click. Nav tracks active section and smooth-scrolls.

---

### Task 6: Mobile responsive and final polish

**Files:**
- Modify: `css/style.css` (media queries)
- Modify: `js/scroll.js` (mobile hamburger)

- [ ] **Step 1: Test and refine mobile layout**

Open in browser DevTools responsive mode at 375px width (iPhone SE) and 390px (iPhone 14). Verify:

- Matrix rain canvas is hidden
- Terminal title bar is hidden
- Nav shows hamburger icon, links are in a dropdown
- Hero text is readable, no horizontal overflow
- JSON block doesn't overflow (may need `font-size` reduction or `word-break`)
- Experience cards are full-width
- Skills grid is single column
- Contact links are tappable (sufficient padding)
- Typing animations are faster or skippable

Fix any issues found in `style.css` media queries.

- [ ] **Step 2: Test at tablet breakpoint (768px)**

Verify intermediate layout works — skills grid may stay 2-column, nav can stay horizontal. Fix any awkward in-between states.

- [ ] **Step 3: Copy resume PDF to assets**

```bash
cp /path/to/Pradeep_Sr_Engineer_Resume.pdf assets/
```

Ensure the resume download link works.

- [ ] **Step 4: Final cross-browser check**

Open in Chrome and Safari. Verify:
- Canvas renders in both
- CSS animations play smoothly
- No console errors
- All links work (mailto, external, download)

---

### Task 7: Performance and accessibility pass

**Files:**
- Modify: `index.html` (minor attribute additions)
- Modify: `css/style.css` (minor tweaks)

- [ ] **Step 1: Add accessibility attributes**

- Ensure all `<section>` elements have `aria-label` attributes
- Nav hamburger has `aria-expanded` toggled by JS
- Canvas has `aria-hidden="true"`
- Scanline overlay has `aria-hidden="true"`
- Links have descriptive text (already have visible text, verify)
- Check color contrast: green `#00ff88` on `#0a0a0a` passes WCAG AA for large text

- [ ] **Step 2: Add performance optimizations**

- Canvas: use `willReadFrequently: false` on `getContext('2d')`
- Add `will-change: transform` to animated elements (experience cards, skill bars)
- Throttle scroll listener in matrix.js (max once per 100ms)
- Add `loading="lazy"` to any images if ever added
- Ensure JS files have `defer` attribute on script tags in HTML (or keep them at bottom of body, which is equivalent)

- [ ] **Step 3: Final test**

```bash
open index.html
```

Full walkthrough: page load → hero animation → scroll through all sections → verify all animations fire → test nav links → test mobile responsive → test resume download → check console for errors.

Expected: Zero console errors, smooth 60fps animations, all content visible and interactive.
