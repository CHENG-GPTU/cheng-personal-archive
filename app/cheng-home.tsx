"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HomeTarget } from "./learning-home";
import { portfolioProjects } from "./portfolio-content";
import { ProjectVisual } from "./portfolio-parts";
import PortfolioSiteNav from "./portfolio-site-nav";
import EyeResumeLink from "./eye-resume-link";
import ContactCard from "./contact-card";
import InteractiveBadge from "./interactive-badge";
import { useArchiveAbout } from "./archive-navigation";
import "./cheng-home.css";

const tools: { label: string; target: HomeTarget }[] = [
  { label: "AIPM 学习系统", target: "aipm" },
  { label: "作品集", target: "portfolio" },
  { label: "产品原型", target: "prototype" },
  { label: "项目验证", target: "validation" },
  { label: "健康记录", target: "fitness" },
  { label: "穿搭审美", target: "fashion" },
  { label: "自媒体", target: "media" },
  { label: "30 天验收", target: "milestone" },
];

type Props = { workOnly?: boolean; onNavigate?: (target: HomeTarget) => void };

export default function ChengHome({ workOnly = false, onNavigate }: Props) {
  const site = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const goAbout = useArchiveAbout();

  useEffect(() => {
    const root = site.current;
    if (!root || workOnly) return;
    const anchor = root.querySelector(".dossier-site-about");
    const navigation = root.querySelector(".dossier-site-nav");
    if (!anchor || !navigation) return;
    const align = () => {
      // The badge stays attached to the original header, not the floating dock.
      if (navigation.getAttribute('data-compact') === 'true') return;
      const position = anchor.getBoundingClientRect();
      const parent = root.getBoundingClientRect();
      root.style.setProperty("--badge-anchor-x", `${position.left + position.width / 2 - parent.left}px`);
      root.style.setProperty("--badge-anchor-y", `${position.bottom + 6 - parent.top}px`);
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(root);
    observer.observe(navigation);
    const dock = navigation.querySelector('.dossier-site-nav__dock');
    if (dock) observer.observe(dock);
    window.addEventListener("resize", align);
    let active = true;
    void document.fonts.ready.then(() => { if (active) align(); });
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("resize", align);
    };
  }, [workOnly]);

  useEffect(() => {
    const root = site.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let scrollFrame = 0;
    let moveFrame = 0;
    let trailIndex = 0;
    let lastX = -1000;
    let lastY = -1000;
    let lastTime = 0;
    const animations = new Map<Element, Animation>();

    function updateHeader() {
      const progress = workOnly ? 1 : Math.min(1, Math.max(0, window.scrollY / 320));
      root!.style.setProperty("--brand-scale", String(1 - progress * .79));
      root!.style.setProperty("--brand-top", `${76 - progress * 62}px`);
      scrollFrame = 0;
    }
    function onScroll() {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
    }
    function onPointerMove(event: PointerEvent) {
      if (!finePointer.matches || reduced.matches || motionPaused || event.pointerType !== "mouse") return;
      const bounds = hero.current?.getBoundingClientRect();
      if (!bounds) return;
      cancelAnimationFrame(moveFrame);
      moveFrame = requestAnimationFrame(() => {
        portrait.current?.style.setProperty("--portrait-x", `${(event.clientX / window.innerWidth - .5) * 50}px`);
        portrait.current?.style.setProperty("--portrait-y", `${(event.clientY / window.innerHeight - .5) * 50}px`);
      });
      if ((event.target as HTMLElement).closest("a, button, .cheng-portrait")) return;
      if (Math.hypot(event.clientX - lastX, event.clientY - lastY) < 105 || event.timeStamp - lastTime < 75) return;
      const stamp = trail.current?.children[trailIndex % portfolioProjects.length] as HTMLElement | undefined;
      if (!stamp) return;
      trailIndex++;
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = event.timeStamp;
      animations.get(stamp)?.cancel();
      stamp.style.left = `${event.clientX - bounds.left}px`;
      stamp.style.top = `${event.clientY - bounds.top}px`;
      stamp.style.zIndex = String(trailIndex);
      animations.set(stamp, stamp.animate([
        { opacity: 0, transform: "translate(-50%, -50%) scale(.5)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)", offset: .25 },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)", offset: .65 },
        { opacity: 0, transform: "translate(-50%, -50%) scale(1)" },
      ], { duration: 850, easing: "cubic-bezier(.2,.7,.2,1)", fill: "none" }));
    }
    function resetPointer() {
      portrait.current?.style.setProperty("--portrait-x", "0px");
      portrait.current?.style.setProperty("--portrait-y", "0px");
      lastX = -1000;
      lastY = -1000;
    }
    function onMotionPreference() {
      if (reduced.matches) {
        resetPointer();
        animations.forEach(animation => animation.cancel());
      }
    }
    function dismissMenu(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape" || !menu.current?.open) return;
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      } else if (menu.current?.open && !menu.current.contains(event.target as Node)) {
        menu.current.open = false;
      }
    }
    const heroElement = hero.current;
    updateHeader();
    resetPointer();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissMenu);
    reduced.addEventListener("change", onMotionPreference);
    heroElement?.addEventListener("pointermove", onPointerMove, { passive: true });
    heroElement?.addEventListener("pointerleave", resetPointer);
    return () => {
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(moveFrame);
      animations.forEach(animation => animation.cancel());
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissMenu);
      reduced.removeEventListener("change", onMotionPreference);
      heroElement?.removeEventListener("pointermove", onPointerMove);
      heroElement?.removeEventListener("pointerleave", resetPointer);
    };
  }, [workOnly, motionPaused]);

  return <div ref={site} id={workOnly ? undefined : "home"} className={`cheng-site${workOnly ? " cheng-site--work" : ""}`} data-motion-paused={motionPaused}>
    <a className="cheng-skip" href="#main-content">跳到主要内容</a>
    <div className="cheng-original-header"><PortfolioSiteNav active={workOnly ? "work" : "home"} /></div>
    {!workOnly && <div className="cheng-home-badge" role="button" tabIndex={0}
      aria-label="向下拉工牌打开 About；也可按回车"
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          goAbout();
        }
      }}>
      <InteractiveBadge onPullRelease={goAbout} />
    </div>}

    <main id="main-content">
      {!workOnly && <section ref={hero} className="cheng-hero" aria-label="CHENG 的个人首页">
        <h1 className="cheng-sr-only">CHENG — AI 产品探索与项目实践</h1>
        <span className="cheng-brand" aria-hidden="true">CHENG</span>
        <div className="cheng-trail" ref={trail} aria-hidden="true">{portfolioProjects.map(project => <div className="cheng-trail__stamp" key={project.slug}><div><ProjectVisual kind={project.visual} /></div></div>)}</div>
        <div ref={portrait} className="cheng-portrait">
          <div className="cheng-portrait__image" role="img" aria-label="CHENG 的黑白人像，保留墨镜、衣领与动态残影">
            <span className="cheng-portrait__frame cheng-portrait__frame--one" />
            <span className="cheng-portrait__frame cheng-portrait__frame--two" />
            <span className="cheng-portrait__frame cheng-portrait__frame--three" />
          </div>
          <button className="cheng-motion-toggle" type="button" onClick={() => setMotionPaused(value => !value)} aria-pressed={motionPaused} aria-label={motionPaused ? "播放人像与鼠标动效" : "暂停人像与鼠标动效"} title={motionPaused ? "播放动效" : "暂停动效"}>
            {motionPaused ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z" fill="currentColor" /></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="2" /></svg>}
          </button>
        </div>
        <p className="cheng-bio">我是 CHENG，正在转型 AI 产品。<br />从真实需求出发，把项目推进与跨部门协作的经验，变成可以体验、验证的产品实践。</p>
        <a className="cheng-button" href="#work">查看我的作品</a>
        {onNavigate && <details ref={menu} className="cheng-tools"><summary>功能入口</summary><nav className="cheng-tools__menu" aria-label="原有网站功能"><EyeResumeLink label="个人简历" compact />{tools.map(tool => <button key={tool.target} type="button" onClick={() => { if (menu.current) menu.current.open = false; onNavigate(tool.target); }}>{tool.label}</button>)}</nav></details>}
      </section>}

      <section className="cheng-work" id="work" aria-labelledby="cheng-work-title">
        <div className="cheng-work__heading">
          {workOnly ? <h1 id="cheng-work-title">各有灵感，各有模样。</h1> : <h2 id="cheng-work-title">各有灵感，各有模样。</h2>}
          <p>学习、训练、复盘，还有桌面上的陪伴。<br />五个项目，五种关于日常的探索。</p>
          {!workOnly && <Link className="cheng-button" href="/work">查看全部</Link>}
        </div>
        <div className="cheng-work__grid" id="projects">{portfolioProjects.map(project => <Link key={project.slug} className="cheng-project" href={project.href}>
          <div className="cheng-project__art"><ProjectVisual kind={project.visual} /><span className="cheng-project__open" aria-hidden="true">↗</span></div>
          <div className="cheng-project__title"><h3>{project.title}</h3><span>{project.category}</span></div>
          <p className="cheng-project__stage">{project.stage}</p>
        </Link>)}</div>
      </section>
      {!workOnly && <section className="contact-finale" id="contact" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="contact-sr">{"Let's talk about the next opportunity."}</h2>
        <div className="contact-finale__sentence">
          <span aria-hidden="true">{"Let's talk about"}</span>
          <div className="contact-finale__last-line"><span aria-hidden="true">the next</span><ContactCard word /><span className="contact-finale__period" aria-hidden="true">.</span></div>
        </div>
      </section>}
    </main>
    {workOnly && <footer className="cheng-footer"><span>© {new Date().getFullYear()} CHENG</span><span>持续学习，持续实践。</span><EyeResumeLink label="阅读简历" compact /></footer>}
  </div>;
}
