# Portfolio Website — Complete Coding Agent Specification

## 1. Project Objective

Build a professional personal portfolio website for a software developer in training who is currently seeking internship opportunities.

The portfolio must communicate, within a few seconds:

1. Who the developer is.
2. What technologies they work with.
3. What they have actually built.
4. What areas of software engineering they are currently developing.
5. How to view their code and contact them.

The website must feel like the portfolio of a **serious engineer who is actively developing their expertise**, not a generic "developer portfolio" template.

The design should prioritize:

* Technical credibility
* Clarity
* Readability
* Strong project presentation
* Professionalism
* Performance
* Accessibility
* Responsive design

Do not optimize for visual novelty at the expense of useful information.

---

# 2. Technology Stack

## Core implementation stack

Use exactly the following technologies unless there is a strong technical reason otherwise:

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **Git**
* **GitHub**
* **Vercel**

Use the current stable versions available at implementation time.

Prefer Next.js App Router.

Use TypeScript throughout the application.

---

# 3. Infrastructure Decisions

The portfolio itself should remain intentionally simple.

### Database

**No database.**

Do not add PostgreSQL merely because PostgreSQL is one of the developer's technologies.

The portfolio does not currently require persistent application data.

Portfolio content such as projects and technologies should be stored in typed local data files.

---

### Backend

**No separate backend service initially.**

Do not create:

* Express server
* Go API
* FastAPI service
* Separate Node.js server
* Authentication system
* CMS
* Database API

unless a genuine future requirement is introduced.

Next.js should handle the application.

---

### Hosting

Use:

**Vercel**

Use the free/Hobby tier.

Do not use Cloudflare for this project.

The initial deployment should use the Vercel-provided domain:

```text
your-project.vercel.app
```

A custom domain can be added later but is not required.

---

### Source control

Use:

**GitHub**

The portfolio repository should be public.

The repository itself should contain a professional README.

---

# 4. Developer Technology Stack Displayed on the Website

The developer's public technology stack is:

```text
Go
Python
TypeScript
React
Next.js
PostgreSQL
```

These technologies should be displayed as part of the developer's technical profile.

However, the website must distinguish between:

### Technologies used to build the portfolio

```text
Next.js
React
TypeScript
Tailwind CSS
Vercel
```

and:

### Developer's broader technology stack

```text
Go
Python
TypeScript
React
Next.js
PostgreSQL
```

Do not imply that PostgreSQL is powering the portfolio.

---

# 5. Design Direction

Use a **minimal technical aesthetic**.

The visual identity should feel like:

> modern engineering documentation + software development workstation

rather than:

> flashy developer portfolio template.

### Design characteristics

Use:

* Dark-first interface
* Off-white/light text
* One primary accent color
* Strong typography
* Generous whitespace
* Thin borders
* Subtle background texture/grid where appropriate
* Monospace typography for technical elements
* Clean cards
* Restrained shadows
* Clear visual hierarchy

The site should feel sophisticated without being visually noisy.

---

# 6. Explicitly Avoid

Do NOT use:

* Excessive gradients
* Huge glowing text
* Floating blobs
* Excessive glassmorphism
* Stock programmer images
* Fake coding screenshots
* Excessive emojis
* Skill percentage bars
* Fake proficiency scores
* "90% Go" style metrics
* Excessive 3D effects
* Excessive animations
* Parallax everywhere
* Unnecessary carousels
* Generic motivational slogans
* Long autobiographical sections
* Fake testimonials
* Fake client logos
* Fake achievements
* Fabricated statistics
* Claims of expertise that are not supported

Avoid designs that look like a template immediately.

---

# 7. Animation Philosophy

Animation should be subtle and functional.

Use animation only where it improves:

* Navigation
* Section transitions
* Hover feedback
* Project interaction
* Visual hierarchy

Examples:

* Subtle hover movement
* Fade/slide entrance
* Navigation transition
* Button feedback

Do not animate every element.

Respect:

```text
prefers-reduced-motion
```

Users who request reduced motion should receive an appropriately reduced animation experience.

