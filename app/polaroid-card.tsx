"use client";

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import './polaroid-card.css';

export default function PolaroidCard() {
  const surface = useRef<HTMLDivElement>(null);
  const hoverImage = useRef<HTMLImageElement>(null);
  const maskImage = useRef<HTMLImageElement>(null);
  const frame = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  const reset = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const el = surface.current;
    if (!el) return;
    el.dataset.active = 'false';
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  useEffect(() => {
    // SSR images can finish before hydration attaches their load handler.
    const imageReadyFrame = requestAnimationFrame(() => {
      if (hoverImage.current?.complete && hoverImage.current.naturalWidth > 0 && maskImage.current?.complete && maskImage.current.naturalWidth > 0) setReady(true);
    });
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => reset();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    window.addEventListener('blur', sync);
    return () => {
      cancelAnimationFrame(imageReadyFrame);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      window.removeEventListener('blur', sync);
    };
  }, []);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = surface.current;
    if (!el) return;
    el.dataset.active = 'true';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Read the stable outer rectangle, never the rotated child's bounds.
    const rect = el.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${-y * 12}deg`);
      el.style.setProperty('--ry', `${x * 12}deg`);
      frame.current = null;
    });
  };

  return <section className="polaroid-stage" id="polaroid" aria-label="互动拍立得">
    <div ref={surface} className="polaroid-hit" data-active="false" data-ready={ready}
      tabIndex={0} role="img" aria-label="陈俊呈像素拍立得；鼠标悬浮或键盘聚焦可查看破纸人物效果"
      onPointerEnter={move} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}
      onFocus={event => {
        if (ready && event.currentTarget.matches(':focus-visible') && matchMedia('(hover: hover) and (pointer: fine)').matches) event.currentTarget.dataset.active = 'true';
      }} onBlur={reset}>
      <div className="polaroid-tilt">
        {/* Fixed shared box prevents layout shift between differently sized source files. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="polaroid-image polaroid-image--default" src="/assets/polaroid/pixel-original.jpg" width={838} height={1024} alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="polaroid-image polaroid-image--hover" src="/assets/polaroid/torn-frame-v2.png" width={838} height={1024} alt="" draggable={false} />
        <div className="polaroid-pop" aria-hidden="true">
          {/* Separate masked foreground can cross all four photo-frame edges. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={hoverImage} src="/assets/polaroid/character-pop-v2.png" alt="" draggable={false}
            onLoad={() => { if (maskImage.current?.complete && maskImage.current.naturalWidth > 0) setReady(true); }}
            onError={() => { setReady(false); reset(); }} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={maskImage} className="polaroid-mask-preload" src="/assets/polaroid/character-mask-v2.png" alt="" aria-hidden="true"
          onLoad={() => { if (hoverImage.current?.complete && hoverImage.current.naturalWidth > 0) setReady(true); }}
          onError={() => { setReady(false); reset(); }} />
      </div>
    </div>
  </section>;
}
