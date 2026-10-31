"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteProject, saveProjectOrder } from "@/app/admin/actions";
import { IDLE_STATE, type ActionState } from "@/app/admin/state";
import { FormStatus } from "@/components/admin/inputs";

export function ProjectOrderEditor({
  projects,
}: {
  projects: { slug: string; title: string }[];
}) {
  const [ordered, setOrdered] = useState(projects);
  const initialOrder = JSON.stringify(projects.map((project) => project.slug));
  const [savedOrder, setSavedOrder] = useState(initialOrder);
  const currentOrder = JSON.stringify(ordered.map((project) => project.slug));
  const orderAction = async (previous: ActionState, formData: FormData) => {
    const result = await saveProjectOrder(previous, formData);
    if (result.status === "success") setSavedOrder(String(formData.get("order") ?? ""));
    return result;
  };
  const [state, formAction, pending] = useActionState(orderAction, IDLE_STATE);
  const dirty = savedOrder !== currentOrder;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length) return;
    setOrdered((current) => {
      const next = [...current];
      const [project] = next.splice(from, 1);
      next.splice(to, 0, project);
      return next;
    });
  };

  return (
    <form action={formAction} className="admin-order-editor">
      <div className="admin-order-head">
        <div>
          <h2>Homepage order</h2>
          <p>Arrange every project, then save the final order in one commit.</p>
        </div>
        <button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={!dirty || pending}
        >
          {pending ? "Saving order…" : "Save order"}
        </button>
      </div>

      <FormStatus status={state.status} message={state.message} />

      <ol className="admin-order-list">
        {ordered.map((project, index) => (
          <li key={project.slug}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{project.title}</strong>
            <div className="admin-row-actions">
              <button
                type="button"
                className="admin-icon-button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${project.title} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="admin-icon-button"
                onClick={() => move(index, index + 1)}
                disabled={index === ordered.length - 1}
                aria-label={`Move ${project.title} later`}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
      <input type="hidden" name="order" value={currentOrder} />
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The typed value is cleared when the dialog closes rather than in an effect
  // watching `open`: the two places that close it (cancel, Escape) both reset it
  // directly, so the state can never be left showing a stale confirmation.
  const close = () => {
    setOpen(false);
    setValue("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // Inlined rather than calling `close()` so this effect has no dependency on a
      // function recreated on every render.
      if (event.key === "Escape") {
        setOpen(false);
        setValue("");
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      } else if (event.key === "Tab") {
        const elements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            "input:not(:disabled), button:not(:disabled)",
          ) ?? [],
        );
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return (
      <button
        ref={triggerRef}
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
    <div className="admin-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) close();
    }}>
      <div
        className="admin-confirm"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`delete-title-${slug}`}
      >
        <p id={`delete-title-${slug}`}>
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
    </div>
  );
}