---

# 8. Global Information Architecture

The primary homepage structure should be:

```text
Navigation
    ↓
Hero
    ↓
About
    ↓
Selected Projects
    ↓
Technology Stack
    ↓
Currently Learning
    ↓
GitHub / Contact
    ↓
Footer
```

The homepage should remain relatively compact.

Do not create unnecessary sections.

---

# 9. Navigation

Create a clean responsive navigation bar.

Desktop:

```text
ASYNC                              About
                                   Projects
                                   Stack
                                   GitHub
                                   Contact
```

The developer identity/name appears on the left.

Navigation links should scroll to their respective sections where appropriate.

On mobile, collapse the navigation into an accessible mobile menu.

The navigation should remain easy to use without dominating the screen.

Do not create more navigation items than necessary.

---

# 10. Hero Section

The hero is the most important part of the homepage.

Primary heading:

```text
Software Developer
in Training
```

Supporting statement:

```text
I build software while developing a deeper understanding
of backend systems, networking, and computer science.
```

Display the developer's primary stack:

```text
Go · Python · TypeScript · React · Next.js · PostgreSQL
```

Primary actions:

```text
View Projects
GitHub
```

Also include an internship availability indicator:

```text
● Available for Internship
```

This should be visually noticeable but not distracting.

---

# 11. Hero Design

The hero should immediately communicate:

```text
Who am I?
What do I build?
What technologies do I use?
What am I looking for?
```

The visitor should understand the developer's identity within approximately five seconds.

Do not use generic copy such as:

```text
Hi, I'm Async 👋

I'm a passionate developer who loves building
innovative solutions.
```

The copy must be concrete.

---

# 12. Terminal-Inspired Element

Include one small terminal-inspired visual element.

Example:

```text
$ whoami

software-developer-in-training

$ focus

backend / systems / software engineering
```

This should reinforce the technical identity.

It must remain a visual accent.

Do not turn the entire website into a fake terminal emulator.

---

# 13. About Section

Create a concise About section.

Suggested content:

```text
I'm a software developer in training focused on building a
strong foundation in programming, backend engineering,
and computer systems.

My current work centers around Go, while I'm expanding
into Python and modern web development with TypeScript,
React, and Next.js.

I'm particularly interested in understanding how software
works beneath the abstractions—from HTTP and networking
to concurrency, operating systems, and backend architecture.
```

Keep the section concise.

Do not write an exaggerated personal biography.

Do not make claims that cannot be demonstrated through the developer's work.

---

# 14. Projects Section

Projects are the primary evidence of technical ability.

Give projects significant visual emphasis.

Heading:

```text
Selected Projects
```

Each project card should contain:

* Project name
* Short description
* Problem/solution context
* Technology tags
* GitHub link
* Live/demo link where available
* Optional status
* Optional featured indicator

Example:

```text
ASCII ART WEB

A web application for generating ASCII art from
user-provided text using configurable banner styles.

Go · HTML · CSS · HTTP

[ View Project ] [ GitHub ]
```

The project cards should be clean and information-dense.

Do not prioritize decoration over information.

---

# 15. Project Detail Pages

For substantial projects, support dedicated project pages.

A project page should be structured as:

```text
Project
├── Overview
├── Problem
├── Solution
├── Architecture
├── Technical Decisions
├── Features
├── Technologies
├── Screenshots / Demo
└── GitHub
```

The purpose of the project page is to demonstrate engineering thinking.

Explain:

* Why the project exists
* What problem it solves
* How it works
* Important architectural decisions
* Interesting technical challenges
* Technologies used
* What was learned

Do not simply provide screenshots.

---

# 16. Initial Project Candidates

The architecture must support projects such as:

## ASCII Art Web

Technologies:

```text
Go
HTML
CSS
HTTP
```

## School Platform / School OS

Potential technologies:

```text
Go
Next.js
TypeScript
PostgreSQL
```

These should only be presented as completed projects if they are actually implemented.

Do not fabricate features.

Do not fabricate project metrics.

