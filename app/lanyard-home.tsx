"use client";

import Image from 'next/image';
import EyeResumeLink from './eye-resume-link';
import { useEffect, useRef } from 'react';
import { useArchiveAbout } from './archive-navigation';
import SideRaysBackground from './side-rays-background';
import InteractiveBadge from './interactive-badge';
import PortfolioSiteNav from './portfolio-site-nav';
import ContactCard from './contact-card';
import type { HomeTarget } from './learning-home';
import './lanyard-home.css';

const moduleLinks: { target: HomeTarget; label: string }[] = [
  { target: 'aipm', label: 'AIPM 学习系统' },
  { target: 'portfolio', label: '作品集' },
  { target: 'prototype', label: '产品原型' },
  { target: 'validation', label: '项目验证' },
  { target: 'fitness', label: '健康记录' },
  { target: 'fashion', label: '穿搭审美' },
  { target: 'milestone', label: '30 天验收' },
  { target: 'media', label: '自媒体' },
];

export default function LanyardHome({ onNavigate }: { onNavigate: (target: HomeTarget) => void }) {
  const hero = useRef<HTMLDivElement>(null);
  const goAbout = useArchiveAbout();
  useEffect(() => {
    if (!hero.current) return;
    const root = hero.current;
    const anchor = root.querySelector('.dossier-site-about');
    if (!anchor) return;
    const align = () => {
      if (root.querySelector('.dossier-site-nav')?.getAttribute('data-compact') === 'true') return;
      const rect = anchor.getBoundingClientRect();
      const parent = root.getBoundingClientRect();
      root.style.setProperty('--badge-anchor-x', `${rect.left + rect.width / 2 - parent.left}px`);
      root.style.setProperty('--badge-anchor-y', `${rect.bottom + 6 - parent.top}px`);
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(root);
    observer.observe(root.querySelector('.dossier-site-nav')!);
    const dock = root.querySelector('.dossier-site-nav__dock');
    if (dock) observer.observe(dock);
    window.addEventListener('resize', align);
    let active = true;
    document.fonts.ready.then(() => { if (active) align(); });
    return () => { active = false; observer.disconnect(); window.removeEventListener('resize', align); };
  }, []);
  return <main className="lanyard-home" aria-label="陈俊呈的互动工牌首页">
    <h1 className="lanyard-home__sr">陈俊呈 · 个人档案</h1>
    <div ref={hero} className="lanyard-home__hero">
    <SideRaysBackground />
    <div className="lanyard-home__portrait">
      <Image
        src="/images/home-portrait-echo-source-v1.png"
        alt="佩戴墨镜、带横向残影的黑白人像"
        width={1500}
        height={2000}
        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 70vw, 65vw"
        priority
        draggable={false}
      />
    </div>
    <PortfolioSiteNav active="home" />
    <div className="lanyard-home__scene" role="button" tabIndex={0} aria-label="向下拉工牌打开 About；也可按回车" aria-describedby="lanyard-instruction"
      onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); goAbout(); } }}>
      <InteractiveBadge onPullRelease={goAbout} />
    </div>
    <p className="lanyard-home__hint" id="lanyard-instruction">向下拉动工牌，展开 About。</p>
    <details className="lanyard-home__access">
      <summary>功能入口</summary>
      <nav aria-label="原有网站功能">
        <EyeResumeLink label="个人简历" compact />
        {moduleLinks.map(item => <button key={item.target} type="button" onClick={() => onNavigate(item.target)}>{item.label}</button>)}
      </nav>
    </details>
    </div>
    <section className="contact-finale" id="contact" aria-labelledby="contact-heading">
      <h2 id="contact-heading" className="contact-sr">{"Let's talk about the next opportunity."}</h2>
      <div className="contact-finale__sentence">
        <span aria-hidden="true">{"Let's talk about"}</span>
        <div className="contact-finale__last-line"><span aria-hidden="true">the next</span><ContactCard word /><span className="contact-finale__period" aria-hidden="true">.</span></div>
      </div>
    </section>
  </main>;
}
