'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './archive-navigation.css';

const ArchiveNavigation = createContext<(distance?: number) => void>(() => {});
export const useArchiveAbout = () => useContext(ArchiveNavigation);

export default function ArchiveNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState('idle');
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRoute = useRef<(() => void) | null>(null);
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useCallback(() => {
    document.documentElement.removeAttribute('data-about-drop');
    busy.current = false;
    setPhase('idle');
  }, []);
  useEffect(() => {
    if (pathname !== '/about' || !resolveRoute.current) return;
    // View transitions can suspend rAF while awaiting their update callback.
    // A short task lets child effects commit without deadlocking that capture.
    routeTimer.current = setTimeout(() => {
      resolveRoute.current?.();
      resolveRoute.current = null;
    }, 80);
  }, [pathname]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (routeTimer.current) clearTimeout(routeTimer.current);
    resolveRoute.current?.();
    document.documentElement.removeAttribute('data-about-drop');
  }, []);
  const goAbout = useCallback((distance = 100) => {
    if (distance < 45 || busy.current || pathname !== '/') return;
    busy.current = true;
    router.prefetch('/about');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase('rebound');
    timer.current = setTimeout(() => {
      setPhase('falling');
      document.documentElement.dataset.aboutDrop = 'true';
      if (!reduced && document.startViewTransition) {
        const transition = document.startViewTransition(() => new Promise<void>(resolve => {
          resolveRoute.current = resolve;
          router.push('/about');
          // Always release a capture if a slow route cannot complete in time.
          timer.current = setTimeout(() => { resolve(); resolveRoute.current = null; }, 4000);
        }));
        void transition.finished.catch(() => {}).finally(() => {
          if (timer.current) clearTimeout(timer.current);
          finish();
        });
      } else {
        router.push('/about');
        timer.current = setTimeout(finish, reduced ? 100 : 1000);
      }
    }, reduced ? 0 : 180);
  }, [router, pathname, finish]);
  return <ArchiveNavigation.Provider value={goAbout}>
    <div className="archive-navigation" data-phase={phase}>{children}</div>
  </ArchiveNavigation.Provider>;
}
