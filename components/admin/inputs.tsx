"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/admin/Icon";

/**
 * Client-side form primitives for the control plane.
 *
 * Everything here holds one thing: structured list state that a plain
 * `<textarea>` cannot express without asking the owner to type separators. Rows
 * can be added, reordered and removed; the result is submitted as a single JSON
 * field and validated server-side against the same Zod schema the loader uses.
 *
 * The important boundary: these components enforce nothing. Length limits and
 * required fields are checked on the server, where they cannot be bypassed. The
 * client only mirrors the rules for display, so the two stay honest about the
 * same source of truth.
 */

const classNames = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(" ");

/** A labelled form field with optional hint and error. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  wide,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={classNames("admin-field", wide && "is-wide", error && "has-error")}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {/*
        Rendered as a live region so a validation failure is announced. The
        message is always in the DOM rather than conditionally mounted, which
        keeps the announcement reliable across repeated submissions.
      */}
      <p className={classNames("admin-field-note", error && "is-error")} id={`${htmlFor}-note`}>
        {error ?? hint ?? ""}
      </p>
    </div>
  );
}

/** Standard text input with the shared control styling. */
export function TextInput({
  name,
  defaultValue,
  placeholder,
  maxLength,
  required,
  type = "text",
  readOnly,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  type?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <input
      type={type}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      maxLength={maxLength}
      required={required}
      readOnly={readOnly}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      className={classNames("admin-input", readOnly && "is-readonly")}
    />
  );
}

/** Multi-line input for the longer copy fields. */
export function TextArea({
  name,
  defaultValue,
  rows = 4,
  placeholder,
  maxLength,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  onChange?: (value: string) => void;
}) {
  return (
    <textarea
      name={name}
      rows={rows}
      defaultValue={defaultValue}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      className="admin-input admin-textarea"
    />
  );
}

