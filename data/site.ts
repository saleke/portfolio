/**
 * The canonical origin used in metadata, structured data, robots.txt and the
 * sitemap. A stable production fallback is important here: Vercel preview and
 * project URLs must not become competing versions of the public site in search.
 */
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.NODE_ENV === "production" ? "https://saleke.is-a.dev" : "http://localhost:3000");

export const siteUrl = configuredSiteUrl.replace(/\/+$/, "");
