"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import {
  buildImageFilename,
  commitFiles,
  fetchJsonFile,
  fetchJsonFiles,
  GitHubError,
  isGitConfigured,
  listFilesUnder,
  type GitFile,
} from "@/lib/github";
import { validateImage, ImageValidationError } from "@/lib/images";
import {
  contentPath,
  serialiseDocument,
  uploadDirectory,
  uploadUrlPrefix,
  CONTENT_DIR,
} from "@/lib/repo-paths";
import {
  compareProjects,
  isValidSlug,
  projectSchema,
  slugify,
  type Project,
  type ProjectImage,
} from "@/lib/schema";

/**
 * Server Actions for publishing projects.
 *
 * Security model, and the reason it is shaped this way:
 *
 * A Server Action is a public HTTP endpoint. Its identifier is obfuscated, not
 * secret, and Next's built-in CSRF protection only checks that the `Origin`
 * header matches `Host`. That stops cross-site requests; it does not stop a
 * direct request from anyone who can reach the site. So every action below
 * checks the session **first**, before reading any input, and derives every
 * repository path server-side rather than accepting one from the form.
 *
 * Paths in particular: a form that let the client choose `public/x.html` or
 * `../../.env.local` would be a remote file write. Slugs are validated against a
 * strict pattern and paths are built from them in `lib/repo-paths.ts`, so a
 * traversal string cannot survive.
 *
 * Every action reads the current state from the GitHub branch head rather than
 * from the local filesystem. See `fetchJsonFile` for why that distinction is
 * load-bearing.
 */

/**
 * `ActionState` is imported rather than re-exported: every export of a
 * `"use server"` module becomes an RPC endpoint, so a non-function export here
 * is rejected at build time. Consumers import both from `@/app/admin/state`.
 */
import { type ActionState } from "@/app/admin/state";

/**
 * Gate for every mutating action.
 *
 * Returns false rather than throwing so callers can turn it into a form error.
 * The dashboard layout also redirects unauthenticated visitors, but a layout
 * guard is a rendering concern, not an authorization boundary: an action is
 * directly reachable regardless of what the layout chose to render.
 */
async function requireAuth(): Promise<boolean> {
  return isAuthenticated();
}

/** Message shown when the git credentials are absent. */
const NOT_CONFIGURED =
  "Publishing is not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER and GITHUB_REPO_NAME.";

/** Shown after every successful write, so the deploy delay is never a surprise. */
const PUBLISHED_NOTE = "Vercel is rebuilding now, so the live site updates in a minute or two.";

/**
 * Normalises FormData into a plain object for the schema.
 *
 * `order` is deliberately absent. It used to be parsed here, which produced
 * `NaN` for every save because the form has no such field, and Zod rejected the
 * whole submission — meaning publishing never worked at all. Position is now
 * derived server-side from the repository, which is also the only place that
 * knows the truth about ordering.
 *
 * Every key returned here is a field the form actually renders. A key here that
 * the form omits would be submitted as empty on every save and silently wipe
 * whatever was stored, which is the same failure mode as the one above.
 */
function collectFields(formData: FormData): Record<string, unknown> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  /**
   * Reads one of the reorderable list fields.
   *
   * These arrive as a single JSON string from `StringListInput` rather than as
   * one field per row. A malformed payload is tolerated rather than thrown: the
   * schema still validates the result, and returning an empty list lets the
   * owner see the error against the list itself instead of losing the whole
   * page to an exception.
   */
  const rows = (name: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(text(name));
      if (!Array.isArray(parsed)) return [];
      return parsed.map(String);
    } catch {
      return [];
    }
  };

  return {
    title: text("title"),
    description: text("description"),
    context: text("context"),
    overview: text("overview"),
    problem: text("problem"),
    solution: text("solution"),
    architecture: text("architecture"),
    decisions: rows("decisions"),
    features: rows("features"),
    // Tags arrive comma-separated, which is far easier to type than repeated
    // rows and matches how the existing data reads.
    technologies: text("technologies")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    status: text("status") || "in-progress",
    featured: formData.get("featured") === "on",
    githubUrl: text("githubUrl"),
    liveUrl: text("liveUrl"),
    eyebrow: text("eyebrow") || "PROJECT",
  };
}

