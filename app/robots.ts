import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin area carries a password prompt and has no business in a
        // search index.
        disallow: "/admin",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}