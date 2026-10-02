"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteProject, reorderProjects } from "@/app/admin/actions";
import { IDLE_STATE } from "@/app/admin/state";
import { FormStatus } from "@/components/admin/inputs";

/**
 * Moves a project up or down in the ordering.
 *
 * Ordering is stored as an explicit `order` weight rather than derived from file
 * names, so changing it is a content edit. The action swaps positions and only
 * rewrites the projects whose weight actually changes, which is usually two
 * files rather than the whole list.
 */
export function MoveProjectButton({
  slug,
  title,
  direction,
  disabled,
}: {
  slug: string;
  title: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(reorderProjects, IDLE_STATE);
  const isUp = direction === "up";

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        className="admin-button admin-button-quiet admin-button-icon"
        disabled={disabled || pending}
        // Names the project, not the slug: the slug is an implementation detail
        // the owner chose by accident as often as not.
        aria-label={`Move ${title} ${isUp ? "up" : "down"}`}
        title={disabled ? (isUp ? "Already first" : "Already last") : isUp ? "Move up" : "Move down"}
      >
        {isUp ? "↑" : "↓"}
      </button>
      {/* Errors surface here rather than on the page, since this button has no
          room for them and the common failure is simply "no movement left". */}
      {state.status === "error" ? <span className="sr-only">{state.message}</span> : null}
    </form>
  );
}

/**
 * Deletes a project after the owner types its title.
 *
 * The confirmation exists because this writes a destructive commit to the
 * repository. It is not a security control, only a guard against a misclick.
 */
export function DeleteProjectButton({ slug, title }: { slug: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteProject, IDLE_STATE);
  const [value, setValue] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // The typed value is cleared when the dialog closes rather than in an effect
  // watching `open`: the two places that close it (cancel, Escape) both reset it
  // directly, so the state can never be left showing a stale confirmation.
  const close = () => {
    setOpen(false);
    setValue("");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // Inlined rather than calling `close()` so this effect has no dependency on a
      // function recreated on every render.
      if (event.key === "Escape") {
        setOpen(false);
        setValue("");
      }
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className="admin-button admin-button-danger"
        onClick={() => setOpen(true)}
      >
        Delete
      </button>
    );
  }

  const matches = value.trim() === title;

  return (
    <div className="admin-confirm" ref={dialogRef} role="dialog" aria-label={`Delete ${title}`}>
      <p>
        Delete <strong>{title}</strong>? Type the title to confirm.
      </p>

      <form action={formAction} className="admin-form">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="confirm" value={value} />

        <label className="sr-only" htmlFor={`confirm-${slug}`}>
          Type the project title to confirm
        </label>
        <input
          id={`confirm-${slug}`}
          name="confirmVisible"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={title}
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          aria-invalid={value.length > 0 && !matches}
        />

        {state.status === "error" && !state.fieldErrors ? (
          <FormStatus status="error" message={state.message} />
        ) : null}

        <div className="admin-confirm-actions">
          <button
            type="submit"
            className="admin-button admin-button-danger"
            disabled={!matches || pending}
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
          <button
            type="button"
            className="admin-button admin-button-quiet"
            onClick={close}
            disabled={pending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

