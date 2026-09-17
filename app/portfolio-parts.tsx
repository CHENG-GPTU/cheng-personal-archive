import Link from "next/link";
import { ArchiveMusicControl } from './archive-music';
import EyeResumeLink from "./eye-resume-link";
import ProjectCover from "./project-cover";
import type { PortfolioProject } from "./portfolio-content";

export function PortfolioNav({ home = false }: { home?: boolean }) {
  const base = home ? "" : "/";
  return <header className="folio-nav"><Link className="folio-brand" href="/" aria-label="陈俊呈，返回首页"><b>呈</b><span>陈俊呈<small>JUNCHENG CHEN</small></span></Link><nav aria-label="个人网站导航"><ArchiveMusicControl compact /><a href={`${base}#projects`}>作品</a><a href={`${base}#record`}>经历</a><a href={`${base}#chronicle`}>人生档案</a></nav><EyeResumeLink className="folio-nav__resume" label="阅读简历" /></header>;
}

export function ProjectVisual({ kind }: { kind: PortfolioProject["visual"] }) {
  return <ProjectCover kind={kind} />;
}

export function ProjectCard({ project }: { project: PortfolioProject }) {
  return <Link className="folio-project" href={project.href}><ProjectVisual kind={project.visual} /><div className="folio-project__meta"><span>{project.category}</span><span>{project.stage}</span></div><h3>{project.title}<span aria-hidden="true">↗</span></h3><p>{project.description}</p></Link>;
}

export function PortfolioFooter() {
  return <footer className="folio-footer"><div><strong>陈俊呈</strong><p>经历会继续，档案也会。</p></div><nav aria-label="页脚导航"><EyeResumeLink label="个人简历" compact /><Link href="/work">所有作品 ↗</Link><Link href="/#chronicle">人生档案 ↗</Link></nav><span>EST. 2026<br />持续更新，不预写结局。</span></footer>;
}
