"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { commitFiles, fetchJsonFile, GitHubError, isGitConfigured } from "@/lib/github";
import { DOCUMENTS, serialiseDocument } from "@/lib/repo-paths";
import {
  focusSchema,
  sectionHeadingSchema,
  siteCopySchema,
  technologiesSchema,
  SECTION_KEYS,
  SECTION_LABELS,
  type FocusAreas,
  type SiteCopy,
  type Technologies,
} from "@/lib/content-schema";
import { z } from "zod";
import type { ActionState } from "@/app/admin/state";

/**
 * Server Actions for editing everything that is not a project.
 *
 * Each action saves one tab, not the whole document. That matters more than it
 * looks: `site.json` holds hero copy, the about text and five section headings,
 * and if saving the hero could overwrite the about section, a two-minute typo
 * fix could quietly discard a paragraph. So an action reads the current document
 * from GitHub, replaces only the slice its own form owns, and writes the whole
 * document back.
 *
 * The consequence worth knowing: every save is a full-document write, so two
 * browsers saving different tabs at the same instant means last-write-wins on
 * the whole file. That is acceptable for a single-owner portfolio and is why
 * the confirmation copy never promises a merge.
 */

/** Gate for every mutating action. Checked before any input is read. */
async function requireAuth(): Promise<ActionState | null> {
  if (!(await isAuthenticated())) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  if (!isGitConfigured()) {
    return {
      status: "error",
      message: "Publishing is not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER and GITHUB_REPO_NAME.",
    };
  }
  return null;
}

/** Shown after every successful write, so the deploy delay is never a surprise. */
const PUBLISHED_NOTE = "Vercel is rebuilding now, so the live site updates in a minute or two.";

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** Reads one field as a trimmed string. */
function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Reads a JSON array out of a hidden field.
 *
 * The list editors are client components that hold structured state, and submit
 * it as one JSON string rather than as parallel indexed inputs. That avoids the
 * index-alignment fragility of the multi-field approach: a client that removes
 * row two cannot desynchronise the remaining rows, because there is only ever
 * one field.
 */
function jsonField<T>(formData: FormData, name: string, schema: z.ZodType<T>): T {
  const raw = text(formData, name);
  if (!raw) {
    return schema.parse([]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The form submitted a malformed list. Reload the page and try again.");
  }
  return schema.parse(parsed);
}

/**
 * Loads the current `site.json` from the branch head.
 *
 * Falls back to the shape the schema supplies if the file is missing, so a
 * fresh repository can still be filled in through the admin rather than only
 * by hand-editing files.
 */
async function readSite(): Promise<SiteCopy> {
  const raw = await fetchJsonFile<unknown>(DOCUMENTS.site);

  if (raw === null) {
    return siteCopySchema.parse({
      name: "",
      codeName: "",
      title: "",
      seoDescription: "",
      hero: {
        availability: "",
        lede: "",
        stack: [""],
        positioning: [],
        primaryAction: "View Projects",
        secondaryAction: "GitHub",
        overline: "",
      },
      terminal: {
        filename: "identity.sh",
        whoamiLabel: "whoami",
        identity: "",
        focusLabel: "focus",
        focus: "",
        statusLabel: "status",
      },
      about: { lede: "", paragraphs: [] },
      sections: Object.fromEntries(
        SECTION_KEYS.map((key) => [key, { index: "", title: "", intro: "" }]),
      ),
    });
  }

  const parsed = siteCopySchema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError(
      `The stored site copy is invalid, so the edit was not saved. Fix ${DOCUMENTS.site} on GitHub and try again.`,
      502,
    );
  }
  return parsed.data;
}

/**
 * Loads a document from the branch head and validates it.
 *
 * A missing document is an error rather than an empty state: unlike projects,
 * these files back sections that have no sensible placeholder, and silently
 * writing a blank site over a working one would be much worse than refusing.
 */
