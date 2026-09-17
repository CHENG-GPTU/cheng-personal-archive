"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "./side-rays-background.css";

const SideRays = dynamic(() => import("@/components/react-bits/SideRays/SideRays"), { ssr: false });

/** A decorative, client-only layer. Each home state mounts exactly one instance. */
export default function SideRaysBackground({ scene = "home" }: { scene?: "entry" | "home" }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setActive(!document.hidden && !reduced.matches);
    sync();
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  return <div className={`site-side-rays site-side-rays--${scene}`} aria-hidden="true">
    {active ? <SideRays origin="top-left" intensity={1.9} speed={2.9} opacity={0.75} blend={0.8} /> : null}
  </div>;
}
