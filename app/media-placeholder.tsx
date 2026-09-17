"use client";

import "./media-placeholder.css";

export interface MediaPlaceholderProps {
  onOpenSchedule?: () => void;
}

const futureModules = [
  { label: "VISUAL LIBRARY", title: "审美参考库", detail: "收藏、拆解与个人视觉关键词" },
  { label: "SHOOTING SYSTEM", title: "拍摄训练场", detail: "机位、灯光、动作与分镜复盘" },
  { label: "PUBLISHING REVIEW", title: "发布复盘", detail: "内容质量、反馈与下一次迭代" },
] as const;

export default function MediaPlaceholder({ onOpenSchedule }: MediaPlaceholderProps) {
  return (
    <section className="mp-shell" aria-labelledby="mp-title">
      <header className="mp-hero">
        <div className="mp-status-mark" aria-hidden="true">
          <span>NOT</span>
          <span>LIVE</span>
        </div>
        <div className="mp-copy">
          <p>SELF-MEDIA / RESERVED SPACE</p>
          <h2 id="mp-title">自媒体模块，<br />暂未启用。</h2>
          <span>先完成 AIPM 核心训练与项目验证；这里不会用空数据制造“正在运营”的假象。</span>
        </div>
      </header>

      <div className="mp-module-grid" aria-label="计划中的自媒体功能">
        {futureModules.map((module, index) => (
          <article key={module.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <small>{module.label}</small>
              <h3>{module.title}</h3>
              <p>{module.detail}</p>
            </div>
            <strong>DISABLED</strong>
          </article>
        ))}
      </div>

      <footer className="mp-footer">
        <div>
          <span>CURRENT RULE</span>
          <p>不记录粉丝数、不虚构发布数据，也不让内容运营挤占项目交付时间。</p>
        </div>
        {onOpenSchedule ? (
          <button type="button" onClick={onOpenSchedule}>查看二十天日程中的拍摄训练</button>
        ) : (
          <p>拍摄训练仍保留在二十天生活日程中。</p>
        )}
      </footer>
    </section>
  );
}