/** Flattens Zod issues into a per-field map the form can render inline. */
function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    // First error per field wins, matching how the form displays them.
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

type ExistingImageRef = { src: string; alt: string };

/**
 * Reads images already attached to a project.
 *
 * The form sends kept images as index-aligned `existingImage` / `existingAlt`
 * pairs. Only images the owner kept are submitted, so an omitted entry means
 * "remove this". That is how deleting an individual image is expressed without
 * any extra control.
 */
function collectExistingImages(formData: FormData): ExistingImageRef[] {
  return formData
    .getAll("existingImage")
    .map((value, index) => {
      const src = typeof value === "string" ? value : "";
      const altRaw = formData.get(`existingAlt-${index}`);
      return {
        src,
        alt: typeof altRaw === "string" ? altRaw.trim().slice(0, 140) : "",
      };
    })
    .filter((image) => image.src.length > 0);
}

/** Reads the tiny WebP data URL the browser generated for the blur placeholder. */
function readBlur(formData: FormData, index: number): string | undefined {
  const value = formData.get(`imageBlur-${index}`);
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("data:image/webp;base64,")) return undefined;
  // Keep the payload small; an oversized data URL bloats every page that
  // inlines it into its HTML.
  return value.length <= 20000 ? value : undefined;
}

/**
 * Validates and prepares images from the form.
 *
 * Runs before the JSON is written so a bad image fails the whole save rather
 * than leaving content that references a file which was never committed.
 *
 * Each file is paired with its declared dimensions, sent as parallel indexed
 * fields (`imageWidth-0`, `imageHeight-0`, ...). Pairing by index rather than by
 * position in the multipart body avoids any ambiguity.
 *
 * A file may also carry `imageReplaces-<index>`, the `src` of a stored image it
 * supersedes. That is returned alongside rather than applied here, because the
 * ordering only makes sense against the project's current image list, which
 * this function does not read.
 *
 * Image bytes are kept as a `Buffer` and handed to `commitFiles` unencoded.
 * `commitFiles` base64-encodes exactly once on the way to GitHub; pre-encoding
 * here would encode them twice and produce a file that decodes to base64 text.
 */
async function collectNewImages(
  formData: FormData,
  slug: string,
  validReplaceTargets: ReadonlySet<string>,
): Promise<{ images: ProjectImage[]; files: GitFile[]; replaces: Map<string, ProjectImage> }> {
  const images: ProjectImage[] = [];
  const files: GitFile[] = [];

  /** New image keyed by the stored `src` it supersedes. */
  const replaces = new Map<string, ProjectImage>();

  const uploads = formData.getAll("images").filter((entry): entry is File => entry instanceof File);

  for (const [index, file] of uploads.entries()) {
    if (file.size === 0) continue;

    const width = Number.parseInt(String(formData.get(`imageWidth-${index}`) ?? ""), 10);
    const height = Number.parseInt(String(formData.get(`imageHeight-${index}`) ?? ""), 10);

    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new ImageValidationError(`Could not read the dimensions of "${file.name}".`);
    }

    const { bytes, width: realWidth, height: realHeight } = await validateImage(file, {
      width,
      height,
    });

    const altRaw = formData.get(`imageAlt-${index}`);
    const alt = typeof altRaw === "string" ? altRaw.trim().slice(0, 140) : "";

    const filename = buildImageFilename(bytes);

    const image: ProjectImage = {
      src: `${uploadUrlPrefix(slug)}/${filename}`,
      alt,
      width: realWidth,
      height: realHeight,
      blurDataUrl: readBlur(formData, index),
    };

    images.push(image);

    /*
      The target is validated against the project's own upload directory and
      against the images actually stored on the branch. `replaces` decides a
      position in an array, so an unvalidated value could reorder or resurrect
      an unrelated path in the content file.
    */
    const target = formData.get(`imageReplaces-${index}`);
    if (
      typeof target === "string" &&
      target.startsWith(`${uploadUrlPrefix(slug)}/`) &&
      validReplaceTargets.has(target) &&
      !replaces.has(target)
    ) {
      replaces.set(target, image);
    }

    files.push({ path: `${uploadDirectory(slug)}/${filename}`, content: bytes });
  }

  return { images, files, replaces };
}

