"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { FormStatus } from "@/components/admin/inputs";

const INITIAL: LoginState = {};

/**
 * Sign-in form.
 *
 * A plain form posting to a Server Action, so it submits correctly even before
 * hydration. `autoComplete="current-password"` lets a password manager offer
 * the stored credential.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          className="admin-input"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          disabled={pending}
        />
      </div>

      {state.error ? <FormStatus status="error" message={state.error} /> : null}

      <button type="submit" className="admin-button admin-button-primary" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}