import { SectionHeading } from "@/components/SectionHeading";
import { getSiteCopy } from "@/lib/content";

export async function About() {
  const site = await getSiteCopy();
  const { about, sections } = site;

  return (
    <section className="section container" id="about" aria-labelledby="about-title">
      <SectionHeading
        id="about-title"
        index={sections.about.index}
        title={sections.about.title}
        intro={sections.about.intro}
      />

      <div className="about-grid">
        <p className="about-lede">{about.lede}</p>
        <div className="about-copy">
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}