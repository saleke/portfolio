import { z } from "zod";

/**
 * Schemas for the editable site content.
 *
 * Same contract as `lib/schema.ts`: these schemas are the single source of
 * truth, and the TypeScript types are derived from them so a field can never
 * drift between what is validated and what the components read.
 *
 * Every document here is written by the admin UI and read during the build, so
 * validation is not optional. A malformed document must fail `next build`
 * rather than render a subtly wrong page in production.
 */

/** A reusable section heading, used by all five content sections. */
export const sectionHeadingSchema = z.object({
  index: z
    .string()
    .trim()
    .min(1, "A label is required")
    .max(32, "Keep the label to 32 characters or fewer"),
  title: z
    .string()
    .trim()
    .min(1, "A heading is required")
    .max(90, "Keep the heading to 90 characters or fewer"),
  intro: z.string().trim().max(240, "Keep the intro to 240 characters or fewer").default(""),
});
export type SectionHeading = z.infer<typeof sectionHeadingSchema>;

export const siteCopySchema = z.object({
  // --- Identity -------------------------------------------------------------
  name: z.string().trim().min(1, "Name is required").max(60),
  codeName: z
    .string()
    .trim()
    .min(1, "Handle is required")
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  title: z.string().trim().min(1, "Job title is required").max(80),
  seoDescription: z.string().trim().min(1, "Meta description is required").max(200),

  // --- Hero -----------------------------------------------------------------
  hero: z.object({
    availability: z.string().trim().min(1).max(60),
    overline: z.string().trim().max(60).default(""),
    lede: z.string().trim().min(1, "Intro paragraph is required").max(400),
    /** The single line of technology chips under the hero text. */
    stack: z.array(z.string().trim().min(1).max(30)).min(1).max(12),
    /**
     * The lines that follow the job title in the `<h1>`, separated on screen by
     * a pipe. Kept separate from `stack` because these are a positioning
     * statement, not a technology list.
     */
    positioning: z.array(z.string().trim().min(1).max(80)).max(3).default([]),
    primaryAction: z.string().trim().min(1).max(24).default("View Projects"),
    secondaryAction: z.string().trim().min(1).max(24).default("GitHub"),
  }),

  // --- Terminal card --------------------------------------------------------
  terminal: z.object({
    filename: z.string().trim().min(1).max(24).default("identity.sh"),
    whoamiLabel: z.string().trim().min(1).max(20).default("whoami"),
    identity: z.string().trim().min(1).max(60),
    focusLabel: z.string().trim().min(1).max(20).default("focus"),
    focus: z.string().trim().min(1).max(80),
    statusLabel: z.string().trim().min(1).max(20).default("status"),
  }),

  // --- About ----------------------------------------------------------------
  about: z.object({
    lede: z.string().trim().min(1, "Lede is required").max(400),
    paragraphs: z.array(z.string().trim().min(1).max(600)).max(8),
  }),

  // --- Section headings -----------------------------------------------------
  sections: z.object({
    about: sectionHeadingSchema,
    projects: sectionHeadingSchema,
    stack: sectionHeadingSchema,
    learning: sectionHeadingSchema,
    contact: sectionHeadingSchema,
  }),
});
export type SiteCopy = z.infer<typeof siteCopySchema>;

export const technologiesSchema = z.object({
  groups: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Group name is required").max(40),
        items: z.array(z.string().trim().min(1).max(40)).max(40),
      }),
    )
    .min(1, "Add at least one group")
    .max(8, "At most 8 groups"),
});
export type Technologies = z.infer<typeof technologiesSchema>;

export const focusSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1, "A label is required").max(40),
        detail: z.string().trim().min(1).max(160),
        /**
         * Renders the card in the "future / interest" style.
         *
         * This replaces a previous check of `label === "Technical interests"`,
         * which coupled presentation to content: retyping the label silently
         * restyled the card. Styling is now a field the owner controls.
         */
        accent: z.boolean().default(false),
      }),
    )
    .min(1, "Add at least one area")
    .max(8, "At most 8 areas"),
});
export type FocusAreas = z.infer<typeof focusSchema>;

/** The section keys that must be present in `siteCopy.sections`. */
export const SECTION_KEYS = ["about", "projects", "stack", "learning", "contact"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** Human labels for the section editor, so the UI never shows a raw key. */
export const SECTION_LABELS: Record<SectionKey, string> = {
  about: "About",
  projects: "Projects",
  stack: "Technology",
  learning: "Direction & skills",
  contact: "Contact",
};

/** Human labels for the site-copy tabs. */
export const COPY_TABS = [
  { key: "identity", label: "Identity" },
  { key: "hero", label: "Hero" },
  { key: "about", label: "About" },
  { key: "terminal", label: "Terminal card" },
  { key: "sections", label: "Section headings" },
] as const;

export type CopyTab = (typeof COPY_TABS)[number]["key"];
export const COPY_TAB_KEYS = COPY_TABS.map((tab) => tab.key);