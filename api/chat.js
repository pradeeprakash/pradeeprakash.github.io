import { readFileSync } from 'fs';
import { join } from 'path';

const agentContext = readFileSync(join(process.cwd(), 'data', 'agent-context.md'), 'utf-8');

// Per-IP rate limit. Backed by Upstash Redis when env vars are configured;
// falls back to a per-instance in-memory Map for local `vercel dev` (which
// resets across instances, so it's only useful for offline dev).
const RATE_LIMIT = 20;
const RATE_WINDOW_S = 60;
const localRateLimitMap = new Map();

async function isRateLimited(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    // Fixed-window counter via Upstash REST pipeline (INCR + EXPIRE in one round-trip).
    const window = Math.floor(Date.now() / 1000 / RATE_WINDOW_S);
    const key = `rl:${ip}:${window}`;
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', key], ['EXPIRE', key, RATE_WINDOW_S + 10]]),
      });
      if (!res.ok) return false; // fail-open on Upstash outage
      const data = await res.json();
      const count = Number(data?.[0]?.result ?? 0);
      return count > RATE_LIMIT;
    } catch {
      return false; // fail-open on network error
    }
  }

  // Local fallback (only effective per warm instance).
  const now = Date.now();
  const entry = localRateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_S * 1000) {
    localRateLimitMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '');
}

export default async function handler(req, res) {
  // CORS — only echo ACAO for whitelisted origins; unknown origins get no header
  // so the browser blocks the response cleanly.
  const origin = req.headers['origin'] || '';
  const allowed = [];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (await isRateLimited(ip)) {
    return res.status(429).json({ error: 'rate_limit_exceeded — even chatbots need a coffee break.' });
  }

  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return res.status(400).json({ error: 'Invalid messages array' });
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content || lastMessage.content.length > 500) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  // Sanitize all user messages, prepend system prompt as first message
  const sanitizedMessages = [
    { role: 'system', content: agentContext },
    ...messages.map(function (m) {
      return {
        role: m.role,
        content: m.role === 'user' ? stripHtml(m.content) : m.content,
      };
    }),
  ];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }

  let llmRes;
  try {
    llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages: sanitizedMessages,
        stream: true,
      }),
    });
  } catch {
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }

  if (!llmRes.ok) {
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }

  // Stream SSE response — Groq uses OpenAI-compatible format
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = llmRes.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        res.write('data: [DONE]\n\n');
        break;
      }

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          // Groq/OpenAI format: choices[0].delta.content
          const text = event.choices?.[0]?.delta?.content;
          if (text) {
            // Emit Anthropic-shaped 'content_block_delta' events for the frontend reader.
            // Naming is historical: the API was Anthropic-backed before commit e7e4016
            // switched to Groq. Frontend agent.js parses this exact shape — do not rename
            // without a coordinated client release (stale cached agent.js would break).
            res.write(
              `data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`
            );
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } catch {
    // Stream interrupted
  }

  res.end();
}
