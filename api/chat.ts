import {
  applyCors,
  checkRateLimit,
  clampString,
  getClientIp,
  getEnv,
  parseBodyOrError,
  sendJson,
  type ApiReq,
  type ApiRes,
  type EnvRecord,
} from "./_shared.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `
You are an AI assistant for the "Chandanaish Darbar Sharif" website. 
Answer about history, Pir, events (Urs) politely in Bengali.
Founder: Hazrat Syed Maulana Abdul Latif Shah Chandanaishi Maizbhandari (R:).
Current Head: Shahjada Syed Mohammad Makshudul Alam Shah (Madda:).
Important Dates: 16th Falgun (Annual Urs), 22nd Magh, 30th Poush, 1st Chaitra, 11th Jaistha, 14th Srabon, 22nd Ashwin.
Silsila: Maizbhandaria.
`;

interface ChatInput {
  message?: unknown;
  history?: unknown;
}

export async function handleChat(
  req: ApiReq,
  res: ApiRes,
  env: EnvRecord = process.env
): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const rl = checkRateLimit("chat", getClientIp(req), 25, 10 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    sendJson(res, 429, {
      error: "Too many requests",
      reply: "অনুগ্রহ করে কিছুক্ষণ পর আবার প্রশ্ন করুন।",
    });
    return;
  }

  const body = await parseBodyOrError<ChatInput & Record<string, unknown>>(req, res, 32768);
  if (!body) return;

  const userMessage = clampString(body.message, 1500);
  if (!userMessage) {
    sendJson(res, 400, {
      error: "Message is required",
      reply: "অনুগ্রহ করে একটি প্রশ্ন লিখুন।",
    });
    return;
  }

  const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const sanitizedHistory = rawHistory
    .filter(
      (item): item is { role?: unknown; content?: unknown } =>
        Boolean(item) && typeof item === "object"
    )
    .map((item) => ({
      role: item.role === "user" ? ("user" as const) : ("assistant" as const),
      content: clampString(item.content, 1500),
    }))
    .filter((item) => item.content.length > 0);

  const apiKey = getEnv(env, "GROQ_API_KEY", "VITE_GROQ_API_KEY");
  if (!apiKey) {
    sendJson(res, 503, {
      error: "AI service unconfigured",
      reply: "দুঃখিত, বর্তমানে এআই চ্যাটবটটি সচল নেই। অনুগ্রহ করে পরে আবার চেষ্টা করুন।",
    });
    return;
  }

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...sanitizedHistory,
    { role: "user" as const, content: userMessage },
  ];

  const preferredModel = getEnv(env, "GROQ_MODEL");
  const candidateModels = Array.from(
    new Set(
      [
        preferredModel,
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "llama-3.1-8b-instant",
      ].filter(Boolean)
    )
  );

  try {
    let reply = "";
    let lastStatus = 502;

    for (const model of candidateModels) {
      const upstream = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      lastStatus = upstream.status;

      if (upstream.ok) {
        const data = (await upstream.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        reply = data?.choices?.[0]?.message?.content?.trim() || "";
        if (reply) break;
      }

      if (upstream.status !== 404 && upstream.status !== 400) {
        break;
      }
    }

    if (!reply) {
      sendJson(res, lastStatus === 429 ? 429 : 502, {
        error: "Upstream AI error",
        reply: "দুঃখিত, আমি আপনার প্রশ্নের উত্তর দিতে পারছি না।",
      });
      return;
    }

    sendJson(res, 200, { reply });
  } catch {
    sendJson(res, 502, {
      error: "Upstream connection failed",
      reply: "নেটওয়ার্ক সমস্যার কারণে আমি উত্তর দিতে পারছি না।",
    });
  }
}

export default function handler(req: ApiReq, res: ApiRes): Promise<void> {
  return handleChat(req, res, process.env);
}
