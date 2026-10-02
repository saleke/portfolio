import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Project } from "@/lib/schema";
import { parseProject, isValidSlug, compareProjects } from "@/lib/schema";

/**
 * Reads project content from `content/projects/*.json`.
 *
 * This module is server-only: it touches the filesystem, and must never be
 * pulled into a client bundle.
 *
 * Reads are wrapped in React's `cache` so that a single render pass performs one
 * read per file rather than one per component. On Vercel a process is
 * short-lived and tied to a single build, so this collapses to a single read
 * per file per build. During `next dev` it also stops the dev server hitting
 * disk on every component render while content is being edited.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

/** A successful load, or a validation failure describing what is wrong. */
type Loaded =
  | { ok: true; project: Project }
  | { ok: false; slug: string; issues: string[] };

/**
 * Reads and validates every project file.
 *
 * A malformed file throws, which fails `next build`. That is deliberate: bad
 * content must be caught in CI, not discovered by a visitor. Errors from every
 * bad file are aggregated so one run reports all problems, not just the first.
 */
async function loadProjects(): Promise<Project[]> {
  let filenames: string[];

  try {
    filenames = await readdir(CONTENT_DIR);
  } catch (error) {
    // A missing content directory means "no projects", not a crash. This keeps
    // the site buildable in a fresh clone or in CI before content is seeded.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const settled = await Promise.all(
    filenames
      .filter((name) => name.endsWith(".json"))
      .map(async (filename): Promise<Loaded> => {
        // The filename *is* the slug: it becomes a route segment and a path
        // component, so it is validated before anything else happens.
        const slug = filename.slice(0, -".json".length);

        if (!isValidSlug(slug)) {
          return {
            ok: false,
            slug: filename,
            issues: [
              `Filename "${filename}" is not a valid slug. Use lowercase letters, numbers and single dashes, e.g. "my-project.json".`,
            ],
          };
        }

        const contents = await readFile(path.join(CONTENT_DIR, filename), "utf8");

        let raw: unknown;
        try {
          raw = JSON.parse(contents);
        } catch (error) {
          return { ok: false, slug: filename, issues: [`File is not valid JSON: ${(error as Error).message}`] };
        }

        const parsed = parseProject(raw, slug);

        return parsed.ok
          ? { ok: true, project: parsed.project }
          : { ok: false, slug: filename, issues: parsed.issues };
      }),
  );

  const projects: Project[] = [];
  const failures: string[] = [];

  for (const entry of settled) {
    if (entry.ok) {
      projects.push(entry.project);
    } else {
      failures.push(`content/projects/${entry.slug}\n  - ${entry.issues.join("\n  - ")}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Invalid project content. Fix the following file(s):\n\n${failures.join("\n\n")}`,
    );
  }

  // Deterministic ordering via the shared comparator, so this list matches the
  // order the dashboard's reorder action produces.
  projects.sort(compareProjects);

  return projects;
}

export const getProjects = cache((): Promise<Project[]> => loadProjects());

export const getProject = cache(async (slug: string): Promise<Project | undefined> => {
  // Guard the lookup so a crafted slug can never reach the filesystem layer.
  if (!isValidSlug(slug)) return undefined;

  const projects = await loadProjects();
  return projects.find((project) => project.slug === slug);
});

export const getProjectSlugs = cache(async (): Promise<string[]> =>
  (await loadProjects()).map((project) => project.slug),
);