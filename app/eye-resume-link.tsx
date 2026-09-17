'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { eyeTarget } from './eye-follow-math';
import './eye-resume-link.css';

type Tracker = (x: number, y: number) => void;
const trackers = new Set<Tracker>();
function trackPointer(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  trackers.forEach(track => track(event.clientX, event.clientY));
}
function subscribe(track: Tracker) {
  if (!trackers.size) window.addEventListener('pointermove', trackPointer, { passive: true });
  trackers.add(track);
  return () => {
    trackers.delete(track);
    if (!trackers.size) window.removeEventListener('pointermove', trackPointer);
  };
}

/** Local Next.js adapter of the supplied Eye Follow Button / FollowEyes source.
 * Keeps its two-eye geometry, 90% range, spring stiffness 100 and damping 20.
 * Replaces Framer editor plumbing with a shared pointer listener and DOM springs.
 */
export default function EyeResumeLink({ label = '查看简历', className = '', compact = false }: {
  label?: string; className?: string; compact?: boolean;
}) {
  const eyes = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = eyes.current;
    if (!root) return;
    const pupils = [...root.querySelectorAll<HTMLElement>('.eye-resume__pupil')];
    const states = pupils.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
    const media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let visible = false, frame = 0, previous = 0;
    let unsubscribe: (() => void) | undefined;
    function reset() {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      states.forEach((s, index) => {
        Object.assign(s, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 });
        pupils[index].style.transform = 'translate3d(0,0,0)';
      });
    }
    function animate(time: number) {
      const dt = Math.min((time - (previous || time - 16.67)) / 1000, 1 / 30);
      previous = time;
      let moving = false;
      states.forEach((s, index) => {
        s.vx += (100 * (s.tx - s.x) - 20 * s.vx) * dt;
        s.vy += (100 * (s.ty - s.y) - 20 * s.vy) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.vx) + Math.abs(s.vy) > .02) moving = true;
        pupils[index].style.transform = `translate3d(${s.x}px,${s.y}px,0)`;
      });
      frame = moving ? requestAnimationFrame(animate) : 0;
      if (!moving) previous = 0;
    }
    const follow: Tracker = (x, y) => {
      if (!visible || document.hidden || !root) return;
      const rect = root.getBoundingClientRect();
      const size = pupils[0].parentElement!.offsetWidth;
      const pupilSize = pupils[0].offsetWidth;
      const gap = parseFloat(getComputedStyle(root).gap) || 0;
      states.forEach((s, index) => {
        const target = eyeTarget(x - rect.left - rect.width / 2, y - rect.top - rect.height / 2, index === 0 ? -gap / 2 : gap / 2, size, pupilSize);
        s.tx = target.x; s.ty = target.y;
      });
      if (!frame) frame = requestAnimationFrame(animate);
    };
    function configure() {
      unsubscribe?.(); unsubscribe = undefined; reset();
      if (media.matches) unsubscribe = subscribe(follow);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) reset();
    });
    observer.observe(root);
    configure(); media.addEventListener('change', configure);
    const onVisibility = () => { if (document.hidden) reset(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe?.(); observer.disconnect(); reset();
      media.removeEventListener('change', configure);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <Link href="/resume" className={`eye-resume${compact ? ' eye-resume--compact' : ''}${className ? ` ${className}` : ''}`}>
    <span className="eye-resume__label">{label}</span>
    <span ref={eyes} className="eye-resume__eyes" aria-hidden="true">
      <span className="eye-resume__eye"><span className="eye-resume__pupil" /></span>
      <span className="eye-resume__eye"><span className="eye-resume__pupil" /></span>
    </span>
  </Link>;
}
