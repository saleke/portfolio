import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { z } from "zod";
import {
  siteCopySchema,
  technologiesSchema,
  focusSchema,
  type SiteCopy,
  type Technologies,
  type FocusAreas,
} from "@/lib/content-schema";

/**
 * Reads the editable site content from `content/*.json`.
 *
 * Server-only: this touches the filesystem and must never reach a client bundle.
 *
 * Every document is parsed and validated at build time. An invalid document
 * throws, which fails `next build`. That is the intended behaviour: a typo in a
 * heading should break the deploy, not reach a visitor. The message names the
 * file and the field so the failure is actionable from the deploy log.
 *
 * Each getter is wrapped in React's `cache`, so one render pass reads each file
 * once no matter how many components consume it. On Vercel a process is
 * short-lived and tied to one build, so this collapses to a single read per file
 * per build. During `next dev` it also prevents a disk hit per component render
 * while editing content.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");

/**
 * Reads and validates one content document.
 *
 * The return type is inferred from the schema argument, so the getter and its
 * schema cannot disagree.
 */
async function readDocument<T>(filename: string, schema: z.ZodType<T>): Promise<T> {
  const relative = path.join("content", filename);

  let contents: string;
  try {
    contents = await readFile(path.join(CONTENT_DIR, filename), "utf8");
  } catch (error) {
    // A missing document is a hard error, unlike a missing projects directory.
    // These files back every section of the homepage, so there is no sensible
    // empty state to fall back to.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Missing content file ${relative}. Restore it from git, or recreate it and commit.`,
      );
    }
    throw error;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(contents);
  } catch (error) {
    throw new Error(`${relative} is not valid JSON: ${(error as Error).message}`);
  }

  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid content in ${relative}:\n${issues}`);
}

export const getSiteCopy = cache((): Promise<SiteCopy> =>
  readDocument("site.json", siteCopySchema),
);

export const getTechnologies = cache((): Promise<Technologies> =>
  readDocument("technologies.json", technologiesSchema),
);

export const getFocusAreas = cache((): Promise<FocusAreas> =>
  readDocument("focus.json", focusSchema),
);