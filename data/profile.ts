/**
 * Contact channels, sourced from the environment.
 *
 * The split with `content/site.json` is deliberate:
 *
 * - **Files** hold content. Identity, copy and project data are committed,
 *   versioned and reviewable through the admin control plane.
 * - **Environment variables** hold configuration that should not live in a
 *   public repository. A phone number and a personal address are exactly that,
 *   and unlike a heading they are not something you want in `git log` forever.
 *
 * Every field is optional. A missing or malformed value becomes `undefined`
 * rather than an empty string, which is what lets `contactLinks` omit a channel
 * entirely instead of rendering a dead `mailto:` or `tel:` link.
 */

/**
 * Reads an optional URL from the environment.
 *
 * The URL constructor is used as the validator rather than a regex, so only
 * values that actually parse are accepted. The protocol check matters: without
 * it a misconfigured variable could inject a `javascript:` URL into an href.
 */
function readUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Reads an optional plain-text value, returning undefined when blank. */
function readText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const contact = {
  email: readText(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  phone: readText(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  githubUrl: readUrl(process.env.NEXT_PUBLIC_CONTACT_GITHUB_URL),
  linkedinUrl: readUrl(process.env.NEXT_PUBLIC_CONTACT_LINKEDIN_URL),
} as const;

/**
 * Names of the contact variables, with whether each is configured.
 *
 * The settings page renders this so the owner can see at a glance what is
 * missing, without having to open the Vercel dashboard and cross-reference the
 * README.
 */
export const contactVariables = [
  { name: "NEXT_PUBLIC_CONTACT_EMAIL", configured: Boolean(contact.email) },
  { name: "NEXT_PUBLIC_CONTACT_PHONE", configured: Boolean(contact.phone) },
  { name: "NEXT_PUBLIC_CONTACT_GITHUB_URL", configured: Boolean(contact.githubUrl) },
  { name: "NEXT_PUBLIC_CONTACT_LINKEDIN_URL", configured: Boolean(contact.linkedinUrl) },
] as const;

export type ContactChannel = {
  /** Short uppercase label shown in the left column. */
  label: string;
  /** Human-readable value. */
  display: string;
  /** Either a `mailto:`, a `tel:`, or the raw external URL. */
  href: string;
  /** External links open in a new tab and must not leak the referrer. */
  external: boolean;
};

/**
 * The contact channels that are actually configured.
 *
 * Derived rather than hand-written, which makes a row with a missing value
 * impossible to construct. The homepage, the navbar and the footer all read
 * this, so a channel cannot be enabled in one place and forgotten in another.
 *
 * `handle` is passed in because GitHub and LinkedIn are displayed as
 * `@handle` using the owner's code name, which lives in `content/site.json`.
 */
export function buildContactLinks(handle: string): ContactChannel[] {
  return [
    contact.email
      ? { label: "Email", display: contact.email, href: `mailto:${contact.email}`, external: false }
      : null,
    contact.phone
      ? {
          label: "Phone",
          display: contact.phone,
          // Keep only dialling characters, so a formatted number such as
          // "+234 (0)913 141 8159" still produces a valid `tel:` URI.
          href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
          external: false,
        }
      : null,
    contact.githubUrl
      ? { label: "GitHub", display: `@${handle}`, href: contact.githubUrl, external: true }
      : null,
    contact.linkedinUrl
      ? { label: "LinkedIn", display: `@${handle}`, href: contact.linkedinUrl, external: true }
      : null,
  ].filter((link): link is ContactChannel => link !== null);
}