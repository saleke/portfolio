"use client";

/**
 * Keeps an unsubmitted form draft in `localStorage`.
 *
 * Why this exists: React resets a `<form action>` once its action resolves. That
 * is correct for a form that succeeded and terrible for one that did not — after
 * a rejected save the owner is left staring at an empty form holding work that
 * still exists only in their head. A refresh loses it too, and so does
 * navigating away to check something.
 *
 * A draft in `localStorage` closes all three cases with one mechanism, survives
 * a full page reload, and needs no server round trip, no database and no new
 * dependency. This is a single-owner admin area editing one document at a time,
 * so the draft is intentionally not shared between tabs or reconciled with the
 * repository — it is a scratchpad, not a second source of truth.
 *
 * What it does *not* preserve: uploaded images. A `File` cannot be serialised
 * and a `Blob` URL dies with the document, so an image chosen but not yet
 * published has to be re-picked. The alt text and dimensions, which are the
 * parts actually typed in, do persist.
 */

import { useCallback, useEffect, useRef } from "react";

/** Draft contents are flat strings, so they round-trip through JSON trivially. */
type Draft = Record<string, string>;

const PREFIX = "portfolio:draft:";

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    // Anything that is not a plain string is discarded rather than trusted, so a
    // hand-edited or corrupted entry cannot put an object where a value belongs.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((pair): pair is [string, string] =>
        typeof pair[1] === "string",
      ),
    );
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(draft));
  } catch {
    // Private browsing or a full quota. The form still works; the draft is lost.
  }
}

function discardDraft(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* Nothing useful to do if storage is unavailable. */
  }
}

/** One capturable control, excluding the types that cannot or should not persist. */
function isCapturable(field: Element): field is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) return true;
  if (!(field instanceof HTMLInputElement)) return false;
  // `file` holds live handles that mean nothing once serialised, and `hidden`
  // is React-owned state we must not overwrite.
  return field.type !== "file" && field.type !== "hidden";
}

/**
 * Reads every capturable control out of the form.
 *
 * This is deliberately reflective rather than a per-field list. The form's
 * fields are spread across `ProjectForm`, `StringListInput` and `ImageUploader`,
 * and a hand-maintained list is exactly the kind of thing that silently omits
 * one field and rots — which is the bug this hook exists to remove.
 */
function capture(form: HTMLFormElement): Draft {
  const draft: Draft = {};

  for (const field of form.elements) {
    // `RadioNodeList` has no `name` and is handled by the checkbox branch below
    // only when it is a single element, so it is filtered out first.
    if (field instanceof RadioNodeList) continue;
    if (!("name" in field) || !field.name || !isCapturable(field)) continue;

    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      if (field.checked) draft[field.name] = field.value;
      continue;
    }
    draft[field.name] = field.value;
  }

  return draft;
}

/**
 * Writes a draft back into the form's DOM.
 *
 * Only uncontrolled controls are touched, and only where the value actually
 * differs, so this cannot fight React for state it owns and cannot move the
 * caret in a field the owner is still typing in.
 */
function restore(form: HTMLFormElement, draft: Draft): void {
  for (const [name, value] of Object.entries(draft)) {
    const field = form.elements.namedItem(name);
    if (!field || field instanceof RadioNodeList) continue;
    if (!isCapturable(field)) continue;
    if (field.value !== value) field.value = value;
  }
}

/**
 * Draft persistence for one form.
 *
 * @param key       Identifies the draft, so an edit and a new entry never
 *                  overwrite each other.
 * @param status    The action's status. A `"success"` clears the draft, because
 *                  the work is published and the draft would now be a stale copy
 *                  that could be resurrected over a newer edit.
 * @param enabled   Off for a form that starts blank and should stay blank.
 */
export function useDraft(key: string, status: string, enabled = true) {
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the one real hazard here: writing the draft back over a restored one
  // before the restore has happened, which would replace the owner's saved work
  // with an empty form.
  const restoredRef = useRef(false);

  // Restore once per mount. Deliberately not reactive to `status`: re-reading
  // storage on every state change would clobber whatever is on screen.
  useEffect(() => {
    if (!enabled) return;
    restoredRef.current = true;
    const stored = readDraft(key);
    const form = formRef.current;
    if (stored && form) restore(form, stored);
  }, [key, enabled]);

  // Clear once the save has actually landed.
  useEffect(() => {
    if (!enabled) return;
    if (status === "success") {
      discardDraft(key);
      restoredRef.current = true;
    }
  }, [status, key, enabled]);

  // Re-apply after a failed save.
  //
  // React has reset the uncontrolled inputs by the time the action's state lands,
  // so the DOM is blank even though the draft on disk is intact. Re-applying is
  // what makes a rejected save recoverable rather than a reason to retype.
  useEffect(() => {
    if (!enabled || status !== "error") return;
    const stored = readDraft(key);
    const form = formRef.current;
    if (stored && form) restore(form, stored);
  }, [status, key, enabled]);

  // Release the debounce timer on unmount so a pending write cannot fire at a
  // form that no longer exists.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const save = useCallback(() => {
    const form = formRef.current;
    if (!form || !restoredRef.current) return;
    const draft = capture(form);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Debounced because a paste into a textarea fires once per line.
    timerRef.current = setTimeout(() => writeDraft(key, draft), 400);
  }, [key]);

  /**
   * Flushes immediately.
   *
   * The debounce would otherwise lose the last edit: a failed submission
   * resolves within a few hundred milliseconds, so the timer may not have fired.
   */
  const flush = useCallback(() => {
    const form = formRef.current;
    if (!form || !restoredRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    writeDraft(key, capture(form));
  }, [key]);

  /**
   * Discards the draft immediately.
   *
   * Needed because a successful publish does not always resolve to a `"success"`
   * status. `createProject` ends in a `redirect`, which unmounts this form
   * before any state lands — so the status-based effect above never runs for a
   * brand new project, and its draft would outlive the project it described.
   */
  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    restoredRef.current = true;
    discardDraft(key);
  }, [key]);

  return { formRef, save, flush, clear };
}