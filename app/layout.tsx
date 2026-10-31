import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  const fullTitle = `${site.name} (${site.codeName}) | ${site.title}`;

  return {
    metadataBase: new URL(siteUrl),
    title: fullTitle,
    description: site.seoDescription,
    applicationName: `${site.name} Portfolio`,
    authors: [{ name: site.name, url: siteUrl }],
    creator: site.name,
    publisher: site.name,
    category: "technology",
    keywords: [
      site.name,
      "Aleke Solomon",
      site.codeName,
      "software developer",
      "full stack developer",
      "web developer",
    ],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification: {
      // The public verification file remains available as a second method.
      google: "bbnoU8kPPVpSabD3U3ubDlgmIsUUcX27GDoo_0TITUg",
    },
    openGraph: {
      title: fullTitle,
      description: site.seoDescription,
      type: "website",
      url: siteUrl,
      siteName: `${site.name} Portfolio`,
      locale: "en_US",
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
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
      apple: site.profileImage,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