async function readDocument<T>(path: string, schema: z.ZodType<T>, label: string): Promise<T> {
  const raw = await fetchJsonFile<unknown>(path);

  if (raw === null) {
    throw new GitHubError(`${path} is missing from the content branch, so nothing was saved.`, 502);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError(
      `${label} is invalid on the content branch, so the edit was not saved. Fix ${path} on GitHub and try again.`,
      502,
    );
  }
  return parsed.data;
}

/**
 * Commits a document and refreshes the pages that render it.
 *
 * `revalidatePath` on a statically generated homepage rebuilds it from the
 * *deployed* files, not from the commit just pushed, so it cannot show the new
 * copy before the deploy finishes. It is still worth calling: it clears a stale
 * cache entry if the deploy completes first, so the site is never left serving
 * an older render than the repository.
 */
async function save(path: string, value: unknown, message: string): Promise<ActionState> {
  try {
    await commitFiles([{ path, content: serialiseDocument(value) }], message);
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { status: "success", message: `Saved. ${PUBLISHED_NOTE}` };
}

/** Identity fields: name, handle, job title and the meta description. */
const identityFields = z.object({
  name: siteCopySchema.shape.name,
  codeName: siteCopySchema.shape.codeName,
  title: siteCopySchema.shape.title,
  seoDescription: siteCopySchema.shape.seoDescription,
});

export async function saveIdentity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  const parsed = identityFields.safeParse({
    name: text(formData, "name"),
    codeName: text(formData, "codeName"),
    title: text(formData, "title"),
    seoDescription: text(formData, "seoDescription"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    // Merge onto the stored document so the hero, about and section headings are
    // untouched by an identity edit.
    const current = await readSite();
    return await save(
      DOCUMENTS.site,
      { ...current, ...parsed.data },
      `content: update identity and SEO (${parsed.data.name})`,
    );
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    if (error instanceof z.ZodError) {
      return { status: "error", message: "Some fields need attention." };
    }
    throw error;
  }
}

/** Hero copy, the stack line, and the two call-to-action labels. */
const heroFields = z.object({
  overline: siteCopySchema.shape.hero.shape.overline,
  availability: siteCopySchema.shape.hero.shape.availability,
  lede: siteCopySchema.shape.hero.shape.lede,
  primaryAction: siteCopySchema.shape.hero.shape.primaryAction,
  secondaryAction: siteCopySchema.shape.hero.shape.secondaryAction,
});

export async function saveHero(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  const strings = heroFields.safeParse({
    overline: text(formData, "overline"),
    availability: text(formData, "availability"),
    lede: text(formData, "lede"),
    primaryAction: text(formData, "primaryAction"),
    secondaryAction: text(formData, "secondaryAction"),
  });

  if (!strings.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors: fieldErrorsFrom(strings.error.issues),
    };
  }

  // The two lists are parsed separately so a malformed row cannot take the text
  // fields down with it.
  let stack: SiteCopy["hero"]["stack"];
  let positioning: SiteCopy["hero"]["positioning"];

  try {
    stack = jsonField(formData, "stack", siteCopySchema.shape.hero.shape.stack);
    positioning = jsonField(formData, "positioning", siteCopySchema.shape.hero.shape.positioning);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not read the technology list.",
    };
  }

  try {
    const current = await readSite();
    return await save(
      DOCUMENTS.site,
      { ...current, hero: { ...strings.data, stack, positioning } },
      "content: update hero",
    );
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }
}

/** About lede and paragraphs. */
const aboutFields = z.object({
  lede: siteCopySchema.shape.about.shape.lede,
  paragraphs: siteCopySchema.shape.about.shape.paragraphs,
});

