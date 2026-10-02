import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects";
import { ProjectForm } from "../../ProjectForm";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  return { title: project ? `Edit ${project.title} | Admin` : "Edit project | Admin" };
}

/** Edit form for an existing project. */
export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  return <ProjectForm project={project} />;
}