/**
 * Loads a project's current stored state from the branch head.
 *
 * Used by update and delete so both act on the latest commit rather than on
 * whatever the running deployment happens to have built from.
 */
async function readStoredProject(
  slug: string,
): Promise<{ ok: true; project: Project } | { ok: false; message: string }> {
  try {
    const raw = await fetchJsonFile(contentPath(slug));

    if (raw === null) {
      return {
        ok: false,
        message: `No project named "${slug}" was found on the content branch. It may never have been published, or it may have been deleted.`,
      };
    }

    const parsed = projectSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        message: `The stored content for "${slug}" is invalid, so the edit was not saved. Fix ${contentPath(slug)} on GitHub and try again.`,
      };
    }

    return { ok: true, project: { ...parsed.data, slug } };
  } catch (error) {
    if (error instanceof GitHubError) return { ok: false, message: error.message };
    throw error;
  }
}

/**
 * Publishes a brand new project.
 *
 * The slug is derived from the title on the server. A client-supplied slug is
 * accepted when it is already valid, which allows a deliberate custom slug
 * without ever permitting an arbitrary path.
 */
export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAuth())) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!isGitConfigured()) {
    return { status: "error", message: NOT_CONFIGURED };
  }

  // The title is what the slug is derived from, so an empty title has to be
  // reported against the field. Without this check the owner who left the title
  // blank would be told the slug could not be derived, which describes a
  // consequence of the real problem rather than the problem itself.
  if (String(formData.get("title") ?? "").trim().length === 0) {
    return {
      status: "error",
      message: "Some fields need attention.",
      fieldErrors: { title: "Title is required" },
    };
  }

  const slug = slugify(
    String(formData.get("slug") ?? "") || String(formData.get("title") ?? ""),
  );

  if (!isValidSlug(slug)) {
    return {
      status: "error",
      message: "Could not derive a valid URL slug from that title. Try a shorter, simpler title.",
    };
  }

  // The JSON and every image go into one commit, so a failure part-way through
  // cannot leave the content file referencing an image that was never written.
  try {
    // A new project has no stored images, so nothing can be replaced. Passing an
    // empty set makes `imageReplaces-*` inert rather than honoured.
    const result = await collectNewImages(formData, slug, new Set());
    // Re-validate with the images merged in, so an over-length image list or a
    // malformed path fails here rather than in GitHub.
    const fields = collectFields(formData);
    const parsed = projectSchema.safeParse({ ...fields, images: result.images });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Some fields need attention.",
        fieldErrors: fieldErrorsFrom(parsed.error.issues),
      };
    }

    // Position comes from the repository, not the form. The repository is the
    // only source that includes projects added but not yet deployed.
    const existing = await listFilesUnder(`${CONTENT_DIR}/`);
    if (existing.some((path) => path === contentPath(slug))) {
      return {
        status: "error",
        message: `A project with the slug "${slug}" already exists. Choose a different title, or edit that project instead.`,
        fieldErrors: { title: "This slug is already taken." },
      };
    }

    const position = existing.length + 1;
    const data = parsed.data;

    // Only override a placeholder, so the owner can still label a case study
    // differently from a plain project.
    if (data.eyebrow === "PROJECT") {
      data.eyebrow = `PROJECT / ${String(position).padStart(2, "0")}`;
    }
    data.order = position;

    await commitFiles(
      [
        { path: contentPath(slug), content: serialiseDocument(data) },
        ...result.files,
      ],
      `feat: add project ${data.title}`,
    );
  } catch (error) {
    if (error instanceof ImageValidationError) return { status: "error", message: error.message };
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/admin/projects");

  redirect(`/admin/projects/${slug}?published=1`);
}

