import { focusAreas } from "@/data/profile";
import { SectionHeading } from "@/components/SectionHeading";

export function CurrentlyLearning() { return <section className="section learning-section container" aria-labelledby="learning-title"><SectionHeading id="learning-title" index="04 / DIRECTION & SKILLS" title="Building with intent." intro="The current direction of my work, established skills, and technical interests." /><div className="learning-grid">{focusAreas.map((area, index) => <div className={`learning-item ${area.label === "Technical interests" ? "future" : ""}`} key={area.label}><span className="learning-number">0{index + 1}</span><div><h3>{area.label}</h3><p>{area.detail}</p></div></div>)}</div></section>; }
