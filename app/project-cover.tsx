import Image from "next/image";
import type { PortfolioProject } from "./portfolio-content";
import "./project-cover.css";

/** Public visual concepts. These compositions are not product screenshots or results. */
export default function ProjectCover({ kind }: { kind: PortfolioProject["visual"] }) {
  return <div className={`project-cover project-cover--${kind}`} aria-hidden="true">
    <div className="cover-stage">
      {kind === "coach" && <>
        <div className="cover-blueprint" />
        <div className="cover-brand"><strong>AIPM<span>学习工作台</span></strong><p>从想法，到一次真正的练习。</p></div>
        <div className="cover-coach-window">
          <div className="cover-window-top"><span><i /><i /><i /></span><b>AIPM / 练习空间</b></div>
          <div className="cover-coach-body"><aside><b>A.</b><span>理解问题</span><strong>完成练习</strong><span>反馈与修改</span></aside><div><small>今天，先把问题说清楚。</small><h4>一个真实场景，<br />是产品的起点。</h4><div className="cover-answer">谁，在什么情况下，<br />遇到了什么问题？</div><span className="cover-mini-button">开始练习</span></div></div>
        </div>
        <div className="cover-note"><span>把思考留下来</span><b>理解 → 练习<br />反馈 → 修改</b><i /></div>
        <span className="cover-coach-a">A</span>
      </>}
      {kind === "health" && <>
        <div className="cover-track"><i /><i /><i /></div>
        <div className="cover-brand"><strong>组间<span>让训练保持节奏</span></strong><p>记录这一组，专注下一组。</p></div>
        <span className="cover-sport-type">SET</span>
        <div className="cover-phone"><div className="cover-phone-island" /><div className="cover-phone-head"><b>组间</b><span>自由训练</span></div><p>正在进行</p><div className="cover-progress"><b>3<small>/ 4 组</small></b></div><h4>保持自己的节奏。</h4><div className="cover-phone-action">记录一组</div><footer><span>撤销</span><span>休息计时</span></footer></div>
        <div className="cover-rest"><span>组间休息</span><b>01:00</b><i /><small>示例计时</small></div>
      </>}
      {kind === "skill" && <>
        <div className="cover-brand"><strong>复盘，有据。<span>Project retrospective</span></strong><p>让每一份表达，都能回到来源。</p></div>
        <div className="cover-sheet cover-sheet--source"><span>项目记录</span><b>问题 / 决策 / 产出</b><i /><i /><i /><div>原始材料</div></div>
        <div className="cover-sheet cover-sheet--result"><span>复盘初稿</span><h4>我做了什么，<br />为什么这样做。</h4><p><i />来源可追溯</p><p><i />贡献有边界</p><p><i />结论待审阅</p><footer>保留判断，也保留不确定。</footer></div>
        <div className="cover-skill-cube"><b>{"{ }"}</b><span>Skill</span></div>
        <span className="cover-review-tag">本人审阅</span>
      </>}
      {kind === "archive" && <>
        <div className="cover-brand"><strong>每一页，都是我。<span>CHENG / 个人档案</span></strong><p>经历、作品与生活，慢慢收录。</p></div>
        <div className="cover-archive-folder"><span>个人档案</span><b>CHENG</b><p>还在探索。<br />也在不断成为自己。</p><footer>经历 · 项目 · 生活</footer></div>
        <div className="cover-polaroid"><div><Image src="/images/cheng-resume-white-shirt.jpg" alt="" fill sizes="(max-width: 809px) 180px, 220px" /></div><span>此刻，也是下一页。</span></div>
        <span className="cover-archive-tab">持续收录</span>
      </>}
      {kind === "pet" && <>
        <div className="cover-ink-orbit" /><div className="cover-ink-mist" />
        <div className="cover-brand"><strong>EV<span>桌面里的小伙伴</span></strong><p>一声「嘿，Eve」，就在身边。</p></div>
        <span className="cover-seal">墨<br />伴</span>
        <div className="cover-pet-platform" />
        <Image className="cover-pet-character" src="/images/ev-ink-skin-v1.png" alt="" width={1024} height={1365} sizes="(max-width: 809px) 400px, 450px" />
        <div className="cover-pet-bubble"><span /><b>嘿，Eve</b><i /><i /><i /><i /><i /></div>
        <div className="cover-pet-caption"><b>水墨新衣</b><span>EV 国风皮肤</span></div>
      </>}
      <span className="cover-disclosure">{kind === "pet" ? "角色皮肤 · 场景设计示意" : "视觉设计示意 · 非效果数据"}</span>
    </div>
  </div>;
}
