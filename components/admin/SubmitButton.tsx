"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Submit button that reflects the enclosing form's pending state.
 *
 * `useFormStatus` reads from the nearest ancestor `<form>`, so it needs to live
 * inside the form rather than alongside it. During a Server Action the request
 * can take several seconds, because publishing writes files to GitHub and waits
 * for the response. A button that stays enabled through that window invites a
 * second submit and a duplicate commit, so it disables and says what is
 * happening.
 *
 * `aria-disabled` is not used: the button is genuinely disabled, which removes
 * it from the tab order mid-submit. That is correct here, since there is nothing
 * useful for a keyboard user to do until the save finishes.
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "danger" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`admin-button admin-button-${variant}`}
      data-pending={pending ? "" : undefined}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}