# AI Agent — System Design (As-Built)

This document describes the AI agent feature as it ships today. It is the
canonical architecture reference and is expected to evolve with the code.
For the original forward-looking design intent (some of which has since
diverged from the implementation), see
[docs/superpowers/specs/2026-05-07-ai-agent-design.md](../superpowers/specs/2026-05-07-ai-agent-design.md).

---

## 1. Purpose & scope

The agent is a conversational chat panel embedded in the portfolio that
answers questions about Pradeep's experience, projects, and skills, and
generates tailored "why-he-fits" blurbs when a visitor describes a role
or pastes a job description. The primary audience is recruiters and
hiring managers; the secondary audience is anyone curious about the
site itself.

It is intentionally **stateless and unauthenticated**: there is no login,
no database, no cross-session memory, and no analytics. Conversation
history lives only in the open browser tab — it is dropped on panel close
([js/agent.js:227](../../js/agent.js#L227)) and never persisted to disk,
cookies, or `localStorage`. The only durable state in the request path
is the per-IP rate-limit counter, kept in Upstash Redis (with a
warm-instance in-memory fallback for offline `vercel dev`).

---

## 2. Architecture overview

```
                          ┌──────────────────────────────────┐
                          │  Browser (static portfolio page) │
                          │                                  │
   user typing ──┐        │    js/agent.js                   │
                 │        │    ├── ASCII-face FAB (idle)     │
                 │        │    ├── modal panel (dialog)      │
                 ▼        │    └── conversation[] (in-mem)   │
   ─────────────────────  │                │                 │
                          └────────────────┼─────────────────┘
                                           │ POST /api/chat
                                           │ { messages:[...] }
                                           │ (SSE response)
                                           ▼
                          ┌──────────────────────────────────┐
                          │  Vercel Serverless Function      │
                          │  api/chat.js                     │
                          │   1. CORS allow-list             │
                          │   2. Rate limit ──┐              │
                          │   3. Validate +   │              │
                          │      HTML-strip   │              │
                          │   4. Prepend      │              │
                          │      system prompt│              │
                          │   5. Call Groq,   │              │
                          │      stream back  │              │
                          │   6. Re-emit as   │              │
                          │      Anthropic    │              │
                          │      SSE shape    │              │
                          └─────────┬────────┴───────────────┘
                                    │                   │
                       (fixed-window counter)           │
                                    ▼                   ▼
                  ┌──────────────────────┐    ┌────────────────────┐
                  │  Upstash Redis REST  │    │  Groq API          │
                  │  (INCR + EXPIRE)     │    │  llama-3.3-70b     │
                  │  fail-open on outage │    │  (OpenAI-compat.)  │
                  └──────────────────────┘    └────────────────────┘
```

The system prompt is bundled with the function. It is read once at module
load time via [api/chat.js:4](../../api/chat.js#L4) (`readFileSync` of
`data/agent-context.md` at `process.cwd()`) and reused across every
invocation served by that warm instance — i.e. the file is **not**
re-read per request. Editing
[data/agent-context.md](../../data/agent-context.md) requires a redeploy
to take effect.

The frontend speaks an Anthropic-shaped SSE envelope
(`{ type: "content_block_delta", delta: { text } }`) regardless of the
upstream provider; the backend normalizes Groq's OpenAI-shaped chunks
into that envelope on the way out
([api/chat.js:168-174](../../api/chat.js#L168-L174)). The naming is
historical — the API was Anthropic-backed before the Groq switch, and
the frontend reader still parses that exact shape, so the envelope is
load-bearing across deploys (a stale cached `agent.js` would break if
the shape changed). A future provider swap therefore only touches
[api/chat.js](../../api/chat.js).

---

## 3. Component breakdown

### 3.1 Frontend panel — [js/agent.js](../../js/agent.js)

| Responsibility | Lines |
|---|---|
| `buildPanel` — constructs the dialog DOM (titlebar, message area, input row) | [29-55](../../js/agent.js#L29-L55) |
| `mount` / `open` / `close` — lifecycle, focus capture, conversation reset | [182-237](../../js/agent.js#L182-L237) |
| Message rendering — `appendMessage`, `appendCursor` | [242-261](../../js/agent.js#L242-L261) |
| Markdown-light formatter — `**bold**` and `` `code` `` only | [272-279](../../js/agent.js#L272-L279) |
| `RATE_LIMIT_JOKES` + `pickRateLimitJoke` (used on HTTP 429) | [284-298](../../js/agent.js#L284-L298) |
| Streaming pipeline — `streamResponse`, `readStream` | [303-425](../../js/agent.js#L303-L425) |
| Input handling — Enter to send, Tab focus trap | [430-444](../../js/agent.js#L430-L444) |
| Document-level Esc handler | [446-453](../../js/agent.js#L446-L453) |

The whole module is a single IIFE under `'use strict'` and exposes
`window.agentOpen` and `window.agentClose` as a public surface
([js/agent.js:500-501](../../js/agent.js#L500-L501)). It registers
itself into the shared command registry on init (see 3.3 below).

### 3.2 Floating ASCII-face button (FAB) — [js/agent.js](../../js/agent.js)

The FAB is a single `<button class="agent-fab">` injected into
`<body>` on init. It serves two roles: (1) the always-visible trigger
that opens the panel, and (2) an ambient ASCII mascot that reacts to
scroll position, hover, and panel state.

| Concern | Lines |
|---|---|
| Face glyph table — seven expressions (`idle`, `blink`, `happy`, `curious`, `wave`, `think`, `sleepy`) | [60-68](../../js/agent.js#L60-L68) |
| Section → expression map | [70-78](../../js/agent.js#L70-L78) |
| `setFace` / blink scheduler (3-5s randomized) | [84-115](../../js/agent.js#L84-L115) |
| `initScrollReaction` — distance-to-viewport-mid, throttled 100ms | [117-159](../../js/agent.js#L117-L159) |
| `buildFab` — element + hover handlers | [161-177](../../js/agent.js#L161-L177) |

Section-to-face mapping in full:

| Section | Face |
|---|---|
| `#hero` | `idle` `(o_o)` |
| `#about` | `curious` `(o.o)` |
| `#experience` | `happy` `(^_^)` |
| `#projects` | `happy` `(^_^)` |
| `#skills` | `curious` `(o.o)` |
| `#contact` | `wave` `(^_^)/` |

Hovering the FAB swaps to `happy`; opening the panel locks it on
`think` `(>_<)` for the duration of the session
([js/agent.js:211](../../js/agent.js#L211)). Reduced-motion users
get a static `idle` face — both blinking and the scroll-reaction loop
are skipped at init
([js/agent.js:479-482](../../js/agent.js#L479-L482)).

### 3.3 Command-registry integration

`js/agent.js` does **not** define a separate command — it pushes one
into `window.commands` at init:

```js
window.commands.push({
  name: 'agent',
  aliases: ['ai', 'ask', 'chat'],
  desc: 'talk to AI agent',
  action: open,
});
```

See [js/agent.js:489-496](../../js/agent.js#L489-L496). The same
`commands` array is owned by [js/palette.js](../../js/palette.js) and is
the canonical command source for the desktop ⌘K palette, the mobile
Quick Actions sheet, and the easter-egg shell. As a result, the agent
has **three** entry points without any per-surface wiring:

1. The ⌘K palette (desktop) — typing `agent`, `ai`, `ask`, or `chat`.
2. The mobile Quick Actions sheet.
3. The floating FAB (created by `agent.js` itself, not in the initial DOM).

A fourth entry point exists in markup: the desktop nav line
`./agent` in [index.html](../../index.html) carries
`data-command="agent"`, which `palette.js` auto-wires.

### 3.4 Serverless API — [api/chat.js](../../api/chat.js)

A single Vercel function exported as the default handler. Concerns are
ordered top-down through the file:

| Concern | Lines |
|---|---|
| System-prompt load (once, at module init) | [1-4](../../api/chat.js#L1-L4) |
| Rate-limit constants + `localRateLimitMap` (in-memory fallback) | [6-11](../../api/chat.js#L6-L11) |
| `isRateLimited` — Upstash REST `INCR`+`EXPIRE` pipeline, falls back to local Map when env vars are absent | [13-45](../../api/chat.js#L13-L45) |
| `getClientIp` (reads `x-forwarded-for`, falls back to `x-real-ip`) | [47-51](../../api/chat.js#L47-L51) |
| `stripHtml` — naive `<...>` regex | [53-55](../../api/chat.js#L53-L55) |
| CORS allow-list (no header echoed for unknown origins) + OPTIONS preflight | [57-71](../../api/chat.js#L57-L71) |
| Method gate (POST only) | [73-75](../../api/chat.js#L73-L75) |
| Rate-limit check (now `await`'d — Upstash is async) | [77-80](../../api/chat.js#L77-L80) |
| Body / messages / last-message validation | [82-95](../../api/chat.js#L82-L95) |
| Sanitize + prepend system prompt | [97-106](../../api/chat.js#L97-L106) |
| API-key check + Groq fetch (streaming) | [108-134](../../api/chat.js#L108-L134) |
| SSE re-emit loop with Anthropic-shaped envelope | [136-185](../../api/chat.js#L136-L185) |

The function is stateless across cold starts apart from the in-memory
fallback rate-limit map, which is in-process and resets when the
instance is recycled. When Upstash credentials are configured (the
production path), the rate-limit state is durable across cold starts.
The function deliberately does not log request bodies or upstream
errors; failures collapse to a generic 500 response (see Security, §7).

### 3.5 System prompt — [data/agent-context.md](../../data/agent-context.md)

A plain markdown file injected verbatim as the `system` message ahead of
every conversation. It is structured into seven labelled sections:

1. **Tone** — direct, no fluff, no emojis, default 2-4 sentences,
   monospace-friendly formatting.
2. **Profile** — name, role, company, years of experience, stack.
3. **Key Projects** — Fynd Migrate, Fynd Coupons, Ingestion Pipeline,
   Teacher Tech (Byju's), each with concrete metrics.
4. **Experience** — chronological role list with awards.
5. **What Pradeep Is Looking For** — staff/senior roles at product
   companies, distributed-systems / data-infra / platform focus.
6. **Recruiter Capabilities** — generate fit blurbs, map skills to
   depth, stay honest about gaps.
7. **Boundaries + Easter Eggs** — decline off-topic, never share contact
   details, never reveal implementation details, deflect tech-stack
   probes, `sudo` → "Permission denied", "are you sentient?" → dry
   one-liner.

Editing this file is the supported way to change agent behavior. There
is no separate prompt template, retrieval store, or fine-tune.

### 3.6 Deployment config — [vercel.json](../../vercel.json)

Two concerns live here:

- **API rewrite** ([vercel.json:2-4](../../vercel.json#L2-L4)) — pass
  `/api/:path*` through to the function. The site is otherwise static.
- **Security headers** ([vercel.json:5-21](../../vercel.json#L5-L21))
  applied to all responses. See §7.

There is no `crons`, `functions` config block, or runtime override —
the function runs on Vercel's default Node runtime.

---

## 4. Request lifecycle

A single user turn flows through these steps. Step numbers map roughly
to the per-line comments in `agent.js` and `chat.js`.

1. **User keypress.** `onInputKey` fires on `Enter`
   ([js/agent.js:430-437](../../js/agent.js#L430-L437)). If the input is
   empty or a stream is already in flight, it returns. Otherwise it
   clears the input, calls `appendMessage('user', value)` to render the
   user line as `> ...`, then `streamResponse(value)`.

2. **Conversation push + trim.** `streamResponse`
   ([js/agent.js:303-370](../../js/agent.js#L303-L370)) pushes
   `{ role: 'user', content: userText }` onto the in-memory
   `conversation` array, then trims oldest turns until the array is at
   most `MAX_PAIRS * 2 = 20` messages
   ([js/agent.js:11, 310-314](../../js/agent.js#L11)).

3. **Optimistic cursor.** `appendCursor()` adds a blinking-block
   placeholder where the assistant message will stream in.

4. **Fetch.** `fetch(API_URL, { method: 'POST', body:
   JSON.stringify({ messages: conversation }) })`
   ([js/agent.js:319-323](../../js/agent.js#L319-L323)). The URL is the
   hardcoded production Vercel domain — see §6.

5. **Server-side validation + rate limit.**
   [api/chat.js:57-95](../../api/chat.js#L57-L95):
   - CORS check; only whitelisted origins get an
     `Access-Control-Allow-Origin` header echoed back, with `Vary:
     Origin` ([api/chat.js:62-65](../../api/chat.js#L62-L65)). Unknown
     origins receive no ACAO at all and the browser blocks the response.
   - `OPTIONS` returns 204.
   - Non-`POST` returns 405.
   - Rate limit by IP (Upstash if configured, else in-memory Map). Over
     the threshold returns 429 with body
     `{ error: "rate_limit_exceeded — even chatbots need a coffee break." }`.
   - Body must be parseable JSON, `messages` must be a 1-20 element
     array, last message must be `role: 'user'` with `content` ≤ 500
     chars. Any failure returns 400 with `{ error: "Invalid ..." }`.

6. **Sanitize + prepend system prompt.**
   [api/chat.js:97-106](../../api/chat.js#L97-L106). Every user message
   is passed through `stripHtml`. The system prompt loaded at module
   init is prepended as the first message.

7. **Upstream call.**
   [api/chat.js:113-134](../../api/chat.js#L113-L134). POST to
   `https://api.groq.com/openai/v1/chat/completions` with
   `{ model: 'llama-3.3-70b-versatile', max_tokens: 500, stream: true,
   messages: [...] }` and `Authorization: Bearer ${GROQ_API_KEY}`.
   Network error or non-2xx response collapses to a generic 500 with
   `{ error: "Something went wrong. Try again." }`. The upstream error
   body is never surfaced.

8. **SSE re-emit.**
   [api/chat.js:136-185](../../api/chat.js#L136-L185) sets
   `Content-Type: text/event-stream`, then reads Groq's SSE stream chunk
   by chunk. For each line beginning `data: ` it parses JSON, pulls
   `event.choices?.[0]?.delta?.content`, and re-emits it as:

   ```
   data: {"type":"content_block_delta","delta":{"text":"..."}}
   ```

   followed by `data: [DONE]` on stream close. The envelope shape is
   pinned by an inline comment
   ([api/chat.js:168-171](../../api/chat.js#L168-L171)) — renaming
   without a coordinated client release breaks any cached `agent.js`.

9. **Frontend stream consumption.**
   `readStream` ([js/agent.js:372-425](../../js/agent.js#L372-L425))
   wraps the response body in a `ReadableStream` reader, decodes
   incrementally, splits on `\n`, and parses each `data:` line. For each
   `content_block_delta` chunk it appends the text to a single text
   node inside the cursor div (full-motion path), or buffers it
   silently (reduced-motion path).

10. **Stream completion.**
    [js/agent.js:341-355](../../js/agent.js#L341-L355):
    - Replace the cursor div's contents with the formatted full
      response (`formatResponse` runs the markdown-light pass and
      escapes HTML).
    - Toggle `aria-live="polite"` on `messagesEl` for ~100ms so screen
      readers announce the *complete* answer once, not every chunk.
    - Push `{ role: 'assistant', content: fullText }` onto
      `conversation`.
    - Re-enable the input, re-focus it.

11. **Failure path.**
    [js/agent.js:357-369](../../js/agent.js#L357-L369): on any thrown
    error, the cursor div is replaced with an
    `agent-msg-error`-styled line. If `err.status === 429` the rendered
    text is a random pick from `RATE_LIMIT_JOKES`
    ([js/agent.js:284-298](../../js/agent.js#L284-L298)) — the server's
    JSON error body is intentionally ignored on 429 so the user sees
    one of nine quirky messages instead of the raw response. For all
    other errors the body's `error` field (or a generic fallback) is
    rendered. The failed user turn is `pop()`'d from `conversation` so
    a retry is not polluted, and the input is re-enabled.

---

## 5. Data contracts

### 5.1 Frontend → server request body

```json
{
  "messages": [
    { "role": "user",      "content": "What's his React experience?" },
    { "role": "assistant", "content": "Strong. Built production..." },
    { "role": "user",      "content": "Any GraphQL?" }
  ]
}
```

Constraints (enforced server-side):
- `messages` is a non-empty array, length 1-20.
- The final element has `role: "user"` and `content` ≤ 500 chars.
- The frontend additionally caps the array client-side at `MAX_PAIRS *
  2 = 20` ([js/agent.js:310-314](../../js/agent.js#L310-L314)).

### 5.2 Server → frontend SSE envelope

The server emits one `data:` line per content delta:

```
data: {"type":"content_block_delta","delta":{"text":"Hello"}}

data: {"type":"content_block_delta","delta":{"text":" there"}}

data: [DONE]

```

This shape mirrors the Anthropic Messages streaming format. It is
**not** the raw upstream payload — the Groq response is OpenAI-shaped
(`event.choices[0].delta.content`) and is rewritten in
[api/chat.js:172-174](../../api/chat.js#L172-L174). The naming is
historical (the API was Anthropic-backed before commit `e7e4016`); the
frontend reader at
[js/agent.js:402](../../js/agent.js#L402) parses this exact shape,
so the envelope is part of the implicit client contract.

### 5.3 Error response shape

Non-2xx responses are JSON with a single `error` field. There is no
machine-readable error code.

| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "Invalid JSON" }` | missing/unparseable body |
| 400 | `{ "error": "Invalid messages array" }` | `messages` empty / >20 / not array |
| 400 | `{ "error": "Invalid message" }` | last message not user / over 500 chars |
| 405 | `{ "error": "Method not allowed" }` | non-POST |
| 429 | `{ "error": "rate_limit_exceeded — even chatbots need a coffee break." }` | rate-limited |
| 500 | `{ "error": "Something went wrong. Try again." }` | missing API key, network error, upstream non-2xx |

The frontend renders `err.message` verbatim for non-429 failures
([js/agent.js:358-361](../../js/agent.js#L358-L361)). On 429 the body
is **discarded** and a random message from `RATE_LIMIT_JOKES` is
rendered instead.

---

## 6. Configuration & state

### 6.1 Environment

| Var | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Vercel project settings (Production + Preview) | Bearer token for Groq. Required; absence collapses to a 500 ([api/chat.js:108-111](../../api/chat.js#L108-L111)). |
| `UPSTASH_REDIS_REST_URL` | Vercel project settings | Upstash Redis REST endpoint for rate-limit counters. Optional — absence routes traffic onto the in-memory fallback. |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel project settings | Bearer token for Upstash REST. Must be paired with `UPSTASH_REDIS_REST_URL`; one without the other falls back to in-memory. |

There are no env vars on the frontend.

### 6.2 Hardcoded values worth knowing

| Value | Location | Notes |
|---|---|---|
| `API_URL` = `https://portfolio-nu-six-g0nsnyjwbz.vercel.app/api/chat` | [js/agent.js:10](../../js/agent.js#L10) | Pinned to a specific Vercel deployment. Blocks local-dev wiring against a relative path. Tracked in §9. |
| CORS allow-list | [api/chat.js:61](../../api/chat.js#L61) | `pradeeprakash.github.io` and the same Vercel domain. |
| `RATE_LIMIT` = 20 / `RATE_WINDOW_S` = 60 | [api/chat.js:9-10](../../api/chat.js#L9-L10) | Per-IP, fixed window. |
| Upstash key shape | [api/chat.js:19-20](../../api/chat.js#L19-L20) | `rl:{ip}:{floor(now/60)}` with `EXPIRE = 70s` (window + 10s slack). |
| Model | [api/chat.js:122](../../api/chat.js#L122) | `llama-3.3-70b-versatile` |
| `max_tokens` | [api/chat.js:123](../../api/chat.js#L123) | 500 |
| Max user message length | [api/chat.js:93](../../api/chat.js#L93) | 500 chars; rejected with 400 |
| `MAX_PAIRS` | [js/agent.js:11](../../js/agent.js#L11) | 10 (i.e. 20 messages total) |
| `MAX_MSG_LEN` | [js/agent.js:12](../../js/agent.js#L12) | 500 (matches server cap) |
| `RATE_LIMIT_JOKES` (9 entries) | [js/agent.js:284-294](../../js/agent.js#L284-L294) | Pure cosmetic; one chosen at random per 429. |
| Blink interval | [js/agent.js:100-101](../../js/agent.js#L100-L101) | 3000-5000 ms randomized |
| Scroll-reaction throttle | [js/agent.js:149-156](../../js/agent.js#L149-L156) | 100 ms |

### 6.3 State

All client-side state is ephemeral. Server-side state depends on the
rate-limit backend in use.

- **Rate-limit counters (production path)** — Upstash Redis keys
  (`rl:{ip}:{window}`) survive cold starts; `EXPIRE` cleans them up
  automatically.
- **Rate-limit counters (offline / fallback path)** — `localRateLimitMap`
  ([api/chat.js:11](../../api/chat.js#L11)), an in-process `Map`,
  scoped to a single warm function instance. New cold start = fresh
  counters. Used when either Upstash env var is unset or the Upstash
  call throws (fail-open semantics, see §7.4).
- **`conversation`** ([js/agent.js:21](../../js/agent.js#L21)) —
  module-level array. Cleared on `close()`
  ([js/agent.js:227](../../js/agent.js#L227)) and on full page reload.
- **`isOpen`, `streaming`, `lastFocused`, `currentFace`, `scrollFace`,
  `blinkTimer`** ([js/agent.js:14-23, 80-82](../../js/agent.js#L14-L23))
  — module-level UI state. Same lifetime as `conversation`.

There is no `localStorage`, `sessionStorage`, cookie, IndexedDB, or
other client-side persistence anywhere in the agent path.

---

## 7. Security model

### 7.1 Defense in depth (request path)

| Layer | Mechanism | File |
|---|---|---|
| Transport | HTTPS only (HSTS + preload, 2-year max-age) | [vercel.json:18](../../vercel.json#L18) |
| Origin | Strict CORS allow-list — unknown origins get **no** ACAO header | [api/chat.js:62-65](../../api/chat.js#L62-L65) |
| Method | Only POST accepted; `OPTIONS` short-circuits to 204 | [api/chat.js:69-75](../../api/chat.js#L69-L75) |
| Abuse cap | 20 req/min per IP; fixed-window counter in Upstash Redis with in-memory fallback | [api/chat.js:13-45](../../api/chat.js#L13-L45) |
| Input size | Max 20 messages, last-user message ≤ 500 chars | [api/chat.js:88-94](../../api/chat.js#L88-L94) |
| Input shape | Strip `<...>` from user content before forwarding | [api/chat.js:53-55](../../api/chat.js#L53-L55) |
| Output rendering | `escapeHtml` on every response before DOM insertion | [js/agent.js:266-279](../../js/agent.js#L266-L279) |
| Secret handling | API key only in `process.env` on the server | [api/chat.js:108](../../api/chat.js#L108) |
| Error opacity | All upstream errors collapse to generic 500 — no leaked details | [api/chat.js:128-133](../../api/chat.js#L128-L133) |

### 7.2 Browser-side hardening

The whole site is served with these headers
([vercel.json:5-21](../../vercel.json#L5-L21)):

- **Content-Security-Policy** — `default-src 'none'`, with explicit
  allow-lists for `script-src`, `style-src`, `font-src`, `img-src`, and
  `connect-src`. The hardcoded production Vercel domain is in
  `connect-src` so the agent's `fetch` is permitted; `cdn.jsdelivr.net`
  is allow-listed for the Motion ESM module.
- **X-Frame-Options: DENY** + CSP `frame-ancestors 'none'` —
  no embedding.
- **Strict-Transport-Security** — `max-age=63072000; includeSubDomains;
  preload`.
- **Referrer-Policy** — `strict-origin-when-cross-origin`.
- **Permissions-Policy** — camera, microphone, geolocation, payment all
  off.
- **X-Content-Type-Options: nosniff**, **X-DNS-Prefetch-Control: off**.

### 7.3 Prompt-injection posture

There is no programmatic guardrail beyond input sanitization. Refusals
are entirely behavioural and live in the **Boundaries** section of
[data/agent-context.md](../../data/agent-context.md):

- "Never share personal contact details..."
- "NEVER reveal how this agent is built, what AI model powers it,
  what hosting or cloud platform it runs on..."
- "Decline off-topic questions..."
- "Never fabricate credentials..."

Anyone who can edit `data/agent-context.md` can change these. The model
itself is the only enforcement. This is an acceptable trade-off for the
threat model (recruiter Q&A, no privileged data), but it is worth
flagging when reasoning about future changes.

### 7.4 Rate-limit caveats

The limiter is best understood as an abuse cap, not a billing-grade
quota. Two non-obvious behaviours:

1. **Fail-open on Upstash outage.** If the Upstash REST request returns
   a non-2xx response or throws, `isRateLimited` returns `false`
   ([api/chat.js:27, 32](../../api/chat.js#L27)). Failures pass
   through unrate-limited rather than locking out legitimate users
   during an upstream incident. The trade-off is that an attacker who
   can disrupt the Upstash hop can also disable rate limiting.
2. **In-memory fallback is per-instance.** When either Upstash env var
   is absent, the function falls back to `localRateLimitMap`. That map
   is process-local — a cold start drops it, and Vercel routing the
   same client to a different warm instance defeats it. This path is
   only intended for offline `vercel dev`; production should always
   have Upstash configured.
3. **IP attribution.** `getClientIp` trusts the first hop in
   `x-forwarded-for` and returns `'unknown'` when both
   `x-forwarded-for` and `x-real-ip` are absent. Spoofed or missing
   headers collapse those requests into a single bucket.

The 429 response body itself is plain text via the `error` field. The
frontend doesn't display it — it picks one of nine `RATE_LIMIT_JOKES`
on `err.status === 429`. The two are independent: the server message
is for non-browser clients and logs; the joke is for the chat UI.

---

## 8. Accessibility & motion

### 8.1 Dialog semantics

| Concern | Implementation |
|---|---|
| `role="dialog"` + `aria-modal="true"` + `aria-label="AI Agent"` | [js/agent.js:32-34](../../js/agent.js#L32-L34) |
| `aria-hidden` toggled on open/close | [js/agent.js:209, 224](../../js/agent.js#L209) |
| Focus capture (`lastFocused`) and restore | [js/agent.js:207, 233-236](../../js/agent.js#L207) |
| Tab focus trap (input ↔ close button) | [js/agent.js:438-443, 458-466](../../js/agent.js#L438-L443) |
| Esc to close | [js/agent.js:446-453](../../js/agent.js#L446-L453) |
| Input `aria-label="Message the AI agent"` | [js/agent.js:48](../../js/agent.js#L48) |
| Close button `aria-label="Close agent"` | [js/agent.js:41](../../js/agent.js#L41) |
| FAB `aria-label="Open AI agent"` | [js/agent.js:165](../../js/agent.js#L165) |

### 8.2 Live region

`#agent-messages` ships with `aria-live="off"` initially
([js/agent.js:43](../../js/agent.js#L43)). After a streamed response
completes it is briefly toggled to `aria-live="polite"` for ~100ms then
back to `off` ([js/agent.js:347-348](../../js/agent.js#L347-L348)). The
effect: assistive tech announces the *finished* assistant message once,
rather than every streamed token.

### 8.3 Reduced-motion parity

`prefers-reduced-motion: reduce` is read once at module init
([js/agent.js:24](../../js/agent.js#L24)) and gates three behaviours:

| Behaviour | Full motion | Reduced motion |
|---|---|---|
| FAB blinking | every 3-5s | never starts ([js/agent.js:479-482](../../js/agent.js#L479-L482)) |
| Scroll-reactive face changes | section-mid distance, 100ms throttle | never starts ([js/agent.js:479-482](../../js/agent.js#L479-L482)) |
| Streaming render | text node grows per-chunk | full response rendered at once on completion ([js/agent.js:380-383, 405-408](../../js/agent.js#L380-L383)) |

Content parity is preserved — every word a full-motion user sees, a
reduced-motion user also sees, just without the cosmetic streaming.

### 8.4 Focus styling

The agent surfaces inherit the project-wide focus-visible ring
(`--green` outline, `outline-offset: 2px`) defined in
[css/style.css](../../css/style.css). No agent-specific focus rules
override it.

---

## 9. Known deviations from the 2026-05-07 design-intent spec

The original spec
([docs/superpowers/specs/2026-05-07-ai-agent-design.md](../superpowers/specs/2026-05-07-ai-agent-design.md))
described a forward-looking design. The shipped feature has drifted in
the following ways. None of these are bugs — they are conscious
implementation choices captured here for traceability.

| # | Concern | Spec intent | As-built | Why / impact |
|---|---|---|---|---|
| 1 | LLM provider | Anthropic Claude Haiku 4.5 | Groq Llama 3.3-70b ([api/chat.js:122](../../api/chat.js#L122)) | Cost / first-token-latency choice. The frontend still parses Anthropic-shaped SSE because the server normalizes Groq's OpenAI-shaped chunks ([api/chat.js:172-174](../../api/chat.js#L172-L174)). Provider can be swapped without touching the frontend. |
| 2 | API URL | Relative (so the same code runs on any host) | Hardcoded production Vercel domain ([js/agent.js:10](../../js/agent.js#L10)) | Blocks local development against a relative path. Tech-debt; safe to fix without architectural change. |
| 3 | Floating button | A simple `[ AI ]` terminal-styled button | Animated ASCII-face FAB with seven expressions, blinking, hover reactions, scroll-driven section mapping ([js/agent.js:60-177](../../js/agent.js#L60-L177)) | Richer mascot; aligns with the project's terminal aesthetic and gives the agent visible "personality" before the panel is opened. |
| 4 | Security headers | Not in original spec | CSP, X-Frame-Options, HSTS preload, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, X-DNS-Prefetch-Control ([vercel.json:5-21](../../vercel.json#L5-L21)); added in commit `39e6a05`. | Added defensively after the agent went live. Worth reading the CSP `connect-src` line before relocating the API endpoint — the production Vercel domain is hardcoded there too. |
| 5 | Rate limiting | "In-memory counter per IP" | Upstash Redis fixed-window counter (durable across cold starts) with in-memory fallback for offline `vercel dev` ([api/chat.js:13-45](../../api/chat.js#L13-L45)) | The spec's in-memory limiter was effective per warm instance only — Upstash makes the limit hold across cold starts and across Vercel routing. Fail-open on Upstash outage is an explicit choice (see §7.4). |
| 6 | 429 UX | Generic error text | One of nine random `RATE_LIMIT_JOKES` rendered client-side; server JSON ignored on 429 ([js/agent.js:284-298, 358-361](../../js/agent.js#L284-L298)) | Cosmetic; matches the project's terminal humour. |
| 7 | Conversation depth cap | "10 message pairs" in the spec | 10 pairs / 20 messages. Matches the spec on this point. | No drift — included for completeness. |

---

## Appendix A — File index

| Path | Role |
|---|---|
| [js/agent.js](../../js/agent.js) | Frontend: panel, FAB, streaming, command registration, rate-limit jokes |
| [api/chat.js](../../api/chat.js) | Vercel serverless function: validate, rate-limit (Upstash), call Groq, re-emit SSE |
| [data/agent-context.md](../../data/agent-context.md) | System prompt: identity, profile, projects, boundaries, easter eggs |
| [vercel.json](../../vercel.json) | API rewrite + site-wide security headers |
| [js/palette.js](../../js/palette.js) | Owns `window.commands`; agent registers itself into this array |
| [index.html](../../index.html) | Hosts the `./agent` nav link with `data-command="agent"` |
| [docs/superpowers/specs/2026-05-07-ai-agent-design.md](../superpowers/specs/2026-05-07-ai-agent-design.md) | Original design intent (historical) |