/** Publishes changes to an existing project. */
export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAuth())) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!isGitConfigured()) {
    return { status: "error", message: NOT_CONFIGURED };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    return { status: "error", message: "Invalid project reference." };
  }

  const stored = await readStoredProject(slug);
  if (!stored.ok) return { status: "error", message: stored.message };
  const existing = stored.project;

  // Images the owner removed in the form are deleted from the repository.
  // Anything not submitted as `existingImage` is treated as removed.
  const kept = collectExistingImages(formData);
  const keptSrcs = new Set(kept.map((image) => image.src));

  // Restricted to the project's own upload directory. A `src` in the content
  // file is data, not a trusted path, and this is what stops a crafted value
  // from widening a delete into an arbitrary file removal.
  const ownPrefix = `${uploadUrlPrefix(slug)}/`;
  const removed = existing.images.filter(
    (image) => image.src.startsWith(ownPrefix) && !keptSrcs.has(image.src),
  );

  // Kept images keep their stored dimensions and blur placeholder. Only the alt
  // text is owner-editable, so those values are merged back onto the stored
  // record rather than trusted from the form.
  const storedBySrc = new Map(existing.images.map((image) => [image.src, image]));
  const mergedKept = kept.map((image) => {
    const record = storedBySrc.get(image.src);
    return {
      ...image,
      width: record?.width ?? 1200,
      height: record?.height ?? 800,
      blurDataUrl: record?.blurDataUrl,
    };
  });

  let files: GitFile[];
  let parsedProject: ReturnType<typeof projectSchema.parse>;

  // The only images a new upload is allowed to claim as its target.
  const replaceTargets = new Set(existing.images.map((image) => image.src));

  try {
    const result = await collectNewImages(formData, slug, replaceTargets);

    /*
      Rebuilt from the stored order rather than concatenated, because that is
      what makes a replace behave like a replace.

      Appending new images to the kept ones looks equivalent until one of them
      is a replacement: the first image is the cover used for the social card,
      so replacing it and appending it would silently change which screenshot
      the project card shows. Walking the stored list and substituting in place
      keeps every untouched image exactly where the owner left it.
    */
    const images: ProjectImage[] = [];
    for (const image of existing.images) {
      const replacement = result.replaces.get(image.src);
      if (replacement) {
        images.push(replacement);
      } else if (keptSrcs.has(image.src)) {
        const merged = mergedKept.find((entry) => entry.src === image.src);
        if (merged) images.push(merged);
      }
      // Neither kept nor replaced: the owner removed it.
    }

    // Genuinely new images, in the order they were attached.
    const substituted = new Set(result.replaces.values());
    for (const image of result.images) {
      if (!substituted.has(image)) images.push(image);
    }

    const parsed = projectSchema.safeParse({ ...collectFields(formData), images });
    if (!parsed.success) {
      return {
        status: "error",
        message: "Some fields need attention.",
        fieldErrors: fieldErrorsFrom(parsed.error.issues),
      };
    }

    // Position is preserved from the stored project. The owner reorders with the
    // arrow controls; silently renumbering on every save would fight that.
    parsedProject = { ...parsed.data, order: existing.order };

    files = [
      { path: contentPath(slug), content: serialiseDocument(parsedProject) },
      ...result.files,
      ...removed.map((image) => ({
        path: `${uploadDirectory(slug)}/${image.src.slice(ownPrefix.length)}`,
        delete: true as const,
      })),
    ];
  } catch (error) {
    if (error instanceof ImageValidationError) return { status: "error", message: error.message };
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }

  try {
    await commitFiles(files, `feat: update project ${parsedProject.title}`);
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }

  revalidatePath("/");
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/admin/projects");

  /*
    The edit page itself, which the two lines above do not cover.

    Without it the form the owner is looking at is never re-rendered, so it
    keeps the image list it had before the save: the images just published are
    never adopted as stored ones, and the files still sit in local state. On the
    next save the form submits no `existingImage` at all while the server still
    holds the published set, so every one of those images is treated as removed
    and deleted. Removing a single image appeared to delete all of them.
  */
  revalidatePath(`/admin/projects/${slug}`);

  return { status: "success", message: `Saved. ${PUBLISHED_NOTE}` };
}

/**
 * Removes a project and its images.
 *
 * Image targets are the union of two sources so nothing is missed: whatever is
 * actually in the repository right now, and whatever the stored content
 * references. Either alone can be incomplete after an interrupted earlier save.
 */
