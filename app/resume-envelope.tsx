"use client";

import Image from "next/image";
import EyeResumeLink from "./eye-resume-link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ARCHIVE_OPEN_DURATION } from "./story-motion";
import SideRaysBackground from "./side-rays-background";
import './archive-ticket.css';
import { prepareInteractiveBadge } from './interactive-badge';
import { ArchiveMusicControl } from './archive-music';

const archiveFrames = [
  "/images/archive-string-closed-v1.png",
  "/images/archive-string-loose-v1.png",
  "/images/archive-string-open-v1.png",
];

export const ARCHIVE_PAPER_TEXTURE = "/images/archive-paper-fiber-v2.png";

export default function ResumeEnvelope({ onComplete, onPrepare, onOpen, onIntent }: { onComplete: (animated?: boolean) => void; onPrepare?: () => void; onOpen?: () => void; onIntent?: () => void }) {
  const [opening, setOpening] = useState(false);
  const [loaded, setLoaded] = useState<boolean[]>([false, false, false]);
  const [assetFailed, setAssetFailed] = useState(false);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const sceneRef = useRef<HTMLElement>(null);
  const packageRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef(onComplete);
  const completedRef = useRef(false);
  const ready = loaded.every(Boolean);
  const playing = opening && ready && !assetFailed;
  useEffect(() => { prepareInteractiveBadge(); }, []);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  const finish = useCallback((animated = false) => {
    if (completedRef.current) return;
    completedRef.current = true;
    window.scrollTo({ top: 0, behavior: "instant" });
    completeRef.current(animated);
  }, []);

  useEffect(() => {
    if (!opening) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (assetFailed || reduced.matches) {
      const frame = window.requestAnimationFrame(() => finish(false));
      return () => window.cancelAnimationFrame(frame);
    }
    // Loading cannot trap the visitor; a slow image falls back to direct entry.
    const timer = window.setTimeout(() => finish(ready), ready ? ARCHIVE_OPEN_DURATION : 5000);
    const changed = () => { if (reduced.matches) finish(false); };
    reduced.addEventListener("change", changed);
    return () => { window.clearTimeout(timer); reduced.removeEventListener("change", changed); };
  }, [opening, ready, assetFailed, finish]);

  function open() {
    if (opening) return;
    onOpen?.();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || assetFailed) { finish(false); return; }
    onPrepare?.();
    const scene = sceneRef.current;
    if (scene) {
      scene.style.setProperty("--file-tilt", "0deg");
    }
    setOpening(true);
  }
  function tilt(event: PointerEvent<HTMLButtonElement>) {
    if (opening || event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    sceneRef.current?.style.setProperty("--file-tilt", `${x * 3}deg`);
    sceneRef.current?.style.setProperty("--light-x", `${x * 12}px`);
  }
  return <><header className="sealed-entry__nav sealed-entry__nav--music"><ArchiveMusicControl /><EyeResumeLink label="直接查看简历" compact /></header>
  <section ref={sceneRef} className={`sealed-entry sealed-entry--discovered${playing ? " is-opening" : ""}${assetFailed ? " has-asset-fallback" : ""}`} style={{ "--archive-duration": `${ARCHIVE_OPEN_DURATION}ms` } as CSSProperties} aria-label="昏暗房间里，被光照亮的个人档案">
    <Image className="sealed-entry__desk" src={backgroundFailed ? "/images/archive-nanmu-desk-v1.png" : "/images/archive-room-light-v2.png"} alt="" fill priority sizes="100vw" onError={() => setBackgroundFailed(true)} />
    <div className="sealed-entry__light" aria-hidden="true" />
    {!opening ? <SideRaysBackground scene="entry" /> : null}
    <div className="sealed-entry__stage">
      <button ref={packageRef} type="button" className="sealed-file" onClick={open} onPointerEnter={onIntent} onFocus={onIntent} onPointerDown={onIntent} onPointerMove={tilt} onPointerLeave={() => { sceneRef.current?.style.setProperty("--file-tilt", "0deg"); sceneRef.current?.style.setProperty("--light-x", "0px"); }} disabled={opening} aria-label="打开陈俊呈的档案，展开人生记录" aria-busy={opening && !ready}>
        {archiveFrames.map((src, index) => <span className={`sealed-file__frame sealed-file__frame--${index}`} key={src} aria-hidden="true"><Image src={src} alt="" fill sizes="(max-width: 760px) 98vw, 46vw" priority={index === 0} loading={index === 0 ? undefined : "eager"} onLoad={() => setLoaded(current => current.map((value, i) => i === index ? true : value))} onError={() => setAssetFailed(true)} /></span>)}
        <span className="sealed-file__light" aria-hidden="true" />
        <span className="sealed-file__mouth" aria-hidden="true">
          <span className="sealed-file__inner-back" />
          <span className="sealed-file__papers"><i /><i /><i /></span>
          <span className="sealed-file__inner-rim" />
        </span>
        <span className="sealed-file__front" aria-hidden="true"><Image src={archiveFrames[2]} alt="" fill sizes="(max-width: 760px) 98vw, 46vw" loading="eager" /></span>
        <span className="sealed-file__ticket" aria-hidden="true">
          <span className="archive-ticket__header">
            <strong className="archive-ticket__name">陈俊呈</strong>
            <span className="archive-ticket__identity"><b>CHEN JUN CHENG</b><span>Personal archive</span><small>履历 / 作品 / 人生记录</small></span>
            <span className="archive-ticket__stamp">私藏档案</span>
          </span>
          <span className="archive-ticket__title"><small>个人编号 001</small><b>个人成长档案</b></span>
          <span className="archive-ticket__contents">一个人的经历，<br />一份持续更新的记录。</span>
          <span className="archive-ticket__barcode" />
          <span className="archive-ticket__serial">CHENG — PERSONAL FILE — 001</span>
          <span className="archive-ticket__direction"><small>目标方向</small><b>AI 产品经理</b></span>
        </span>
      </button>
    </div>
    <footer className="sealed-entry__footer"><p role="status">{opening ? ready ? "正在展开这份人生档案。" : "正在准备档案…" : "点击，打开档案。"}</p><button type="button" onPointerEnter={onIntent} onFocus={onIntent} onPointerDown={onIntent} onClick={() => { onOpen?.(); finish(false); }}>跳过动画，进入首页 →</button></footer>
  </section></>;
}
