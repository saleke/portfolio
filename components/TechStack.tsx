import { technologyGroups } from "@/data/technologies";
import { SectionHeading } from "@/components/SectionHeading";

export function TechStack() { return <section className="section container" id="stack" aria-labelledby="stack-title"><SectionHeading id="stack-title" index="03 / TECHNOLOGY" title="Tools I use, concepts I study." intro="No percentage bars. Just the technologies and ideas currently shaping my work." /><div className="tech-grid">{technologyGroups.map((group) => <div className="tech-group" key={group.title}><h3>{group.title}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></section>; }
