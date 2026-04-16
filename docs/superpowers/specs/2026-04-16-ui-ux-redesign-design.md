# UI/UX Redesign — Terminal++ (Design Spec)

**Status:** Design approved, ready for implementation plan
**Date:** 2026-04-16
**Author:** Pradeep Prakash (with Claude)
**Supersedes / extends:** `docs/superpowers/specs/2026-04-14-terminal-portfolio-design.md`

---

## 1. Context & goals

The current portfolio is a static single-page terminal-themed site (vanilla HTML/CSS/JS, no build system). It works and reads cleanly, but motion is flat, typography is generic (`Courier New, Consolas, Monaco`), and the terminal metaphor is stated rather than *felt*. The primary audience is **professional recruiters on mobile**, with a secondary audience of developers who will notice and appreciate craft details.

**Goals**
- Elevate visual and motion quality without abandoning the terminal aesthetic
- Make the primary recruiter flow (role → years → resume → contact) fast and obvious on mobile
- Add distinctive developer-delight details (⌘K palette, cinematic boot) that *only* desktop visitors encounter — mobile recruiters are never taxed by them
- Stay vanilla: no framework, no build system, no package manager, no tests, no backend
- Preserve a11y and reduced-motion parity

**Non-goals**
- Content changes (same copy, better stage)
- Skill self-ratings / percentage bars (explicitly forbidden by `CLAUDE.md`)
- Backwards compatibility with the removed `matrix.js` / glitch / flicker effects
- A JS framework, bundler, or server-side rendering

---

## 2. Scope