Do not fabricate deployment status.

---

# 17. Project Data Architecture

Keep project content separate from presentation components.

Create a typed project model.

Example:

```ts
type Project = {
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  featured?: boolean;
  status?: "completed" | "in-progress";
};
```

Store project data in a dedicated data module such as:

```text
data/projects.ts
```

Components should consume this data rather than hardcoding project information throughout the UI.

This makes adding future projects straightforward.

---

# 18. Technology Stack Section

Do not use proficiency percentages.

Never create:

```text
Go        90%
Python    75%
React     70%
Next.js   60%
```

Instead organize technologies by category.

## Languages

```text
Go
Python
TypeScript
```

## Frontend

```text
React
Next.js
HTML
CSS
```

## Backend / Data

```text
Go HTTP
REST APIs
PostgreSQL
```

## Concepts

```text
Data Structures
Algorithms
HTTP
Networking
Concurrency
Operating Systems
```

Only display technologies that accurately represent the developer's experience.

---

# 19. Currently Learning Section

Create a section that honestly communicates current learning.

Example:

```text
CURRENTLY EXPLORING

Backend Engineering
Go · HTTP · APIs · Concurrency

Computer Systems
Networking · Operating Systems · Memory

Web Development
React · Next.js · PostgreSQL

Future Focus
Cybersecurity · AI / Machine Learning
```

Clearly distinguish:

* Existing skills
* Current learning
* Future specialization

Do not present future goals as current expertise.

---

# 20. GitHub Section

Create a simple GitHub call-to-action.

Example:

```text
OPEN SOURCE / CODE

Most of my work lives on GitHub.

[ Visit GitHub ]

@username
```

The GitHub profile link should be configurable from one central location.

Do not make the website dependent on the GitHub API.

If dynamic GitHub information is eventually added, the website must still function if GitHub's API is unavailable.

---

# 21. Contact Section

Keep contact simple.

Example:

```text
LET'S BUILD SOMETHING

I'm currently looking for internship opportunities
where I can contribute, learn, and grow as a software developer.

GitHub
LinkedIn
Email
```

Use direct links initially.

Do not build a database-backed contact form.

Do not add unnecessary authentication or messaging infrastructure.

---

# 22. Footer

Keep the footer minimal.

Include:

* Developer name
* GitHub
* LinkedIn if available
* Email if appropriate
* Current year

Do not clutter the footer.

---

# 23. Responsive Design

The site must be mobile-first.

Support:

* Mobile
* Tablet
* Laptop
* Large desktop

Pay particular attention to:

* Navigation
* Hero typography
* Project cards
* Technology tags
* Buttons
* Horizontal spacing
* Text line length
* Section spacing

Do not merely shrink the desktop layout.

Components must reflow naturally.

---

# 24. Accessibility

Implement proper accessibility.

Requirements:

* Semantic HTML
* Correct heading hierarchy
* Keyboard navigation
* Visible focus states
* Accessible buttons
* Accessible links
* Sufficient color contrast
* Descriptive link labels
* Alt text for meaningful images
* Reduced-motion support
* Proper mobile navigation semantics

Do not sacrifice accessibility for aesthetics.

---

# 25. Performance

The portfolio should be fast.

Prioritize:

* Next.js optimization
* Server Components by default
* Minimal client-side JavaScript
* Optimized images
* Proper font loading
* Lazy loading where useful
* Minimal dependencies
* Avoid unnecessary third-party scripts

Use `"use client"` only when client-side interactivity genuinely requires it.

Do not install a library when native React/Next.js functionality is sufficient.

---

# 26. SEO

Implement proper basic SEO.

Include:

* Page title
* Meta description
* Open Graph metadata
* Social sharing metadata
* Favicon
* Semantic headings
* Sitemap where appropriate
* Robots configuration

Example title:

```text
Async — Software Developer in Training
```

The metadata should accurately describe the developer and website.

Do not keyword-stuff the page.

---

# 27. Recommended Project Structure

Use a maintainable structure such as:

