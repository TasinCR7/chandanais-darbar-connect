import {
  applyCors,
  checkRateLimit,
  clampString,
  escapeTelegramHtml,
  getClientIp,
  getEnv,
  parseBodyOrError,
  sendJson,
  type ApiReq,
  type ApiRes,
  type EnvRecord,
} from "./_shared.js";

function buildTelegramMessage(body: Record<string, unknown>): string | null {
  const type = clampString(body.type, 20);

  if (type === "doa") {
    const name = clampString(body.name, 100);
    const phone = clampString(body.phone, 30) || "দেওয়া হয়নি";
    const subject = clampString(body.subject, 200);
    const address = clampString(body.address, 200) || "দেওয়া হয়নি";
    const details = clampString(body.details, 1500);

    if (!name || !subject || !details) return null;

    return [
      "🤲 <b>নতুন দোয়া আবেদন জমা হয়েছে!</b>",
      "━━━━━━━━━━━━━━━━━━",
      `👤 <b>নাম:</b> ${escapeTelegramHtml(name)}`,
      `📱 <b>মোবাইল:</b> ${escapeTelegramHtml(phone)}`,
      `📌 <b>বিষয়:</b> ${escapeTelegramHtml(subject)}`,
      `📍 <b>ঠিকানা:</b> ${escapeTelegramHtml(address)}`,
      `📝 <b>বিস্তারিত:</b>\n${escapeTelegramHtml(details)}`,
      "━━━━━━━━━━━━━━━━━━",
      "পীর সাহেব হুজুরকে দোয়ার জন্য অবগত করুন।",
    ].join("\n");
  }

  if (type === "question" || type === "complaint") {
    const trackingNumber = clampString(body.trackingNumber, 32) || "N/A";
    const name = clampString(body.name, 100);
    const phone = clampString(body.phone, 30) || "দেওয়া হয়নি";
    const subject = clampString(body.subject, 200);
    const details = clampString(body.details, 1500);

    if (!name || !subject || !details) return null;

    const isComplaint = type === "complaint";
    const icon = isComplaint ? "🔴" : "🔵";
    const titleText = isComplaint ? "নতুন অভিযোগ জমা হয়েছে!" : "নতুন প্রশ্ন জমা হয়েছে!";

    return [
      `${icon} <b>${titleText}</b>`,
      "━━━━━━━━━━━━━━━━━━",
      `🆔 <b>ট্র্যাকিং নম্বর:</b> ${escapeTelegramHtml(trackingNumber)}`,
      `👤 <b>নাম:</b> ${escapeTelegramHtml(name)}`,
      `📱 <b>মোবাইল:</b> ${escapeTelegramHtml(phone)}`,
      `📌 <b>বিষয়:</b> ${escapeTelegramHtml(subject)}`,
      `📝 <b>বিস্তারিত:</b>\n${escapeTelegramHtml(details)}`,
      "━━━━━━━━━━━━━━━━━━",
      "অনুগ্রহ করে প্যানেল থেকে ব্যবস্থা নিন।",
    ].join("\n");
  }

  if (type === "donation") {
    const donorName = clampString(body.donorName, 100);
    const donorPhone = clampString(body.donorPhone, 30);
    const categoryLabel = clampString(body.categoryLabel, 120);
    const amountNum = Number(body.amount);
    const paymentMethod = clampString(body.paymentMethod, 50);
    const transactionId = clampString(body.transactionId, 100);

    if (
      !donorName ||
      !donorPhone ||
      !categoryLabel ||
      !Number.isFinite(amountNum) ||
      amountNum <= 0 ||
      !paymentMethod ||
      !transactionId
    ) {
      return null;
    }

    return [
      "🟢 <b>নতুন হাদিয়া/নজরানা জমা হয়েছে!</b>",
      "━━━━━━━━━━━━━━━━━━",
      `👤 <b>নাম:</b> ${escapeTelegramHtml(donorName)}`,
      `📱 <b>মোবাইল:</b> ${escapeTelegramHtml(donorPhone)}`,
      `🎯 <b>খাত:</b> ${escapeTelegramHtml(categoryLabel)}`,
      `💰 <b>পরিমাণ:</b> ${escapeTelegramHtml(amountNum)} ৳`,
      `💳 <b>পেমেন্ট:</b> ${escapeTelegramHtml(paymentMethod)}`,
      `🔑 <b>TrxID:</b> ${escapeTelegramHtml(transactionId)}`,
      "━━━━━━━━━━━━━━━━━━",
      "অনুগ্রহ করে প্যানেল থেকে ট্রানজেকশনটি যাচাই করুন।",
    ].join("\n");
  }

  return null;
}

export async function handleNotify(
  req: ApiReq,
  res: ApiRes,
  env: EnvRecord = process.env
): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const rl = checkRateLimit("notify", getClientIp(req), 12, 15 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    sendJson(res, 429, { ok: false, error: "Too many notifications" });
    return;
  }

  const body = await parseBodyOrError<Record<string, unknown>>(req, res, 16384);
  if (!body) return;

  const formattedMessage = buildTelegramMessage(body);
  if (!formattedMessage) {
    sendJson(res, 400, { ok: false, error: "Invalid notification payload" });
    return;
  }

  const botToken = getEnv(env, "TELEGRAM_BOT_TOKEN", "VITE_TELEGRAM_BOT_TOKEN");
  const chatIdsRaw = getEnv(
    env,
    "TELEGRAM_CHAT_ID",
    "TELEGRAM_CHAT_IDS",
    "VITE_TELEGRAM_CHAT_ID",
    "VITE_TELEGRAM_CHAT_IDS"
  );

  if (!botToken || !chatIdsRaw) {
    sendJson(res, 200, { ok: false, skipped: true });
    return;
  }

  const chatIds = chatIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^-?\d+$/.test(id));

  if (chatIds.length === 0) {
    sendJson(res, 200, { ok: false, skipped: true });
    return;
  }

  const results = await Promise.allSettled(
    chatIds.map(async (chatId) => {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedMessage,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      return response.ok;
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  sendJson(res, 200, { ok: sent > 0, sent });
}

export default function handler(req: ApiReq, res: ApiRes): Promise<void> {
  return handleNotify(req, res, process.env);
}
