"use client";

import { useActionState, type ReactNode } from "react";
import { IDLE_STATE, type ActionState } from "@/app/admin/state";
import { Field, FormStatus, TextInput, CountedTextArea } from "@/components/admin/inputs";
import { SubmitButton } from "@/components/admin/SubmitButton";

/**
 * Wraps a Server Action in a form with consistent error and status handling.
 *
 * Every editor in the control plane submits through this, so field-level errors
 * behave identically everywhere: the message appears under the field it belongs
 * to, and the banner only carries what has no single field.
 */
export function EditorForm({
  action,
  children,
  saveLabel = "Save changes",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /**
   * Rendered as a function rather than as elements so the field errors are only
   * available to the caller after the action has resolved, inside the same
   * render that displays the messages.
   */
  children: (props: { fieldErrors: FieldErrors }) => ReactNode;
  saveLabel?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  // Split the errors: keyed ones belong beside their field, the rest are
  // form-level and go in the banner. Showing both everywhere would repeat every
  // message twice.
  const fieldErrors = state.fieldErrors ?? {};
  const formError =
    state.status === "error" && state.message !== "Some fields need attention."
      ? state.message
      : undefined;

  return (
    <form action={formAction} className="admin-form">
      <FormStatus status={formError ? "error" : state.status} message={formError ?? (state.status === "success" ? state.message : undefined)} />

      {children({ fieldErrors })}

      <div className="admin-savebar">
        <p className="admin-note">
          Saving writes to the repository. The public site updates after the build finishes, usually
          within a minute or two.
        </p>
        <SubmitButton>{saveLabel}</SubmitButton>
      </div>
    </form>
  );
}

export type FieldErrors = Record<string, string>;

/** Identity tab. */
export function IdentityEditor({
  action,
  values,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: { name: string; codeName: string; title: string; seoDescription: string };
}) {
  return (
    <EditorForm action={action}>
      {({ fieldErrors }) => (
        <>
          <div className="admin-grid">
            <Field label="Full name" htmlFor="name" hint="Used in the brand mark and the footer." error={fieldErrors.name}>
              <TextInput name="name" defaultValue={values.name} maxLength={60} required />
            </Field>

            <Field
              label="Handle"
              htmlFor="codeName"
              hint="Lowercase, used for the GitHub and LinkedIn display name."
              error={fieldErrors.codeName}
            >
              <TextInput name="codeName" defaultValue={values.codeName} maxLength={30} required />
            </Field>
          </div>

          <Field
            label="Job title"
            htmlFor="title"
            hint="The first line of the hero heading and the browser tab title."
            error={fieldErrors.title}
          >
            <TextInput name="title" defaultValue={values.title} maxLength={80} required />
          </Field>

          <CountedTextArea
            label="Meta description"
            name="seoDescription"
            defaultValue={values.seoDescription}
            max={200}
            rows={3}
            hint="Shown in search results. Aim for one clear sentence."
            error={fieldErrors.seoDescription}
          />
        </>
      )}
    </EditorForm>
  );
}

/** Hero tab. */
export function HeroEditor({
  action,
  values,
  stackInput,
  positioningInput,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: {
    overline: string;
    availability: string;
    lede: string;
    primaryAction: string;
    secondaryAction: string;
  };
  stackInput: ReactNode;
  positioningInput: ReactNode;
}) {
  return (
    <EditorForm action={action}>
      {({ fieldErrors }) => (
        <>
          <div className="admin-grid">
            <Field
              label="Availability"
              htmlFor="availability"
              hint="Sits next to the status dot above the heading."
              error={fieldErrors.availability}
            >
              <TextInput name="availability" defaultValue={values.availability} maxLength={60} required />
            </Field>

            <Field
              label="Overline"
              htmlFor="overline"
              hint="Small uppercase label. Leave blank to hide it."
              error={fieldErrors.overline}
            >
              <TextInput name="overline" defaultValue={values.overline} maxLength={60} />
            </Field>
          </div>

          <CountedTextArea
            label="Intro paragraph"
            name="lede"
            defaultValue={values.lede}
            max={400}
            rows={4}
            error={fieldErrors.lede}
          />

          {positioningInput}

          {stackInput}

          <div className="admin-grid">
            <Field
              label="Primary button"
              htmlFor="primaryAction"
              hint="Scrolls to the projects section."
              error={fieldErrors.primaryAction}
            >
              <TextInput name="primaryAction" defaultValue={values.primaryAction} maxLength={24} required />
            </Field>

            <Field
              label="Secondary button"
              htmlFor="secondaryAction"
              hint="Links to GitHub. Hidden if no GitHub URL is configured."
              error={fieldErrors.secondaryAction}
            >
              <TextInput name="secondaryAction" defaultValue={values.secondaryAction} maxLength={24} required />
            </Field>
          </div>
        </>
      )}
    </EditorForm>
  );
}

/** About tab. */
export function AboutEditor({
  action,
  values,
  paragraphsInput,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: { lede: string };
  paragraphsInput: ReactNode;
}) {
  return (
    <EditorForm action={action}>
      {({ fieldErrors }) => (
        <>
          <CountedTextArea
            label="Lede"
            name="lede"
            defaultValue={values.lede}
            max={400}
            rows={3}
            hint="The larger sentence beside the paragraphs."
            error={fieldErrors.lede}
          />
          {paragraphsInput}
        </>
      )}
    </EditorForm>
  );
}

/** Terminal card tab. */
export function TerminalEditor({
  action,
  values,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: {
    filename: string;
    whoamiLabel: string;
    identity: string;
    focusLabel: string;
    focus: string;
    statusLabel: string;
  };
}) {
  return (
    <EditorForm action={action}>
      {({ fieldErrors }) => (
        <>
          <Field
            label="Window title"
            htmlFor="filename"
            hint="The filename in the terminal's title bar."
            error={fieldErrors.filename}
          >
            <TextInput name="filename" defaultValue={values.filename} maxLength={24} required />
          </Field>

          <Field
            label="Identity line"
            htmlFor="identity"
            hint="The output of the first command. Keep it short; it is monospaced."
            error={fieldErrors.identity}
          >
            <TextInput name="identity" defaultValue={values.identity} maxLength={60} required />
          </Field>

          <Field
            label="Focus line"
            htmlFor="focus"
            hint="The output of the second command."
            error={fieldErrors.focus}
          >
            <TextInput name="focus" defaultValue={values.focus} maxLength={80} required />
          </Field>

          <fieldset className="admin-fieldset">
            <legend>Command labels</legend>
            <p className="admin-note">The text after each prompt symbol.</p>
            <div className="admin-grid is-three">
              <Field label="First" htmlFor="whoamiLabel" error={fieldErrors.whoamiLabel}>
                <TextInput name="whoamiLabel" defaultValue={values.whoamiLabel} maxLength={20} required />
              </Field>
              <Field label="Second" htmlFor="focusLabel" error={fieldErrors.focusLabel}>
                <TextInput name="focusLabel" defaultValue={values.focusLabel} maxLength={20} required />
              </Field>
              <Field label="Third" htmlFor="statusLabel" error={fieldErrors.statusLabel}>
                <TextInput name="statusLabel" defaultValue={values.statusLabel} maxLength={20} required />
              </Field>
            </div>
          </fieldset>
        </>
      )}
    </EditorForm>
  );
}

/** Section headings tab. */
export function SectionsEditor({
  action,
  sections,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  sections: { key: string; label: string; index: string; title: string; intro: string }[];
}) {
  return (
    <EditorForm action={action}>
      {({ fieldErrors }) => (
        <div className="admin-sections">
          {sections.map((section) => (
            <fieldset className="admin-sectioncard" key={section.key}>
              <legend>{section.label}</legend>

              <div className="admin-grid">
                <Field
                  label="Number label"
                  htmlFor={`${section.key}-index`}
                  hint="Shown small above the heading."
                  error={fieldErrors[`${section.key}-index`]}
                >
                  <TextInput
                    name={`${section.key}-index`}
                    defaultValue={section.index}
                    maxLength={32}
                    required
                  />
                </Field>

                <Field
                  label="Heading"
                  htmlFor={`${section.key}-title`}
                  error={fieldErrors[`${section.key}-title`]}
                >
                  <TextInput
                    name={`${section.key}-title`}
                    defaultValue={section.title}
                    maxLength={90}
                    required
                  />
                </Field>
              </div>

              <Field
                label="Intro"
                htmlFor={`${section.key}-intro`}
                hint="Optional supporting line. Leave blank to hide it."
                error={fieldErrors[`${section.key}-intro`]}
              >
                <TextInput
                  name={`${section.key}-intro`}
                  defaultValue={section.intro}
                  maxLength={240}
                />
              </Field>
            </fieldset>
          ))}
        </div>
      )}
    </EditorForm>
  );
}