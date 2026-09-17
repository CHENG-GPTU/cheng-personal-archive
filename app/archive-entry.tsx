'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ResumeEnvelope from './resume-envelope';
import ArchiveMusic, { type ArchiveMusicHandle } from './archive-music';
import './archive-sealed.css';
import './archive-discovery.css';
import './archive-dive.css';

/** In-memory only: client navigation keeps entry dismissed; a reload resets it. */
export default function ArchiveEntry({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [waitingForHome, setWaitingForHome] = useState(false);
  const [arrival, setArrival] = useState(false);
  const [homePrepared, setHomePrepared] = useState(false);
  const musicRef = useRef<ArchiveMusicHandle>(null);
  // Direct resume/project/learning links remain shareable without an entrance gate.
  const isFrontPage = pathname === '/' || pathname === '/about';

  useEffect(() => {
    if (waitingForHome && pathname === '/') {
      setWaitingForHome(false);
      setEntered(true);
    }
  }, [pathname, waitingForHome]);

  function enter(animated = false) {
    setArrival(animated && !homePrepared);
    if (pathname !== '/') {
      setWaitingForHome(true);
      router.replace('/#home', { scroll: false });
    } else {
      setEntered(true);
    }
  }

  function prepareHome() {
    setHomePrepared(true);
    // Mount Home once behind the envelope; preserve its badge during the reveal.
    if (pathname !== '/') router.replace('/#home', { scroll: false });
  }
  const showEntry = isFrontPage && !entered;
  const showContent = !showEntry || (homePrepared && pathname === '/');
  return <ArchiveMusic ref={musicRef}>
    {showContent ? <div className="archive-content" inert={showEntry || undefined}>{children}</div> : null}
    {showEntry ? <main className="folio folio--envelope archive-entry-restored">
      <ResumeEnvelope onComplete={enter} onPrepare={prepareHome} onOpen={() => musicRef.current?.startFromEntry()} onIntent={() => musicRef.current?.prepareFromIntent()} />
    </main> : null}
    {arrival && isFrontPage ? <div className="archive-paper-arrival" aria-hidden="true" onAnimationEnd={() => setArrival(false)} /> : null}
  </ArchiveMusic>;
}
