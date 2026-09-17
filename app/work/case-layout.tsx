import Link from "next/link";
import { portfolioProjects } from "../portfolio-content";
import { PortfolioFooter, PortfolioNav, ProjectVisual } from "../portfolio-parts";
import { caseContents } from "./case-content";
import "../portfolio.css";

export default function PortfolioCase({ slug }: { slug: string }) {
  const project = portfolioProjects.find(item => item.slug === slug);
  const content = caseContents[slug];
  if (!project || !content) throw new Error(`Unknown portfolio case: ${slug}`);
  const index = portfolioProjects.indexOf(project);
  const next = portfolioProjects[(index + 1) % portfolioProjects.length];
  return <div className="folio"><PortfolioNav /><main className="folio-width folio-case"><header className="folio-page-head"><p className="folio-kicker">CASE {String(index + 1).padStart(2, "0")} / {project.category}</p><h1>{content.headline.split("\n").map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1><p>{content.intro}</p><div className="folio-case__meta"><span>{project.title}</span><span>{project.stage}</span><span>本人需求与决策 / AI 辅助制作</span></div>{content.action && <Link className="folio-button folio-button--dark" href={content.action.href}>{content.action.label}</Link>}</header><ProjectVisual kind={project.visual} /><aside className="folio-case__note">{content.evidence}</aside>{content.sections.map(section => <section className="folio-case__section" key={section.title}><h2>{section.title}</h2>{section.body && <p>{section.body}</p>}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}<div className="folio-actions"><Link className="folio-button" href="/work">← 所有作品</Link><Link className="folio-button" href={next.href}>下一个：{next.title} ↗</Link></div></main><PortfolioFooter /></div>;
}
