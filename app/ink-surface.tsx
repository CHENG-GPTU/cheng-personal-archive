"use client";

import { useEffect, useId, useRef, type PointerEvent } from "react";

/** Decorative displacement only: portraits, controls and text stay undistorted. */
export default function InkSurface() {
  const filterId = `ink-${useId().replace(/:/g, "")}`;
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const strength = useRef(0);
  const previous = useRef({ x: 0, y: 0, time: 0 });
  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);
  function disturb(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    const last = previous.current;
    const speed = last.time ? Math.hypot(event.clientX - last.x, event.clientY - last.y) / Math.max(8, now - last.time) : 0.4;
    previous.current = { x: event.clientX, y: event.clientY, time: now };
    strength.current = Math.min(38, Math.max(strength.current, speed * 22 + 8));
    const rect = event.currentTarget.getBoundingClientRect();
    surface.current?.style.setProperty("--ink-x", `${(event.clientX - rect.left) / rect.width * 100}%`);
    surface.current?.style.setProperty("--ink-y", `${(event.clientY - rect.top) / rect.height * 100}%`);
    if (frame.current) return;
    let timestamp = now;
    const settle = (time: number) => {
      strength.current *= Math.pow(0.94, Math.min(64, time - timestamp) / 16.67);
      timestamp = time;
      displacement.current?.setAttribute("scale", strength.current.toFixed(2));
      surface.current?.style.setProperty("--ink-energy", String(strength.current / 38));
      if (strength.current > 0.15) frame.current = window.requestAnimationFrame(settle);
      else { frame.current = 0; displacement.current?.setAttribute("scale", "0"); }
    };
    frame.current = window.requestAnimationFrame(settle);
  }
  return <div className="mounted-scroll__fluid" ref={surface} onPointerMove={disturb} aria-hidden="true">
    <svg width="0" height="0" className="ink-filter"><defs><filter id={filterId} x="-8%" y="-12%" width="116%" height="124%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.025" numOctaves="2" seed="9" result="noise" /><feDisplacementMap ref={displacement} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" /></filter></defs></svg>
    <div className="mounted-scroll__liquid-ink" style={{ filter: `url(#${filterId})` }} />
    <div className="mounted-scroll__light" />
  </div>;
}
