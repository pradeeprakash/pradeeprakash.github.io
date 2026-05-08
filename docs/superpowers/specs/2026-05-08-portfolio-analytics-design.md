# Portfolio Analytics — Design Spec

**Date:** 2026-05-08
**Status:** Draft

---

## Overview

Add lightweight, cookieless analytics to the portfolio so the owner can see three numbers during an active job search: how many people visit, how many click a contact channel, and how many download the resume. As a prerequisite, migrate the static page from GitHub Pages to the existing Vercel project so Vercel Web Analytics works natively (its beacon endpoint is same-origin only). The migration also collapses the four-place hardcoded `vercel.app` URL flagged as a known wart in `CLAUDE.md`.

## Goals

- See total visits, contact-channel clicks, and resume downloads in a single dashboard.
- No cookies. No consent banner. No PII collected.
- No new runtime dependency beyond the Vercel Analytics script (~1.5 KB gzipped, third-party, doesn't count against the 20 KB local-JS budget).
- All existing accessibility and performance guarantees preserved.

## Non-goals

- Section-reach tracking (which sections a visitor scrolled to).
- AI agent usage events (`agent_open`, `agent_message_sent`, transcript capture).
- Inbound capture (contact form, feedback widget). Out of scope for this spec — see future "agent feedback + contact form" work.
- Custom dashboard or admin UI. The Vercel dashboard is the dashboard.
- Migrating `vercel.json` → `vercel.ts`. Unrelated refactor.
- Custom domain DNS. The spec assumes the default Vercel-assigned subdomain (optionally renamed via Vercel project settings); attaching e.g. `pradeeprakash.dev` is a deferred follow-up.

## Architecture

### Before

```
Browser
├── pradeeprakash.github.io (static page on GitHub Pages)
│         │
│         └── fetch ──▶ portfolio-nu-six-g0nsnyjwbz.vercel.app/api/chat (Vercel function)
│                              │
│                              └── Groq (Llama 3.3 70B) via SSE
│
Two origins. CORS. CSP connect-src whitelists the Vercel URL.
The Vercel deployment URL is hardcoded in four places (agent.js, api/chat.js,
index.html, vercel.json) — a known wart in CLAUDE.md.
```

### After

```
Browser
└── <project>.vercel.app  (single Vercel project, same origin for everything)
    ├── /                  → static index.html, css/, js/, assets/, data/
    ├── /api/chat          → existing Vercel function (unchanged behavior)
    └── /_vercel/insights/ → Vercel Web Analytics beacon endpoint (built-in)

GitHub Pages repo retained as a permanent redirect to the Vercel URL,
so old shared/bookmarked links never 404.
```

### Key decisions

- **Single-origin hosting.** The static page moves from GitHub Pages to the same Vercel project that hosts `/api/chat`. Removes CORS, simplifies CSP `connect-src` to `'self'`, collapses the four-place hardcoded URL problem.
- **Vercel Web Analytics for everything.** Auto-pageviews + custom events via `track()`. Cookieless, IP-anonymized, GDPR-friendly out of the box. No consent banner needed.
- **One canonical event hook in `palette.js`.** Every interactive surface (⌘K, mobile sheet, easter-egg shell, `data-command` clicks) already routes through `runCommand(name)`, so a single line at the top of that function tracks all funnel events. Aligns with the existing "Command registry" rule — surfaces can't drift.
- **Graceful degradation.** If the Vercel Analytics script fails to load (CDN down, blocker, offline), the page works exactly as before. `window.track` no-ops; nothing throws.

## Migration plan

Steps 1–4 ship in a single PR/deploy (per-step rollback is still possible by reverting individual commits). Steps 5–6 are operational follow-ups; step 7 is deferred indefinitely.

**Step 1 — Vercel project serves static files.**
The existing Vercel project hosts only `api/chat.js` today. To extend it to also serve the static page: with no `framework` set in `vercel.json`, Vercel deploys every non-`api/` file in the project root as a static asset by default. Audit `vercel.json` for any explicit static-handling overrides that would suppress this; if present, remove them or replace with the default. Push the existing `index.html`, `css/`, `js/`, `assets/` content as-is — no relocation needed. The `/api/chat` function continues to work unchanged. Verify: `https://<vercel>.vercel.app/` renders identically to GitHub Pages; agent panel still streams (still cross-origin at this point — collapse comes in step 4).

**Step 2 — Enable Vercel Web Analytics on the project.**
Toggle on in the Vercel dashboard. No code change. Without this, the analytics script tag added in step 3 loads an empty config and silently no-ops.

**Step 3 — Ship analytics code.**
Add `js/analytics.js`, the `<script defer src="/_vercel/insights/script.js" data-domain="<canonical-host>">` tag in `index.html`, and the `trackCommand` hook in `palette.js`. Verify on live deploy: click resume, click each contact channel, see events appear in dashboard within ~30s.

**Step 4 — Same-origin cleanup.**
Switch `js/agent.js`'s `API_URL` from the absolute Vercel URL to `/api/chat` (relative). Update CSP `connect-src` (in both `index.html` meta tag and `vercel.json` header) to `'self'`. Drop the GitHub Pages origin from `api/chat.js`'s CORS allowlist (production page no longer needs it). Verify: agent network calls are same-origin, no preflight, no console errors.

**Step 5 — Promote Vercel as canonical URL.**
Update the resume PDF link, social profiles, and any external references to the new URL. Operational, not code.

**Step 6 — Redirect GitHub Pages → Vercel.**
Replace the GitHub Pages repo's `index.html` with a redirect-only page:

```html
<!doctype html>
<meta charset="utf-8">
<title>Pradeep Prakash — moved</title>
<link rel="canonical" href="https://<canonical-host>/">
<meta http-equiv="refresh" content="0; url=https://<canonical-host>/">
<p>This page has moved to <a href="https://<canonical-host>/">https://<canonical-host>/</a>.</p>
```

Do **not** delete the GitHub Pages deployment — it remains as a permanent redirect so old shared/bookmarked links keep working. Verify: visiting `pradeeprakash.github.io` lands on the Vercel URL within 1s.

**Step 7 — (deferred) custom domain.**
Point a custom domain (e.g. `pradeeprakash.dev`) at the Vercel project. DNS-only, no code change beyond updating the analytics script's `data-domain` attribute. Treat as a separate task.

## Code changes

### New file

**`js/analytics.js`** (≈ 30 lines, ~0.3 KB gzipped)

```js
(function () {
  'use strict';

  // Positive-match against the production canonical host(s).
  // Update this list when a custom domain is added; previews and localhost
  // are filtered by exclusion (anything not in the list no-ops).
  var CANONICAL_HOSTS = [
    '<canonical-host>',  // e.g. 'pradeep-prakash.vercel.app' or 'pradeeprakash.dev'
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

The `CANONICAL_HOSTS` array is the single configuration point for "what counts as a production visit." Filling it in is part of step 3 of the rollout. Renaming the Vercel project or attaching a custom domain later means appending an entry — old hosts can stay in the list during a transition window.

Loaded with `<script defer src="js/analytics.js"></script>` immediately after `palette.js` in the script chain (so `palette.js` can call `window.track` safely — `defer` scripts execute in document order).

### Modified files

**`index.html`**
- Add Vercel Analytics script tag immediately before the classic `<script defer>` chain:
  ```html
  <script defer src="/_vercel/insights/script.js"></script>
  ```
  No attributes needed — Vercel auto-attributes events to the project hosting the deployment. (Unlike Plausible-style scripts, there is no `data-domain` attribute.)
- Add `<script defer src="js/analytics.js"></script>` after `palette.js`, before `shell.js`.
- Update CSP `connect-src` meta tag: drop the absolute Vercel URL, use `'self'` for the now-same-origin `/api/chat`. Confirm `script-src` permits `'self'` (already does — `/_vercel/insights/script.js` is same-origin).

**`js/palette.js`**
- At the top of `runCommand(name, args)`, add a single tracking call:
  ```js
  if (window.track) {
    var ev = mapToTrackEvent(name);
    if (ev) window.track(ev.name, ev.props);
  }
  ```
- Add a private `mapToTrackEvent(commandName)` helper:

  | Command name | Tracked as |
  |---|---|
  | `resume` | `resume_download` (no props) |
  | `email` | `contact_click` `{ channel: 'email' }` |
  | `linkedin` | `contact_click` `{ channel: 'linkedin' }` |
  | `github` | `contact_click` `{ channel: 'github' }` |
  | _everything else_ | `null` (skip — no event fires) |

  Returning `null` for navigation, palette opens, shell, agent, etc. keeps the dashboard clean and the event count well within the free tier.

**`js/agent.js`**
- Change `API_URL` from `'https://portfolio-nu-six-g0nsnyjwbz.vercel.app/api/chat'` to `'/api/chat'`.

**`api/chat.js`**
- Drop the GitHub Pages origin and the absolute Vercel-deployment origin from the CORS allowlist (production page is now same-origin and doesn't need ACAO at all). Optionally retain a single localhost entry for `vercel dev` testing.

**`vercel.json`**
- Update CSP response header: `connect-src` drops the absolute Vercel URL, uses `'self'`.
- Confirm static-file serving covers `index.html`, `css/`, `js/`, `assets/`, `data/`. Vercel auto-detects most of this; only `cleanUrls` may need an explicit flag.

**`CLAUDE.md`**
- **`## Analytics`** section: rewrite from "No third-party analytics. … keep it that way." to describe the new posture — Vercel Web Analytics, cookieless, three event types, ~1.5 KB script counted as third-party, custom-event mapping single-sourced from `palette.js`.
- **`## AI agent`** → "The hardcoded Vercel URL appears in **four** places…" warning: collapse to "the canonical host appears in one place (the analytics script's `data-domain` attribute) — `agent.js` and CSP both use `'self'`/relative paths."
- **`## Project shape`** intro: update to reflect single-origin hosting on Vercel for both the static page and the function (drop the GH Pages reference).

## Events to instrument

| Event | Trigger | Properties | Source surface |
|---|---|---|---|
| `pageview` | Initial page load | (auto: device, country, referrer) | Vercel Analytics built-in |
| `contact_click` | Click on email / LinkedIn / GitHub link or button | `{ channel: 'email' \| 'linkedin' \| 'github' }` | `palette.js` → `runCommand` |
| `resume_download` | Click on the resume link | (none) | `palette.js` → `runCommand` |

The single `contact_click` event with a `channel` property (rather than three separate events) gives a one-row "total contacts" view in the dashboard with a drill-down breakdown when needed.

## Privacy & consent

- Vercel Web Analytics is cookieless, IP-anonymized, and GDPR-compliant by default.
- No consent banner. No "Do Not Track" plumbing. No privacy-policy page added.
- No PII is captured by any custom event — channel name and event name only.
- If a custom domain is later attached and the audience shifts toward EU users, this decision should be revisited as a separate task.

## Performance impact

- Vercel Analytics script: ~1.5 KB gzipped, third-party (CDN), `defer`-loaded. Doesn't count against the 20 KB local-JS budget per `CLAUDE.md`.
- `js/analytics.js`: ~0.3 KB gzipped.
- No render-blocking resources added. Script loads and beacons after page interactive.
- Total transfer impact: well under 2 KB on top of the existing budget. LCP, TTI, CLS unchanged.

## Reduced-motion / accessibility

No motion or interaction surface changes. Tracking fires regardless of `prefers-reduced-motion` (visitors still count as visitors). No new focusable elements, no new ARIA, no new keyboard paths.

## Inherited side effects worth noting

- **`data/agent-context.md` remains publicly fetchable** at `/data/agent-context.md` after migration, because Vercel serves every non-`api/` file as a static asset. This is also true today on GitHub Pages, so the migration doesn't introduce a new exposure — but it's worth acknowledging since the spec touches the file structure. If treating the system prompt as private becomes important, the fix is `.vercelignore` for `data/` plus reading the file from a server-only path; out of scope here.

## Local development

`vercel dev` (or `python3 -m http.server`) serves on `localhost`. The `isLocalOrPreview()` guard in `js/analytics.js` short-circuits all event calls on `localhost`, `127.0.0.1`, and `*.vercel.app` previews — so dev and preview traffic never pollute the production dashboard. Vercel Analytics' own script also auto-detects production via its `mode` flag; the explicit guard is belt-and-suspenders against future regressions.

## Rollback

- **After step 1 only:** nothing to roll back. GitHub Pages still primary.
- **After step 3:** if the analytics code breaks something, revert that commit alone. Hosting and same-origin work stay in place.
- **After step 4:** if same-origin causes issues, revert the relative-URL change in `agent.js` and the CORS/CSP edits. Hosting still works.
- **After step 6:** the GitHub Pages redirect page is one commit to revert; the original `index.html` returns and GH Pages is primary again.

Each step is a separate commit even within the bundled PR, so granular revert is preserved.

## Verification checklist

- [ ] `<vercel>.vercel.app/` renders identically to the current GitHub Pages page (visual diff).
- [ ] Agent panel opens, sends a message, streams a response — same-origin in network tab.
- [ ] Vercel Analytics dashboard shows pageviews appearing within ~30s of a real visit.
- [ ] Clicking the resume button produces one `resume_download` event in the custom-events panel.
- [ ] Clicking each of email / LinkedIn / GitHub produces one `contact_click` event with the correct `channel` property.
- [ ] No CORS preflight on `/api/chat`. No console errors.
- [ ] Lighthouse Performance score unchanged (±2 points).
- [ ] Visiting `pradeeprakash.github.io` redirects to the Vercel URL within 1s.
- [ ] `localhost` visits do **not** appear in the production dashboard.