```text
portfolio/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   │
│   └── projects/
│       └── [slug]/
│           └── page.tsx
│
├── components/
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── TerminalCard.tsx
│   ├── About.tsx
│   ├── Projects.tsx
│   ├── ProjectCard.tsx
│   ├── TechStack.tsx
│   ├── CurrentlyLearning.tsx
│   ├── GitHub.tsx
│   ├── Contact.tsx
│   └── Footer.tsx
│
├── data/
│   ├── projects.ts
│   ├── technologies.ts
│   └── profile.ts
│
├── public/
│   ├── images/
│   └── ...
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── README.md
└── .gitignore
```

Adjust the structure if a simpler structure is technically better.

Do not over-engineer.

---

# 28. Configuration

Centralize personal information.

For example:

```ts
const profile = {
  name: "Async",
  title: "Software Developer in Training",
  github: "...",
  linkedin: "...",
  email: "...",
};
```

Do not scatter personal URLs throughout components.

Use environment variables only where secrets or deployment-specific configuration genuinely requires them.

Never hardcode secrets into the repository.

---

# 29. Security

Before making the GitHub repository public, ensure that the repository contains no:

* API keys
* Passwords
* Tokens
* Database credentials
* Private certificates
* `.env` files containing secrets
* Personal sensitive information

Use:

```text
.env.local
```

and appropriate `.gitignore` rules where environment configuration becomes necessary.

Never commit secrets.

---

# 30. GitHub Repository

The repository should be public and professionally organized.

Repository name should be simple, for example:

```text
portfolio
```

or:

```text
async-portfolio
```

The README should explain:

* What the project is
* Technologies used
* Development setup
* How to run locally
* How to build
* Deployment platform
* Project structure at a high level

Do not write an excessively long README.

---

# 31. Git Commit Practices

Use meaningful commits.

Examples:

```text
feat: build portfolio hero section
feat: add project showcase
feat: implement responsive navigation
feat: add project detail pages
style: refine typography and spacing
fix: correct mobile navigation behavior
perf: optimize project images
docs: update project README
```

Do not generate meaningless commits simply to create GitHub activity.

Do not manufacture a contribution graph.

---

# 32. Deployment Architecture

Use:

```text
Local Development
        ↓
       Git
        ↓
     GitHub
        ↓
     Vercel
        ↓
your-project.vercel.app
```

Vercel should be connected to the GitHub repository.

Every appropriate push to the production branch should trigger a deployment.

The application must build successfully in a clean production environment.

---

# 33. Deployment Requirements

The final project must:

1. Run locally.
2. Build successfully.
3. Pass linting.
4. Have no TypeScript errors.
5. Be pushed to GitHub.
6. Be connected to Vercel.
7. Deploy successfully on Vercel's free/Hobby tier.
8. Use the Vercel-provided domain initially.
9. Not require Cloudflare.
10. Not require paid infrastructure.

A custom domain is optional and should not be implemented as a requirement.

---

# 34. Local Development

The project should support the standard workflow:

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
npm run start
```

Use the package manager selected by the project and document the commands in the README.

---

# 35. Quality Assurance

Before declaring the project complete, verify all of the following.

## Functionality

* Navigation works.
* Mobile navigation works.
* Project links work.
* GitHub links work.
* External links open correctly.
* Project detail pages work.
* No broken routes exist.
* No console errors exist.

## TypeScript

* No TypeScript errors.
* No unnecessary `any` types.
* Data structures are properly typed.

## Responsive design

Test:

* Mobile
* Tablet
* Desktop
* Large desktop

## Accessibility

Test:

* Keyboard navigation
* Focus states
* Screen-size responsiveness
* Contrast
* Reduced motion

## Performance

Check:

* Image sizes
* Client JavaScript
* Unnecessary dependencies
* Loading behavior

## SEO

Verify:

* Title
* Description
* Open Graph
* Favicon
* Semantic headings
* Robots/sitemap where appropriate

## Deployment

Verify:

* Production build succeeds.
* Vercel deployment succeeds.
* Production URL loads correctly.
* All production links work.

---

# 36. Content Integrity

This rule is critical.

The portfolio must never fabricate:

* Work experience
* Internship experience
* Clients
* Projects
* Awards
* Certifications
* Statistics
* Users
* Revenue
* Performance metrics
* Professional expertise

If information is not available, use a placeholder or omit the section.

The portfolio must present the developer honestly as a **software developer in training**.

---

# 37. Design Philosophy

The final website should communicate:

```text
Serious
   ↓
