"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  authEnv,
  createSessionToken,
  passwordsMatch,
  sessionCookieOptions,
} from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

function safeNextPath(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const { password: expected, secret, configured } = authEnv();
  if (!configured) {
    return { error: "Auth is not configured on this server." };
  }

  const provided = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!(await passwordsMatch(provided, expected))) {
    return { error: "Wrong password." };
  }

  const token = await createSessionToken(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(process.env.NODE_ENV === "production"));

  redirect(next);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
