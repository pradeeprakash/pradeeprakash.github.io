# Terminal Portfolio Website — Design Spec

**Author:** Pradeep Prakash
**Date:** 2026-04-14
**Status:** Approved

## Goal

Build a personal portfolio website styled as a full terminal simulation to showcase backend engineering work and land senior/staff engineering roles. The site should be visually striking ("full spectacle") with heavy CSS animations and vanilla JS effects, deployable as a static site to GitHub Pages.

## Tech Stack

- **HTML** — single `index.html`, semantic markup
- **CSS** — custom CSS, CSS variables for theming, keyframe animations, no frameworks
- **JS** — vanilla JavaScript, no libraries. Canvas API for matrix rain, IntersectionObserver for scroll triggers, requestAnimationFrame for smooth animations
- **Hosting** — static files, GitHub Pages compatible

## Page Structure

Single-page scroll. The entire site is wrapped in a "terminal window" with a macOS-style title bar (red/yellow/green dots, `pradeep@portfolio ~` label). A full-viewport `<canvas>` renders a matrix rain background behind everything.

### Sections (scroll order)

1. **Hero** — typing animation intro
2. **About** — `$ cat about.json`
3. **Experience** — `$ history --verbose`
4. **Skills** — `$ top -systems`
5. **Contact** — `$ whoami --contact`

### Navigation

Fixed top bar, always visible on scroll.

- Left: `❯ pp.dev` logo
- Right: `./about  ./experience  ./skills  ./contact` (file-path style links)
- Active section highlighted in green (tracked via IntersectionObserver)
- Smooth scroll on click

## Section Details

### Hero

Full-viewport first impression. Animation sequence on page load:

1. Matrix rain starts falling in background canvas
2. "Last login: Mon Apr 14 09:32:01 on ttys001" fades in
3. `$ whoami` types out character by character (~60ms/char, 40-80ms randomness)
4. Name "Pradeep Prakash" appears with glitch effect (RGB split + horizontal offset, 300ms) then settles with green text-shadow glow
5. Subtitle "Backend Engineer · Distributed Systems · 7+ Years" fades in
6. `$ cat mission.txt` types out → summary text streams in line by line
7. Blinking cursor remains at final prompt

### About — `$ cat about.json`

Triggered on scroll into view. Command types out, then a JSON block renders with syntax highlighting:

```json
{
  "name": "Pradeep Prakash",
  "role": "Software Engineer III",
  "company": "Fynd (Reliance Retail)",
  "location": "Bengaluru, India",
  "experience": "7+ years",
  "focus": [
    "fault-tolerant data pipelines",
    "event-driven services",
    "multi-tenant platforms"
  ],
  "status": "open_to_opportunities"
}
```

Each key-value pair fades in sequentially (50ms delay between lines). Syntax colors: keys in red, strings in yellow, brackets in gray.

### Experience — `$ history --verbose`

Vertical timeline with left border. Each role is a card:

**Current role (Fynd):**
- Glowing green left border + green dot indicator
- Title, company, date range badge
- Tech stack tags (green pill badges)
- Full bullet points with green arrow prefixes:
  - 6-stage fault-tolerant ingestion pipeline — 200-500 rec/s, p99 <400ms
  - Cut pod memory ~80% (1.5GB → 300MB) via cursor streaming
  - Owned Fynd Coupons: 0 → 97K MAU, 99.9% availability
  - Reduced incidents by 40% via circuit breakers
  - Fynd Star 2023, 2024, 2025, 2026

