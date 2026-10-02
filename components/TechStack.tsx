import { SectionHeading } from "@/components/SectionHeading";
import { getSiteCopy, getTechnologies } from "@/lib/content";

export async function TechStack() {
  // Both reads are cached, so this costs one file read per document per build.
  const [site, technologies] = await Promise.all([getSiteCopy(), getTechnologies()]);

  return (
    <section className="section container" id="stack" aria-labelledby="stack-title">
      <SectionHeading
        id="stack-title"
        index={site.sections.stack.index}
        title={site.sections.stack.title}
        intro={site.sections.stack.intro}
      />

      <div className="tech-grid">
        {technologies.groups.map((group) => (
          <div className="tech-group" key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}