# Resume Content Sync — Design

**Date:** 2026-08-05  
**Status:** Approved for planning  
**Approach:** Content-faithful sync (no layout/CSS/JS behavior changes)

## Goal

Bring the live portfolio, AI agent system prompt, and hosted resume PDF in line with the updated resume (`Pradeep_Sr_Engineer_Resume_.pdf`), including Partner Portal / UPP as a lead Fynd bullet, corrected AgentSentinel attribution (“Contributed to”), tightened metrics, and a site-wide role title of **Senior Full-Stack Engineer**.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| PDF source | Replace from `~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf` |
| Hosted PDF path | Keep `assets/Pradeep_Senior_Engineer_Resume.pdf` (no link churn) |
| Project cards | Keep AgentSentinel as primary; wording → contributed |
| Partner Portal | Experience-first (new lead bullet); no new project card |
| Role title | **Senior Full-Stack Engineer** everywhere (hero, meta, OG/Twitter, JSON-LD, about JSON, agent Profile) |
| Scope mode | Content sync only — no structural redesign |

## Files in scope

| File | Change |
|------|--------|
| `assets/Pradeep_Senior_Engineer_Resume.pdf` | Binary replace from Downloads source |
| `index.html` | Role title, about summary/focus, Fynd bullets + Vue tag + Fynd Star, project copy, skills tag tweaks |
| `data/agent-context.md` | Full Profile / Key Projects / Experience rewrite to match page + resume |

## Out of scope

- CSS, JS behavior, Motion, boot overlay, palette
- OG image / favicon regeneration
- New project card for Partner Portal
- New “Leadership” skills section (layout unchanged)
- Historical docs under `docs/superpowers/` (except this spec)
- Inventing metrics not present in the resume

## Page content (`index.html`)

### Branding / SEO

Replace “Backend & AI Platform Engineer” (and HTML-entity variants) with **Senior Full-Stack Engineer** in:

- `<title>`, meta description (rephrase around full-stack + platform without inventing claims)
- `og:title`, `og:description`, `twitter:title`, `twitter:description`
- JSON-LD `jobTitle`
- Hero subtitle
- About JSON `"role"`

Hero mission / status / now lines may get light wording alignment only if needed for consistency; no redesign.

### About

**Summary** — Align to resume: product-to-platform execution across migration systems, partner-portal workflows, data pipelines, reliability, and LLM/AI-agent observability; technical-lead capacity (architecture, execution planning, code review, mentoring, RCA, on-call, release readiness); core stack unchanged in substance (Node.js, TypeScript, React, Kafka, MongoDB, PostgreSQL, Redis, Kubernetes, GCP/AWS).

**Focus array** — Keep four items; include partner-portal / product-to-platform alongside observability, migration systems, and reliability / AI-assisted workflows.

### Experience (Fynd)

- Add `Vue` to tags.
- Reorder bullets to resume order:

  1. Partner Portal / UPP (new) — partner-growth journey through earnings; org-readiness states
  2. Fynd Migrate — tech-led; 300 records/sec at p99 under 400 ms; 1M+ records; 50+ merchants; safe re-runs
  3. Migration validation workbench — deterministic checks + optional LLM audit; 6 entity types; 52 tests / 9 files
  4. AgentSentinel — **Contributed to** (not Architected); trace/span modeling; 138 FE / 416 BE tests
  5. AI-assisted engineering operating model
  6. Peak pod memory −80% (1.5 GB → 300 MB)
  7. Production incidents −40%
  8. Fynd Coupons — 0 → 97K MAU; 300 req/s at p99 under 300 ms; 99.9% availability
  9. ★ Fynd Star — 4× recipient (2023–2026)

- Drop claims not in the resume (e.g. “~70% operational effort”, “2–3 day manual onboarding” as primary Migrate framing) unless they remain elsewhere — they should not remain on the page.
- Byju’s / Acube / Codingmart: substance unchanged; copy only if needed for tone consistency.

### Projects

Same four cards, same order:

1. **AgentSentinel** (primary) — contribution framing; keep 138 FE / 416 BE / trace-span metrics
2. **Migration Validation Workbench** — tighten to resume wording
3. **Fynd Migrate** — 300 rec/s, p99 &lt; 400 ms, 1M+ records
4. **Teacher Tech** — unchanged in substance

### Skills

Keep existing category chrome. Add resume gaps as tags where they fit without new sections (e.g. Partner Portal under frontend/tools). Do not introduce a Leadership category block.

## AI system prompt (`data/agent-context.md`)

Rewrite so the agent cannot contradict the page or resume:

- **Role:** Senior Full-Stack Engineer (backend-leaning is fine as a qualifier in prose if useful)
- **Profile:** technical-lead capacity + product-to-platform domains from the resume
- **Key Projects:** Partner Portal / UPP, Fynd Migrate (updated metrics), Migration Validation Workbench, AgentSentinel (contributed), Fynd Coupons, Teacher Tech
- **Metrics:** Use resume-tight numbers only (300 rec/s, p99 under 400 ms; Coupons 300 req/s p99 under 300 ms). No “200–500” ranges. No “~70% operational effort.”
- **Experience:** Mirror Fynd page bullets including Partner Portal, Vue, Fynd Star; earlier roles unchanged in substance
- **Tone / Looking for / Recruiter capabilities / Boundaries / Easter eggs:** Keep behavior; update any stale role strings

**Deploy note:** `api/chat.js` reads the prompt once per cold start via `readFileSync`. After deploy (or forced cold start), the new prompt takes effect.

## PDF

```text
cp ~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf \
   assets/Pradeep_Senior_Engineer_Resume.pdf
```

Verify download links in hero and contact still point at `assets/Pradeep_Senior_Engineer_Resume.pdf`.

## Consistency rules

- Page, agent prompt, and PDF narrative must agree on attribution (AgentSentinel = contributed) and metrics.
- Never invent employers, titles, dates, or numbers absent from the resume.
- Phone number may appear in the PDF; agent boundaries still forbid sharing personal contact details in chat.

## Success criteria

1. Resume download serves the new PDF.
2. Fynd experience leads with Partner Portal; AgentSentinel wording is “Contributed to.”
3. Site-wide title is Senior Full-Stack Engineer.
4. Agent answers about projects/metrics match the page.
5. No CSS/JS/layout regressions from content-only edits.
