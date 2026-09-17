"use client";

import { useEffect, useState } from "react";
import "./life-journey.css";

const chapters = ["此刻", "履历", "项目", "人生卷宗", "下一程"];

export default function LifeJourney() {
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const archive = document.querySelector<HTMLElement>(".life-archive");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-journey]"));
    if (!archive || sections.length === 0) return;

    let frame = 0;
    const updateJourney = () => {
      frame = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      const heroProgress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
      const heroTurn = Math.min(1, Math.max(0, (window.scrollY - window.innerHeight * 0.06) / (window.innerHeight * 0.82)));
      const recordBurst = Math.min(1, Math.max(0, (window.scrollY - window.innerHeight * 0.48) / (window.innerHeight * 0.68)));
      const compact = window.innerWidth <= 900;
      archive.style.setProperty("--journey-progress", progress.toFixed(4));
      archive.style.setProperty("--journey-photo-y", `${(heroProgress * 26).toFixed(2)}px`);
      archive.style.setProperty("--journey-hero-turn", heroTurn.toFixed(4));
      archive.style.setProperty("--journey-record-burst", recordBurst.toFixed(4));
      archive.style.setProperty("--journey-hero-rotate-y", `${(heroTurn * (compact ? -4 : -9)).toFixed(2)}deg`);
      archive.style.setProperty("--journey-hero-rotate-z", `${(heroTurn * (compact ? -0.7 : -1.7)).toFixed(2)}deg`);
      archive.style.setProperty("--journey-hero-x", `${(heroTurn * (compact ? -0.7 : -2.2)).toFixed(2)}vw`);
      archive.style.setProperty("--journey-hero-y", `${(heroTurn * (compact ? 0.6 : 1.8)).toFixed(2)}vh`);
      archive.style.setProperty("--journey-hero-scale", (1 - heroTurn * (compact ? 0.012 : 0.025)).toFixed(4));
      archive.style.setProperty("--journey-hero-shadow", `${(heroTurn * 24).toFixed(2)}px`);
      archive.style.setProperty("--journey-record-lift", `${((1 - recordBurst) * (compact ? 36 : 76)).toFixed(2)}px`);
      archive.style.setProperty("--journey-record-card-lift", `${((1 - recordBurst) * (compact ? 32 : 58)).toFixed(2)}px`);
      archive.style.setProperty("--journey-record-scale", (0.94 + recordBurst * 0.06).toFixed(4));
      archive.style.setProperty("--journey-emergence-scale", (0.72 + recordBurst * 0.28).toFixed(4));
      archive.style.setProperty("--journey-ring-scale", recordBurst.toFixed(4));

      let nextChapter = 0;
      sections.forEach((section, index) => {
        if (section.getBoundingClientRect().top <= window.innerHeight * 0.56) nextChapter = index;
      });
      setActiveChapter((current) => current === nextChapter ? current : nextChapter);
    };
    const requestJourneyUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateJourney);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-journey-visible");
      });
    }, { rootMargin: "-12% 0px -16%", threshold: 0.14 });
    sections.forEach((section) => observer.observe(section));

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      archive.style.setProperty("--journey-pointer-x", x.toFixed(3));
      archive.style.setProperty("--journey-pointer-y", y.toFixed(3));
    };

    updateJourney();
    window.addEventListener("scroll", requestJourneyUpdate, { passive: true });
    window.addEventListener("resize", requestJourneyUpdate);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestJourneyUpdate);
      window.removeEventListener("resize", requestJourneyUpdate);
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <aside className="life-journey-map" aria-label={`人生路径：当前位于${chapters[activeChapter]}`}>
    <span className="life-journey-map__eyebrow">LIFE ROUTE</span>
    <div className="life-journey-map__rail" aria-hidden="true"><i /></div>
    <ol>
      {chapters.map((chapter, index) => <li className={index === activeChapter ? "is-active" : index < activeChapter ? "is-passed" : ""} key={chapter}>
        <span>{String(index + 1).padStart(2, "0")}</span><b>{chapter}</b>
      </li>)}
    </ol>
    <small>{String(activeChapter + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}</small>
  </aside>;
}
