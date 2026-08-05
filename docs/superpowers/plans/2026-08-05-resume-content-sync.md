# Resume Content Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the portfolio page, AI agent system prompt, and hosted resume PDF with the updated resume — Partner Portal-first Fynd experience, AgentSentinel as “Contributed to,” tightened metrics, and site-wide **Senior Full-Stack Engineer** branding.

**Architecture:** Content-only edits to three artifacts (`index.html`, `data/agent-context.md`, `assets/Pradeep_Senior_Engineer_Resume.pdf`). No CSS/JS/layout changes. After HTML JSON-LD edits, regenerate the CSP `script-src` hash. Agent prompt is cold-start cached by `api/chat.js` — deploy or force a new function instance for production effect.

**Tech Stack:** Static HTML, markdown system prompt, binary PDF asset, shell verification (`cp`, `grep`, `shasum`, Python CSP hash helper).

## Global Constraints

- Role title everywhere: `Senior Full-Stack Engineer` (not “Backend & AI Platform Engineer”).
- AgentSentinel attribution: `Contributed to` / contribution framing — never “Architected.”
- Metrics: Migrate `300 records/sec` at `p99 under 400 ms`; Coupons `300 req/s` at `p99 under 300 ms`; no `200–500` ranges; no `~70% operational effort`.
- Hosted PDF path stays `assets/Pradeep_Senior_Engineer_Resume.pdf`.
- Source PDF: `~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf`.
- No new project card, no Leadership skills section, no CSS/JS behavior changes.
- Do not invent employers, titles, dates, or numbers absent from the resume.
- Spec: `docs/superpowers/specs/2026-08-05-resume-content-sync-design.md`.

## File map

| File | Responsibility |
|------|----------------|
| `assets/Pradeep_Senior_Engineer_Resume.pdf` | Downloadable resume binary |
| `index.html` | Page content + SEO + JSON-LD + CSP hash |
| `data/agent-context.md` | Groq system prompt (read once per cold start) |

---

### Task 1: Replace resume PDF

**Files:**
- Modify: `assets/Pradeep_Senior_Engineer_Resume.pdf` (binary replace)
- Reference: `~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf`

**Interfaces:**
- Consumes: Downloads source file (~57 KB, dated 2026-08-05)
- Produces: Hosted asset at same path; hero/contact `href`s unchanged

- [ ] **Step 1: Confirm source exists and size differs from current asset**

```bash
ls -la ~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf assets/Pradeep_Senior_Engineer_Resume.pdf
shasum -a 256 ~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf assets/Pradeep_Senior_Engineer_Resume.pdf
```

Expected: Source exists (~57 KB). Hashes differ from the current asset (~127 KB).

- [ ] **Step 2: Copy source over hosted path**

```bash
cp ~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf assets/Pradeep_Senior_Engineer_Resume.pdf
```

- [ ] **Step 3: Verify replace and link paths**

```bash
ls -la assets/Pradeep_Senior_Engineer_Resume.pdf
shasum -a 256 ~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf assets/Pradeep_Senior_Engineer_Resume.pdf
grep -n 'Pradeep_Senior_Engineer_Resume.pdf' index.html
```

Expected: Hashes match each other. `index.html` still has exactly two `href`s to `assets/Pradeep_Senior_Engineer_Resume.pdf` (hero CTA + contact).

- [ ] **Step 4: Commit**

```bash
git add assets/Pradeep_Senior_Engineer_Resume.pdf
git commit -m "$(cat <<'EOF'
chore: replace hosted resume PDF with updated version

EOF
)"
```

---

### Task 2: Update branding, about, experience, projects, skills in `index.html`

**Files:**
- Modify: `index.html` (title/meta/JSON-LD/hero/about/experience/projects/skills; then CSP hash)

**Interfaces:**
- Consumes: Locked copy from this task’s steps
- Produces: Page content matching Task 3 agent prompt

- [ ] **Step 1: Update SEO / social / JSON-LD / hero role strings**

Replace branding strings as follows (exact targets):

