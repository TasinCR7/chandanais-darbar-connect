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

function normalizeSmsPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("8801") && digits.length === 13) return digits;
  if (digits.startsWith("01") && digits.length === 11) return `88${digits}`;
  if (digits.length === 10 && digits.startsWith("1")) return `880${digits}`;
  return digits;
}

async function verifyStaffCaller(
  req: ApiReq,
  env: EnvRecord
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const rawAuth = req.headers.authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const supabaseUrl = getEnv(env, "SUPABASE_URL", "VITE_SUPABASE_URL");
  const supabaseAnonKey = getEnv(
    env,
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY"
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase configuration missing on server" };
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return { ok: false, status: 401, error: "Invalid or expired session" };
    }

    const userData = (await userRes.json()) as { id?: string };
    if (!userData?.id) {
      return { ok: false, status: 401, error: "Invalid user session" };
    }

    const roleRes = await fetch(`${supabaseUrl}/rest/v1/rpc/is_staff`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _user_id: userData.id }),
    });

    if (!roleRes.ok) {
      return { ok: false, status: 403, error: "Failed to verify staff permissions" };
    }

    const isStaff = await roleRes.json();
    if (isStaff !== true) {
      return { ok: false, status: 403, error: "Admin/Staff access required" };
    }

    return { ok: true, userId: userData.id };
  } catch {
    return { ok: false, status: 502, error: "Auth verification service unavailable" };
  }
}

export async function handleSms(
  req: ApiReq,
  res: ApiRes,
  env: EnvRecord = process.env
): Promise<void> {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const rl = checkRateLimit("sms", getClientIp(req), 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    sendJson(res, 429, { error: "Rate limit exceeded" });
    return;
  }

  const authCheck = await verifyStaffCaller(req, env);
  if (!authCheck.ok) {
    sendJson(res, authCheck.status, { error: authCheck.error });
    return;
  }

  const body = await parseBodyOrError<Record<string, unknown>>(req, res, 65536);
  if (!body) return;

  const action = clampString(body.action, 20);
  const overrideApiKey = clampString(body.apiKey, 200);
  const serverApiKey = getEnv(env, "SMS_API_KEY", "VITE_SMS_API_KEY");
  const apiKey = overrideApiKey || serverApiKey;

  if (action === "status") {
    sendJson(res, 200, { configured: Boolean(serverApiKey) });
    return;
  }

  if (!apiKey) {
    sendJson(res, 400, {
      error: "SMS API key is not configured",
      configured: false,
    });
    return;
  }

  if (action === "balance") {
    try {
      const qs = new URLSearchParams({ api_key: apiKey });
      const upstream = await fetch(`https://api.sms.net.bd/user/balance?${qs.toString()}`);
      const data = (await upstream.json()) as {
        error?: number;
        msg?: string;
        data?: { balance?: string | number };
      };

      if (!upstream.ok || data?.error !== 0) {
        sendJson(res, 502, {
          error: data?.msg || "Failed to fetch SMS balance",
          configured: Boolean(serverApiKey),
        });
        return;
      }

      sendJson(res, 200, {
        configured: Boolean(serverApiKey),
        balance: data?.data?.balance ?? null,
      });
    } catch {
      sendJson(res, 502, {
        error: "SMS gateway unreachable",
        configured: Boolean(serverApiKey),
      });
    }
    return;
  }

  if (action === "send") {
    const message = clampString(body.message, 1000);
    const senderId = clampString(body.senderId, 50);
    const contentId = clampString(body.contentId, 80);
    const rawRecipients = Array.isArray(body.recipients) ? body.recipients : [];

    if (!message || rawRecipients.length === 0 || rawRecipients.length > 100) {
      sendJson(res, 400, { error: "Valid message and 1-100 recipients are required" });
      return;
    }

    const recipients = rawRecipients
      .filter((r): r is { name?: unknown; phone?: unknown } => Boolean(r) && typeof r === "object")
      .map((r) => ({
        name: clampString(r.name, 100) || "Member",
        phone: normalizeSmsPhone(clampString(r.phone, 30)),
      }))
      .filter((r) => /^8801[3-9]\d{8}$/.test(r.phone));

    if (recipients.length === 0) {
      sendJson(res, 400, { error: "No valid Bangladesh mobile numbers found" });
      return;
    }

    const logs: Array<{ name: string; status: "success" | "failed"; reason?: string }> = [];

    for (const recipient of recipients) {
      try {
        const params = new URLSearchParams({
          api_key: apiKey,
          msg: message,
          to: recipient.phone,
        });
        if (senderId) params.set("sender_id", senderId);
        if (contentId) params.set("content_id", contentId);

        const upstream = await fetch("https://api.sms.net.bd/sendsms", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        const result = (await upstream.json().catch(() => null)) as {
          error?: number;
          msg?: string;
        } | null;

        if (upstream.ok && result?.error === 0) {
          logs.push({ name: recipient.name, status: "success" });
        } else {
          logs.push({
            name: recipient.name,
            status: "failed",
            reason: result?.msg || `HTTP ${upstream.status}`,
          });
        }
      } catch {
        logs.push({ name: recipient.name, status: "failed", reason: "Network error" });
      }
    }

    const sentCount = logs.filter((l) => l.status === "success").length;
    sendJson(res, 200, {
      ok: sentCount > 0,
      sentCount,
      failedCount: logs.length - sentCount,
      logs,
    });
    return;
  }

  sendJson(res, 400, { error: "Unsupported SMS action" });
}

export default function handler(req: ApiReq, res: ApiRes): Promise<void> {
  return handleSms(req, res, process.env);
}
