import { profile } from "@/data/profile";

export function Footer() { return <footer className="site-footer"><div className="container footer-inner"><span>© {new Date().getFullYear()} {profile.name}</span><span>{profile.title}</span><a href={`mailto:${profile.email}`}>{profile.email}</a></div></footer>; }
