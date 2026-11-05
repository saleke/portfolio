import type { MetadataRoute } from "next";
import { getProjects } from "@/lib/projects";
import { searchProfileImagePath, siteUrl } from "@/data/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects();

  return [
    {
      url: siteUrl,
      changeFrequency: "monthly",
      priority: 1,
      images: [new URL(searchProfileImagePath, siteUrl).toString()],
    },
    ...projects.map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
