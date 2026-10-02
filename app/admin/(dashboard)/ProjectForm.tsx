"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/schema";
import { createProject, updateProject } from "@/app/admin/actions";
import type { ActionState } from "@/app/admin/state";
import { Field, FormStatus, StringListInput, Toggle } from "@/components/admin/inputs";
import { ImageUploader } from "./ImageUploader";

/**
 * The publishing form, used for both new projects and edits.
 *
 * The field order mirrors the layout of the public project page, so the owner
 * writes each one knowing exactly where it will appear.
 *
 * It is a plain `<form action>` rather than a fetch-and-render, so it submits
 * without JavaScript. `useActionState` then layers per-field error messages and
 * a pending state on top of that.
 */

/** The four narrative fields, which share a shape. */
const NARRATIVE_FIELDS = [
  ["overview", "Overview", "What it is."],
  ["problem", "Problem", "What it was trying to solve."],
  ["solution", "Solution", "What you built."],
  ["architecture", "Architecture", "How it is put together."],
] as const;

/** Mirrors `projectSchema` so the counter warns before the limit is hit. */
const LIMITS = {
  title: 120,
  description: 300,
  context: 400,
  narrative: 4000,
  url: 300,
  eyebrow: 40,
} as const;

export function ProjectForm({ project }: { project?: Project }) {
  const isEdit = Boolean(project);

  const action = isEdit ? updateProject : createProject;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {
    status: "idle",
  });

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="admin-form admin-form-wide">
      {isEdit ? <input type="hidden" name="slug" value={project!.slug} /> : null}

      <div className="admin-form-head">
        <div>
          <p className="admin-eyebrow">{isEdit ? "EDIT" : "NEW"}</p>
          <h1>{isEdit ? project!.title : "Add a project"}</h1>
        </div>
        <div className="admin-form-head-actions">
          <Link href="/admin/projects" className="admin-button admin-button-quiet">
            Back
          </Link>
          <button
            type="submit"
            className="admin-button admin-button-primary"
            disabled={pending}
          >
            {pending ? "Publishing…" : isEdit ? "Save changes" : "Publish project"}
          </button>
        </div>
      </div>

      <FormStatus status={state.status} message={state.message} />

      <fieldset className="admin-section">
        <legend>Basics</legend>

        <Field
          label="Title"
          htmlFor="title"
          hint="Also the page heading and the link text everywhere it is listed."
          error={errors.title}
        >
          <input
            id="title"
            name="title"
            className="admin-input"
            defaultValue={project?.title}
            required
            maxLength={LIMITS.title}
            aria-invalid={Boolean(errors.title)}
          />
        </Field>

        {!isEdit ? (
          <Field
            label="URL"
            htmlFor="slug"
            hint="Leave blank to generate from the title. The page will live at /projects/<this>."
            error={errors.slug}
          >
            <input
              id="slug"
              name="slug"
              className="admin-input"
              maxLength={80}
              placeholder="auto-generated"
            />
          </Field>
        ) : null}

        <Field
          label="Summary"
          htmlFor="description"
          hint="One sentence. Shown on the project card and in search results."
          error={errors.description}
        >
          <textarea
            id="description"
            name="description"
            className="admin-input admin-textarea"
            defaultValue={project?.description}
            required
            rows={2}
            maxLength={LIMITS.description}
            aria-invalid={Boolean(errors.description)}
          />
        </Field>

        <Field
          label="Context"
          htmlFor="context"
          hint="Why this project exists, in a sentence or two."
          error={errors.context}
        >
          <textarea
            id="context"
            name="context"
            className="admin-input admin-textarea"
            defaultValue={project?.context}
            rows={2}
            maxLength={LIMITS.context}
          />
        </Field>

        <div className="admin-grid">
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              className="admin-input admin-select"
              defaultValue={project?.status ?? "in-progress"}
            >
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </Field>

          <Field
            label="Label"
            htmlFor="eyebrow"
            hint="Leave as PROJECT to number it automatically."
            error={errors.eyebrow}
          >
            <input
              id="eyebrow"
              name="eyebrow"
              className="admin-input"
              defaultValue={project?.eyebrow}
              maxLength={LIMITS.eyebrow}
              placeholder="PROJECT"
            />
          </Field>
        </div>

        <Toggle
          name="featured"
          defaultChecked={project?.featured}
          label="Featured"
          description="Featured projects are called out on the homepage ahead of the rest."
        />
      </fieldset>

      <fieldset className="admin-section">
        <legend>Case study</legend>
        <p className="admin-note">
          The point of a project page is to show how you think, so these carry the most weight.
        </p>

        {NARRATIVE_FIELDS.map(([name, label, hint]) => (
          <Field key={name} label={label} htmlFor={name} hint={hint} error={errors[name]}>
            <textarea
              id={name}
              name={name}
              className="admin-input admin-textarea"
              defaultValue={project?.[name]}
              required
              rows={4}
              maxLength={LIMITS.narrative}
              aria-invalid={Boolean(errors[name])}
            />
          </Field>
        ))}

        {/*
          Reorderable rows rather than one-per-line textareas, matching every
          other list in the control plane. A decision the owner regrets can then
          be deleted on its own instead of by editing a block of text.
        */}
        <StringListInput
          name="decisions"
          values={project?.decisions ?? []}
          label="Technical decisions"
          singular="decision"
          placeholder="What you chose, and why"
          maxItems={20}
          maxLength={500}
          hint="One per row. Each is a single decision worth defending."
        />

        <StringListInput
          name="features"
          values={project?.features ?? []}
          label="Features"
          singular="feature"
          placeholder="What the finished thing does"
          maxItems={30}
          maxLength={300}
        />
      </fieldset>

      <fieldset className="admin-section">
        <legend>Details</legend>

        <Field
          label="Technologies"
          htmlFor="technologies"
          hint="Comma separated, e.g. Go, PostgreSQL, React."
          error={errors.technologies}
        >
          <input
            id="technologies"
            name="technologies"
            className="admin-input"
            defaultValue={project?.technologies.join(", ")}
            aria-invalid={Boolean(errors.technologies)}
          />
        </Field>

        <div className="admin-grid">
          <Field label="Source code" htmlFor="githubUrl" error={errors.githubUrl}>
            <input
              id="githubUrl"
              name="githubUrl"
              className="admin-input"
              type="url"
              defaultValue={project?.githubUrl}
              maxLength={LIMITS.url}
              placeholder="https://github.com/..."
            />
          </Field>

          <Field
            label="Live demo"
            htmlFor="liveUrl"
            hint="Shown as a button on the project page."
            error={errors.liveUrl}
          >
            <input
              id="liveUrl"
              name="liveUrl"
              className="admin-input"
              type="url"
              defaultValue={project?.liveUrl}
              maxLength={LIMITS.url}
              placeholder="https://..."
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="admin-section">
        <legend>Images</legend>
        <ImageUploader existing={project?.images ?? []} />
      </fieldset>

      <div className="admin-savebar">
        <p className="admin-note">
          Saving writes this project and any new images to the repository in one commit. The
          public site updates once the build finishes.
        </p>
        <div className="admin-savebar-actions">
          <Link href="/admin/projects" className="admin-button admin-button-quiet">
            Cancel
          </Link>
          <button
            type="submit"
            className="admin-button admin-button-primary"
            disabled={pending}
          >
            {pending ? "Publishing…" : isEdit ? "Save changes" : "Publish project"}
          </button>
        </div>
      </div>
    </form>
  );
}