'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import EyeResumeLink from './eye-resume-link';
import { ArchiveMusicControl } from './archive-music';
import './portfolio-site-nav.css';

export default function PortfolioSiteNav({ active }: { active: 'home' | 'about' | 'work' }) {
  const origin = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const header = origin.current;
    if (!header) return;
    // Keep the original header's height reserved when its navigation floats.
    const observer = new IntersectionObserver(([entry]) => {
      setCompact(!entry.isIntersecting && entry.boundingClientRect.bottom <= 12);
    }, { rootMargin: '-12px 0px 0px 0px' });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return <header ref={origin} className="dossier-site-nav" data-compact={compact}>
    <Link className="dossier-site-brand" href="/#home" aria-label="陈俊呈个人网站首页">CHENG<span>PERSONAL ARCHIVE</span></Link>
    <div className="dossier-site-nav__dock">
      <ArchiveMusicControl compact={compact} />
      <nav aria-label="作品集主导航">
        <Link href="/#home" aria-current={active === 'home' ? 'page' : undefined}>Home</Link>
        <span className="dossier-site-about"><Link href="/about" aria-current={active === 'about' ? 'page' : undefined}>About</Link></span>
        <Link href="/work" aria-current={active === 'work' ? 'page' : undefined}>Portfolio</Link>
      </nav>
    </div>
    <EyeResumeLink className="dossier-site-resume" />
  </header>;
}
