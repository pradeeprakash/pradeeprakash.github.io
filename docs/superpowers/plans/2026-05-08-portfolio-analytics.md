# Portfolio Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the static portfolio from GitHub Pages to the existing Vercel project, then enable Vercel Web Analytics with three custom events (pageviews + `contact_click` with channel + `resume_download`).

**Architecture:** Single Vercel project serves both the static site (project root) and the API function (`api/chat.js`). Vercel Web Analytics' beacon endpoint is same-origin (`/_vercel/insights/event`), which only works once the static page lives on Vercel. A single tracking hook in `js/palette.js` (the canonical command dispatcher) covers every interactive surface — ⌘K, mobile sheet, the easter-egg shell, and `data-command` clicks all flow through it. After migration, the static page's `connect-src` and `agent.js`'s `API_URL` collapse to same-origin, removing the four-place hardcoded `vercel.app` URL flagged in `CLAUDE.md`. The GitHub Pages deployment is retained as a permanent redirect via a `gh-pages` branch.

**Tech Stack:** Static HTML/CSS/vanilla-JS portfolio (no build, no test runner, no package manager). Vercel serverless function (Node) at `api/chat.js`. Vercel Web Analytics. Reference spec: `docs/superpowers/specs/2026-05-08-portfolio-analytics-design.md`.

---

## Important context

This project has **no test runner, no package manager, no build system** by design (per `CLAUDE.md` § Project shape). Verification per task means:

- `node --check <file>.js` for JavaScript syntax
- `python3 -c "import json; json.load(open('vercel.json'))"` for `vercel.json` JSON validity
- Manual browser inspection (DevTools → Network / Console) on a Vercel preview URL
- Vercel dashboard for analytics events

There are no unit tests to write. Where the writing-plans skill normally calls for "Write the failing test", this plan substitutes concrete syntax/format checks plus a final end-to-end QA pass against a preview deployment.

**One PR, multiple commits.** Tasks 4–12 ship as a single PR with one commit per task so each is independently revertible. Task 13 opens the PR; Task 14 merges. Tasks 16–17 are operational, executed after merge.

---

## File map

| File | Action | Purpose after change |
|---|---|---|
| `js/analytics.js` | **create** | IIFE exposing `window.track(name, props)`. Forwards to Vercel's `va()` only on canonical production hosts; no-ops elsewhere. |
| `js/palette.js` | modify (lines 81–91) | Add tracking call + `mapToTrackEvent` helper at top of `runCommand`. |
| `js/agent.js` | modify (line 10) | `API_URL` → relative `/api/chat`. |
| `index.html` | modify (lines 15, 476–483) | CSP `connect-src` → `'self'`. Add Vercel Analytics script + `analytics.js` to script chain. |
| `api/chat.js` | modify (line 61) | Drop GitHub Pages and absolute Vercel origins from CORS allowlist. |
| `vercel.json` | modify (line 8) | CSP `connect-src` header → `'self'`. |
| `CLAUDE.md` | modify (3 sections) | Rewrite `## Analytics`; collapse "four-place hardcoded URL" warning; update Project shape intro. |

---

## Phase 1 — Pre-flight (no commits)

These three tasks do not produce code changes. They gather information and toggle dashboard settings the code will depend on.

---

### Task 1: Audit Vercel project for static-deploy readiness

**Files:** Read-only audit. No file changes.

- [ ] **Step 1: Confirm `vercel.json` does not block static-asset serving**

Run:
```bash
cat /Users/pradeeptheneshaa/Projects/portfolio/vercel.json
```

Expected: a `headers` array applying CSP and security headers to `/(.*)`. **No `framework`, `outputDirectory`, `routes`, or `rewrites` keys.** If any of those are present, they may suppress automatic static-file serving and need to be removed in a later task — flag and stop.

The current file (verified at plan-write time) has only `headers`. No action needed beyond confirming this.

- [ ] **Step 2: Confirm the Vercel project has no framework preset that hides static assets**

In a browser, open the Vercel dashboard for the `portfolio-nu-six-g0nsnyjwbz` project → Settings → General → "Framework Preset". Expected: `Other` or unset. If a framework like Next.js is set, that overrides static-file serving — change to `Other` before continuing.

- [ ] **Step 3: Note the deployment URL pattern**

In Vercel dashboard → Deployments → identify both the production deployment URL and the most recent preview URL. Record:
- Production: `<production>.vercel.app`
- Preview pattern: `<project>-git-<branch>-<scope>.vercel.app`

These are needed for verification in later tasks.

---

### Task 2: Determine canonical production host

**Files:** None (decision-only).

- [ ] **Step 1: Decide whether to rename the Vercel project for a cleaner host**

