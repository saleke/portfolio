import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/data/site";
import { getSiteCopy } from "@/lib/content";

/**
 * Root metadata is generated from content rather than hardcoded, so changing the
 * name, title or meta description in the admin updates the browser tab, the
 * search snippet and the social card together.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteCopy();
  const fullTitle = `${site.name} | ${site.title}`;

  return {
    metadataBase: new URL(siteUrl),
    title: fullTitle,
    description: site.seoDescription,
    openGraph: {
      title: fullTitle,
      description: site.seoDescription,
      type: "website",
      images: [
        {
          url: site.profileImage,
          width: 1024,
          height: 1024,
          alt: `Portrait of ${site.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: site.seoDescription,
    },
    icons: { icon: site.profileImage },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}