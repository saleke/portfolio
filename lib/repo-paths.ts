import { isValidSlug } from "@/lib/schema";

/**
 * Repository paths, in one place.
 *
 * These strings are security-relevant: they become tree entries in a commit
 * written with a token that can write to the repository. Centralising them means
 * there is one place to audit that every path is built from a validated slug and
 * nothing else, rather than the same template repeated across action files where
 * one copy could drift into accepting a traversal.
 *
 * Nothing here ever accepts untrusted input directly. Slugs are validated by
 * `isValidSlug` first, which rejects anything containing `/`, `.` or `\`.
 */

/** Repo directory holding one JSON file per project. */
export const CONTENT_DIR = "content/projects";

/** Repo directory holding uploaded project images, one subdirectory per slug. */
export const UPLOAD_DIR = "public/uploads/projects";

/** Site copy documents, each a single JSON file. */
export const DOCUMENTS = {
  site: "content/site.json",
  technologies: "content/technologies.json",
  focus: "content/focus.json",
} as const;

export type DocumentKey = keyof typeof DOCUMENTS;

/** Repo path for a project's content file. Requires a validated slug. */
export function contentPath(slug: string): string {
  if (!isValidSlug(slug)) {
    // Unreachable through the actions, which validate before calling. Kept as a
    // hard stop rather than an assumption, because a mistake here is a remote
    // file write.
    throw new Error(`Refusing to build a content path from an invalid slug: ${slug}`);
  }
  return `${CONTENT_DIR}/${slug}.json`;
}

/** Repo path prefix for a project's uploaded images. Requires a validated slug. */
export function uploadDirectory(slug: string): string {
  if (!isValidSlug(slug)) {
    throw new Error(`Refusing to build an upload path from an invalid slug: ${slug}`);
  }
  return `${UPLOAD_DIR}/${slug}`;
}

/**
 * The public URL prefix for a project's images, matching `uploadDirectory`.
 * Stored in the content file and rendered by `next/image`.
 */
export function uploadUrlPrefix(slug: string): string {
  return `/uploads/projects/${slug}`;
}

/** The JSON body written for a new file. Two-space indent plus a trailing newline. */
export function serialiseDocument(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}