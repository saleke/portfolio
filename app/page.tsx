import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Projects } from "@/components/Projects";
import { TechStack } from "@/components/TechStack";
import { CurrentlyLearning } from "@/components/CurrentlyLearning";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { getSiteCopy } from "@/lib/content";
import { contact } from "@/data/profile";
import { searchProfileImagePath, siteUrl } from "@/data/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Homepage composition.
 *
 * Reads the owner's name so the navbar brand can be rendered from content. The
 * read is cached, so this adds no extra file access beyond what the sections
 * below already perform.
 */
export default async function Home() {
  const site = await getSiteCopy();
  const sameAs = [contact.githubUrl, contact.linkedinUrl].filter(
    (url): url is string => Boolean(url),
  );
  const profileImage = new URL(searchProfileImagePath, siteUrl).toString();
  const profileImageId = `${siteUrl}/#profile-image`;
  const nameParts = site.name.split(/\s+/);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: site.codeName,
        alternateName: [`${site.name} Portfolio`, site.name, `@${site.codeName}`],
        description: site.seoDescription,
        inLanguage: "en",
      },
      {
        "@type": "ProfilePage",
        "@id": `${siteUrl}/#profile-page`,
        url: siteUrl,
        name: `${site.codeName} | ${site.name} — Software Developer Portfolio`,
        description: site.seoDescription,
        inLanguage: "en",
        isPartOf: { "@id": `${siteUrl}/#website` },
        mainEntity: { "@id": `${siteUrl}/#person` },
        primaryImageOfPage: { "@id": profileImageId },
        thumbnailUrl: profileImage,
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#person`,
        name: site.name,
        givenName: nameParts[0],
        familyName: nameParts.at(-1),
        additionalName: site.codeName,
        identifier: `@${site.codeName}`,
        alternateName: ["Aleke Solomon", site.codeName, `@${site.codeName}`],
        url: siteUrl,
        image: {
          "@type": "ImageObject",
          "@id": profileImageId,
          url: profileImage,
          contentUrl: profileImage,
          width: 1086,
          height: 1086,
          caption: `${site.name} (${site.codeName})`,
        },
        jobTitle: site.title,
        description: site.seoDescription,
        knowsAbout: [
          "Full stack web development",
          "Software engineering",
          "Go",
          "Python",
          "TypeScript",
          "React",
          "Next.js",
          "PostgreSQL",
          "Networking",
          "Cybersecurity",
          "Artificial intelligence",
        ],
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar name={site.name} />
      <main id="main-content">
        <Hero />
        <About />
        <Projects />
        <TechStack />
        <CurrentlyLearning />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