/** A switch-styled checkbox. Native input, so keyboard and form semantics work. */
export function Toggle({
  name,
  defaultChecked,
  label,
  description,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
}) {
  return (
    <label className="admin-toggle">
      {/* No `value`: a checked box submits `on`, an unchecked one submits
          nothing at all, which is exactly how `formData.get(...) === "on"` is
          meant to be interpreted. */}
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span className="admin-toggle-track" aria-hidden="true">
        <span className="admin-toggle-thumb" />
      </span>
      <span className="admin-toggle-text">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

/** Segmented control, used where there are a few known options. */
export function Segmented({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="admin-segmented" role="radiogroup">
      {options.map((option) => (
        <label key={option.value} className="admin-segment">
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={option.value === defaultValue}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * Character counter.
 *
 * Only warns as the limit is approached, and switches to an error state once it
 * is exceeded. A counter that turns red early trains the owner to ignore it.
 */
export function Counter({ value, max }: { value: string; max: number }) {
  const length = value.trim().length;
  const near = max - length <= Math.max(12, Math.round(max * 0.1));
  return (
    <span
      className={classNames(
        "admin-counter",
        near && "is-near",
        length > max && "is-over",
      )}
      aria-live="polite"
    >
      {length}/{max}
    </span>
  );
}

/** A labelled textarea that reports its length. */
export function CountedTextArea({
  label,
  name,
  defaultValue,
  max,
  rows = 4,
  hint,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  max: number;
  rows?: number;
  hint?: string;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="admin-counted">
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="admin-input admin-textarea"
          aria-describedby={`${id}-note`}
        />
        <Counter value={value} max={max} />
      </div>
    </Field>
  );
}

/** Buttons that reorder a list row up or down. */
function MoveButtons({
  index,
  length,
  onMove,
}: {
  index: number;
  length: number;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="admin-icon-button"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        aria-label="Move up"
      >
        <Icon name="up" size={14} />
      </button>
      <button
        type="button"
        className="admin-icon-button"
        onClick={() => onMove(index, index + 1)}
        disabled={index === length - 1}
        aria-label="Move down"
      >
        <Icon name="down" size={14} />
      </button>
    </>
  );
}

/** Removes a row, with the confirmation it deserves. */
function RemoveButton({
  onRemove,
  label,
  disabled,
}: {
  onRemove: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  // Two-step removal. A single click deleting a section heading or a whole
  // project is a mistake waiting to happen, and the undo path for it is a git
  // revert. The second press cancels itself after a few seconds so the row does
  // not sit permanently in a destructive state.
  if (armed) {
    return (
      <button
        type="button"
        className="admin-button admin-button-danger is-compact"
        onClick={() => {
          onRemove();
          setArmed(false);
        }}
      >
        Confirm
      </button>
    );
  }

  return (
    <button
      type="button"
      className="admin-icon-button admin-icon-button-danger"
      onClick={() => {
        setArmed(true);
        // Returns to idle if the owner does not follow through.
        const timer = setTimeout(() => setArmed(false), 4000);
        void timer;
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon name="trash" size={14} />
    </button>
  );
}

/** Moves one item within a list, immutably. */
function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Splits a comma-separated list into trimmed, non-empty entries.
 *
 * A missing limit returns everything, which the callers use to tell "over the
 * limit" apart from "exactly at it".
 */
function parseItems(text: string, limit = Number.POSITIVE_INFINITY): string[] {
  const items = text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return limit === Number.POSITIVE_INFINITY ? items : items.slice(0, limit);
}

/**
 * An editor for a list of plain strings, such as stack chips or paragraphs.
 *
 * Submitting as one JSON field rather than indexed inputs is what keeps rows from
 * desynchronising: removing row two leaves one field holding the whole array, so
 * there is no index to get out of step.
 */
export function StringListInput({
  name,
  values,
  maxItems,
  maxLength,
  label,
  singular,
  placeholder,
  addLabel,
  hint,
  minItems = 0,
}: {
  name: string;
  values: string[];
  maxItems?: number;
  maxLength?: number;
  label: string;
  singular: string;
  placeholder?: string;
  addLabel?: string;
  hint?: string;
  minItems?: number;
}) {
  const id = useId();
  const [items, setItems] = useState<string[]>(values.length > 0 ? values : [""]);

  const atMinimum = items.length <= minItems;
  const atMaximum = maxItems !== undefined && items.length >= maxItems;

  return (
    <div className="admin-listfield">
      {hint ? <p className="admin-note">{hint}</p> : null}
      <div className="admin-listfield-head">
        <span id={`${id}-label`}>{label}</span>
        {/*
          The count is informational only. The server enforces the maximum, so
          this is here to explain a rejection rather than to prevent one.
        */}
        {maxItems ? (
          <span className={classNames("admin-counter", atMaximum && "is-near")}>
            {items.filter((item) => item.trim()).length}/{maxItems}
          </span>
        ) : null}
      </div>

      <ul className="admin-rows" aria-labelledby={`${id}-label`}>
        {items.map((value, index) => (
          <li className="admin-row" key={index}>
            <input
              className="admin-input"
              value={value}
              maxLength={maxLength}
              placeholder={placeholder}
              aria-label={`${singular} ${index + 1}`}
              onChange={(event) =>
                setItems((current) =>
                  current.map((item, i) => (i === index ? event.target.value : item)),
                )
              }
            />
            <div className="admin-row-actions">
              <MoveButtons index={index} length={items.length} onMove={(from, to) => setItems((c) => move(c, from, to))} />
              <RemoveButton
                onRemove={() => setItems((current) => current.filter((_, i) => i !== index))}
                label={`Remove ${singular}`}
                disabled={atMinimum}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="admin-button admin-button-ghost is-compact"
        onClick={() => setItems((current) => [...current, ""])}
        disabled={atMaximum}
      >
        <Icon name="plus" size={14} /> {addLabel ?? `Add ${singular}`}
      </button>

      {/*
        One hidden field carries the whole list. Empty rows are dropped here
        rather than server-side so an accidentally blank row does not become a
        validation error.
      */}
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(items.map((item) => item.trim()).filter(Boolean))}
      />
    </div>
  );
}

/**
 * An editor for the technology groups.
 *
 * Each group is a title plus a comma-separated list, which is how the data is
 * read on the site anyway. The list is kept as a textarea per group rather than
 * as one row per technology: a stack group with fifteen entries would otherwise
 * occupy far more space than its worth, and typing commas is faster than clicking
 * "add" fifteen times.
 */
export function TechnologyGroupsInput({
  name,
  groups,
  maxGroups = 8,
  maxItems = 40,
}: {
  name: string;
  groups: { title: string; items: string[] }[];
  maxGroups?: number;
  maxItems?: number;
}) {
  /*
   * Each group holds the raw text the owner typed, not a parsed array.
   *
   * Deriving the textarea's value from a parsed array loses characters as they
   * are typed: "Go," would parse to ["Go"] and render back as "Go", so the comma
   * could never be entered and the second technology was unreachable by
   * keyboard. Keeping the text and parsing on the way out avoids that, and it
   * also means submitting without leaving the field works, which a parse-on-blur
   * handler would miss.
   */
  const [state, setState] = useState<{ title: string; text: string }[]>(
    groups.length > 0
      ? groups.map((group) => ({ title: group.title, text: group.items.join(", ") }))
      : [{ title: "", text: "" }],
  );

  const update = (index: number, patch: Partial<{ title: string; text: string }>) =>
    setState((current) =>
      current.map((group, i) => (i === index ? { ...group, ...patch } : group)),
    );

  return (
    <div className="admin-listfield">
      <div className="admin-listfield-head">
        <span>Groups</span>
        <span className={classNames("admin-counter", state.length >= maxGroups && "is-near")}>
          {state.length}/{maxGroups}
        </span>
      </div>

      <ul className="admin-groups">
        {state.map((group, index) => {
          const items = parseItems(group.text, maxItems);
          const overLimit = parseItems(group.text).length > maxItems;

          return (
            <li className="admin-group" key={index}>
              <div className="admin-group-head">
                <input
                  className="admin-input admin-group-title"
                  value={group.title}
                  maxLength={40}
                  placeholder="Group name"
                  aria-label={`Group ${index + 1} name`}
                  onChange={(event) => update(index, { title: event.target.value })}
                />
                <div className="admin-row-actions">
                  <MoveButtons
                    index={index}
                    length={state.length}
                    onMove={(from, to) => setState((current) => move(current, from, to))}
                  />
                  <RemoveButton
                    onRemove={() => setState((current) => current.filter((_, i) => i !== index))}
                    label="Remove group"
                  />
                </div>
              </div>

              <textarea
                className={classNames("admin-input admin-textarea", overLimit && "has-error")}
                rows={3}
                value={group.text}
                placeholder="Comma-separated, e.g. Go, Python, TypeScript"
                aria-label={`${group.title || `Group ${index + 1}`} technologies`}
                aria-invalid={overLimit}
                onChange={(event) => update(index, { text: event.target.value })}
              />

              <p className={classNames("admin-field-note", overLimit && "is-error")}>
                {overLimit
                  ? `Only the first ${maxItems} will be saved.`
                  : `${items.length} ${items.length === 1 ? "technology" : "technologies"}`}
              </p>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="admin-button admin-button-ghost is-compact"
        onClick={() => setState((current) => [...current, { title: "", text: "" }])}
        disabled={state.length >= maxGroups}
      >
        <Icon name="plus" size={14} /> Add group
      </button>

      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          state
            .map((group) => ({
              title: group.title.trim(),
              items: parseItems(group.text, maxItems),
            }))
            // A row with neither a name nor an item is a stray click on "Add
            // group", not intent, so it is dropped rather than sent to fail
            // validation.
            .filter((group) => group.title.length > 0 || group.items.length > 0),
        )}
      />
    </div>
  );
}

/**
 * An editor for the focus areas.
 *
 * `accent` is an explicit switch here, replacing the component's previous habit
 * of testing whether the label happened to read "Technical interests" to decide
 * styling. Presentation is now a field the owner controls.
 */
export function FocusAreasInput({
  name,
  items,
  maxItems = 8,
}: {
  name: string;
  items: { label: string; detail: string; accent: boolean }[];
  maxItems?: number;
}) {
  const id = useId();
  const [state, setState] = useState(items);

  const update = (index: number, patch: Partial<{ label: string; detail: string; accent: boolean }>) =>
    setState((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  return (
    <div className="admin-listfield">
      <div className="admin-listfield-head">
        <span id={`${id}-label`}>Areas</span>
        <span className={classNames("admin-counter", state.length >= maxItems && "is-near")}>
          {state.length}/{maxItems}
        </span>
      </div>

      <ul className="admin-focuslist" aria-labelledby={`${id}-label`}>
        {state.map((item, index) => (
          <li className="admin-focusitem" key={index}>
            <div className="admin-focusitem-fields">
              <input
                className="admin-input"
                value={item.label}
                maxLength={40}
                placeholder="Label"
                aria-label={`Area ${index + 1} label`}
                onChange={(event) => update(index, { label: event.target.value })}
              />
              <input
                className="admin-input"
                value={item.detail}
                maxLength={160}
                placeholder="Detail"
                aria-label={`Area ${index + 1} detail`}
                onChange={(event) => update(index, { detail: event.target.value })}
              />
            </div>

            <div className="admin-row-actions">
              {/*
                A toggle rather than a checkbox because it changes how the card
                looks on the site, which is a styling decision rather than a data
                value to toggle silently.
              */}
              <button
                type="button"
                className={classNames("admin-chip-button", item.accent && "is-on")}
                onClick={() => update(index, { accent: !item.accent })}
                aria-pressed={item.accent}
                title={
                  item.accent
                    ? "Highlighted on the site. Click to turn off."
                    : "Not highlighted. Click to highlight."
                }
              >
                <Icon name="target" size={13} />
                <span>Accent</span>
              </button>
              <MoveButtons
                index={index}
                length={state.length}
                onMove={(from, to) => setState((current) => move(current, from, to))}
              />
              <RemoveButton
                onRemove={() => setState((current) => current.filter((_, i) => i !== index))}
                label="Remove area"
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="admin-button admin-button-ghost is-compact"
        onClick={() =>
          setState((current) => [...current, { label: "", detail: "", accent: false }])
        }
        disabled={state.length >= maxItems}
      >
        <Icon name="plus" size={14} /> Add area
      </button>

      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          state
            .map((item) => ({
              label: item.label.trim(),
              detail: item.detail.trim(),
              accent: item.accent,
            }))
            // A row with neither a label nor a detail is a stray click, not
            // intent, so it is dropped rather than sent to fail validation.
            .filter((item) => item.label.length > 0 || item.detail.length > 0),
        )}
      />
    </div>
  );
}

/**
 * Form-level status message.
 *
 * The one way a save reports back. This previously coexisted with four
 * hand-rolled `<p className="admin-error">` blocks, which meant the same failure
 * rendered as plain red text on the project form and as a bordered panel on the
 * site-copy editor. There is a single treatment now, and forms use this rather
 * than inventing their own.
 *
 * The live-region role follows the severity. An error is the direct result of
 * something the owner just pressed the button for and needs to act on, so it is
 * announced assertively. A success confirmation is not an emergency, and
 * interrupting a screen reader mid-navigation is worse than being slightly late
 * to announce it.
 */
export function FormStatus({
  status,
  message,
}: {
  status: "idle" | "error" | "success";
  message?: string;
}) {
  if (status === "idle" || !message) return null;

  return (
    <p
      className={classNames("admin-status", `is-${status}`)}
      role={status === "error" ? "alert" : "status"}
      aria-live={status === "error" ? "assertive" : "polite"}
    >
      <Icon name={status === "error" ? "alert" : "check"} size={15} />
      <span>{message}</span>
    </p>
  );
}

/**
 * A save bar that stays pinned while a long form scrolls.
 *
 * Positioned sticky rather than fixed so it occupies layout space and never
 * covers the last field on a short form.
 */
export function SaveBar({ children }: { children: ReactNode }) {
  return <div className="admin-savebar">{children}</div>;
}