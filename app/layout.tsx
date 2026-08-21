import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/data/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Solomon Aleke | Software Developer in Training",
  description: "The portfolio of Solomon Aleke, a software developer in training focused on full stack web development, software engineering, and networking.",
  openGraph: {
    title: "Solomon Aleke | Software Developer in Training",
    description: "Building full stack web applications while developing deeper expertise in software engineering and networking.",
    type: "website",
    images: [{ url: "/images/solomon-aleke.png", width: 1024, height: 1024, alt: "Portrait of Solomon Aleke" }],
  },
  twitter: { card: "summary_large_image", title: "Solomon Aleke | Software Developer in Training", description: "Full stack web development, software engineering, and networking." },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
