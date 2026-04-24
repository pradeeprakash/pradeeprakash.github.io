# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Static single-page portfolio with a terminal aesthetic — CRT scanline overlay, terminal chrome, cinematic boot sequence (desktop), typewriter for typed commands, ⌘K command palette (desktop) / Quick Actions sheet (mobile), and an easter-egg live shell. **No build system, no package manager, no tests, no framework.** Just `index.html`, `css/style.css`, and five vanilla-JS files loaded in a specific order. To preview, open `index.html` directly in a browser or serve the directory with any static server (e.g. `python3 -m http.server`).

The full design intent is captured in `docs/superpowers/specs/2026-04-16-ui-ux-redesign-design.md` — read it if you're asked to touch motion, interaction, or section structure.

## JS module layout and load order

Scripts are loaded from `index.html` with `defer` in this order — the order still matters because later modules depend on globals exposed by earlier ones. An inline `type="module"` bootstrap runs first and exposes `window.Motion` from the CDN before any classic script executes (see **Motion** below):

1. `js/typing.js` — Cinematic **boot overlay** (desktop, first visit only; gated on viewport, `prefers-reduced-motion`, `sessionStorage.portfolio.booted`, and deep-link hashes `#resume` / `#contact` / `?direct`). Runs the hero sequence after the overlay fades. **Attaches `window.typeText(el, text, speed)`** — every other typing effect must reuse this global rather than re-implementing it.
2. `js/effects.js` — "Downloading…" animation + `[ OK ]` stamp on resume click.
3. `js/palette.js` — **Shared command registry.** Exposes `window.commands` (the array of command objects) and `window.runCommand(name, args?)` (the canonical dispatcher). Implements the ⌘K command palette (desktop) and the mobile Quick Actions sheet. Auto-wires any element with a `data-command="<name>"` attribute.
4. `js/shell.js` — Easter-egg live prompt, mounted by `runCommand('shell')`, unmounted on `Esc`. Exposes `window.shellOpen`, `window.shellClose`, `window.shellClear`. Uses `window.runCommand` to dispatch typed input — the command set is single-sourced from `palette.js`.
5. `js/scroll.js` — The orchestrator. Adds `html.js-ready` first thing to flip CSS out of its no-JS fallback. Owns section reveal, nav active-link tracking, smooth-scroll, mobile hamburger, the `> cd ~/<section>` breadcrumb micro-transition (desktop), and the current-role pulse on reveal. **Depends on `window.typeText` (typing.js)** — do not reorder the `<script>` tags.
6. `js/cube.js` — Drives the rotation of `#hero-cube-3d`, a CSS 3D glass cube with six translucent neon-tinted faces (defined in the HTML and styled in `style.css`). Uses `Motion.animate` when `window.Motion` is available, falls back to `requestAnimationFrame` otherwise. Pauses when the hero leaves the viewport (IntersectionObserver) or the tab is hidden. Reduced-motion renders a single static pose and never starts the loop.

All six files use the IIFE + `'use strict'` pattern (except `typing.js`, which intentionally attaches globals).

## Command registry

Every interactive action on the page — navigation, resume download, email copy, external link open, opening the shell — flows through a single array of command objects in `palette.js`. Adding a new action = adding one entry to `commands` and (for UI surfaces) either marking an element with `data-command="<name>"` or calling `window.runCommand('<name>')` directly. The palette, the mobile sheet, and the shell all render / dispatch from the same source, so they can't drift.

## Boot overlay gating

The cinematic boot overlay lives in `index.html` as `<div class="boot-overlay">`, styled in `style.css`, and driven by `typing.js`. It only runs when **all** of these are true:

- Viewport > 768px (mobile is exempt)
- `prefers-reduced-motion: reduce` is not set
- `sessionStorage.portfolio.booted !== '1'` (first visit in this session)
- URL hash is not `#resume` or `#contact` and query string does not contain `direct`

Any skip input (keydown / click / wheel / touchstart) cancels pending timers and fades the overlay immediately. Completion (natural or skipped) sets `sessionStorage.portfolio.booted = '1'`. When the overlay is suppressed, the hero sequence also snaps to final state — no mid-state is ever shown.

## Section reveal pattern

Each non-hero section (`#about`, `#experience`, `#projects`, `#skills`, `#contact`) follows the same HTML contract:

```
<section id="...">
  <div class="cd-breadcrumb" data-cd="<section>"></div>
  <div class="prompt-line section-trigger">
    <span class="typed-command" data-text="<command to type>"></span>
  </div>
  <div class="section-content"> ... </div>
</section>
```

On init, `scroll.js` hides every `.section-content` and sets up an `IntersectionObserver` on every `.section-trigger`. When a trigger enters the viewport it:

1. Types `> cd ~/<data-cd>` into `.cd-breadcrumb` (desktop only; mobile and reduced-motion skip this).
2. Types the `data-text` command via `window.typeText`.
3. Calls `revealSection(section)`, which **dispatches by `section.id`** to `animateAbout` / `animateExperience` / `animateProjects` / `animateSkills` / `animateContact`.

Reveals are driven by `revealStagger(els, opts)` in `scroll.js`, which calls `Motion.animate` with `Motion.stagger(...)` when `window.Motion` is loaded and falls back to class-toggle + `setTimeout` delays otherwise. Reduced-motion users get the class-toggle path with zero wait between items — final state is applied without animation. Every new reveal should go through `revealStagger` rather than reinventing the loop.

Adding a new section requires four edits: the HTML structure above, a new `case` in `revealSection`'s switch, a matching `animate<Name>` function in `scroll.js`, and (if palette navigation should reach it) a new entry in `commands` in `palette.js`. The hero is special — it's driven by `runHeroSequence` in `typing.js`, not the observer.

## Skills rendering

Skills are plain categorised tag groups. Each `.skill-category` contains a `.skill-category-label` and a `.skill-tags` flex row of `<span class="tag">`. `animateSkills` in `scroll.js` stagger-reveals each category on a 60 ms tick. **Never reintroduce skill bars or frequency badges** (daily / weekly / occasional, etc.) — any self-rated or quantified skill display reads as junior, regardless of form.

## Visibility conventions

CSS relies on two coupled classes toggled from JS: `.hidden` (opacity 0, `translateY(6px)`) and `.visible` (opacity 1, transitioned in via `--t-mid` / `--t-slow` tokens and `--ease-out-expo`). The `slide-in-left` variant is used for experience cards. When writing new reveal logic, follow the same add-`.hidden`-on-init / swap-to-`.visible`-on-reveal pattern rather than introducing a new mechanism.

The `html.js-ready` class gates the no-JS fallback — any JS-only element or any starting-state that needs a reveal must be hidden via a `html.js-ready ...` selector (or `.hidden`), not a bare rule, so non-JS visitors see a fully-rendered page.

## Accessibility and responsive rules to preserve

- The 768 px breakpoint is the mobile cutoff in CSS (`@media (max-width: 768px)`). Keep new mobile/desktop forks on the same breakpoint.
- Scanline overlay and the status strip have `aria-hidden="true"` and `pointer-events: none`. Decorative-only elements stay that way.
- Any new motion-heavy effect must be guarded behind `window.matchMedia('(prefers-reduced-motion: reduce)')` both in CSS (`@media` query that disables the animation) and in JS (skip the class-add/remove timing entirely).
- Reduced-motion parity is mandatory: every piece of content visible to a full-motion user must also be visible — just without the animation.
- Boot overlay is `aria-hidden="true"` so screen readers skip the narration.
- Skip link (`.skip-link`) must remain the first focusable element in `<body>`.
- Focus-visible outlines use `--green` with `outline-offset: 2px` — keep them.

## Theme tokens

All colors and motion values live as CSS custom properties on `:root` in `css/style.css`. The project runs a **Phosphor Glass** aesthetic — monochrome-green terminal identity layered with translucent glass surfaces and a neon ambient backdrop. Two token families live in the file:

- **Terminal palette** (top `:root` block): `--green` (#22d88b, system), `--green-bright` (#5bffb0, rarest accent — hero name / active cursor / active nav), `--green-dim`, `--yellow` (awards only), `--red`, `--blue`, `--white`, `--white-soft`, `--gray`, `--dark-gray`, background tiers, and `--phosphor-glow` (reusable text-shadow).
- **Phosphor Glass palette** (bottom `:root` block at the end of the file): `--glass-1/2/3` (dense→chip surface alphas), `--glass-edge` / `--glass-edge-hi` / `--glass-inner-hi` (hairline borders and top-edge highlight), `--blur-sm/md/lg/xl`, and neon accents `--neon-cyan` / `--neon-magenta` / `--neon-amber` / `--neon-violet` with matching `--glow-*` shadow presets.
- **Typography:** `--font-mono` (JetBrains Mono self-hosted + fallbacks), `--fs-xs/sm/md/lg` (clamp-based), `--lh-tight/body/loose`.
- **Motion:** `--ease-out-expo`, `--t-fast/mid/slow`. Mobile media query shortens `--t-mid`/`--t-slow`.

Prefer editing variables over hard-coding hex, rgba, or ms values. The `--green-bright` token is the loudest accent — overuse (more than ~3 places per viewport) breaks the visual hierarchy. The neon accents (`--neon-*`) are each tied to a specific surface and should stay that way: cyan for JSON/metrics, magenta for one cube face, amber for another, violet for a third. Scattering them breaks the color coding.

## Phosphor Glass and the ambient backdrop

`body::before` is a fixed-position, z-index `-1` layer of five overlapping radial gradients (green, cyan, magenta, violet, amber) blurred by 60px and drifting on a 38 s ease-in-out loop (`@keyframes ambient-drift`). This is what `backdrop-filter` surfaces (nav, terminal, cards, tags, palette, cube faces) blur against — **do not remove it**, or the glass goes flat. The drift animation is killed under `prefers-reduced-motion: reduce`.

Glass surfaces use two coupled properties: a tinted `background` (one of `--glass-1/2/3`), plus `backdrop-filter: blur(var(--blur-*)) saturate(1.2–1.4)` with the matching `-webkit-backdrop-filter`. Always keep the webkit prefix — Safari still needs it. A subtle `0 1px 0 var(--glass-inner-hi) inset` gives each surface a top-edge highlight; keep it when adding new glass.

## Fonts

JetBrains Mono is **self-hosted** at `assets/fonts/jetbrains-mono-variable.woff2` (variable font, Latin subset, ~40 KB). It's preloaded in `<head>` with `rel="preload"` + `crossorigin`, declared via `@font-face` with `font-display: swap`, and referenced through the `--font-mono` fallback stack. Do not add a Google Fonts `<link>` — the font is local and must remain local to keep the perf budget and avoid a third-party dependency.

## Motion (animation library)

`motion@11.13.5` is loaded as an ES module from `cdn.jsdelivr.net` (pinned version) via an inline `<script type="module">` at the bottom of `<body>`, immediately before the classic deferred scripts. It imports the whole namespace and assigns it to `window.Motion`, so the IIFE scripts can call `window.Motion.animate(...)`, `window.Motion.inView(...)`, `window.Motion.scroll(...)`, `window.Motion.stagger(...)`, etc. without themselves being modules.

**Why CDN, not self-hosted:** the standalone UMD build is ~22 KB gzipped, which alone exceeds the 20 KB JS budget. There is no prebuilt single-file ESM bundle, so self-hosting would require vendoring the full module graph or introducing a bundler — both off-spec for this repo. The CDN module is an intentional, documented exception to the "no third-party runtime dependency" rule used elsewhere (see **Fonts**). Keep the version pinned; do not switch to `@latest`.

**Load-order guarantee:** `<script type="module">` and classic `<script defer>` share the same deferred queue and execute in document order, so the bootstrap completes (including all of Motion's internal imports) before `typing.js` runs. If you add a new classic script that uses Motion, it must stay after the bootstrap in `index.html`.

**Reduced-motion parity still applies.** All Motion calls must be gated by `window.matchMedia('(prefers-reduced-motion: reduce)').matches` the same way CSS animations are — reveal the final state immediately for reduced-motion users (see **Accessibility and responsive rules to preserve**).

**Graceful degradation:** if `window.Motion` is undefined (CDN down, offline, CSP), existing CSS-driven reveals (`.hidden` → `.visible`) must continue to work. Do not make content visibility depend on Motion — only the *animation* of that transition.

## Performance budget

Hard numbers from the spec: total initial transfer < 150 KB gzipped (HTML + CSS + JS + font), JS total < 20 KB gzipped, CSS < 25 KB gzipped, font < 60 KB, OG image < 60 KB, LCP < 1.5s on 4G mid-tier, TTI < 2.5s, CLS = 0. All scripts are `defer`. No Google Fonts, no polyfills, ES2020 baseline. **Motion** (see above) is the one sanctioned third-party runtime dep, loaded from `cdn.jsdelivr.net` as a pinned ES module; its bytes are not counted against the local JS budget but its CDN load time is on the critical path for animated reveals.

## Print styles

`@media print` in `style.css` hides all terminal chrome and motion, swaps the page to black-on-white with system serif body + system mono for prompts, and appends `href` after every external link. It's ~40 lines and worth keeping tidy when adding new chrome.

## Assets

- `assets/Pradeep_Sr_Engineer_Resume.pdf` — the linked resume download. The duplicate at the repo root exists but is not the one referenced from the page.
- `assets/fonts/jetbrains-mono-variable.woff2` — self-hosted font.
- `assets/og.jpg` — Open Graph preview image (1200×630, ~55 KB). Regenerate by opening `tools/og-generator.html`, element-screenshotting the `.og` block, and re-encoding as JPEG.
- `assets/apple-touch-icon.png`, `favicon-32.png`, `favicon-16.png` — generated from `tools/favicon-generator.html` (screenshot each tile, crop to exact pixel size).

## Analytics

No third-party analytics. The page is server-agnostic static HTML with zero tracking — keep it that way.
