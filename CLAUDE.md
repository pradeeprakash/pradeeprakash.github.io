# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Static single-page portfolio with a terminal / CRT aesthetic. **No build system, no package manager, no tests, no framework.** Just `index.html`, `css/style.css`, and four vanilla-JS files loaded in a specific order. To preview, open `index.html` directly in a browser or serve the directory with any static server (e.g. `python3 -m http.server`).

## JS module layout and load order

Scripts are loaded from `index.html` in this order — the order matters:

1. `js/matrix.js` — Matrix-rain canvas behind everything. Self-contained IIFE. Disables itself on viewports < 768 px and when `prefers-reduced-motion` is set. Exposes a scroll-throttled "boost" effect.
2. `js/typing.js` — Runs the hero boot sequence on `DOMContentLoaded` **and** attaches the shared typewriter utility as `window.typeText(el, text, speed)`. Any future typing effect should reuse this global rather than re-implementing it.
3. `js/effects.js` — Glitch hover on `.glitch` elements, random screen flicker (15–30 s, wide-viewport only), and the "downloading…" animation on the resume link.
4. `js/scroll.js` — The orchestrator. Owns section reveal, nav active-link tracking, smooth-scroll, and the mobile hamburger. **Depends on `window.typeText` from `typing.js`** — do not reorder the `<script>` tags or wrap scroll.js before typing.js loads.

All four files use the IIFE + `'use strict'` pattern (except `typing.js`, which intentionally attaches a global).

## Section reveal pattern

This is the most load-bearing structural concept. Each non-hero section (`#about`, `#experience`, `#skills`, `#contact`) follows the same HTML contract:

```
<section id="...">
  <div class="prompt-line section-trigger">
    <span class="typed-command" data-text="<command to type>"></span>
  </div>
  <div class="section-content"> ... </div>
</section>
```

On `DOMContentLoaded`, `scroll.js` hides every `.section-content` and sets up an `IntersectionObserver` on every `.section-trigger`. When a trigger enters the viewport it:

1. Types the `data-text` command via `window.typeText`.
2. Calls `revealSection(section)`, which **dispatches by `section.id`** to `animateAbout` / `animateExperience` / `animateSkills` / `animateContact`.

Adding a new section therefore requires three edits: the HTML structure above, a new `case` in `revealSection`'s switch, and a matching `animate<Name>` function. The hero is special — it's driven by `runHeroSequence` in `typing.js`, not the observer.

## Skills bar rendering

Skill bars are built dynamically by `buildSkillBar` in `scroll.js` from `<div class="skill-bar" data-skill="..." data-level="0-100">` stubs in the HTML. The bar is 20 block characters wide (`BAR_TOTAL = 20`), uses `█` for filled and `░` for empty, and fills one block at a time on a 30 ms tick once the skills section scrolls into view.

## Visibility conventions

CSS relies on two coupled classes toggled from JS: `.hidden` (opacity 0, translated down 10 px) and `.visible` (opacity 1, transitioned in). The `slide-in-left` variant is used for experience cards. When writing new reveal logic, follow the same add-`.hidden`-on-init / swap-to-`.visible`-on-reveal pattern rather than introducing a new mechanism.

## Accessibility and responsive rules to preserve

- `prefers-reduced-motion: reduce` short-circuits the matrix rain entirely and skips the screen flicker. Keep new motion-heavy effects guarded the same way.
- The 768 px breakpoint is the mobile cutoff in both CSS (`@media (max-width: 768px)`) and JS (`matrix.js` `isMobile()`, `effects.js` flicker guard). Keep these in sync if the breakpoint changes.
- Matrix canvas has `aria-hidden="true"`; scanline overlay has `aria-hidden="true"` and `pointer-events: none`. Decorative-only elements should stay that way.

## Theme tokens

All colors live as CSS custom properties on `:root` in `css/style.css` (`--green`, `--green-dim`, `--yellow`, `--red`, `--blue`, `--white`, `--gray`, `--dark-gray`, plus background tiers). Prefer editing variables over hard-coding hex values in new rules.

## Assets

`assets/Pradeep_Sr_Engineer_Resume.pdf` is the linked resume download. The duplicate at the repo root exists but is not the one referenced from the page.
