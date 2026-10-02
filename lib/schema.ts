import { z } from "zod";

/**
 * Single source of truth for project content.
 *
 * The `Project` type is *derived* from this schema, so a field can never drift
 * between the validator and the type. Content lives in `content/projects/*.json`
 * and is written by the admin UI, so runtime validation is mandatory: the site
 * must fail the build rather than ship a broken page.
 */

/** A technology tag. Deliberately permissive; trimmed and de-duplicated on write. */
export const technologySchema = z
  .string()
  .trim()
  .min(1, "Technology cannot be empty")
  .max(40, "Technology must be 40 characters or fewer");

/** An uploaded image. Paths are server-derived, never client-supplied. */
export const imageSchema = z.object({
  /** Path under `/uploads`, always produced server-side. */
  src: z
    .string()
    .regex(/^\/uploads\/projects\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/, "Image path is not a valid upload path"),
  alt: z.string().trim().max(140, "Alt text must be 140 characters or fewer").default(""),
  /** Intrinsic size, captured at upload. Used to reserve space and prevent layout shift. */
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  /** Tiny inline WebP used as the `next/image` blur placeholder. */
  blurDataUrl: z.string().max(20000).optional(),
});
export type ProjectImage = z.infer<typeof imageSchema>;

export const projectSchema = z.object({
  /**
   * Identifies the file `content/projects/<slug>.json` and the public route
   * `/projects/<slug>`. Never stored inside the JSON body — the filename *is*
   * the slug, which removes any possibility of the two disagreeing.
   */
  // slug: z.string(),

  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),

  /** One-line summary. Used on the card, in <meta description>, and OG tags. */
  description: z.string().trim().min(1, "Summary is required").max(300, "Summary must be 300 characters or fewer"),

  /** One or two sentences on *why* this project exists, shown on the card. */
  context: z.string().trim().max(400, "Context must be 400 characters or fewer").default(""),

  /** Case-study body. These fields are what makes a project page worth reading. */
  overview: z.string().trim().min(1, "Overview is required").max(4000),
  problem: z.string().trim().min(1, "Problem is required").max(4000),
  solution: z.string().trim().min(1, "Solution is required").max(4000),
  architecture: z.string().trim().min(1, "Architecture is required").max(4000),

  decisions: z.array(z.string().trim().min(1).max(500)).max(20, "At most 20 technical decisions"),
  features: z.array(z.string().trim().min(1).max(300)).max(30, "At most 30 features"),

  technologies: z.array(technologySchema).max(20, "At most 20 technologies"),

  images: z.array(imageSchema).max(8, "At most 8 images per project").default([]),

  status: z.enum(["completed", "in-progress"]).default("in-progress"),
  featured: z.boolean().default(false),

  githubUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).default(""),
  liveUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).default(""),

  /**
   * Display label such as "PROJECT / 04". Auto-generated from position when a
   * project is created, but editable so a case study can be labelled differently.
   */
  eyebrow: z.string().trim().min(1).max(40).default("PROJECT"),

  /** Manual sort weight. Lower sorts first. Ties fall back to title. */
  order: z.number().int().min(0).max(9999).default(100),
});

/**
 * A project plus its slug. The slug comes from the filename, so it is the one
 * field that cannot live inside the JSON body.
 */
export const storedProjectSchema = projectSchema.transform((value) => value);

export type ProjectInput = z.input<typeof projectSchema>;
export type Project = z.infer<typeof projectSchema> & { slug: string };

/** Slug rules. Also enforced when deriving filesystem paths, to block traversal. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 80;

/**
 * Turns a human title into a URL-safe slug.
 *
 * Deliberately conservative: it strips everything that is not a lowercase
 * alphanumeric or dash, so the result is *always* a valid path segment and can
 * never traverse out of the content directory.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: "Café" -> "Cafe"
    .toLowerCase()
    .replace(/['’]/g, "") // "owner's" -> "owners"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
}

/**
 * The one ordering rule for projects.
 *
 * Shared so the site and the admin's reorder action cannot disagree. If the
 * dashboard sorted differently from the homepage, "move up" would appear to do
 * nothing, or would move the wrong project. The tie-break on title matters
 * because `readdir` order is not guaranteed and varies between filesystems.
 */
export function compareProjects(
  a: { order: number; title: string },
  b: { order: number; title: string },
): number {
  return a.order - b.order || a.title.localeCompare(b.title);
}

/**
 * Parses and validates a content file.
 *
 * Returns a discriminated result rather than throwing so the loader can
 * aggregate *all* problems and report them together, instead of failing on the
 * first bad file.
 */
export function parseProject(raw: unknown, slug: string):
  | { ok: true; project: Project }
  | { ok: false; slug: string; issues: string[] } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, slug, issues: ["File must contain a JSON object."] };
  }

  const result = projectSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, project: { ...result.data, slug } };
  }

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });

  return { ok: false, slug, issues };
}