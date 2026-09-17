"use client";

import EyeResumeLink from './eye-resume-link';
import { useEffect, useState } from "react";
import "./classified-dossier.css";

const OPEN_DURATION = 1850;

export default function ClassifiedDossier({ onComplete }: { onComplete: () => void }) {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!opening) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onComplete, reducedMotion ? 120 : OPEN_DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete, opening]);

  return (
    <section className={`classified-entry${opening ? " is-opening" : ""}`} aria-label="个人绝密档案入口">
      <div className="classified-entry__desk" aria-hidden="true"><i /><i /><i /></div>
      <a className="classified-file" href="#identity" onClick={() => setOpening(true)} aria-disabled={opening} aria-label="调阅陈俊呈个人档案">
        <span className="classified-file__tab">PERSONAL RECORD · 0001</span>
        <span className="classified-file__binding" aria-hidden="true" />
        <span className="classified-file__meta">
          <b>档案编号</b><i>CJ / 2025—∞</i>
          <b>密级</b><i>PERSONAL / ARCHIVE</i>
          <b>建档日期</b><i>2026 · HANGZHOU</i>
        </span>
        <span className="classified-file__portrait">
          {/* eslint-disable-next-line @next/next/no-img-element -- the supplied portrait is intentionally presented as a physical archive photograph. */}
          <img src="/images/cheng-portrait-silver-v1.jpg" alt="陈俊呈个人档案照片" />
          <i>SUBJECT / CHENG</i>
        </span>
        <span className="classified-file__identity">
          <small>个人成长档案 · 持续增补</small>
          <strong>陈俊呈</strong>
          <em>CHEN JUNCHENG</em>
          <span>AI PRODUCT · PROJECT MANAGEMENT · LIFE RECORD</span>
        </span>
        <span className="classified-file__stamp" aria-hidden="true">持续<br />更新</span>
        <span className="classified-file__seal"><i>调阅档案</i><b>OPEN FILE</b></span>
        <span className="classified-file__warning">本档案由本人持续记录。事实、判断与待验证内容分别归档。</span>
      </a>
      <EyeResumeLink className="classified-entry__resume" label="快速调阅简历" compact />

      <div className="classified-transition" aria-hidden="true">
        <i className="classified-transition__seal">DECLASSIFIED</i>
        <i className="classified-transition__paper paper-a" />
        <i className="classified-transition__paper paper-b" />
        <i className="classified-transition__flash" />
      </div>
      <p className="classified-entry__folio">CHENG ARCHIVE · EST. 2026 · FILE WILL REMAIN OPEN</p>
    </section>
  );
}
