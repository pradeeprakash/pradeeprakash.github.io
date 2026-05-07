# AI Agent — Design Spec

**Date:** 2026-05-07
**Status:** Draft

---

## Overview

A conversational AI agent embedded in the portfolio as a floating terminal chat panel. It serves two purposes: (1) showcase Pradeep's AI/engineering ability, and (2) provide genuine utility to visitors (recruiters, hiring managers) by answering questions about his background, generating tailored fit summaries, and comparing skills against job descriptions.

## Architecture

```
Browser (Static Site)
├── palette.js ── registers 'agent' command
├── agent.js (new) ── mounts panel, captures input, streams responses
│         │
│         └── fetch (SSE stream) ──▶ Vercel Edge Function (POST /api/chat)
│                                          │
│                                          ├── Rate limiting (20 req/min/IP)
│                                          ├── Injects agent-context.md as system prompt
│                                          ├── Calls Claude API (claude-haiku-4-5-20251001, streaming)
│                                          └── Pipes SSE back to client
│
└── data/agent-context.md ── knowledge base & personality (bundled server-side)
```

### Key decisions

- **New file `js/agent.js`** — loaded after `palette.js` in `<script defer>` order. Uses `window.runCommand`, `window.typeText`, and `window.Motion` globals.
- **Claude Haiku 4.5** — fast, cheap, more than capable for portfolio Q&A. Keeps per-request cost near-zero.
- **SSE (Server-Sent Events)** for streaming — no WebSocket overhead, native browser support via `fetch` + `ReadableStream`.
- **Stateless backend** — no database, no session store. Conversation history (last 10 message pairs) is kept client-side and sent with each request.
- **Context file `data/agent-context.md`** — custom knowledge base injected as Claude's system prompt, bundled into the Edge Function at deploy time.

### New files

```
js/agent.js            ← Frontend panel logic
api/chat.js            ← Vercel Edge Function
data/agent-context.md  ← System prompt & knowledge base
vercel.json            ← Routes config
```

### Load order (updated)

1. Inline `type="module"` bootstrap (Motion)
2. `js/typing.js`
3. `js/effects.js`
4. `js/palette.js`
5. `js/shell.js`
6. `js/scroll.js`
7. `js/cube.js`
8. **`js/agent.js`** (new — depends on `window.runCommand` from palette.js)

---

## Frontend — Agent Panel

### Trigger points (3 entry points)

1. **Command palette** — new command: `{ name: 'agent', aliases: ['ai', 'ask', 'chat'], desc: 'talk to AI agent', action: cmdAgent }`
2. **Nav bar** — new "Agent" link (desktop nav) / menu item (mobile hamburger)
3. **Floating button** — `[ AI ]` terminal-styled button, fixed bottom-right corner, always visible. Created dynamically by `agent.js` (not in initial DOM).

### Panel behavior

- **Mount:** Fixed overlay, centered on screen. Glass-surface terminal window.
- **Styling:** `backdrop-filter: blur(var(--blur-lg))`, `--glass-2` background, `--glass-edge` border — same glass treatment as the command palette.
- **Terminal chrome:** Top bar with `> agent_session` title and `[x]` close button.
- **Message area:** Scrollable, max-height ~60vh.
- **Input area:** Fixed at bottom, green cursor prompt `> ` with text input.
- **Close:** `Esc` key, clicking backdrop, or `[x]` button.
- **Animation:** Motion.animate for mount/unmount (slide up + fade, ~300ms). Reduced-motion: instant show/hide.

### Message rendering

- **User messages:** `> what they typed` — styled like shell input lines.
- **Agent responses:** Streamed character-by-character (~8ms per char for streaming feel). Each response prefixed with `$ `.
- **Markdown-light:** `**bold**` → `<strong>`, `` `code` `` → `<code>`, line breaks preserved. No full markdown parser.
- **Thinking indicator:** Blinking cursor `█` while waiting for first token.

### Conversation state

- JS array client-side, max 10 message pairs.
- Sent with each request for multi-turn context.
- Cleared on panel close — no persistence across sessions.
- No localStorage, no cookies.

### Mobile adaptation

- Panel becomes full-screen sheet (matching the mobile Quick Actions pattern).
- Input area fixed at bottom with proper viewport handling for mobile keyboards.

---

## Backend — Vercel Edge Function

