#!/usr/bin/env node
/**
 * Validates `content/projects/*.json` without running a full Next.js build.
 *
 * The loader performs the same validation at build time and fails the build on
 * bad content, but that failure surfaces only after a 90-second compile. This
 * gives an answer in well under a second, which is the point of running it
 * before every commit.
 *
 * Usage:
 *   node scripts/validate-content.mjs     # exit 0 if valid, 1 otherwise
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content", "projects");

// Kept deliberately in step with lib/schema.ts. The build is the real
// guarantee; this exists to surface mistakes early and legibly.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const projectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
  context: z.string().trim().max(400).optional(),
  overview: z.string().trim().min(1).max(4000),
  problem: z.string().trim().min(1).max(4000),
  solution: z.string().trim().min(1).max(4000),
  architecture: z.string().trim().min(1).max(4000),
  decisions: z.array(z.string().trim().min(1).max(500)).max(20),
  features: z.array(z.string().trim().min(1).max(300)).max(30),
  technologies: z.array(z.string().trim().min(1).max(40)).max(20),
  images: z
    .array(
      z.object({
        src: z.string(),
        alt: z.string().max(140),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        blurDataUrl: z.string().optional(),
      }),
    )
    .max(8)
    .optional(),
  status: z.enum(["completed", "in-progress"]).optional(),
  featured: z.boolean().optional(),
  githubUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  eyebrow: z.string().optional(),
  order: z.number().int().optional(),
});

async function main() {
  let filenames;
  try {
    filenames = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith(".json"));
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`No content directory at ${path.relative(ROOT, CONTENT_DIR)}`);
      process.exit(1);
    }
    throw error;
  }

  if (filenames.length === 0) {
    console.log("No projects found. Nothing to validate.");
    return;
  }

  let failures = 0;

  for (const filename of filenames) {
    const slug = filename.slice(0, -".json".length);
    const label = path.join("content", "projects", filename);

    if (!SLUG_PATTERN.test(slug)) {
      console.error(`✗ ${label}\n  filename is not a valid slug`);
      failures++;
      continue;
    }

    let raw;
    try {
      raw = JSON.parse(await readFile(path.join(CONTENT_DIR, filename), "utf8"));
    } catch (error) {
      console.error(`✗ ${label}\n  invalid JSON: ${error.message}`);
      failures++;
      continue;
    }

    const result = projectSchema.safeParse(raw);
    if (!result.success) {
      console.error(`✗ ${label}`);
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      failures++;
      continue;
    }

    // Image paths must sit inside the project's own upload directory. A
    // mismatch means the content file and the repository disagree.
    for (const [index, image] of (result.data.images ?? []).entries()) {
      const expected = `/uploads/projects/${slug}/`;
      if (!image.src.startsWith(expected)) {
        console.error(`✗ ${label}\n  images[${index}].src is outside ${expected}`);
        failures++;
      }
    }

    console.log(`✓ ${label}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} file(s) failed validation.`);
    process.exit(1);
  }

  console.log(`\nAll ${filenames.length} project file(s) are valid.`);
}

await main();