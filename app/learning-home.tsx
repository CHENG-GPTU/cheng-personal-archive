"use client";

import EyeResumeLink from './eye-resume-link';
import { useEffect, useRef, useState } from "react";
import { PortfolioFooter, PortfolioNav, ProjectCard } from "./portfolio-parts";
import { portfolioProjects } from "./portfolio-content";
import ResumeEnvelope from "./resume-envelope";
import StoryScroll from "./story-scroll";
import SideRaysBackground from "./side-rays-background";
import "./portfolio.css";
import "./story-scroll.css";
import "./archive-cinematic.css";
import "./archive-sealed.css";
import "./archive-discovery.css";
import "./story-editorial.css";

export type HomeTarget = "aipm" | "portfolio" | "prototype" | "validation" | "fitness" | "fashion" | "media" | "milestone";
type LearningHomeProps = { awakened: boolean; selectedDay: number; phase: string; title: string; outcome: string; onNavigate: (target: HomeTarget) => void; onAwaken: () => void };

const archiveLinks: { target: HomeTarget; label: string; meta: string }[] = [
  { target: "aipm", label: "AIPM 学习系统", meta: "进入学习与练习" }, { target: "portfolio", label: "作品集档案", meta: "项目过程与贡献" },
  { target: "prototype", label: "产品原型", meta: "流程与交互方案" }, { target: "validation", label: "项目验证", meta: "计划与里程碑" },
  { target: "fitness", label: "健康案例", meta: "训练与饮食记录" }, { target: "fashion", label: "穿搭审美", meta: "个人视觉档案" },
  { target: "media", label: "自媒体实验", meta: "预留，暂未开展" }, { target: "milestone", label: "30 天验收", meta: "求职准备与模拟面试" },
];


export default function LearningHome({ awakened, onNavigate, onAwaken }: LearningHomeProps) {
  const [replay, setReplay] = useState(false);
  const [arrival, setArrival] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const showingCover = !awakened || replay;
  useEffect(() => {
    if (!arrival || showingCover) return;
    const timer = window.setTimeout(() => setArrival(false), 650);
    return () => window.clearTimeout(timer);
  }, [arrival, showingCover]);
  useEffect(() => {
    // Explicit deep links bypass the packaging; a plain home visit shows it.
    if (!awakened && ["#identity", "#projects", "#record", "#chronicle"].includes(window.location.hash)) onAwaken();
  }, [awakened, onAwaken]);
  useEffect(() => {
    if (showingCover) return;
    mainRef.current?.focus({ preventScroll: true });
    const hash = window.location.hash;
    if (["#identity", "#projects", "#record", "#chronicle"].includes(hash)) {
      const frame = window.requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ block: "start", behavior: "instant" }));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [showingCover]);

  if (showingCover) return <div className="folio folio--envelope"><ResumeEnvelope onComplete={(animated = false) => { setReplay(false); setArrival(animated); onAwaken(); }} /></div>;

  return <div className="folio folio--story">
    <SideRaysBackground />
    {arrival ? <div className="archive-paper-arrival" aria-hidden="true" /> : null}
    <a className="folio-skip" href="#identity">跳到主要内容</a>
    <PortfolioNav home />
    <div className="folio-width story-reopen-row"><button className="story-reopen" type="button" onClick={() => setReplay(true)}>← 重新查看简历封套</button></div>
    <main ref={mainRef} tabIndex={-1} aria-label="陈俊呈的故事与作品">
      <StoryScroll />
      <section className="folio-section folio-width" id="projects"><header className="folio-section-head"><div><p className="folio-kicker">01 / SELECTED WORK</p><h2>在做的事，留下的作品。</h2></div><a className="folio-text-link" href="/work">查看项目目录 ↗</a></header><div className="folio-project-grid">{portfolioProjects.map(project => <ProjectCard key={project.slug} project={project} />)}</div><p className="folio-boundary">由我提出需求、参与取舍和体验反馈，AI 辅助文档与代码。项目按真实进展标记，未验证的效果不写作成果。</p></section>

      <section className="folio-experience" id="record"><div className="folio-width folio-experience__grid"><header><p className="folio-kicker">02 / EXPERIENCE</p><h2>带着过去的经验，<br />走向下一站。</h2><p>从协调人和事，走向理解问题、设计方案与验证价值。转型不是抹去过去，而是找到可以带走的能力。</p><EyeResumeLink label="阅读完整履历" compact /></header><div className="folio-records"><article><div><span>约一年半</span><span>工作经历</span></div><h3>院长助理</h3><p>在口腔机构承担跨部门协调、任务推进与咨询协作；期间参与代理院长事务、董事长支持和咨询师支持。</p><ul><li>拆解匿名退费任务，协调多个部门逐项处理，在一天内完成并获得顾客认可。</li><li>依据医生的检查结论，了解顾客需求与价格顾虑，进行针对性解释与咨询协作。</li></ul></article><article><div><span>2025 年毕业</span><span>教育与认证</span></div><h3>大连工业大学 · 表演专业</h3><p>本科。已取得 PMP（项目管理专业人士认证）。在校期间有时装周、服装设计与成衣实践，以及个人内容与商业尝试。</p></article><p className="folio-records__note">目前没有正式互联网或 AI 产品岗位经验。这里展示的是可迁移经验，以及正在建立的产品实践。</p></div></div></section>


      <section className="folio-width folio-workbench"><details><summary><div><p className="folio-kicker">PERSONAL WORKSPACE</p><h2>回到我的工作台</h2><p>学习、实践和日常记录的入口。对外作品与个人使用空间分开呈现。</p></div><span aria-hidden="true">+</span></summary><p className="folio-workbench__note">学习系统仍使用原有访问验证；健康与上传模块沿用原有设备存储方式。此目录不是新的隐私权限系统，请勿在共享设备录入敏感信息。</p><div className="folio-tools">{archiveLinks.map((item, index) => <button key={item.target} type="button" onClick={() => onNavigate(item.target)}><small>{String(index + 1).padStart(2, "0")} / {item.meta}</small><strong>{item.label}<span>↗</span></strong></button>)}</div></details></section>

    </main>
    <PortfolioFooter />
  </div>;
}