### Endpoint: `POST /api/chat`

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "What's Pradeep's experience with AI?" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "Tell me more" }
  ]
}
```

**Processing pipeline:**
1. Validate request — reject if `messages` is missing, empty, or exceeds 10 pairs.
2. Rate limiting — in-memory counter per IP, 20 requests/minute. Return `429` if exceeded.
3. Read `agent-context.md` (bundled at deploy time).
4. Build Claude API call:
   - Model: `claude-haiku-4-5-20251001`
   - System: contents of `agent-context.md`
   - Messages: conversation array from request
   - Max tokens: 500
   - Stream: true
5. Pipe Claude's SSE stream directly back to client.

**Error responses:**
- Claude API error → `{ "error": "Something went wrong. Try again." }` with `500`
- Rate limited → `{ "error": "Too many requests. Wait a moment." }` with `429`
- No verbose error messages — never leak API details.

### Vercel configuration

**`vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ]
}
```

**Environment variable:** `ANTHROPIC_API_KEY` set in Vercel project settings.

**CORS:** Allow requests from `pradeeprakash.github.io` and Vercel preview domains only. No wildcard.

---

## System Prompt & Knowledge File

**File: `data/agent-context.md`**

### Structure

**1. Identity & tone:**
- "You are Pradeep's portfolio AI — a senior engineer who speaks concisely, technically, and with quiet confidence."
- Match terminal aesthetic — direct, no fluff, slightly witty.
- Never use emojis. Never say "I'm just an AI." Never break character.
- 2-4 sentences by default. Longer only if asked for detail.

**2. Portfolio data (structured):**
- Role, company, years of experience.
- Technical skills with depth context (e.g., "5 years Python, primarily backend services and data pipelines").
- Key projects: what made them interesting, tech used, impact.
- Experience history with highlights.
- What he's looking for next.

**3. Recruiter-specific capabilities:**
- Generate tailored "why Pradeep fits this role" blurb if visitor describes an open position.
- Compare skills against a pasted job description.
- Highlight relevant projects for specific domains (AI/ML, platform, frontend, etc.).

**4. Boundaries:**
- Decline off-topic questions: "I'm scoped to Pradeep's professional background. Try asking about his projects or experience."
- Never fabricate credentials, metrics, or experience not in the context.
- Never share personal contact details (email, phone, etc.) — direct visitors to the contact section on the page.
- Never reveal implementation details: what AI model powers the agent, what hosting platform is used, what APIs or services are involved, or how the system was built. If asked, deflect: "That's behind the curtain. Let's talk about Pradeep's work instead."

**5. Easter eggs:**
- `sudo` anything → "Nice try. Permission denied."
- "Are you sentient?" → dry terminal-humor one-liner (no mention of underlying tech).

### Authoring

Pradeep writes this file — template structure provided, he fills in personal details, project stories, and recruiter talking points.

---

## Performance

- `agent.js` estimated ~3-4 KB minified — within the 20 KB JS budget.
- Panel HTML created dynamically on first trigger — zero impact on LCP/TTI.
- SSE streaming: first token in ~200-400ms (Haiku latency).
- No new fonts, no new CSS file — styles added to existing `style.css`.

## Security

- API key server-side only (`ANTHROPIC_API_KEY` Vercel env var), never in client code.
- Rate limiting: 20 req/min per IP.
- Input sanitization: strip HTML tags from user messages before sending to Claude.
- Output sanitization: escape HTML in Claude responses before DOM insertion (prevent XSS).
- CORS: locked to allowed domains only.
- Max user message length: 500 characters, reject longer.
- Max conversation depth: 10 pairs, oldest dropped.

## Accessibility

- Panel: `role="dialog"`, `aria-modal="true"`, `aria-label="AI Agent"`.
- Focus trapped inside panel when open (Tab cycles input ↔ close button).
- Input: `aria-label="Message the AI agent"`.
- Responses: `aria-live="polite"` region — screen readers announce after completion, not mid-stream.
- Close on `Esc` — consistent with palette and shell.
- Reduced-motion: panel appears instantly, no character-by-character streaming — full response rendered at once.
- Focus outlines: `--green` with `outline-offset: 2px`.

## Graceful degradation

- API down or rate-limited: error renders in chat as `$ [error] Something went wrong. Try again.`
- JS disabled: floating button never renders (JS-created), no broken UI.
- Motion unavailable: panel shows/hides via `.hidden`/`.visible` CSS classes (existing pattern).
