import { SectionHeading } from "@/components/SectionHeading";
import { getFocusAreas, getSiteCopy } from "@/lib/content";

export async function CurrentlyLearning() {
  const [site, focus] = await Promise.all([getSiteCopy(), getFocusAreas()]);

  return (
    <section className="section learning-section container" aria-labelledby="learning-title">
      <SectionHeading
        id="learning-title"
        index={site.sections.learning.index}
        title={site.sections.learning.title}
        intro={site.sections.learning.intro}
      />

      <div className="learning-grid">
        {focus.items.map((area, index) => (
          <div className={`learning-item ${area.accent ? "future" : ""}`} key={area.label}>
            <span className="learning-number">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{area.label}</h3>
              <p>{area.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}