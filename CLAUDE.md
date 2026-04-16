# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Static single-page portfolio with a terminal aesthetic — CRT scanline overlay, terminal chrome, and a typewriter for typed commands. **No build system, no package manager, no tests, no framework.** Just `index.html`, `css/style.css`, and three vanilla-JS files loaded in a specific order. To preview, open `index.html` directly in a browser or serve the directory with any static server (e.g. `python3 -m http.server`).

## JS module layout and load order

Scripts are loaded from `index.html` in this order — the order matters:

1. `js/typing.js` — Runs the hero boot sequence on `DOMContentLoaded` **and** attaches the shared typewriter utility as `window.typeText(el, text, speed)`. Any future typing effect should reuse this global rather than re-implementing it.
2. `js/effects.js` — "Downloading…" animation on the resume link.
3. `js/scroll.js` — The orchestrator. Owns section reveal, nav active-link tracking, smooth-scroll, and the mobile hamburger. **Depends on `window.typeText` from `typing.js`** — do not reorder the `<script>` tags or wrap scroll.js before typing.js loads.

All three files use the IIFE + `'use strict'` pattern (except `typing.js`, which intentionally attaches a global).

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

## Skills rendering

Skills are plain categorised tag groups. Each `.skill-category` contains a `.skill-category-label` and a `.skill-tags` flex row of `<span class="tag">`. `animateSkills` in `scroll.js` stagger-reveals each `.skill-category` on a 100 ms tick once the skills section scrolls into view. There are no percentage bars — do not reintroduce self-rated skill levels; they read as junior.

## Visibility conventions

CSS relies on two coupled classes toggled from JS: `.hidden` (opacity 0, translated down 10 px) and `.visible` (opacity 1, transitioned in). The `slide-in-left` variant is used for experience cards. When writing new reveal logic, follow the same add-`.hidden`-on-init / swap-to-`.visible`-on-reveal pattern rather than introducing a new mechanism.

## Accessibility and responsive rules to preserve

- The 768 px breakpoint is the mobile cutoff in CSS (`@media (max-width: 768px)`). Keep new mobile/desktop forks on the same breakpoint.
- Scanline overlay has `aria-hidden="true"` and `pointer-events: none`. Decorative-only elements should stay that way.
- If any future motion-heavy effect is reintroduced (matrix rain, glitch, flicker were deliberately removed for a11y + perf reasons), guard it behind `window.matchMedia('(prefers-reduced-motion: reduce)')`.

## Theme tokens

All colors live as CSS custom properties on `:root` in `css/style.css` (`--green`, `--green-dim`, `--yellow`, `--red`, `--blue`, `--white`, `--gray`, `--dark-gray`, plus background tiers). Prefer editing variables over hard-coding hex values in new rules.

## Assets

`assets/Pradeep_Sr_Engineer_Resume.pdf` is the linked resume download. The duplicate at the repo root exists but is not the one referenced from the page.