export async function saveAbout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  const lede = siteCopySchema.shape.about.shape.lede.safeParse(text(formData, "lede"));
  if (!lede.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors: fieldErrorsFrom(lede.error.issues),
    };
  }

  let paragraphs: SiteCopy["about"]["paragraphs"];
  try {
    paragraphs = jsonField(formData, "paragraphs", aboutFields.shape.paragraphs);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not read the paragraphs.",
    };
  }

  try {
    const current = await readSite();
    return await save(
      DOCUMENTS.site,
      { ...current, about: { lede: lede.data, paragraphs } },
      "content: update about section",
    );
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }
}

/** The terminal card in the hero. */
export async function saveTerminal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  const parsed = siteCopySchema.shape.terminal.safeParse({
    filename: text(formData, "filename"),
    whoamiLabel: text(formData, "whoamiLabel"),
    identity: text(formData, "identity"),
    focusLabel: text(formData, "focusLabel"),
    focus: text(formData, "focus"),
    statusLabel: text(formData, "statusLabel"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  try {
    const current = await readSite();
    return await save(
      DOCUMENTS.site,
      { ...current, terminal: parsed.data },
      "content: update terminal card",
    );
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }
}

/**
 * The five section headings.
 *
 * The set of sections is fixed by the site's structure, so the form submits a
 * fixed set of named fields rather than a list. Adding a sixth section is a code
 * change; that is intentional, since each one needs a component and an anchor.
 */
export async function saveSections(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  const input: Record<string, unknown> = {};
  for (const key of SECTION_KEYS) {
    input[key] = {
      index: text(formData, `${key}-index`),
      title: text(formData, `${key}-title`),
      intro: text(formData, `${key}-intro`),
    };
  }

  const parsed = z.object(Object.fromEntries(SECTION_KEYS.map((key) => [key, sectionHeadingSchema]))).safeParse(input);

  if (!parsed.success) {
    // Namespaces the errors by section so the form can place them on the right
    // field rather than showing every message against the first input.
    const namespaced: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = SECTION_KEYS[Number(issue.path[0])];
      const field = String(issue.path[1] ?? "");
      const name = key ? `${key}-${field}` : field;
      namespaced[name] ??= `${SECTION_LABELS[key] ?? "Section"}: ${issue.message}`;
    }
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors: namespaced,
    };
  }

  try {
    const current = await readSite();
    return await save(
      DOCUMENTS.site,
      { ...current, sections: parsed.data },
      "content: update section headings",
    );
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }
}

/**
 * Technology groups.
 *
 * A single JSON field, because a group is a title plus a list of items and
 * there is no way to express that with flat inputs without fragile indices.
 */
export async function saveTechnologies(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  let groups: Technologies["groups"];
  try {
    groups = jsonField(formData, "groups", technologiesSchema.shape.groups);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: "Some fields need attention.",
        fieldErrors: fieldErrorsFrom(error.issues),
      };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not read the groups.",
    };
  }

  try {
    // Read-then-write even though the form owns the whole document, so the save
    // fails loudly if the file was deleted on the branch rather than resurrecting
    // it from a stale local copy.
    await readDocument(DOCUMENTS.technologies, technologiesSchema, "The technology list");
    return await save(DOCUMENTS.technologies, { groups }, "content: update technology list");
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }
}

/**
 * Focus areas.
 *
 * `accent` is the field that used to be implicit. The old component decided
 * styling by testing whether the label read "Technical interests", so retyping
 * the label silently changed the presentation. It is an explicit boolean now, so
 * appearance is something the owner sets rather than something inferred.
 */
export async function saveFocusAreas(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await requireAuth();
  if (denied) return denied;

  let items: FocusAreas["items"];
  try {
    items = jsonField(formData, "items", focusSchema.shape.items);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: "Some fields need attention.",
        fieldErrors: fieldErrorsFrom(error.issues),
      };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not read the areas.",
    };
  }

  try {
    await readDocument(DOCUMENTS.focus, focusSchema, "The focus areas");
    return await save(DOCUMENTS.focus, { items }, "content: update focus areas");
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }
}

