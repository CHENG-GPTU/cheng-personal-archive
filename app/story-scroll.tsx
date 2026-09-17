"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ProjectVisual } from "./portfolio-parts";
import { storyChapters } from "./story-scroll-data";
import { chapterAtProgress, chapterMotion, clampProgress, progressForChapter } from "./story-motion";
import InkSurface from "./ink-surface";

export default function StoryScroll() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const pinnedRef = useRef(false);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const chapter = storyChapters[active];
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const desktop = window.matchMedia("(min-width: 761px) and (min-height: 640px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      pinnedRef.current = desktop.matches && !reduced.matches;
      if (!pinnedRef.current) { root.style.setProperty("--scene-offset", "0px"); return; }
      const travel = Math.max(1, root.offsetHeight - (window.innerHeight - 106));
      const progress = clampProgress((106 - root.getBoundingClientRect().top) / travel);
      root.style.setProperty("--scene-progress", String(progress));
      root.style.setProperty("--scene-offset", `${chapterMotion(progress, storyChapters.length).offset}px`);
      root.style.setProperty("--ink-pan", `${progress * -55}px`);
      setActive(chapterAtProgress(progress, storyChapters.length));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    schedule();
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); reduced.removeEventListener("change", schedule); };
  }, []);
  function select(index: number, focus = false) {
    const next = Math.max(0, Math.min(storyChapters.length - 1, index));
    setActive(next);
    const root = rootRef.current;
    if (root && pinnedRef.current) {
      const travel = Math.max(1, root.offsetHeight - (window.innerHeight - 106));
      // Native scrolling remains reversible; clicking selects the matching scroll position.
      window.scrollTo({ top: window.scrollY + root.getBoundingClientRect().top - 106 + travel * progressForChapter(next, storyChapters.length), behavior: "instant" });
    }
    const tab = tabsRef.current[next];
    const viewport = trackRef.current;
    if (tab && viewport) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      viewport.scrollTo({ left: tab.offsetLeft + tab.offsetWidth / 2 - viewport.clientWidth / 2, behavior: reduced ? "instant" : "smooth" });
      if (focus) tab.focus({ preventScroll: true });
    }
  }
  function keySelect(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: storyChapters.length - 1 };
    if (event.key in keys) { event.preventDefault(); select(keys[event.key], true); }
  }
  return <section className="story-scroll story-scroll--mounted story-scroll--editorial" ref={rootRef} id="identity" data-scene={chapter.kind} data-chapter={chapter.id} aria-label="交互式人生画卷">
    <div className="story-scroll__sticky">
    <div className="story-scroll__heading"><span>陈俊呈的人生画卷</span><span>阅至 {String(active + 1).padStart(2, "0")} / {String(storyChapters.length).padStart(2, "0")}</span><a href="#projects">直接看作品 ↓</a></div>
    <div className="mounted-scroll">
    <span className="story-scroll__folio-number" aria-hidden="true">{String(active + 1).padStart(2, "0")}</span>
    <div className="mounted-scroll__object" aria-hidden="true"><Image src="/images/life-mounted-scroll-v1.png" alt="" fill priority sizes="100vw" /></div>
    <div className="mounted-scroll__rod mounted-scroll__rod--left" aria-hidden="true"><Image src="/images/life-mounted-scroll-v1.png" alt="" fill sizes="100vw" /></div>
    <div className="mounted-scroll__rod mounted-scroll__rod--right" aria-hidden="true"><Image src="/images/life-mounted-scroll-v1.png" alt="" fill sizes="100vw" /></div>
    <InkSurface />
    <div className="story-stage" id="story-panel" role="tabpanel" aria-labelledby={`story-tab-${chapter.id}`} tabIndex={0}>
      <div className="story-stage__reveal" key={chapter.id}>
        <div className="story-stage__copy"><p className="story-stage__era">{chapter.era}<span>{chapter.status}</span></p><h1>{chapter.title}</h1><p className="story-stage__lead">{chapter.text}</p><details className="story-stage__notes"><summary>阅读这一页的记录 +</summary><p className="story-stage__detail">{chapter.detail}</p></details><ul className="story-stage__tags">{chapter.tags.map(tag => <li key={tag}>{tag}</li>)}</ul><a className="story-stage__action" href={chapter.href}>{chapter.action}<span>↗</span></a></div>
        <div className={`story-stage__visual story-stage__visual--${chapter.kind}`}>
          {chapter.kind === "portrait" ? <figure className="story-stage__portrait"><Image src="/images/cheng-portrait-silver-v1.jpg" alt="陈俊呈的原色个人肖像" fill priority sizes="(max-width: 760px) 85vw, 36vw" /><figcaption>此刻的我 / 2026</figcaption></figure>
            : chapter.kind === "experience" ? <div className="story-experience"><p>一段经历，留下什么。</p><h2>{chapter.id === "exploration" ? "表达" : "推进"}</h2>{(chapter.id === "exploration" ? [["学习", "大连工业大学 · 表演本科"], ["实践", "时装周 / 服装设计与成衣"], ["尝试", "TikTok / 小红书 / 私域"]] : [["角色", "院长助理 · 职责逐步变化"], ["能力", "协调 / 沟通 / 任务推进"], ["证书", "PMP 项目管理认证"]]).map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}<small>本人经历自述 · 不等于互联网岗位经验</small></div>
              : <ProjectVisual kind={chapter.kind} />}
        </div>
      </div>
    </div>
    </div>

    <div className="story-map" id="chronicle" style={{ "--story-position": active / (storyChapters.length - 1) } as CSSProperties}><div className="story-map__top"><div><span>沿卷阅览</span><p>滚动翻阅，也可点击节点直达。</p></div><div className="story-map__arrows"><button type="button" onClick={() => select(active - 1)} disabled={active === 0} aria-label="上一段经历">←</button><button type="button" onClick={() => select(active + 1)} disabled={active === storyChapters.length - 1} aria-label="下一段经历">→</button></div></div>
      <div className="story-map__viewport" ref={trackRef}><div className="story-map__landscape"><div className="story-map__ink" aria-hidden="true" /><div className="story-map__nodes" role="tablist" aria-label="选择人生阶段与项目" aria-orientation="horizontal">{storyChapters.map((item, index) => <button key={item.id} id={`story-tab-${item.id}`} ref={element => { tabsRef.current[index] = element; }} className={`story-map__node${active === index ? " is-active" : ""}${index < active ? " is-read" : ""}`} type="button" role="tab" aria-selected={active === index} aria-controls="story-panel" tabIndex={active === index ? 0 : -1} onClick={() => select(index)} onKeyDown={event => keySelect(event, index)}><span className="story-map__date">{item.era}</span><span className="story-map__dot" aria-hidden="true" /><strong>{item.label}</strong><span className="story-map__node-kind">{index < 3 ? "经历" : "作品与记录"}</span></button>)}</div></div></div>
      <div className="story-map__scrubber"><label htmlFor="story-position">画卷位置</label><input id="story-position" type="range" min={0} max={storyChapters.length - 1} step={1} value={active} onChange={event => select(Number(event.target.value))} aria-valuetext={`${chapter.label}，第 ${active + 1} 段，共 ${storyChapters.length} 段`} /><span aria-live="polite" aria-atomic="true">{chapter.label}</span></div>
    </div>
    </div>
  </section>;
}
