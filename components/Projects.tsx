import Link from "next/link";
import { projects } from "@/data/projects";
import { SectionHeading } from "@/components/SectionHeading";

export function Projects() {
  return <section className="section container" id="projects" aria-labelledby="projects-title"><SectionHeading id="projects-title" index="02 / SELECTED WORK" title="Projects with a point of view." intro="A growing record of things built to learn something real." /><div className="project-grid">{projects.map((project) => <article className="project-card" key={project.slug}><div className="project-card-top"><span className="project-eyebrow">{project.eyebrow}</span>{project.status ? <span className="project-status">{project.status === "in-progress" ? "In progress" : "Completed"}</span> : null}</div><h3>{project.title}</h3><p className="project-description">{project.description}</p><p className="project-context">{project.context}</p><div className="tag-list">{project.technologies.map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div><div className="card-actions"><Link href={`/projects/${project.slug}`}>View case study <span aria-hidden="true">↗</span></Link>{project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a> : null}</div></article>)}</div></section>;
}