Today's Vercel-assigned host is `portfolio-nu-six-g0nsnyjwbz.vercel.app`. Vercel offers a free project rename (Settings → General → Project Name) which changes the host. Realistic options:
- Keep current host: `portfolio-nu-six-g0nsnyjwbz.vercel.app` (ugly but no work)
- Rename to e.g. `pradeep-prakash` → `pradeep-prakash.vercel.app` (recommended)
- Rename to e.g. `portfolio` → `portfolio.vercel.app` (may collide; Vercel will append a suffix if so)

Decide now and rename if applicable. **The chosen hostname is referenced in the `CANONICAL_HOSTS` array in Task 6.** Pick one before proceeding.

- [ ] **Step 2: Record the canonical host**

Write down the final canonical hostname (the one without `https://` or path) in a notes file or scratchpad — Task 6 will paste it into `js/analytics.js`. Example: `pradeep-prakash.vercel.app`.

---

### Task 3: Enable Vercel Web Analytics on the project

**Files:** None.

- [ ] **Step 1: Toggle Web Analytics on**

Vercel dashboard → `<project>` → Analytics → Web Analytics → "Enable". Confirm the panel switches from "Disabled" to "Enabled — collecting events."

Expected: a "no data yet" placeholder dashboard appears. The script tag added in Task 8 is what populates it.

- [ ] **Step 2: Verify the free-tier quota**

Same panel: confirm the free Hobby tier shows ~2.5K events/month. Plenty for a portfolio. No action if already on a paid tier.

---

## Phase 2 — Feature branch + Vercel static deploy verification

---

### Task 4: Create feature branch

**Files:** None (git only).

- [ ] **Step 1: Verify clean starting point**

Run:
```bash
cd /Users/pradeeptheneshaa/Projects/portfolio
git status
```

If unrelated working-tree changes exist (from prior sessions), stash them first:
```bash
git stash push -m "pre-analytics-migration scratch"
```

- [ ] **Step 2: Create the branch**

Run:
```bash
git checkout -b feat/analytics-and-vercel-migration main
```

Expected: branch created from `main`.

---

### Task 5: Verify Vercel preview deploys static files correctly

**Files:** None — we're verifying the existing setup before changing anything.

- [ ] **Step 1: Push the empty branch to trigger a preview deploy**

Run:
```bash
git push -u origin feat/analytics-and-vercel-migration
```

- [ ] **Step 2: Open the preview URL**

In the Vercel dashboard → Deployments → find the new preview for this branch. Open the URL.

Expected: the portfolio renders identically to the GitHub Pages version. The hero, sections, command palette, and AI agent panel all work. The agent panel still uses a cross-origin `fetch` to `portfolio-nu-six-g0nsnyjwbz.vercel.app` because we have not yet changed `API_URL` — that's intentional, ships in Task 9.

If the preview shows anything other than the expected page (404, raw file listing, blank), STOP — this means Vercel is not serving the static files. Re-audit `vercel.json` and the Vercel dashboard's framework preset before proceeding.

- [ ] **Step 3: Smoke-test agent on preview**

On the preview URL, open the AI agent panel (FAB, ⌘K, or the command palette → "agent"). Send a message. Verify a streaming response renders. This confirms the function still works while we're cross-origin.

If the agent fails on preview but works on production, check the CORS allowlist in `api/chat.js` — the preview URL's origin may not be in `allowed`. **Do not fix this in `api/chat.js` yet** (Task 11 rewrites that allowlist anyway). Instead, temporarily test against the production GitHub Pages site to confirm the agent code itself is unbroken.

---

## Phase 3 — Ship analytics code

---

### Task 6: Create `js/analytics.js`

**Files:**
- Create: `/Users/pradeeptheneshaa/Projects/portfolio/js/analytics.js`

- [ ] **Step 1: Write the file**

Create `js/analytics.js` with this exact content. Replace the placeholder string in `CANONICAL_HOSTS` with the canonical hostname recorded in Task 2 (e.g. `'pradeep-prakash.vercel.app'`). Keep the `''` quotes.

```javascript
/* ============================================================
   ANALYTICS.JS — Tiny shim over Vercel Web Analytics.
                  Forwards window.track() calls to window.va()
                  only when running on a canonical production host.
   ============================================================ */

(function () {
  'use strict';

  // Positive-match against the production canonical host(s).
  // Append entries here when adding a custom domain; old hosts can stay
  // in the list during a transition window.
  var CANONICAL_HOSTS = [
    'REPLACE_ME_CANONICAL_HOST',  // e.g. 'pradeep-prakash.vercel.app'
  ];

  function isProductionHost() {
    return CANONICAL_HOSTS.indexOf(location.hostname) !== -1;
  }

  window.track = function (name, props) {
    if (!isProductionHost()) return;
    if (typeof window.va !== 'function') return;  // Script not loaded — silent no-op.
    try {
      window.va('event', Object.assign({ name: name }, props || {}));
    } catch (e) {
      // Never break the page over an analytics error.
    }
  };
})();
```

**Replace `REPLACE_ME_CANONICAL_HOST` with the hostname from Task 2 before saving.** If you forget, the site will deploy fine but no events will ever fire.

