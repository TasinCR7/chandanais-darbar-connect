import type { IncomingMessage, ServerResponse } from "node:http";

export type EnvRecord = Record<string, string | undefined>;

export interface ApiReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
  on?: IncomingMessage["on"];
}

export interface ApiRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Request payload too large");
  }
}

const EXACT_ALLOWED_ORIGINS = new Set([
  "https://chandanaish-darbar.com",
  "https://www.chandanaish-darbar.com",
  "https://chandanais-darbar-connect.vercel.app",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);

function isAllowedOrigin(origin: string): boolean {
  if (EXACT_ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin)) return true;
  if (/^https:\/\/chandanaish?-darbar-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

export function applyCors(req: ApiReq, res: ApiRes): boolean {
  const rawOrigin = req.headers.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

export function sendJson(res: ApiRes, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export function getEnv(env: EnvRecord, ...keys: string[]): string {
  for (const key of keys) {
    const val = env[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return "";
}

export function escapeTelegramHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== "string" && typeof val !== "number") return "";
  return String(val).trim().slice(0, maxLen);
}

export async function readJsonBody<T extends Record<string, unknown>>(
  req: ApiReq,
  maxBytes = 32768
): Promise<T | null> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      if (Buffer.byteLength(req.body, "utf8") > maxBytes) {
        throw new PayloadTooLargeError();
      }
      try {
        const parsed = JSON.parse(req.body);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as T)
          : null;
      } catch {
        return null;
      }
    }
    if (typeof req.body === "object" && !Array.isArray(req.body)) {
      return req.body as T;
    }
    return null;
  }

  if (!req.on) return null;

  return new Promise<T | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on!("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buf = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        settled = true;
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(buf);
    });

    req.on!("end", () => {
      if (settled) return;
      settled = true;
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as T)
            : null
        );
      } catch {
        resolve(null);
      }
    });

    req.on!("error", () => {
      if (settled) return;
      settled = true;
      resolve(null);
    });
  });
}

export function getClientIp(req: ApiReq): string {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",")[0].trim();
  }
  const xRealIp = req.headers["x-real-ip"];
  const realIp = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateBucket>();

export function checkRateLimit(
  namespace: string,
  ip: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const key = `${namespace}:${ip}`;

  if (rateStore.size > 4000) {
    for (const [k, v] of rateStore.entries()) {
      if (v.resetAt <= now) rateStore.delete(k);
    }
  }

  const existing = rateStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export async function parseBodyOrError<T extends Record<string, unknown>>(
  req: ApiReq,
  res: ApiRes,
  maxBytes = 32768
): Promise<T | null> {
  try {
    const body = await readJsonBody<T>(req, maxBytes);
    if (!body) {
      sendJson(res, 400, { error: "Invalid JSON payload" });
      return null;
    }
    return body;
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      sendJson(res, 413, { error: "Payload too large" });
      return null;
    }
    sendJson(res, 400, { error: "Invalid request body" });
    return null;
  }
}

export type ServerRes = ServerResponse;