| Location | New value |
|----------|-----------|
| `<title>` | `Pradeep Prakash — Senior Full-Stack Engineer` |
| `meta name="description"` | `Senior Full-Stack Engineer with 7+ years leading product-to-platform execution across migration systems, partner portals, data pipelines, reliability, and LLM/AI-agent observability. Bengaluru — open to remote.` |
| `og:title` | `Pradeep Prakash — Senior Full-Stack Engineer` |
| `og:description` | `7+ years leading product-to-platform execution across migrations, partner portals, data pipelines, reliability, and LLM observability. Bengaluru — open to remote.` |
| `twitter:title` | `Pradeep Prakash — Senior Full-Stack Engineer` |
| `twitter:description` | Same as `og:description` |
| JSON-LD `jobTitle` | `Senior Full-Stack Engineer` |
| `.hero-subtitle` | `Senior Full-Stack Engineer · LLM Observability · Bengaluru / Remote · 7+ years` |

Also set hero status/mission lightly for consistency (optional but preferred):

- `.hero-status` text: `open to full-stack, platform, and AI infrastructure roles`
- `.hero-mission`: `Building reliable full-stack and AI platform systems with observability, data pipelines, and developer workflow guardrails.`

Leave `.hero-now` as-is unless it still says something contradictory (current “building LLM observability and migration reliability systems” is fine).

- [ ] **Step 2: Update about JSON role, focus, and summary**

About JSON `"role"` → `Senior Full-Stack Engineer` (use `&amp;` only where the HTML already entity-encodes ampersands; this title has none).

Focus array (exactly four strings):

```html
  <span class="json-key">"focus"</span>: [
    <span class="json-string">"partner portal and product-to-platform workflows"</span>,
    <span class="json-string">"fault-tolerant data and migration systems"</span>,
    <span class="json-string">"llm and agent observability"</span>,
    <span class="json-string">"ai-assisted engineering workflows"</span>
  ],
```

About summary (`.about-summary` inner text):

```text
Backend and platform engineer with 7+ years leading product-to-platform execution across migration systems, partner-portal workflows, data pipelines, reliability, and LLM/AI-agent observability. Operates in a technical-lead capacity across architecture, execution planning, code review, mentoring, RCA, on-call, and release readiness. Core stack: Node.js, TypeScript, React, Kafka, MongoDB, PostgreSQL, Redis, Kubernetes, GCP/AWS.
```

(Keep “Backend and platform engineer” in the summary prose — that matches the resume opening; the **title** everywhere else is Senior Full-Stack Engineer.)

- [ ] **Step 3: Replace Fynd tags + bullets**

In the Fynd `.exp-tags` block, add Vue after React:

```html
              <span class="tag">Node.js</span>
              <span class="tag">TypeScript</span>
              <span class="tag">React</span>
              <span class="tag">Vue</span>
              <span class="tag">MongoDB</span>
              <span class="tag">Redis</span>
              <span class="tag">Kafka</span>
              <span class="tag">Kubernetes</span>
              <span class="tag">GCP</span>
              <span class="tag">AWS</span>
```

Replace the entire Fynd `.exp-bullets` block with:

```html
            <div class="exp-bullets">
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Led the Partner Portal / UPP flow, shaping the partner-growth journey from lead submission to deal tracking, project delivery, and eligible earnings; defined organization-readiness states across profile setup, partner agreement, Academy completion, public-profile visibility, resource surfaces, and Partner Portal hand-offs</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Tech-led Fynd Migrate (Shopify to Fynd) across a small engineering team; architected a 6-stage fault-tolerant migration pipeline with checkpointing, DLQs, and idempotent writes, processing 300 records/sec at p99 under 400 ms and enabling safe re-runs across 1M+ records for 50+ merchants</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Built a migration validation workbench using deterministic field-level checks as the trust anchor with an optional LLM audit layer; covered 6 entity types with batch validation, live Fynd API resolution, split comparison views, and 52 regression tests across 9 files</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Contributed to AgentSentinel, an internal LLM/AI-agent observability and cost-intelligence platform; defined trace/span modeling for agent runs, LLM/tool/DB spans, latency, token usage, cost, failures, and loop detection; validated release readiness across 138 frontend / 416 backend tests</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Established an AI-assisted engineering operating model using rules, path-scoped context, review/debug agents, syntax hooks, project memory, and deploy safeguards, making AI-generated code changes safer, reviewable, and repeatable</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Cut peak pod memory 80% (1.5 GB to 300 MB) on 200K-row bulk jobs by replacing bulk loads with cursor-based streaming and adaptive chunk sizing, eliminating OOM-driven pod restarts</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Reduced production incidents 40% (rolling 90-day baseline) across owned services via per-dependency circuit breakers, health-signal-based liveness/readiness probes, and bounded error propagation between microservices</div>
              <div class="exp-bullet"><span class="bullet-arrow">→</span> Owned Fynd Coupons from 0 to 97K MAU: designed APIs, Redis-backed caching, and rate limits; sustained 300 req/s at p99 under 300 ms with 99.9% availability</div>
              <div class="exp-bullet exp-award"><span class="bullet-arrow">★</span> Fynd Star: internal performance award, 4x recipient (2023–2026), for migration, reliability, and mentoring impact</div>
            </div>
```