export async function deleteProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAuth())) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!isGitConfigured()) {
    return { status: "error", message: NOT_CONFIGURED };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    return { status: "error", message: "Invalid project reference." };
  }

  const stored = await readStoredProject(slug);
  if (!stored.ok) return { status: "error", message: stored.message };
  const existing = stored.project;

  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (confirmation !== existing.title) {
    return {
      status: "error",
      message: "Type the project title exactly to confirm deletion.",
      fieldErrors: { confirm: "The title does not match." },
    };
  }

  const urlPrefix = `${uploadUrlPrefix(slug)}/`;
  const repoPrefix = `${uploadDirectory(slug)}/`;

  const referenced = existing.images
    .filter((image) => image.src.startsWith(urlPrefix))
    .map((image) => `${uploadDirectory(slug)}/${image.src.slice(urlPrefix.length)}`);

  // Both sources are constrained to the project's own directory by
  // construction, so neither can widen the delete.
  const targets = new Set([...(await listFilesUnder(repoPrefix)), ...referenced]);

  try {
    await commitFiles(
      [
        { path: contentPath(slug), delete: true },
        ...[...targets].map((path) => ({ path, delete: true as const })),
      ],
      `chore: remove project ${existing.title}`,
    );
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/admin/projects");

  redirect("/admin/projects?deleted=1");
}

/**
 * Moves a project one position up or down the list.
 *
 * Swapping two adjacent entries only needs to rewrite those two files. A full
 * renumber of every project would work too, but it would rewrite N files when a
 * swap touches two, which matters because each write is an API call the owner is
 * waiting on.
 */
export async function reorderProjects(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await requireAuth())) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!isGitConfigured()) {
    return { status: "error", message: NOT_CONFIGURED };
  }

  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    return { status: "error", message: "Invalid project reference." };
  }

  const direction = formData.get("direction") === "up" ? -1 : 1;

  // Reads the authoritative list from the branch head. Using the local build
  // here would reorder against a stale view and could clobber a change that has
  // been committed but not yet deployed.
  const paths = await listFilesUnder(`${CONTENT_DIR}/`);
  const stored = await fetchJsonFiles<unknown>(paths);

  const projects: Project[] = [];
  for (const [path, raw] of stored) {
    if (raw === null) continue;
    const parsed = projectSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        status: "error",
        message: `The stored content for ${path} is invalid, so the order was not changed. Fix it on GitHub and try again.`,
      };
    }
    projects.push({ ...parsed.data, slug: path.slice(CONTENT_DIR.length + 1, -".json".length) });
  }

  projects.sort(compareProjects);

  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) {
    return { status: "error", message: "Project not found on the content branch." };
  }

  const target = index + direction;
  if (target < 0 || target >= projects.length) {
    return {
      status: "error",
      message: direction < 0 ? "Already at the top of the list." : "Already at the bottom of the list.",
    };
  }

  const reordered = [...projects];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Only projects whose weight actually changes are rewritten. This is why the
  // swap above is not simply "set every order to its new position": renumbering
  // unconditionally would rewrite every project file, and each write is an API
  // call the owner is waiting on. Ties and adjacent weights are resolved by the
  // same renumber, since the comparison below makes it fall out correctly.
  const files: GitFile[] = reordered
    .map((project, position) => ({ project, position }))
    .filter(({ project, position }) => project.order !== position + 1)
    .map(({ project, position }) => ({
      path: contentPath(project.slug),
      content: serialiseDocument({ ...stripSlug(project), order: position + 1 }),
    }));

  // Every weight was already correct, which can only happen if the list was
  // renumbered by a previous edit. Still report success rather than committing.
  if (files.length === 0) {
    return { status: "error", message: "That project is already in that position." };
  }

  const moveUp = direction < 0;

  try {
    await commitFiles(files, `chore: reorder projects (${slug} ${moveUp ? "up" : "down"})`);
  } catch (error) {
    if (error instanceof GitHubError) return { status: "error", message: error.message };
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/admin/projects");

  return { status: "success", message: `Order updated. ${PUBLISHED_NOTE}` };
}

/**
 * Drops the derived `slug` so it is never written into the JSON body.
 *
 * `slug` comes from the filename, so storing it as well would create two sources
 * of truth that could disagree. The rest spread is the whole mechanism: whatever
 * the object does not name is omitted.
 */
function stripSlug(project: Project): Omit<Project, "slug"> {
  const rest: Partial<Project> = { ...project };
  delete rest.slug;
  return rest as Omit<Project, "slug">;
}