**Previous roles (Byju's):**
- Gray left border, dimmer styling
- Condensed bullets (Teacher Tech, Tutor CMS)

**Earlier roles (Acube Tech, Codingmart):**
- Minimal single-line entries with gray text

Cards stagger slide-in from left (100ms delay between each) on scroll.

### Skills — `$ top -systems`

Styled as an htop/top system monitor. Four categories in a 2-column grid:

- **Languages:** Node.js, TypeScript, SQL
- **Data & Infra:** MongoDB, PostgreSQL, Redis
- **Streaming:** Kafka, RabbitMQ
- **Platform:** Kubernetes, Docker, GCP/AWS

Each skill is a labeled progress bar (green filled blocks `████` against dark unfilled blocks). Bars animate from 0% to target width over 800ms with easing on scroll into view. Subtle shimmer/pulse animation once filled.

### Contact — `$ whoami --contact`

Output-style display:

- `EMAIL` → pradeep00327@gmail.com (clickable mailto)
- `LINKEDIN` → linkedin.com/in/pradeep-prakash24 (external link)
- `GITHUB` → github.com/pradeeprakash (external link)
- `RESUME` → download resume.pdf (triggers download with "downloading..." animation)

Links glow green on hover with slight translate-x shift. Section ends with:
`Connection closed. Thanks for visiting. ▋`

## Effects & Animations

### Matrix Rain Background
- Full-viewport `<canvas>` element, z-index behind all content
- Green katakana + latin characters falling at low opacity (0.03–0.05)
- Characters speed up briefly on scroll (parallax response)
- Disabled on mobile (replaced with static dark gradient)

### Typing Animations
- Hero: full typing sequence on page load
- Section headers: each `$ command` types out on scroll into view (IntersectionObserver, threshold 0.2)
- Speed: ~60ms/char with randomness (40–80ms) for realism
- Blinking cursor at each prompt

### Glitch & Flicker
- Name reveal: RGB split glitch (red/blue channel offset + horizontal displacement) for 300ms
- Section headings: subtle glitch on hover (CSS `clip-path` based)
- CRT scanline overlay: faint repeating horizontal lines across entire page via CSS pseudo-element
- Random screen flicker: whole page brightness dips for 50ms every 15–30 seconds

### Scroll-Triggered Reveals
- IntersectionObserver (threshold 0.2) activates each section
- Sequence: command types → content appears
- Experience cards: staggered slide-in from left (100ms between each)
- Skill bars: fill from 0% over 800ms
- JSON about: sequential line reveal (50ms between lines)
- Contact links: fade in one by one

### Hover & Interaction
- Nav links: green underline slides in from left
- Experience cards: border glows brighter, subtle box-shadow pulse
- Skill bars: show label text on hover
- Contact links: green glow + translate-x shift
- Resume download: "downloading..." text animation before actual download

## Mobile Adaptations

- Matrix rain: disabled, replaced with static dark gradient background
- Typing animations: faster (30ms/char) or skip-to-complete on tap
- Skills grid: single column stack
- Terminal window: full-width, no visible title bar chrome
- Nav: hamburger menu with terminal-style dropdown (`$ ls ./pages`)
- Screen flicker: disabled
- Experience cards: full-width, no slide-in animation

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0a0a0a` | Page background |
| `--bg-terminal` | `#0d0d0d` | Terminal window background |
| `--bg-card` | `#111111` | Card/block backgrounds |
| `--bg-titlebar` | `#1a1a1a` | Terminal title bar |
| `--green` | `#00ff88` | Primary accent, prompts, active states |
| `--green-dim` | `#00ff8844` | Subtle green tints |
| `--yellow` | `#ffd93d` | JSON strings, awards, secondary accent |
| `--red` | `#ff6b6b` | JSON keys, labels |
| `--blue` | `#6b9fff` | Links, path segments |
| `--white` | `#e0e0e0` | Primary text |
| `--gray` | `#888888` | Secondary text |
| `--dark-gray` | `#555555` | Muted text, borders |

## File Structure

```
portfolio/
├── index.html          # Single page, all sections
├── css/
│   └── style.css       # All styles, animations, responsive
├── js/
│   ├── matrix.js       # Canvas matrix rain effect
│   ├── typing.js       # Typing animation engine
│   ├── scroll.js       # IntersectionObserver scroll triggers
│   └── effects.js      # Glitch, flicker, hover effects
├── assets/
│   └── Pradeep_Sr_Engineer_Resume.pdf
└── README.md           # (only if needed for GitHub Pages)
```

## Content Source

All content is derived from the resume at `https://pradeeprakash.github.io/Pradeep_Sr_Engineer_Resume.pdf`. Key data points:

- Name: Pradeep Prakash
- Location: Bengaluru
- Email: pradeep00327@gmail.com
- Phone: +91 86674 12047
- LinkedIn: linkedin.com/in/pradeep-prakash24
- 4 roles: Fynd (current), Byju's, Acube Tech, Codingmart
- Education: B.E. Computer Science, K.S. Rangasamy College of Technology (2015-2019)

## Out of Scope

- Blog / writing section
- Separate project case studies
- Contact form / backend
- CMS or admin panel
- Analytics (can be added later)
- Framework or build tooling — pure static files