- [ ] **Step 2: Verify syntax**

Run:
```bash
node --check /Users/pradeeptheneshaa/Projects/portfolio/js/analytics.js
```

Expected: no output (success). Any syntax error means re-check the file.

- [ ] **Step 3: Verify the placeholder was replaced**

Run:
```bash
grep -n "REPLACE_ME" /Users/pradeeptheneshaa/Projects/portfolio/js/analytics.js
```

Expected: no matches. If the placeholder still appears, edit the file and replace it.

- [ ] **Step 4: Commit**

```bash
cd /Users/pradeeptheneshaa/Projects/portfolio
git add js/analytics.js
git commit -m "feat(analytics): add window.track shim over Vercel Web Analytics

Tiny IIFE that forwards window.track(name, props) to window.va('event', ...)
only when running on a canonical production host. No-ops on localhost,
Vercel previews, and any host not in CANONICAL_HOSTS — so dev/preview
traffic never pollutes the production dashboard."
```

---

### Task 7: Add tracking hook + `mapToTrackEvent` helper to `js/palette.js`

**Files:**
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/js/palette.js` (lines 75–91)

- [ ] **Step 1: Add the `mapToTrackEvent` helper above the public API block**

Open `js/palette.js`. Find the `Public API` section header at line 76:

```javascript
  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  window.commands = commands;
```

Insert this block **immediately above** the `// Public API` header (so it sits between the existing private functions and the public API). It must be inside the IIFE.

```javascript
  // ----------------------------------------------------------
  // Analytics — single source of truth for which commands are tracked.
  // Returns null for commands that should NOT fire an event.
  // ----------------------------------------------------------
  var TRACKED = {
    resume:   { name: 'resume_download' },
    email:    { name: 'contact_click', props: { channel: 'email' } },
    linkedin: { name: 'contact_click', props: { channel: 'linkedin' } },
    github:   { name: 'contact_click', props: { channel: 'github' } },
  };

  function mapToTrackEvent(commandName) {
    return TRACKED[commandName] || null;
  }

```

- [ ] **Step 2: Add the tracking call inside `runCommand`**

In the same file, locate `window.runCommand` (currently lines 81–91):

```javascript
  window.runCommand = function (name) {
    var token = (name || '').trim().toLowerCase();
    if (!token) return { ok: false, output: '' };
    var cmd = findCommand(token);
    if (!cmd) {
      return { ok: false, output: "command not found: " + token + ". try 'help'." };
    }
    var out;
    try { out = cmd.action(); } catch (e) { out = 'error: ' + e.message; }
    return { ok: true, output: out || '' };
  };
```

Replace it with:

```javascript
  window.runCommand = function (name) {
    var token = (name || '').trim().toLowerCase();
    if (!token) return { ok: false, output: '' };
    var cmd = findCommand(token);
    if (!cmd) {
      return { ok: false, output: "command not found: " + token + ". try 'help'." };
    }
    if (window.track) {
      var ev = mapToTrackEvent(token);
      if (ev) window.track(ev.name, ev.props);
    }
    var out;
    try { out = cmd.action(); } catch (e) { out = 'error: ' + e.message; }
    return { ok: true, output: out || '' };
  };
```

