import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getProject, projects } from "@/data/projects";

export function generateStaticParams() { return projects.map(({ slug }) => ({ slug })); }

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => { const project = getProject(slug); return { title: project ? `${project.title} | Solomon Aleke` : "Project | Solomon Aleke", description: project?.description }; });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return <><Navbar /><main className="project-detail container"><Link className="back-link" href="/#projects">← Back to portfolio</Link><header className="detail-header"><p className="project-eyebrow">{project.eyebrow}</p><h1>{project.title}</h1><p>{project.description}</p><div className="tag-list">{project.technologies.map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div></header><div className="detail-layout"><article className="detail-content"><section><p className="detail-label">01 / OVERVIEW</p><p>{project.overview}</p></section><section><p className="detail-label">02 / PROBLEM</p><p>{project.problem}</p></section><section><p className="detail-label">03 / SOLUTION</p><p>{project.solution}</p></section><section><p className="detail-label">04 / ARCHITECTURE</p><p>{project.architecture}</p></section><section><p className="detail-label">05 / TECHNICAL DECISIONS</p><ul>{project.decisions.map((decision) => <li key={decision}>{decision}</li>)}</ul></section><section><p className="detail-label">06 / FEATURES</p><ul>{project.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></section></article><aside className="detail-aside"><div className="aside-rule" /><p>STATUS</p><strong>{project.status === "in-progress" ? "In progress" : "Completed"}</strong>{project.githubUrl ? <a className="button button-primary" href={project.githubUrl} target="_blank" rel="noreferrer">View on GitHub <span aria-hidden="true">↗</span></a> : null}</aside></div></main><Footer /></>;
}
