import { SectionHeading } from "@/components/SectionHeading";

export function About() {
  return <section className="section container" id="about" aria-labelledby="about-title"><SectionHeading id="about-title" index="01 / ABOUT" title="Building across the stack." intro="Implementation is how I turn concepts into working software." /><div className="about-grid"><p className="about-lede">I learn by turning concepts into working software, moving between interfaces, application logic, data, and the systems that support them.</p><div className="about-copy"><p>My technical interests include web development, networking, cybersecurity, and artificial intelligence.</p><p>I learn primarily through implementation, building projects that strengthen my understanding of the technologies I use.</p></div></div></section>;
}
