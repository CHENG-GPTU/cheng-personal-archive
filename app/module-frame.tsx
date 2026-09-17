"use client";

import type { ReactNode } from "react";
import "./module-frame.css";

type ModuleFrameProps = {
  title: string;
  kicker: string;
  onHome: () => void;
  children: ReactNode;
};

export default function ModuleFrame({ title, kicker, onHome, children }: ModuleFrameProps) {
  return (
    <main className="module-frame">
      <header className="module-frame__header">
        <button type="button" onClick={onHome} aria-label="返回首页">
          <span aria-hidden="true">←</span>
          CHENG
        </button>
        <div>
          <span>{kicker}</span>
          <strong>{title}</strong>
        </div>
        <i aria-hidden="true" />
      </header>
      {children}
    </main>
  );
}