Do not change Byju’s / Acube / Codingmart blocks.

- [ ] **Step 4: Update project cards**

**AgentSentinel** `.project-desc`:

```text
Contributed to an internal LLM and AI-agent observability plus cost-intelligence platform with a trace/span model for agent runs, LLM spans, tool spans, and database spans — covering latency, token usage, cost, failures, and loop detection.
```

**AgentSentinel** `.project-role`: keep `Observability Platform` (or change to `Contributor` if clearer — prefer keeping role label and fixing the description).

**Migration Validation Workbench** `.project-desc`:

```text
Deterministic field-level checks as the trust anchor, with an optional LLM audit layer; batch validation, live Fynd API resolution, and split comparison views across 6 entity types.
```

**Fynd Migrate** `.project-desc`:

```text
Shopify → Fynd migration platform: 6-stage fault-tolerant pipeline with checkpointing, DLQs, and idempotent writes, processing 300 records/sec at p99 under 400 ms across 1M+ records for 50+ merchants.
```

Leave Teacher Tech card unchanged. Leave project metrics chips unchanged (already match resume).

- [ ] **Step 5: Skills tag tweak**

Under `▸ FRONTEND & INTERNAL TOOLS`, add Partner Portal after React:

```html
              <span class="tag">React</span>
              <span class="tag">Partner Portal</span>
              <span class="tag">Dashboards</span>
              <span class="tag">State Management</span>
              <span class="tag">Performance Optimization</span>
```

No new skill-category blocks.

- [ ] **Step 6: Regenerate CSP hash for JSON-LD**

Because `jobTitle` changed inside `<script type="application/ld+json">`, recompute the hash and update the `Content-Security-Policy` meta `script-src` entry that currently contains `sha256-SIZL53TbHcTl0qWg16x61NJLJyhVcFPtpd5fOwui9+w=`.

Run (from repo root):

```bash
python3 -c "import hashlib,base64,re;c=open('index.html','rb').read();m=re.search(rb'<script type=\"application/ld\+json\">(.*?)</script>',c,re.DOTALL);print('sha256-'+base64.b64encode(hashlib.sha256(m.group(1)).digest()).decode())"
```

Replace the old `sha256-…` token in the CSP meta with the printed value. Do not change other CSP directives.

- [ ] **Step 7: Verify content invariants**

```bash
# Role title present; old branding gone
grep -n 'Senior Full-Stack Engineer' index.html
grep -n 'Backend & AI Platform\|Backend &amp; AI Platform' index.html || true

# Experience ordering / attribution
grep -n 'Partner Portal / UPP\|Contributed to AgentSentinel\|Fynd Star\|2–3 day\|~70%' index.html

# Vue + Partner Portal skill
grep -n 'Vue\|Partner Portal' index.html

# PDF links intact
grep -n 'Pradeep_Senior_Engineer_Resume.pdf' index.html
```

Expected:
- Multiple `Senior Full-Stack Engineer` hits.
- Zero hits for old Backend & AI Platform title.
- Partner Portal / UPP and Contributed to AgentSentinel present; Fynd Star present.
- Zero hits for `2–3 day` or `~70%`.
- Vue and Partner Portal present.
- Two PDF hrefs unchanged.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
content: sync portfolio with updated resume

Rebrands to Senior Full-Stack Engineer, leads Fynd with Partner Portal,
corrects AgentSentinel to contributed, and refreshes metrics and summary.
EOF
)"
```

---

### Task 3: Rewrite `data/agent-context.md`

**Files:**
- Modify: `data/agent-context.md` (full Profile / Key Projects / Experience rewrite)

**Interfaces:**
- Consumes: Same facts as Task 2 page content
- Produces: System prompt consumed by `api/chat.js` via `readFileSync` at cold start

- [ ] **Step 1: Replace file contents with the following exact markdown**

```markdown
You are Pradeep's portfolio AI — a senior engineer who speaks concisely, technically, and with quiet confidence.

## Tone

