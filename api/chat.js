import { readFileSync } from 'fs';
import { join } from 'path';

const agentContext = readFileSync(join(process.cwd(), 'data', 'agent-context.md'), 'utf-8');

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://pradeeprakash.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Wait a moment.' });
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
            // Re-emit in our normalized format for the frontend
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