### In scope
- Rework `index.html`, `css/style.css`, `js/typing.js`, `js/scroll.js`, `js/effects.js`
- Add two new JS modules: `js/palette.js` (⌘K) and `js/shell.js` (easter-egg live prompt)
- Self-host JetBrains Mono under `assets/fonts/`
- Create `assets/og.png` (via a one-off HTML generator tool committed under `tools/og-generator.html`)
- Add apple-touch-icon and fallback PNG favicons under `assets/`
- Add `robots.txt` at repo root (no sitemap until there's a canonical URL)
- Add `@media print` styles
- Update `CLAUDE.md` to reflect the new JS layout and any new conventions

### Out of scope
- Framework/bundler migration
- Third-party analytics (explicitly none — zero tracking scripts by design)
- Canonical URL / sitemap / OG URL metadata (deferred to deployment TODO — no prod domain yet)
- Any backend / serverless endpoints
- Reintroduction of matrix rain, glitch, flicker
- Real-time visitor interactions beyond the live-prompt easter egg

---

## 3. Architecture

Stays vanilla. Every JS file: IIFE + `'use strict'`, except `typing.js` which continues to intentionally expose `window.typeText`.

**Load order in `index.html`** (all deferred):
1. `js/typing.js` — boot-overlay sequence (desktop, first visit only) + `window.typeText` shared utility
2. `js/effects.js` — resume download micro-animation
3. `js/palette.js` — ⌘K command palette (desktop) + shared `window.runCommand(name, args?)` registry
4. `js/shell.js` — live-prompt easter egg (opens when `shell` is run from the palette)
5. `js/scroll.js` — IntersectionObserver reveals, nav active tracking, smooth scroll, mobile hamburger, `cd`-style section transitions (desktop)

**Key contracts (unchanged or newly added):**
- `window.typeText(el, text, speed)` — existing, reused by boot overlay, hero, section `cd` transitions, and the live prompt.
- `window.runCommand(name, args?)` — new, canonical entry for every action. Called by ⌘K, the mobile Quick Actions sheet, the live prompt, and direct UI elements (e.g., contact row `[copy]` / `[open]` actions).
- `data-command="<name>"` attribute on any button or link — auto-wired by `palette.js` to call `runCommand`. Progressive-enhancement friendly (the element still works as a plain link/button without JS).

**Single source of truth** for the command set: `palette.js` exports a `commands` array. The palette renders from it, mobile Quick Actions renders from it, the live prompt dispatches through it. Drift is impossible by construction.

---

## 4. Visual system

### 4.1 Typography

- **Primary face:** JetBrains Mono (variable, weights 400/500/700), self-hosted as woff2 under `assets/fonts/`. Ligatures on for `->`, `=>`, `!=`.
- **Fallback stack:** `'JetBrains Mono', 'Berkeley Mono', 'IBM Plex Mono', ui-monospace, monospace`.
- **Sizing tokens** (`:root`):
  ```
  --fs-xs: clamp(11px, 0.72vw + 9px, 12px);   /* inline metadata */
  --fs-sm: clamp(12px, 0.80vw + 10px, 14px);  /* body, prompts */
  --fs-md: clamp(14px, 1.00vw + 12px, 16px);  /* mission, summary */
  --fs-lg: clamp(22px, 2.40vw + 14px, 36px);  /* hero name */
  --lh-tight: 1.25;
  --lh-body:  1.55;
  --lh-loose: 1.75;
  ```
- No secondary typeface. Monospace throughout.

### 4.2 Palette

Additions/changes to existing `:root`:

| Token | Value | Semantics |
|---|---|---|
| `--green` | `#22d88b` (was `#00ff88`) | primary system color (prompts, rules, arrows) |
| `--green-bright` | `#5bffb0` (new) | rarest accent — hero name, active cursor, active nav link |
| `--green-dim` | `#22d88b44` (updated — tracks new `--green`) | dim accents, past-role borders |
| `--yellow` | `#ffd93d` (unchanged) | awards only (`★`) |
| `--white` | `#e0e0e0` (unchanged) | primary content |
| `--white-soft` | `#d6d6d6` (new) | summary/mission prose (contrast upgrade from `--gray`) |
| `--gray` | `#a8a8a8` (unchanged) | secondary metadata |
| `--dark-gray` | `#7a7a7a` (unchanged) | tertiary metadata |
| `--red`, `--blue` | unchanged | title-bar dots only |
| `--phosphor-glow` | `0 0 12px rgba(34,216,139,.18)` (new) | reusable text-shadow |

**Hierarchy rule:** `--green-bright` appears in at most 3 places per viewport (hero name, the current live cursor, the active nav link). Overuse breaks the hierarchy.

### 4.3 Background & atmosphere

- `body` gains a radial depth gradient under the existing terminal:
  ```css
  body {
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, #0f1a14 0%, #080a09 55%),
      var(--bg-primary);
  }
  ```
- `.scanlines`: opacity drops from `0.03` to `0.025`; adds a slow vertical drift via `@keyframes scanline-drift { from { transform: translateY(0); } to { transform: translateY(4px); } }` (8s, linear, infinite). Disabled under `prefers-reduced-motion`.
- New thin **status strip** inside the terminal title bar: `tty1 · uptime 7y · last commit 2d`. Static text. `aria-hidden="true"`. Hand-updated on deploy (or swap to `tty1 · uptime 7y · bengaluru` if staleness risk outweighs freshness signal — see Open Items §12).

### 4.4 Spacing & rhythm

- Existing section padding retained.
- Tag pill border-radius: `3px` (currently `3px`, confirm consistency).
- Card border-radius: `0 6px 6px 0` (left-border accent preserved).
- Vertical rhythm: all line-heights use the three tokens above. Eliminates one-off values.

---

## 5. Motion system

### 5.1 Cinematic boot (desktop, first visit only)

Full-screen overlay above the terminal (`z-index: 10001`, above scanlines). **~1.2s total, skippable on any key / click / tap / scroll.** `sessionStorage.portfolio.booted = '1'` gates repeat visits within the session.

Disabled entirely when:
- Viewport width ≤ 768px (mobile)
- `prefers-reduced-motion: reduce`
- URL contains `#resume`, `#contact`, or `?direct`
- `sessionStorage.portfolio.booted === '1'`

Sequence (text typed at ~18ms/char; dots animate one char at a time; `[ OK ]` snaps green):
```
[   0ms]  portfolio.pp.dev · boot [4.18.0]
[  80ms]  checking /dev/sda0 ............................ OK
[ 240ms]  mounting /home ................................ OK
[ 380ms]  starting network .............................. OK
[ 500ms]  starting sshd ................................. OK
[ 620ms]  starting tty1 ................................. OK
[ 760ms]  login as: pradeep
[ 900ms]  last login: Thu Apr 16 09:32:01 on ttys001
[1050ms]  $
[1200ms]  (fade 180ms → terminal reveals; hero whoami sequence begins)
```

A small dim line sits in the bottom-left of the overlay: `(press any key to skip)`.

After the overlay fades, the existing `runHeroSequence` continues as today (`whoami` → name → `cat mission.txt` → mission) but retimed so the visitor feels one continuous shell session rather than two stitched animations.

### 5.2 Section `cd` transitions (desktop only)

When a `.section-trigger` enters the viewport, `scroll.js`:
1. Types `> cd ~/<section>` in `--green-dim` above the section (~280ms). Auto-clears after 1.4s.
2. Types the existing `data-text` command (`cat experience.log`, etc.) as today but retimed.
3. Calls `revealSection()` as today.

Mobile: step 1 is skipped. Step 2 types at double speed (8ms/char vs 16ms/char on desktop).

### 5.3 Reveal easing & stagger (global)

Tokens (`:root`):
```
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
--t-fast: 140ms;
--t-mid:  260ms;  /* mobile: 180ms via media query */
--t-slow: 420ms;  /* mobile: 280ms via media query */
```

- Reveal: `opacity var(--t-mid) linear, transform var(--t-slow) var(--ease-out-expo)`.
- Translate distance: `10px → 6px`.
- Experience card stagger: `80ms` (was `100ms` elsewhere).
- Skill category stagger: `60ms` (was `100ms`).

### 5.4 Micro-interactions

- **Nav links:** `::before` renders `❯` animating from `opacity 0 translateX(-6px)` to `opacity 1 translateX(0)` on hover.
- **Tags:** on hover, border brightens to `--green`, `translateY(-1px)`, `text-shadow: var(--phosphor-glow)`. No scale, no color flood.
- **Experience `exp-dot`:** one-time radial ring pulse on reveal (1.6s), then still. No ambient "breathing."
- **Current role card:** one-time left-border pulse on reveal (`--green-dim → --green → --green-dim`, 1.6s). No ambient loop.
- **Cursors:** all cursors share a single master blink keyframe via a shared CSS custom property. They stay in sync.
- **Contact links:** on hover, an inline `> open …` chip slides in from the left (150ms, `--ease-out-expo`), disappears on unhover.
- **Resume download:** existing "Downloading…" animation kept; final `[ OK ]` stamp fades in when the download fires.

### 5.5 Reduced-motion fallback

Under `@media (prefers-reduced-motion: reduce)`:
- Boot overlay skipped
- Hero typing skipped (name + role + mission appear instantly)
- Section `cd` headers skipped; the `typed-command` still shows but types instantly
- Scanline drift disabled
- Cursor blink disabled (cursors always visible)
- All `transform` on reveal disabled; `opacity` snaps 0 → 1 in 1 frame
- Micro-interaction transforms (tag hover lift, chip slides) disabled; color/border changes preserved

Content parity is mandatory — reduced-motion users see every piece of content a full-motion user sees.

---

## 6. Interaction system

### 6.1 Command registry (shared)

Exported from `palette.js` as `window.runCommand(name, args?)` and a static array `window.commands` for renderers.

| Command | Aliases | Action |
|---|---|---|
| `help` | `?`, `h` | prints the command list inline |
| `about` | `cat about`, `whoami` | smooth-scroll to `#about` |
| `experience` | `exp`, `work` | smooth-scroll to `#experience` |
| `skills` | `sk`, `stack` | smooth-scroll to `#skills` |
| `contact` | `mail` | smooth-scroll to `#contact` |
| `resume` | `cv`, `download` | triggers resume PDF download |
| `github` | `gh` | opens GitHub in new tab |
| `linkedin` | `li` | opens LinkedIn in new tab |
| `email` | `copy email` | copies email to clipboard, prints `copied.` |
| `clear` | `cls` | clears the live-prompt scrollback |
| `shell` | — | opens the live-prompt easter egg (not listed in `help`) |

Unknown input prints `command not found: <x>. try 'help'.` Never silently fails.

### 6.2 ⌘K command palette (desktop only)

- Triggered by `⌘K` / `Ctrl+K` / `/`.
- Overlay above everything (`z-index: 10000`), centered, max-width `520px`.
- Styling: blurred backdrop (`backdrop-filter: blur(8px) brightness(0.6)`), 1px `--green` border, `--phosphor-glow` outer shadow.
- Structure: JBMono input with `$ _` prefix, divider, filtered list with `❯` marker on the active row, footer hint `esc to close · ↑↓ to navigate · ↵ to run`.
- Fuzzy-matches against command name + aliases + description.
- Enter animation: `opacity 120ms, transform: scale(.98) → 1, cubic-bezier(0.19, 1, 0.22, 1)`.
- Hidden on viewport ≤ 768px.
- A11y: `role="dialog"`, `aria-modal="true"`, focus trap, restore focus on close. Results list is `role="listbox"` with `aria-activedescendant`. Input has `aria-label="Command palette input"`.

### 6.3 Mobile Quick Actions sheet (mobile only)

- Floating action button: `position: fixed; bottom: 20px; right: 20px;` 56×56, green border, content `❯_ Menu`, `z-index: 900`.
- Tap → bottom sheet slides up (`transform: translateY(100% → 0)`, 220ms `--ease-out-expo`). Dismiss on backdrop tap or swipe-down.
- Sheet rows (56px tall each, full-width, 12px padding):
  ```
  [pdf]  Download resume               →
  ✉      Copy email                    →
  in     LinkedIn                      ↗
  gh     GitHub                        ↗
  ```
- Each row dispatches through `window.runCommand(<name>)`.
- Tap feedback: 60ms `background-color` flash.
- A11y: `role="dialog"`, `aria-modal="true"`, focus trap while open, `Esc` closes.

### 6.4 Live-prompt easter egg (opt-in)

Opened via `shell` command in ⌘K. Renders inside the terminal body, below the contact section. Contains:
- A scrollback area (last ~6 command results), `aria-live="polite"`.
- An input line with `pradeep@portfolio:~$` prefix and a block cursor.
- History via `↑/↓` (session-only).
- `Tab` autocompletes.
- `clear` / `cls` wipes scrollback but keeps the shell open.
- `Esc` closes the shell entirely; DOM is removed (no weight when not open).

Mobile: `shell` can still be run, but the live prompt opens in a fullscreen modal variant (not inline) to avoid keyboard/scroll fights.

### 6.5 Nav

- Active link: `./` prefix stays dim, section name gets `--green-bright` + `--phosphor-glow`, 1px underline draws in via `transform: scaleX(0 → 1)` on transition.
- Right-aligned `⌘K` hint (dim, thin border) — desktop only.
- Mobile hamburger: three bars morph to `×` on open (pure CSS, `transform` + `rotate`). Nav links slide in with 40ms stagger when panel opens.

---

## 7. Section-by-section refinements

### 7.1 Hero

- Under subtitle: `● open to opportunities` pill. Green dot (`--green-bright`) pulses every 3s via `@keyframes`. Disabled under reduced-motion.
- After mission line: prominent `[pdf] download resume →` button.
  - Desktop: inline-block, `--green` border, JBMono, 12px 20px padding.
  - Mobile: full-width, 48px tall, thumb-reachable.
  - Triggers `window.runCommand('resume')`.
- Under the resume button: inline row `github · linkedin · email` (text links, separated by `·`). Works without JS.

### 7.2 About (`cat about.json`)

- Keep JSON metaphor.
- Add a left rail of tree glyphs (`│ ├ └`) between the brackets to read like real structured output. Purely visual.
- Summary/mission prose bumped from `--gray` to `--white-soft`.
- Reveal: JSON keys type line-by-line (40ms/line); values appear as a grouped fade after all keys have typed. Feels like a real `cat` output vs. a scrolling typewriter.
- Mobile: typing skipped; whole block fades in.

### 7.3 Experience (`cat experience.log`)

- **Current-role card (Fynd):**
  - Adds a `[current]` pill next to the role title (dim border, `--green-dim` text).
  - One-time left-border pulse on reveal (1.6s). No ambient loop.
- **Past-role cards:** unchanged structure; border stays `--green-dim`.
- **Tag hover:** `translateY(-1px)` + `--phosphor-glow` border brighten (no scale).
- **Bullet arrows (`→`):** on card hover, a slight `translateX(2px)` nudge.
- **Awards (`★ Fynd Star…`):** promoted to its own sub-line with a thin rule above, yellow star a touch larger.
- **Earlier roles:** tighter `line-height: 1.55`, `font-size: var(--fs-sm)`.

### 7.4 Skills (`cat skills.md`)

- Structure unchanged: category → tag row.
- **No** frequency badges / self-ratings. (Considered during brainstorming; rejected — same failure mode as skill bars.)
- Tag hover unified with Section 7.3.
- Category stagger tightened to 60ms.

### 7.5 Contact (`cat contact.txt`)

- Structure unchanged: `LABEL  value` rows.
- Each row gains a trailing dim inline action: `[copy]` for email, `[open]` for the rest.
  - Each action dispatches through `window.runCommand`.
- Mobile: entire row is the tap target; trailing action is implicit.
- Farewell line (`Connection closed. Thanks for visiting.`) kept — earned whimsy at the page's end.

### 7.6 Nav

Covered in §6.5.

---

## 8. Mobile & accessibility

### 8.1 Mobile (≤ 768px)

- Boot overlay: skipped.
- Hero typing: skipped (content renders instantly).
- Section `cd` headers: skipped.
- Reveal timing: `--t-mid: 180ms`, `--t-slow: 280ms`.
- Quick Actions sheet as in §6.3.
- ⌘K hint hidden.
- Minimum body font size: 14px; minimum button font size: 16px.

### 8.2 Keyboard

- Skip-link at top of `<body>`: `Skip to content` — visible on focus, jumps to `#about`.
- `:focus-visible` outline on all interactive elements: 2px `--green` ring with 2px offset.
- ⌘K and mobile sheet: focus-trapped while open; restore focus to trigger element on close.
- Tab order after JS reveal: nav → hero CTA → quick-links → sections in DOM order → contact actions.

### 8.3 Screen readers

- Boot overlay: `aria-hidden="true"`. Not announced.
- `data-text` content written to `.typed-command`'s `textContent` at the end of each typing sequence so the final state reflects in the a11y tree without narration duplication.
- Live prompt scrollback (when open): `aria-live="polite"`.
- Status strip: `aria-hidden="true"`.
- All decorative glyphs (`❯`, `▋`, `│ ├ └`): `aria-hidden="true"` or wrapped in `<span aria-hidden="true">`.

### 8.4 Reduced motion

Covered in §5.5.

### 8.5 Contrast

- `--green` (`#22d88b`) on `#0a0a0a` — AA at regular, AAA at large.
- `--white-soft` (`#d6d6d6`) on `#0a0a0a` — AAA.
- `--green-dim` — decorative borders only; never used for readable text.

### 8.6 No-JS fallback

Strategy: `scroll.js` sets `document.documentElement.classList.add('js-ready')` as its first line. All JS-gated visibility is CSS-driven off that class — no `<noscript>` block needed.
- `html:not(.js-ready) .hidden { opacity: 1; transform: none; }` — sections reveal immediately.
- `html:not(.js-ready) .boot-overlay, … .palette, … .mobile-fab { display: none; }` — JS-only chrome hidden.
- Resume/email/LinkedIn/GitHub are plain `<a>` tags that work without JS. The hero resume button is an `<a>` with `download` attribute, progressively enhanced by `effects.js`.

### 8.7 Color-blindness

- Green + yellow + white + gray — distinguishable for deuteranopia/protanopia.
- Red used only for decorative title-bar dot (non-semantic).

---

## 9. SEO, performance, analytics, OG, favicon, print

### 9.1 SEO

Add to `<head>`:
- `<meta name="author" content="Pradeep Prakash">`
- Inline JSON-LD Person schema (omit `url` and `sameAs[]` URLs only if LinkedIn/GitHub profiles are live — they are):
  ```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Pradeep Prakash",
    "jobTitle": "Staff Full-Stack Engineer",
    "worksFor": { "@type": "Organization", "name": "Fynd (Reliance Retail)" },
    "address": { "@type": "PostalAddress", "addressLocality": "Bengaluru", "addressCountry": "IN" },
    "sameAs": [
      "https://linkedin.com/in/pradeep-prakash24",
      "https://github.com/pradeeprakash"
    ]
  }
  </script>
  ```
- Expanded OG/Twitter (no `og:url` / `twitter:url` until canonical domain is set — see §12):
  ```
  og:image, og:image:width (1200), og:image:height (630), og:site_name, og:locale (en_US)
  twitter:title, twitter:description, twitter:image, twitter:card ("summary_large_image")
  ```
- `robots.txt` at repo root (`User-agent: *` / `Allow: /`).
- **No** `sitemap.xml`, **no** `canonical` until production domain is known.

### 9.2 Performance budget (hard)

| Metric | Budget |
|---|---|
| Total initial transfer (HTML + CSS + JS + font) | **< 150 KB gzipped** |
| JS total (typing + effects + palette + shell + scroll) | **< 20 KB gzipped** |
| CSS | **< 25 KB gzipped** |
| JetBrains Mono (Latin subset, 400/500/700 woff2) | **< 60 KB** |
| OG image | **< 60 KB** |
| LCP on 4G mid-tier phone | **< 1.5s** |
| TTI on 4G mid-tier phone | **< 2.5s** |
| CLS | **0** |

Rules:
- All `<script>` tags get `defer`.
- Font `<link rel="preload" as="font" type="font/woff2" crossorigin>` + `font-display: swap`.
- Self-hosted font (no Google Fonts network dependency in production).
- Reserve layout space for hero typing so it never shifts.
- No polyfills — ES2020 baseline.

### 9.3 Analytics

**None.** The site ships zero third-party tracking scripts. No GoatCounter, no Plausible, no Google Analytics. If this decision is revisited later, add the script as a single tag in `<head>` and be explicit about what's being tracked.

### 9.4 Open Graph image

- `assets/og.png`, 1200×630, < 60 KB after mozjpeg/squoosh compression (PNG with indexed palette may beat JPG for this kind of flat image — measure, pick the smaller).
- Content:
  - Dark `#0a0a0a` background with baked-in subtle scanlines
  - Prompt in green: `pradeep@portfolio:~$ whoami`
  - Name in JetBrains Mono 700: `> Pradeep Prakash`
  - Subtitle: `Staff Full-Stack Engineer · Backend-leaning · Bengaluru`
  - Small dim green URL bottom-right (fill in once domain exists — see §12)
- Generator: `tools/og-generator.html`. A single standalone page that renders the OG design at 1200×630 using the same tokens as the site. Open in a browser at that size, screenshot, compress, commit as `assets/og.png`. Generator itself is committed for future regeneration.

### 9.5 Favicons

- Keep inline SVG favicon.
- Add:
  - `assets/apple-touch-icon.png` (180×180)
  - `assets/favicon-32.png`
  - `assets/favicon-16.png`
- All rendered from the same `❯` glyph on `#0a0a0a`. ≤ 2 KB combined.

### 9.6 Print styles

`@media print` block appended to `css/style.css` (~40 lines):
- Hides: `.scanlines`, boot overlay, ⌘K, Quick Actions FAB, nav, cursor blinks, `⌘K` hint.
- Converts green-on-black → black-on-white.
- Expands all `.hidden` sections (removes reveal gating).
- Strips all `text-shadow`.
- Replaces JBMono with system serif for body, system mono for prompts (no 60 KB font download for printer).
- Shows URLs after links: `a[href^="http"]::after { content: " (" attr(href) ")"; }`.

---

## 10. File-level changes (high-level)

| File | Change |
|---|---|
| `index.html` | New `<head>` (JSON-LD, OG/Twitter, preload font, favicons). Boot overlay markup. Hero CTA pill + resume button + quick-links row. Section `[current]` pill. Contact trailing actions. Mobile FAB + sheet markup. Script tag order updated to include `palette.js` + `shell.js`. No `<noscript>` block — `html.js-ready` gates JS-only chrome (see §8.6). |
| `css/style.css` | New tokens (fonts, motion, palette additions). Font-face declarations. Boot overlay styles. Depth gradient, drifted scanlines, status strip. `⌘K` palette styles. Quick Actions sheet. Easter-egg shell. Section refinements (tree rail, `[current]` pill, current-role pulse, tag hover, bullet nudge, awards rule). Reveal timing tokens. Reduced-motion overrides. Mobile media query overrides. Print block. |
| `js/typing.js` | Boot-overlay sequence (desktop, first-visit only, skippable, gated). Retimed `runHeroSequence` to flow from boot. Still exposes `window.typeText`. |
| `js/effects.js` | Adds `[ OK ]` stamp at end of resume download animation. |
| `js/palette.js` (new) | Commands array. `window.runCommand` dispatcher. ⌘K overlay render + keyboard handling. Mobile Quick Actions sheet render + handling. |
| `js/shell.js` (new) | Easter-egg live-prompt UI. Scrollback, history, tab-complete. Mounts on `runCommand('shell')`; unmounts on `Esc` or `runCommand('clear')` after exit. |
| `js/scroll.js` | Adds `> cd ~/<section>` transition (desktop). Uses `--t-fast/mid/slow` tokens. Tightens stagger values. |
| `assets/fonts/` (new) | JBMono woff2, 400/500/700. |
| `assets/og.png` (new) | 1200×630 OG image. |
| `assets/apple-touch-icon.png`, `favicon-32.png`, `favicon-16.png` (new) | Favicon fallbacks. |
| `tools/og-generator.html` (new) | One-off OG-image renderer page. Committed for repeatability. |
| `robots.txt` (new) | `User-agent: *` / `Allow: /`. |
| `CLAUDE.md` | Update JS load order (now 5 files). Document `window.runCommand` contract. Document boot-overlay gating. Note print styles exist. |

---

## 11. Success criteria

The redesign is complete when:

1. **Recruiter on mobile** can see role + years + location + resume CTA within the first viewport, and download the resume in ≤ 2 taps from any scroll position.
2. **Developer on desktop** discovers ⌘K (via the nav hint), opens it, and can reach every section / action through it.
3. **Boot overlay** runs once per session on desktop, never on mobile, is skippable within 50ms of any input, and is completely transparent to screen readers.
4. **Reduced-motion** users see every piece of content a full-motion user sees, with no animation.
5. **No-JS** users see a complete, readable page with working resume / email / LinkedIn / GitHub links.
6. **Performance budget** (§9.2) met, verified against a cold 4G Lighthouse run.
7. **CLS = 0** across all section reveals.
8. **a11y audit** (Lighthouse + manual screen-reader pass through a full page traversal) is clean.
9. **Print preview** renders a readable, ink-efficient version of the page.
10. **All commands** in `window.commands` work from both ⌘K and mobile sheet (where applicable), and unknown input prints the "command not found" message.

---

## 12. Open items (deployment TODOs)

These are explicitly deferred from the design; track them separately before publishing.

- **Canonical URL, `og:url`, `twitter:url`, sitemap.xml** — blocked on deciding the production domain.
- **OG image regeneration** — run `tools/og-generator.html`, screenshot the `.og` block, re-encode as JPEG, commit `assets/og.jpg`. Re-run whenever hero copy changes.
- **Duplicate resume PDF** — repo root has a PDF that isn't the one linked from the page (see `CLAUDE.md §Assets`). Not part of this redesign; clean up separately.