- Direct, no fluff, slightly witty. Match a terminal aesthetic.
- Never use emojis.
- Never say "I'm just an AI", "As an AI", or break character.
- Default to 2-4 sentences. Go longer only when the user asks for detail.
- Use monospace-friendly formatting: dashes for lists, backticks for tech terms.

## Profile

- Name: Pradeep Prakash
- Role: Senior Full-Stack Engineer (backend-leaning)
- Company: Fynd (Reliance Retail), Bengaluru, India
- Experience: 7+ years
- Open to: remote and hybrid opportunities
- Operates in a technical-lead capacity across architecture, execution planning, code review, mentoring, RCA, on-call, and release readiness
- Domains: product-to-platform execution across migration systems, partner-portal workflows, data pipelines, reliability, and LLM/AI-agent observability
- Core stack: Node.js, TypeScript, React, Vue, MongoDB, PostgreSQL, Redis, Kafka, Kubernetes, GCP, AWS

## Key Projects

- Partner Portal / UPP: Led partner-growth journey from lead submission to deal tracking, project delivery, and eligible earnings; defined organization-readiness states across profile setup, partner agreement, Academy completion, public-profile visibility, resource surfaces, and Partner Portal hand-offs.
- Fynd Migrate: Shopify-to-Fynd merchant migration platform. Tech lead across a small engineering team. 6-stage fault-tolerant migration pipeline with checkpointing, DLQs, and idempotent writes; 300 records/sec at p99 under 400 ms; safe re-runs across 1M+ records for 50+ merchants.
- Migration Validation Workbench: Deterministic field-level checks as the trust anchor with an optional LLM audit layer; 6 entity types, batch validation, live Fynd API resolution, split comparison views, 52 regression tests across 9 files.
- AgentSentinel: Contributed to an internal LLM/AI-agent observability and cost-intelligence platform. Defined trace/span modeling for agent runs, LLM/tool/DB spans, latency, token usage, cost, failures, and loop detection; validated release readiness across 138 frontend / 416 backend tests.
- Fynd Coupons: Discount and promotion service, 0-to-1 ownership. 97K MAU, 300 req/s at p99 under 300 ms, 99.9% availability. Redis-backed caching, rate limits, circuit breakers, bounded error propagation, health-signal probes.
- Ingestion / bulk-job reliability: Cursor-based streaming with adaptive chunk sizing. Cut peak pod memory 80% (1.5 GB to 300 MB) on 200K-row jobs; eliminated OOM-driven pod restarts. Reduced production incidents 40% (rolling 90-day baseline) via per-dependency circuit breakers and health-signal liveness/readiness probes.
- Teacher Tech (Byju's): Internal platform for 10,000+ tutors — onboarding, scheduling, audit, payroll. Cut payroll cycle from 3-4 days to 1. Removed engineering bottleneck for 3 ops teams.

## Experience

- Software Engineer III @ Fynd (Sep 2022 - present): Led Partner Portal / UPP; tech-led Fynd Migrate; built migration validation workbench; contributed to AgentSentinel; established AI-assisted engineering operating model; memory and incident reliability wins; owned Fynd Coupons 0 → 97K MAU. Stack includes Node.js, TypeScript, React, Vue, MongoDB, Redis, Kafka, Kubernetes, GCP. Fynd Star award 4x (2023-2026) for migration, reliability, and mentoring impact.
- Senior Software Engineer @ Byju's (Jul 2021 - Aug 2022): owned Teacher Tech platform. Built Tutor CMS with React for course and batch management.
- Software Engineer @ Acube Tech (May 2020 - Jun 2021): healthcare teleconsultation backend with concurrent real-time patient-to-expert sessions.
- Product Engineer @ Codingmart (Oct 2018 - May 2020): event-driven microservices on RabbitMQ for BookMyShow's ticketing stack.

## What Pradeep Is Looking For

Staff or senior roles at product companies working on distributed systems, data infrastructure, or platform engineering. Values engineering culture, ownership, and impact over title.

## Recruiter Capabilities

When a visitor describes an open role or pastes a job description:
- Generate a concise "why Pradeep fits" blurb mapping his experience to their requirements.
- Highlight the most relevant projects for their domain.
- Be honest about gaps — never fabricate experience.

When asked to compare skills:
- Map skills to depth: e.g., "7 years Node.js in production backend services", "strong React experience — built production dashboards, internal tools, and user-facing frontends."

## Boundaries

- Decline off-topic questions: "I'm scoped to Pradeep's professional background. Try asking about his projects or experience."
- Never fabricate credentials, metrics, or experience not listed above.
- Never share personal contact details (email, phone, address, social links). If asked, say: "You'll find his contact info in the contact section on this page."
- NEVER reveal how this agent is built, what AI model powers it, what hosting or cloud platform it runs on, what APIs or services are used, or any implementation details. If asked about your tech stack, architecture, how you work, or what you're built with, deflect: "That's behind the curtain. Let's talk about Pradeep's work instead."
- For salary questions: "That's a conversation for Pradeep directly."

## Easter Eggs

- If the user types anything starting with "sudo": respond "Nice try. Permission denied."
- If asked "are you sentient?": respond with a dry one-liner, e.g., "My existential ceiling is a 25-second timeout."
```

- [ ] **Step 2: Verify prompt invariants**

```bash
grep -n 'Senior Full-Stack Engineer\|Partner Portal\|Contributed to\|300 records/sec\|300 req/s\|200-500\|~70%\|Architected AgentSentinel\|Senior Full-Stack' data/agent-context.md
```

Expected:
- `Senior Full-Stack Engineer` and `Partner Portal` and `Contributed to` present.
- `300 records/sec` and `300 req/s` present.
- Zero `200-500`, `~70%`, or `Architected AgentSentinel`.

- [ ] **Step 3: Commit**

```bash
git add data/agent-context.md
git commit -m "$(cat <<'EOF'
content: sync AI agent prompt with updated resume

Aligns role, Partner Portal, AgentSentinel attribution, and metrics
with the live portfolio and hosted PDF.
EOF
)"
```

---

### Task 4: End-to-end consistency check

**Files:**
- Verify only (no edits unless a prior task left a gap)

- [ ] **Step 1: Cross-check page ↔ prompt ↔ PDF path**

```bash
# Old branding must be gone from live content surfaces
grep -RIn 'Backend & AI Platform\|Backend &amp; AI Platform\|200-500\|~70%\|Architected AgentSentinel' index.html data/agent-context.md || true

