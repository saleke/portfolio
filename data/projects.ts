export type Project = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  context: string;
  technologies: string[];
  featured?: boolean;
  status?: "completed" | "in-progress";
  githubUrl?: string;
  liveUrl?: string;
  overview: string;
  problem: string;
  solution: string;
  architecture: string;
  decisions: string[];
  features: string[];
};

export const projects: Project[] = [
  {
    slug: "ascii-art-web",
    title: "ASCII Art Web",
    eyebrow: "PROJECT / 01",
    description: "A Go based web application for generating ASCII art from user provided text using configurable banner styles.",
    context: "A practical web project demonstrating Go HTTP handling, server-rendered pages, and a focused user workflow.",
    technologies: ["Go", "net/http", "HTML", "CSS"],
    featured: true,
    githubUrl: "https://github.com/saleke/ascii-art-web",
    overview: "ASCII Art Web turns user provided text into formatted ASCII art through a simple browser interface.",
    problem: "Generating ASCII art from banner styles is useful as a programming exercise, but a command-line workflow is not as approachable for every user.",
    solution: "The project exposes the generator through a small web application with a form, server-side processing, and rendered output.",
    architecture: "A Go HTTP server receives form submissions, applies the selected banner style, and returns HTML with the generated result.",
    decisions: [
      "Use Go's standard HTTP tooling to keep request handling explicit and easy to inspect.",
      "Keep the interface focused on text input, banner selection, and readable output.",
      "Separate generation logic from the page presentation so the core behavior stays testable.",
    ],
    features: ["Text to ASCII art generation", "Configurable banner styles", "Browser-based form workflow", "Server-rendered output"],
    status: "completed",
  },
  {
    slug: "portfolio",
    title: "Personal Portfolio",
    eyebrow: "CASE STUDY / 02",
    description: "A focused portfolio for presenting full stack web development work, technical interests, and current learning.",
    context: "Designed to make practical software work and technical direction easy to understand.",
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    featured: true,
    status: "in-progress",
    githubUrl: "https://github.com/saleke",
    overview: "This portfolio is a small, content-driven Next.js application that presents my full stack development direction and creates a home for future project case studies.",
    problem: "A developer in training needs a clear way to communicate what they are building and learning without relying on vague claims or a long biography.",
    solution: "The site uses a compact information architecture: a direct hero, honest project data, categorized technologies, and a clear path to code and contact.",
    architecture: "Next.js App Router with server-rendered sections, typed local data modules, and a small client-side navigation component for the mobile menu.",
    decisions: [
      "Keep portfolio content in typed data files so new projects do not require presentation rewrites.",
      "Use native links and CSS for interaction feedback to keep client-side JavaScript minimal.",
      "Treat current learning as a distinct category rather than presenting it as finished expertise.",
    ],
    features: ["Responsive single-page layout", "Project detail route", "Accessible mobile navigation", "SEO and social metadata"],
  },
  {
    slug: "school-website",
    title: "School Website",
    eyebrow: "PROJECT / 03",
    description: "A work in progress Next.js application for a school platform, with the product direction still taking shape.",
    context: "An early-stage repository focused on establishing the foundation for a school-focused web application.",
    technologies: ["Next.js", "React", "TypeScript"],
    status: "in-progress",
    githubUrl: "https://github.com/saleke/school-website",
    overview: "School Website is an early-stage Next.js application currently being developed as a school platform.",
    problem: "The project is establishing a clear foundation for a school-focused web experience before its full feature set is defined.",
    solution: "The repository currently provides the Next.js application foundation needed to develop and validate the product direction incrementally.",
    architecture: "A Next.js App Router project using React and TypeScript, with the application structure ready for future school platform features.",
    decisions: [
      "Keep the project in progress until its core workflows and content are implemented.",
      "Use Next.js, React, and TypeScript as the initial application foundation.",
      "Document the project honestly without presenting scaffolded work as completed functionality.",
    ],
    features: ["Next.js application foundation", "React interface foundation", "TypeScript project setup"],
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