The tracking call sits **after** command lookup (so unknown commands don't fire events) but **before** action execution (so the event is recorded even if the action throws). The `if (window.track)` guard means the page works fine if `analytics.js` failed to load.

- [ ] **Step 3: Verify syntax**

Run:
```bash
node --check /Users/pradeeptheneshaa/Projects/portfolio/js/palette.js
```

Expected: no output. Any error means a typo — re-check the inserted block.

- [ ] **Step 4: Verify the four tracked commands all exist in the `commands` registry**

Run:
```bash
grep -n "name: 'resume'\|name: 'email'\|name: 'linkedin'\|name: 'github'" /Users/pradeeptheneshaa/Projects/portfolio/js/palette.js
```

Expected: four matches. If any command is missing, the corresponding `TRACKED` entry is dead code — but leaving it is harmless and future-proof.

- [ ] **Step 5: Commit**

```bash
git add js/palette.js
git commit -m "feat(analytics): instrument resume + contact commands in runCommand

One canonical hook at the top of runCommand fires window.track() for
the four interactive commands that funnel into recruiter intent
(resume, email, linkedin, github). Untracked commands no-op via the
TRACKED lookup table. Aligns with the 'Command registry' rule in
CLAUDE.md so every entry surface (palette / mobile sheet / shell /
data-command click) is covered automatically."
```

---

### Task 8: Wire analytics scripts into `index.html`

**Files:**
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/index.html` (line 476 area: script chain)

- [ ] **Step 1: Add the Vercel Analytics script tag**

Open `index.html`. Find the script chain at lines 476–483:

```html
  <script type="module" src="js/motion-bootstrap.mjs"></script>
  <script src="js/typing.js" defer></script>
  <script src="js/effects.js" defer></script>
  <script src="js/palette.js" defer></script>
  <script src="js/shell.js" defer></script>
  <script src="js/scroll.js" defer></script>
  <script src="js/cube.js" defer></script>
  <script src="js/agent.js" defer></script>
```

Replace it with:

```html
  <script type="module" src="js/motion-bootstrap.mjs"></script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script src="js/typing.js" defer></script>
  <script src="js/effects.js" defer></script>
  <script src="js/palette.js" defer></script>
  <script src="js/analytics.js" defer></script>
  <script src="js/shell.js" defer></script>
  <script src="js/scroll.js" defer></script>
  <script src="js/cube.js" defer></script>
  <script src="js/agent.js" defer></script>
```

Two changes:
1. The Vercel Analytics script is added immediately after the Motion bootstrap. It's same-origin (loaded from `/_vercel/insights/script.js`) and `defer`-loaded, so it doesn't block render. **No `data-domain` attribute** — Vercel auto-attributes events to the project hosting the deployment.
2. `js/analytics.js` is added immediately after `palette.js` and before `shell.js`. The order matters because `palette.js`'s `runCommand` reads `window.track`, and `defer` scripts execute in document order — so `analytics.js` must load before any later script that triggers a command.

- [ ] **Step 2: Verify the HTML still parses**

Run:
```bash
python3 -c "from html.parser import HTMLParser; HTMLParser().feed(open('/Users/pradeeptheneshaa/Projects/portfolio/index.html').read()); print('OK')"
```

Expected: `OK`. (Python's parser is lenient; it'll catch only egregious tag breakage.)

- [ ] **Step 3: Confirm script load order**

Run:
```bash
grep -n 'defer src\|src=.*defer\|src="/_vercel\|src="js/' /Users/pradeeptheneshaa/Projects/portfolio/index.html | tail -15
```

Expected output (line numbers may shift slightly):
```
476:  <script type="module" src="js/motion-bootstrap.mjs"></script>
477:  <script defer src="/_vercel/insights/script.js"></script>
478:  <script src="js/typing.js" defer></script>
479:  <script src="js/effects.js" defer></script>
480:  <script src="js/palette.js" defer></script>
481:  <script src="js/analytics.js" defer></script>
482:  <script src="js/shell.js" defer></script>
483:  <script src="js/scroll.js" defer></script>
484:  <script src="js/cube.js" defer></script>
485:  <script src="js/agent.js" defer></script>
```

If `analytics.js` is anywhere other than between `palette.js` and `shell.js`, fix it.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(analytics): load Vercel Analytics + analytics.js in script chain

Adds /_vercel/insights/script.js after the Motion bootstrap (same-origin,
no attributes — Vercel auto-attributes events to the project) and
js/analytics.js between palette.js and shell.js (palette.js calls
window.track, so analytics.js must load before any later script
triggers a command)."
```

---

## Phase 4 — Same-origin cleanup

---

### Task 9: Switch `js/agent.js` `API_URL` to relative path

**Files:**
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/js/agent.js` (line 10)

- [ ] **Step 1: Replace the absolute URL**

Open `js/agent.js`. Line 10 currently reads:

```javascript
  var API_URL = 'https://portfolio-nu-six-g0nsnyjwbz.vercel.app/api/chat';
```

Replace with:

```javascript
  var API_URL = '/api/chat';
```

This is the only occurrence. The fetch call at line 319 (`fetch(API_URL, ...)`) does not need to change.

- [ ] **Step 2: Verify syntax**

Run:
```bash
node --check /Users/pradeeptheneshaa/Projects/portfolio/js/agent.js
```

Expected: no output.

- [ ] **Step 3: Confirm no other absolute Vercel URLs remain in `agent.js`**

Run:
```bash
grep -n "vercel.app" /Users/pradeeptheneshaa/Projects/portfolio/js/agent.js
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add js/agent.js
git commit -m "refactor(agent): use relative /api/chat (same-origin after migration)

Now that the static page is served from the same Vercel project as the
function, the absolute deployment URL is unnecessary. Removes one of
the four hardcoded vercel.app references flagged in CLAUDE.md."
```

---

### Task 10: Update CSP `connect-src` in `index.html` and `vercel.json`

**Files:**
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/index.html` (line 15)
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/vercel.json` (line 8)

- [ ] **Step 1: Update the meta-tag CSP in `index.html`**

Open `index.html`. Line 15 currently reads (single long line):

```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'sha256-X5hPVT85ldEWaDaWxx6wMu8Y9M6DDhWiu7FOXsKKSCk='; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net https://portfolio-nu-six-g0nsnyjwbz.vercel.app; frame-ancestors 'none'; base-uri 'self'; form-action 'none'">
```

The `connect-src 'self' https://cdn.jsdelivr.net https://portfolio-nu-six-g0nsnyjwbz.vercel.app` substring needs the absolute Vercel URL removed (because `/api/chat` and `/_vercel/insights/event` are both `'self'`):

```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'sha256-X5hPVT85ldEWaDaWxx6wMu8Y9M6DDhWiu7FOXsKKSCk='; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'self'; form-action 'none'">
```

`https://cdn.jsdelivr.net` stays because Motion is loaded from there.

- [ ] **Step 2: Update the response-header CSP in `vercel.json`**

Open `vercel.json`. Line 8 currently reads:

```json
          "value": "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'sha256-X5hPVT85ldEWaDaWxx6wMu8Y9M6DDhWiu7FOXsKKSCk='; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net https://portfolio-nu-six-g0nsnyjwbz.vercel.app; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"
```

Replace `connect-src 'self' https://cdn.jsdelivr.net https://portfolio-nu-six-g0nsnyjwbz.vercel.app` with `connect-src 'self' https://cdn.jsdelivr.net`. Final line:

```json
          "value": "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'sha256-X5hPVT85ldEWaDaWxx6wMu8Y9M6DDhWiu7FOXsKKSCk='; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"
```

The two CSPs (meta tag and response header) must stay identical — Vercel serves both, and a mismatch causes the browser to apply the strictest combination.

- [ ] **Step 3: Verify both CSPs match**

Run:
```bash
grep -o "default-src.*form-action 'none'" /Users/pradeeptheneshaa/Projects/portfolio/index.html
grep -o "default-src.*form-action 'none'" /Users/pradeeptheneshaa/Projects/portfolio/vercel.json
```

Expected: identical output from both commands. If they differ, copy one over the other.

- [ ] **Step 4: Verify `vercel.json` is still valid JSON**

Run:
```bash
python3 -c "import json; json.load(open('/Users/pradeeptheneshaa/Projects/portfolio/vercel.json')); print('OK')"
```

Expected: `OK`.

- [ ] **Step 5: Confirm no absolute Vercel URLs remain in either file**

Run:
```bash
grep -n "portfolio-nu-six-g0nsnyjwbz" /Users/pradeeptheneshaa/Projects/portfolio/index.html /Users/pradeeptheneshaa/Projects/portfolio/vercel.json
```

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add index.html vercel.json
git commit -m "chore(csp): drop absolute Vercel URL from connect-src

The static page and the function are now same-origin, so 'self'
covers both /api/chat and /_vercel/insights/event. cdn.jsdelivr.net
stays because Motion is still loaded from there."
```

---

### Task 11: Drop GitHub Pages and absolute Vercel origins from `api/chat.js` CORS allowlist

**Files:**
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/api/chat.js` (line 61)

- [ ] **Step 1: Update the allowlist**

Open `api/chat.js`. Line 61 currently reads:

```javascript
  const allowed = ['https://pradeeprakash.github.io', 'https://portfolio-nu-six-g0nsnyjwbz.vercel.app'];
```

After migration, the production page is same-origin and the browser sends no `Origin` header (or one matching the deployment), so the allowlist is no longer needed for the production path. Replace with:

```javascript
  const allowed = [];
```

The CORS code block above (lines 60–67) still runs — when `allowed.includes(origin)` is `false`, no `Access-Control-Allow-Origin` header is set, and the browser blocks any cross-origin attempt cleanly. Same-origin requests don't need the header at all, so they continue to work.

If you want to retain a path for `vercel dev` (which serves on `http://localhost:3000` by default), use:

```javascript
  const allowed = ['http://localhost:3000'];
```

Pick the empty-array variant unless you actively use `vercel dev` for cross-origin testing.

- [ ] **Step 2: Verify syntax**

Run:
```bash
node --check /Users/pradeeptheneshaa/Projects/portfolio/api/chat.js
```

Expected: no output.

- [ ] **Step 3: Confirm the GH Pages and absolute Vercel origins are gone**

Run:
```bash
grep -n "pradeeprakash.github.io\|portfolio-nu-six-g0nsnyjwbz" /Users/pradeeptheneshaa/Projects/portfolio/api/chat.js
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add api/chat.js
git commit -m "chore(api): drop cross-origin allowlist after same-origin migration

Production page is now same-origin with /api/chat — browser sends no
mismatched Origin header, so the allowlist is empty. Cross-origin
attempts get no ACAO header and are blocked cleanly by the browser."
```

---

## Phase 5 — Documentation

---

### Task 12: Update `CLAUDE.md` (three sections)

**Files:**
- Modify: `/Users/pradeeptheneshaa/Projects/portfolio/CLAUDE.md` (three sections)

- [ ] **Step 1: Rewrite the `## Analytics` section at the bottom of the file**

Find the section near the end of `CLAUDE.md`:

```markdown
## Analytics

No third-party analytics. The page is server-agnostic static HTML with zero tracking — keep it that way.
```

Replace with:

```markdown
## Analytics

Vercel Web Analytics is enabled on the project. Cookieless, IP-anonymized, GDPR-compliant by default — no consent banner. Three event types are emitted:

- `pageview` — auto-emitted by `/_vercel/insights/script.js` on each load (built-in: device, country, referrer).
- `contact_click` with property `{ channel: 'email' | 'linkedin' | 'github' }` — fired when a contact-section link or button is clicked.
- `resume_download` — fired when the resume link is clicked.

Custom events are wired through a single hook at the top of `runCommand` in `js/palette.js`, which looks up the command name in a `TRACKED` table and forwards to `window.track(name, props)`. The shim in `js/analytics.js` (~0.3 KB gzipped) only forwards to Vercel's `va()` when `location.hostname` is in `CANONICAL_HOSTS` — so previews and `localhost` never pollute the production dashboard.

The Vercel script is loaded from `/_vercel/insights/script.js` (same-origin, ~1.5 KB gzipped, third-party — does not count against the 20 KB local-JS budget). If the script fails to load (CDN down, blocker, offline), `window.track` no-ops and the page works exactly as before.

Section reach, AI agent usage, and other surfaces are intentionally not tracked — keep the dashboard focused on the recruiter funnel (visits, contacts, downloads).
```

- [ ] **Step 2: Collapse the "four-place hardcoded URL" warning in the AI agent section**

Find this paragraph in the `## AI agent` section:

```markdown
**The hardcoded Vercel URL** `portfolio-nu-six-g0nsnyjwbz.vercel.app` appears in **four** places and they must update in lockstep if the deployment URL ever changes:
- [js/agent.js](js/agent.js) — `API_URL` constant.
- [api/chat.js](api/chat.js) — CORS allowlist.
- [index.html](index.html) — CSP `connect-src` (meta tag).
- [vercel.json](vercel.json) — CSP `connect-src` (response header).

A custom domain (e.g. `api.pradeeprakash.dev`) would collapse all four into one — currently deferred.
```

Replace with:

```markdown
**Same-origin after the analytics migration (2026-05-08).** The static page and the function now share an origin, so the absolute Vercel deployment URL no longer appears in code:
- `js/agent.js` uses `API_URL = '/api/chat'` (relative).
- `index.html` and `vercel.json` use `connect-src 'self'` for `/api/chat` and `/_vercel/insights/event`.
- `api/chat.js`'s CORS allowlist is empty (production traffic is same-origin and needs no ACAO).

The only place the canonical host appears is `CANONICAL_HOSTS` in `js/analytics.js` — used for production-vs-preview filtering, not for routing. Adding a custom domain means appending an entry to that array; old entries can stay during a transition window.
```

- [ ] **Step 3: Update the `## Project shape` intro to drop the GitHub Pages reference**

Find the first paragraph of `## Project shape`. The current intro mentions GitHub Pages context implicitly through the deployment URL in references. Locate the sentence describing how to preview:

```markdown
To preview the static side, open `index.html` directly in a browser or serve the directory with any static server (e.g. `python3 -m http.server`); to test the agent end-to-end, `vercel dev` (the function imports nothing it can't get from Node + `process.env`).
```

That sentence is fine — leave it. The thing that needs updating is any mention of GitHub Pages as the deployment target. Search:

```bash
grep -n "github.io\|GitHub Pages" /Users/pradeeptheneshaa/Projects/portfolio/CLAUDE.md
```

For each match, change references to "GitHub Pages" → "Vercel" where they describe the production deployment. Leave references that describe the repo URL or external links alone.

If there are no matches (CLAUDE.md may not mention GH Pages explicitly anywhere — only the user's auto-memory does), skip this step.

- [ ] **Step 4: Verify the file is still valid Markdown**

Run:
```bash
head -30 /Users/pradeeptheneshaa/Projects/portfolio/CLAUDE.md
tail -30 /Users/pradeeptheneshaa/Projects/portfolio/CLAUDE.md
```

Expected: clean Markdown (no broken code fences, no orphan headings). If anything looks off, re-read the file and fix.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): rewrite Analytics + collapse 4-place URL warning

- ## Analytics: replace 'no third-party analytics' rule with the new
  posture (Vercel Web Analytics, three custom event types, single hook
  in runCommand, CANONICAL_HOSTS production-only guard).
- ## AI agent: the four-place hardcoded vercel.app URL is gone after
  the same-origin migration. Only place the canonical host appears
  in code is CANONICAL_HOSTS in js/analytics.js (filtering, not routing)."
```

---

## Phase 6 — Verify and ship

---

### Task 13: Push branch, open PR, run preview QA

**Files:** None (git + dashboard).

- [ ] **Step 1: Push all commits**

Run:
```bash
git push
```

Expected: 7 new commits pushed (one per task in phases 3–5: 6, 7, 8, 9, 10, 11, 12).

- [ ] **Step 2: Open PR**

Run:
```bash
gh pr create --title "Migrate to Vercel + add Web Analytics" --body "$(cat <<'EOF'
## Summary
- Migrates the static portfolio from GitHub Pages to the existing Vercel project so the static page and `/api/chat` share an origin.
- Enables Vercel Web Analytics with three custom events: pageview (auto), `contact_click` (with `channel` prop), `resume_download`.
- Collapses the four-place hardcoded `vercel.app` URL into one config entry (`CANONICAL_HOSTS` in `js/analytics.js`).
- Spec: `docs/superpowers/specs/2026-05-08-portfolio-analytics-design.md`

## Test plan
- [ ] Vercel preview URL renders identically to current production
- [ ] Agent panel opens, sends a message, streams response — same-origin in network tab
- [ ] Click resume button → `resume_download` event in Vercel Analytics within 30s
- [ ] Click email/LinkedIn/GitHub button → `contact_click` event with correct channel
- [ ] No CORS preflight on `/api/chat` after merge
- [ ] No console errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed. Open it.

- [ ] **Step 3: Wait for the Vercel preview deploy to land**

Vercel posts a preview URL as a PR comment. Wait until the deploy is "Ready" (~1–2 minutes).

- [ ] **Step 4: Preview QA — visual + functional**

Open the preview URL. Run through this checklist:

- [ ] Page renders. Hero, sections, palette, agent FAB all visible.
- [ ] Open DevTools → Console. No errors. (Warnings are OK.)
- [ ] Open DevTools → Network. Reload. Verify:
  - `/_vercel/insights/script.js` returns 200 (or 404 if Web Analytics is not yet enabled — re-do Task 3).
  - `js/analytics.js` returns 200.
  - All other `js/*.js` files return 200.
- [ ] Click the resume button. The "Downloading…" effect runs and the PDF downloads. **No** event in the production dashboard yet — preview hostname is not in `CANONICAL_HOSTS` (correct behavior).
- [ ] Click each contact button (email, LinkedIn, GitHub). Each opens the correct destination. **No** events in the production dashboard (correct).
- [ ] Open the agent panel. Send "test message". Verify a streaming response. In Network tab: the `/api/chat` request is **same-origin** (no preflight, request URL starts with the preview hostname not the absolute deployment URL).

If any of the above fails, fix on the branch and push again.

---

### Task 14: Merge PR

**Files:** None.

- [ ] **Step 1: Confirm preview QA passed (Task 13 step 4)**

Do not merge until every item in the preview QA checklist is green.

- [ ] **Step 2: Merge**

Run (or click in GitHub):
```bash
gh pr merge --squash --delete-branch
```

Or use the GitHub UI's "Squash and merge" button.

- [ ] **Step 3: Wait for production deploy**

Vercel auto-deploys `main` to production. Wait for the production deployment to land (~1–2 minutes). Confirm in the Vercel dashboard that the deployment is "Ready" and the production alias points to the new build.

---

### Task 15: Production smoke test

**Files:** None.

- [ ] **Step 1: Open the production canonical URL**

Open `https://<canonical-host>/` (the host you put in `CANONICAL_HOSTS` in Task 6).

- [ ] **Step 2: Verify visual + agent**

Same checks as Task 13 step 4 (visual, console clean, agent works same-origin).

- [ ] **Step 3: Verify analytics events fire**

On the production URL:

- Click the resume button → `resume_download` triggers.
- Click each contact button → `contact_click` triggers with the correct channel.

Open the Vercel dashboard → Analytics → Custom Events. Wait ~30 seconds and refresh. Expected:

- `resume_download`: 1 event
- `contact_click`: 3 events, with the `channel` breakdown showing `email`: 1, `linkedin`: 1, `github`: 1
- The Pages panel shows your visit as a pageview.

If events do not appear within 2 minutes:
1. Check the browser console for errors from `analytics.js` or the Vercel script.
2. Verify `location.hostname` in the console matches the entry in `CANONICAL_HOSTS`.
3. Verify Web Analytics is still enabled in the Vercel dashboard (Task 3).
4. Check the network tab for `/_vercel/insights/event` requests — if they're 404, Web Analytics is disabled.

- [ ] **Step 4: Verify localhost is filtered out**

Run locally:
```bash
cd /Users/pradeeptheneshaa/Projects/portfolio
python3 -m http.server 8000
```

Open `http://localhost:8000`. Click the resume button. Refresh the Vercel dashboard. Expected: **no new events** (localhost is not in `CANONICAL_HOSTS`, so `window.track` no-ops).

Stop the local server (`Ctrl-C`) when done.

---

## Phase 7 — Operational follow-ups (post-merge)

These are operational tasks that don't go through the PR. Do them after Task 15 is green.

---

### Task 16: Update external references to the new canonical URL

**Files:** None in this repo.

- [ ] **Step 1: Update the resume PDF**

The hosted resume PDF (`assets/Pradeep_Sr_Engineer_Resume.pdf`) likely contains a link to the portfolio. If it points to `pradeeprakash.github.io`, update the source `.docx` / `.pdf`-source to point to the new canonical URL and replace the file in the repo.

If the resume is maintained outside this repo, update it there and re-export.

- [ ] **Step 2: Update social profiles**

Update LinkedIn, GitHub profile, and any other external profile that links to the portfolio. Change the URL from `pradeeprakash.github.io` to the new canonical host.

- [ ] **Step 3: Update the auto-memory deployed-URL pointer**

The user's auto-memory has an entry referencing `pradeeprakash.github.io` (per `MEMORY.md`). Update that memory file to point to the new canonical URL so future Claude Code sessions know where the live site is.

---

### Task 17: Set up GitHub Pages → Vercel redirect

**Files:**
- Create on a new orphan `gh-pages` branch: `index.html` (redirect-only)

This task uses an **orphan branch** so the redirect-only page does not pollute `main`.

- [ ] **Step 1: Create the orphan branch**

Run:
```bash
cd /Users/pradeeptheneshaa/Projects/portfolio
git checkout --orphan gh-pages
git rm -rf .
```

Expected: empty index, no tracked files.

- [ ] **Step 2: Write the redirect page**

Create a single file `index.html` with this content. Replace `<canonical-host>` with the actual canonical host from Task 2.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pradeep Prakash — moved</title>
  <link rel="canonical" href="https://<canonical-host>/">
  <meta http-equiv="refresh" content="0; url=https://<canonical-host>/">
  <meta name="robots" content="noindex">
</head>
<body>
  <p>This page has moved to <a href="https://<canonical-host>/">https://<canonical-host>/</a>.</p>
</body>
</html>
```

- [ ] **Step 3: Commit and push the orphan branch**

```bash
git add index.html
git commit -m "feat: redirect-only landing page for legacy GitHub Pages URL

Permanent redirect from pradeeprakash.github.io to the canonical
Vercel-hosted site. noindex so search engines de-index the old URL
and rank the canonical instead."
git push -u origin gh-pages
```

- [ ] **Step 4: Configure GitHub Pages source**

In a browser: GitHub repo → Settings → Pages → "Build and deployment" → Source: "Deploy from a branch" → Branch: `gh-pages` → Folder: `/ (root)` → Save.

GitHub deploys within 1–2 minutes.

- [ ] **Step 5: Return to `main`**

Run:
```bash
git checkout main
```

- [ ] **Step 6: Verify the redirect**

Open `https://pradeeprakash.github.io/` in a fresh browser tab. Expected: lands on `https://<canonical-host>/` within 1 second. The intermediate "moved" message may briefly flash for clients that don't honor `meta refresh` instantly.

If the redirect doesn't fire, confirm GitHub Pages settings show the deployment as "Live" pointing at the `gh-pages` branch.

---

## Self-review

(Performed at plan-write time, fixes applied inline.)

**Spec coverage:** Each spec section maps to tasks:
- Goals (visits, contact clicks, resume downloads, no cookies, no consent, no new runtime dep beyond Vercel script) → Tasks 6–8, 13, 15.
- Architecture (single-origin hosting, Vercel Analytics, single hook in palette.js, graceful degradation) → Tasks 5–11.
- Migration plan steps 1–4 → Tasks 1, 3, 6–11.
- Migration plan step 5 → Task 16.
- Migration plan step 6 → Task 17.
- Migration plan step 7 (custom domain) → explicitly deferred per spec, no task.
- File map / Code changes → Tasks 6–12 cover every file in the spec's "Modified files" list.
- Events to instrument table → Task 7's `TRACKED` table matches exactly.
- Privacy / consent posture → Documented in Task 12's CLAUDE.md rewrite; no banner work.
- Performance impact (~1.8 KB total) → no special task; bytes added are below thresholds.
- Reduced-motion / accessibility → no surface change, no task.
- Local development → Task 15 step 4 verifies localhost filter.
- Rollback → preserved by per-task commits within the PR.
- Verification checklist → Tasks 13 step 4 and Task 15 cover it.
- Inherited side effect (`data/agent-context.md` public exposure) → flagged in spec, intentionally out of scope, no task.

**Placeholder scan:** `REPLACE_ME_CANONICAL_HOST` in Task 6 and `<canonical-host>` in Task 17 are intentional fill-ins (the canonical host is decided in Task 2 and varies per user). Both are explicitly called out as fill-ins with verification steps. No `TBD` / `TODO` / `implement later` strings.

**Type consistency:** `mapToTrackEvent` in Task 7 returns `{name, props}` or `null`; `runCommand` consumes that shape (`ev.name`, `ev.props`); `window.track(name, props)` in Task 6 accepts that shape. Table in Task 7 matches the spec's "Events to instrument" table. CSP strings in Task 10 are byte-identical between `index.html` and `vercel.json`.
