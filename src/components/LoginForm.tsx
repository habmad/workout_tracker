"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form className="login-form" action={action}>
      <input type="hidden" name="next" value={nextPath} />
      <label className="login-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="login-input"
        autoFocus
      />
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit" className="primary-btn" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