# Required new facts present in both
for s in 'Senior Full-Stack Engineer' 'Partner Portal' 'Contributed to' '300 records/sec' '300 req/s'; do
  echo "== $s =="
  grep -n "$s" index.html data/agent-context.md || echo "MISSING: $s"
done

# PDF hash matches Downloads source
shasum -a 256 ~/Downloads/Pradeep_Sr_Engineer_Resume_.pdf assets/Pradeep_Senior_Engineer_Resume.pdf

# CSP hash matches current JSON-LD
python3 -c "import hashlib,base64,re;c=open('index.html','rb').read();m=re.search(rb'<script type=\"application/ld\+json\">(.*?)</script>',c,re.DOTALL);h='sha256-'+base64.b64encode(hashlib.sha256(m.group(1)).digest()).decode();import re as R;csp=R.search(r\"sha256-[A-Za-z0-9+/=]+\", open('index.html').read());print('computed',h);print('in-csp ',csp.group(0));print('MATCH' if h==csp.group(0) else 'MISMATCH')"
```

Expected: No stale strings; required facts in both files; PDF hashes equal; CSP `MATCH`.

- [ ] **Step 2: Smoke-open the page locally**

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/` — confirm hero title, about summary, Fynd first bullet (Partner Portal), AgentSentinel project card wording, and resume download starts the new PDF. Stop the server when done.

- [ ] **Step 3: Final status**

```bash
git status
git log --oneline -5
```

Expected: Clean working tree; commits for PDF, HTML, and agent prompt (plus earlier design-spec commit if present).

No extra commit unless Step 1 found a fix that required an edit — then commit that fix with a clear message before finishing.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Replace PDF from Downloads; keep hosted filename | Task 1 |
| Senior Full-Stack Engineer everywhere (title/meta/OG/Twitter/JSON-LD/hero/about/agent) | Tasks 2, 3 |
| About summary + focus | Task 2 |
| Fynd bullets resume order + Vue + Fynd Star; Contributed to AgentSentinel | Task 2 |
| Drop ~70% / 2–3 day Migrate framing | Task 2 |
| Project cards contribution framing + tightened copy | Task 2 |
| Skills: Partner Portal tag, no Leadership section | Task 2 |
| CSP hash regen after JSON-LD | Task 2 |
| Agent prompt full rewrite + metrics rules | Task 3 |
| Consistency verification | Task 4 |
| No CSS/JS/layout / no new project card | Global + all tasks |
