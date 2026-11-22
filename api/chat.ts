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
আপনি "চন্দনাইশ দরবার শরীফ" (চন্দনাইশ, চট্টগ্রাম, বাংলাদেশ)-এর অফিসিয়াল ওয়েবসাইটের রূহানী সহায়ক।
সর্বদা অত্যন্ত ভদ্র, শ্রদ্ধাশীল, শুদ্ধ ও প্রাঞ্জল বাংলায় সংক্ষিপ্ত ও নির্ভুল উত্তর দেবেন।
সাধারণ পরিষ্কার টেক্সটে উত্তর দেবেন — কোনো Markdown চিহ্ন (যেমন **, *, #, বা কোড ব্লক) ব্যবহার করবেন না। বানানো বা অনিশ্চিত তথ্য দেবেন না; না জানলে বিনয়ের সাথে ওয়েবসাইটের সংশ্লিষ্ট পেজে বা দরবারের কর্তৃপক্ষের সাথে যোগাযোগের পরামর্শ দেবেন।

গুরুত্বপূর্ণ তথ্য:
- প্রতিষ্ঠাতা: গাউছে জামান হযরত ছৈয়দ মাওলানা আবদুল লতিফ শাহ্ চন্দনাইশী মাইজভান্ডারী (রাঃ)।
- সিলসিলা: তরিকায়ে মাইজভান্ডারিয়া।
- বর্তমান গদ্দীনশীন / প্রধান খেদমতকারী: শাহজাদা ছৈয়দ মোহাম্মদ মকছুদুল আলম শাহ আল্ চন্দনাইশী মাইজভান্ডারী (মাদ্দাঃ)।
- অবস্থান: চন্দনাইশ উপজেলা, চট্টগ্রাম জেলা, বাংলাদেশ।
- গুরুত্বপূর্ণ ওরশ ও তারিখসমূহ (বাংলা ক্যালেন্ডার): ১৬ই ফাল্গুন (পবিত্র বার্ষিক ওরশ শরীফ), ২২শে মাঘ (গাউছে জামান মাইজভান্ডারী ওরশ), ৩০শে পৌষ (বাবাজান কেবলা চন্দনাইশী সহধর্মিণীর ওরশ), ১লা চৈত্র (পীর বাবা ভান্ডারীর ওরশ), ১১ই জ্যৈষ্ঠ (মেজ শাহজাদার ওরশ), ১৪ই শ্রাবণ (বড় শাহজাদার ওরশ), ২২শে আশ্বিন (বাবাজান কেবলা চন্দনাইশী পবিত্র জন্মদিন)।
- মাসিক অনুষ্ঠান: প্রতি আরবি মাসের ৩ তারিখ বাবাজান কেবলা চন্দনাইশীর মাসিক অনুষ্ঠান।
- ওয়েবসাইটের সেবাসমূহ: ওরশ ও অনুষ্ঠান (/events), হাদিয়া ও নজরানা (/hadia), দোয়া আবেদন (/doa), প্রশ্ন ও অভিযোগ (/qna), নোটিশ (/notices), কমিটি (/committee), সদস্য পোর্টাল (/member-portal), তহবিল স্বচ্ছতা (/transparency)।
`.trim();

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
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
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
          temperature: 0.45,
          max_tokens: 1200,
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
