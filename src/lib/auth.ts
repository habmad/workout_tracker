/** Shared-password gate. Edge-safe (Web Crypto) so proxy + server actions can share it. */

export const SESSION_COOKIE = "wt_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function encoder() {
  return new TextEncoder();
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(message));
  return toBase64Url(sig);
}

async function verifySig(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  const key = await hmacKey(secret);
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      encoder().encode(message),
    );
  } catch {
    return false;
  }
}

export function authEnv() {
  const password = process.env.APP_PASSWORD?.trim() ?? "";
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  return { password, secret, configured: Boolean(password && secret) };
}

/** Fail closed in production; allow open local only when auth env is unset. */
export function mustEnforceAuth(): boolean {
  const { configured } = authEnv();
  if (configured) return true;
  return process.env.NODE_ENV === "production";
}

export async function passwordsMatch(
  provided: string,
  expected: string,
): Promise<boolean> {
  if (!provided || !expected) return false;
  const a = await sign("pwd-compare", provided);
  const b = await sign("pwd-compare", expected);
  if (a.length !== b.length) return false;
  let ok = 0;
  for (let i = 0; i < a.length; i++) ok |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return ok === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const payload = String(exp);
  const sig = await sign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return verifySig(secret, payload, sig);
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