Technical
   ↓
Curious
   ↓
Actively learning
   ↓
Actually building
```

It should NOT communicate:

```text
"I know everything."
```

The developer's current stage is part of the identity.

The goal is to demonstrate **trajectory, technical curiosity, and evidence of building**, not pretend to have reached senior-level expertise.

---

# 38. Priority Order

When making implementation decisions, follow this priority:

```text
1. Information architecture
2. Content clarity
3. Typography
4. Responsive layout
5. Project presentation
6. Accessibility
7. Performance
8. SEO
9. Visual polish
10. Animation
```

Never sacrifice the first eight priorities for visual effects.

---

# 39. Final Visual Target

The homepage should roughly communicate the following hierarchy:

```text
                         ASYNC

                  Software Developer
                      in Training

        I build software while developing a deeper
        understanding of backend systems, networking,
                   and computer science.

      Go · Python · TypeScript · React · Next.js · PostgreSQL

              [ View Projects ]   [ GitHub ]

                 ● Available for Internship


        ────────────────────────────────────────


                         ABOUT

        Building software and developing a deeper
        understanding of how systems work.


        ────────────────────────────────────────


                  SELECTED PROJECTS

        ┌──────────────────┐  ┌──────────────────┐
        │                  │  │                  │
        │   ASCII ART WEB  │  │   SCHOOL OS      │
        │                  │  │                  │
        │   Go · HTTP      │  │ Go · Next.js     │
        │                  │  │ PostgreSQL       │
        └──────────────────┘  └──────────────────┘


        ────────────────────────────────────────


                    TECHNOLOGY

        Go       Python       TypeScript
        React    Next.js      PostgreSQL


        ────────────────────────────────────────


                 CURRENTLY EXPLORING

        Backend · Systems · Web Development
        Cybersecurity · AI / Machine Learning


        ────────────────────────────────────────


                    LET'S BUILD

             GitHub · LinkedIn · Email
```

This is a conceptual layout, not a requirement to reproduce the exact ASCII arrangement.

The actual implementation should have excellent spacing, typography, responsiveness, and visual hierarchy.

---

# 40. Final Acceptance Criteria

The project is complete only when:

* [ ] Built with Next.js
* [ ] Built with React
* [ ] Written in TypeScript
* [ ] Styled with Tailwind CSS
* [ ] No unnecessary backend
* [ ] No database
* [ ] No Cloudflare
* [ ] Deployed on Vercel
* [ ] Deployable on Vercel's free/Hobby tier
* [ ] GitHub repository is public
* [ ] Professional README exists
* [ ] Hero clearly communicates developer identity
* [ ] Internship availability is visible
* [ ] About section exists
* [ ] Projects section exists
* [ ] Project detail structure is supported
* [ ] Technology stack exists
* [ ] Current learning section exists
* [ ] GitHub section exists
* [ ] Contact section exists
* [ ] Footer exists
* [ ] Responsive on mobile/tablet/desktop
* [ ] Accessible keyboard navigation
* [ ] Reduced-motion support
* [ ] SEO metadata implemented
* [ ] No fake proficiency percentages
* [ ] No fabricated achievements
* [ ] No fabricated project information
* [ ] No secrets committed
* [ ] No TypeScript errors
* [ ] Production build succeeds
* [ ] No broken links
* [ ] No unnecessary dependencies
* [ ] No excessive animations
* [ ] Visual design feels professional and technically oriented

The final result should look like the portfolio of a **serious developer who is still developing their expertise and can demonstrate that development through real projects**.
