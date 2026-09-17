import type { Metadata } from "next";
import Image from "next/image";
import ResumeActions from "./resume-actions";
import "./resume.css";

export const metadata: Metadata = {
  title: "陈俊呈｜AI 产品经理候选人简历",
  description: "陈俊呈的招聘者快速调阅简历：经历、项目、能力证据与事实边界。",
};

const evidenceSkills = [
  { skill: "项目推进", proof: "PMP；曾拆解匿名退费任务并协调多部门在一天内完成", status: "已有事实" },
  { skill: "用户沟通", proof: "根据医生检查结论理解顾客需求与价格顾虑，完成针对性说明", status: "已有事实" },
  { skill: "需求分析", proof: "以自身真实学习痛点定义 AIPM 学习系统的任务、反馈与证据闭环", status: "项目证据" },
  { skill: "AI 产品实践", proof: "正在形成 PRD、原型、AI 工作流、评测与迭代记录", status: "持续补证" },
];

export default function ResumePage() {
  return <main className="resume-view">
    <ResumeActions />
    <article className="resume-sheet" aria-label="陈俊呈快速调阅简历">
      <header className="resume-identity">
        <div className="resume-identity__file"><span>RECRUITER COPY</span><b>FILE / CJ–0001</b><i>90 SEC REVIEW</i></div>
        <div className="resume-identity__name"><small>AI 产品经理候选人 · PMP</small><h1>陈俊呈</h1><p>CHEN JUNCHENG</p></div>
        <dl className="resume-identity__facts"><div><dt>求职方向</dt><dd>AI 产品经理 / 产品与项目协同</dd></div><div><dt>目标城市</dt><dd>杭州优先 · 苏州备选</dd></div><div><dt>当前状态</dt><dd>全职转型 · 可进入面试流程</dd></div><div><dt>联系方式</dt><dd>待本人确认后公开</dd></div></dl>
      </header>

      <div className="resume-layout">
        <aside className="resume-sidebar">
          <figure>
            <Image src="/images/cheng-resume-white-shirt.jpg" alt="陈俊呈白衬衫证件照" fill priority sizes="(max-width: 520px) 140px, 200px" />
            <figcaption>陈俊呈 / 个人照片</figcaption>
          </figure>
          <section><span>EDUCATION / 教育</span><h2>大连工业大学</h2><p>表演专业 · 本科<br />市场营销辅修<br />2025 年毕业</p></section>
          <section><span>CREDENTIAL / 证书</span><h2>PMP</h2><p>项目管理专业人士认证</p><h2>营养指导员</h2><p>已持证</p></section>
          <section><span>FACT BOUNDARY / 事实边界</span><p>暂无正式互联网或 AI 产品岗位经验。TikTok、小红书及私域运营均为个人、小规模实践，不描述为正式从业经历。</p></section>
          <section className="resume-sidebar__status"><span>VERSION STATUS</span><b>V0.3 · 2026.09</b><p>项目按实际阶段呈现；联系方式待本人确认后公开。</p></section>
        </aside>

        <div className="resume-main">
          <section className="resume-summary">
            <div className="resume-section-label"><b>00</b><span>PROFILE / 个人摘要</span></div>
            <p>2025 届本科毕业生，具备约一年半口腔医疗机构助理经验和 PMP 认证。过去工作集中在跨部门协调、任务推进与用户沟通；目前以自己为核心用户，持续完成 AIPM 学习与求职系统、健身训练陪伴产品等 AI 产品实践，目标是用可运行原型和真实项目证据进入 AI 产品行业。</p>
          </section>

          <section className="resume-experience">
            <div className="resume-section-label"><b>01</b><span>EXPERIENCE / 经历</span></div>
            <article><header><div><h2>院长助理</h2><p>口腔医疗机构 · 已匿名化</p></div><span>约一年半<br />2026.07 离职</span></header><ul><li>承担跨部门协调、任务推进与咨询协作，处理多角色、多步骤的现场任务。</li><li>曾拆解一项匿名退费任务，协调多个部门逐项处理，在一天内完成并获得顾客明确认可。</li><li>依据医生检查结论了解顾客需求与价格顾虑并进行针对性说明；不独立进行医疗判断，不对治疗结果作绝对保证。</li></ul></article>
            <article><header><div><h2>个人商业与内容实践</h2><p>TikTok · 小红书 · 私域运营</p></div><span>在校期间<br />小规模尝试</span></header><ul><li>曾从阿里巴巴国际站寻找货源，通过 TikTok 发布视频进行引流与转化尝试。</li><li>进行过小红书和私域运营实践，并参与过时装周模特工作、服装设计与成衣实践。</li><li>相关经历未形成正式互联网业务成果，作为商业敏感度与行动实践保留。</li></ul></article>
          </section>

          <section className="resume-projects">
            <div className="resume-section-label"><b>02</b><span>SELECTED PROJECTS / 项目</span></div>
            <article><header><div><small>PRJ–001 · IN PROGRESS</small><h2>AIPM 学习与求职系统</h2></div><a href="/work/aipm-coach">查看案例 ↗</a></header><p>从“只有任务、缺少教学、AI 对话容易跑偏”的本人体验出发，提出站内讲解、练习和反馈的需求。参与学习结构与求职产出方向的取舍，持续反馈页面和使用问题。</p><dl><div><dt>本人角色</dt><dd>首位用户；提出需求、参与取舍与体验反馈</dd></div><div><dt>已有材料</dt><dd>问题描述、页面代码、文档初稿与迭代记录</dd></div><div><dt>待补证据</dt><dd>完整单关试用记录、人工核查与外部用户验证</dd></div><div><dt>开发边界</dt><dd>本人参与需求和反馈；文档及代码由 AI 协作完成</dd></div></dl></article>
            <article><header><div><small>PRJ–002 · DISCOVERY / MVP</small><h2>健身训练陪伴产品</h2></div><a href="/work/fitness-companion">查看案例 ↗</a></header><p>从训练时经常忘记组数的个人问题出发，提出设备、使用场景与休息习惯；指出自动判断存在误判风险。首版聚焦手动计组、休息计时与撤销，手环与心率联动仍是探索。</p><dl><div><dt>真实问题</dt><dd>通常完成 4 组；忘记时曾统一当作第 3 组</dd></div><div><dt>当前方案</dt><dd>主动确认优先，保留纠错入口</dd></div><div><dt>待验证</dt><dd>组数记录正确性、组间操作成本与持续使用意愿</dd></div><div><dt>当前阶段</dt><dd>需求发现与原型探索，未完成外部验证</dd></div></dl></article>
            <article><header><div><small>PRJ–003 · SKILL PROTOTYPE</small><h2>项目复盘 Skill</h2></div><a href="/work/project-retrospective">查看制作过程 ↗</a></header><p>选择项目复盘作为小型 AI 工作流场景，提出整理真实经历、了解制作过程的需求。AI 辅助起草任务规则，区分事实、判断、待确认及个人贡献，已形成 Skill 文件与制作文档。</p><dl><div><dt>本人贡献</dt><dd>选题、使用场景与原型范围确认</dd></div><div><dt>待验证</dt><dd>事实准确性、追问质量及与普通对话的效果差异</dd></div></dl></article>
          </section>

          <section className="resume-evidence">
            <div className="resume-section-label"><b>03</b><span>CAPABILITY EVIDENCE / 能力证据</span></div>
            <div>{evidenceSkills.map((item) => <article key={item.skill}><h2>{item.skill}</h2><p>{item.proof}</p><span>{item.status}</span></article>)}</div>
          </section>

          <section className="resume-next-proof">
            <div className="resume-section-label"><b>04</b><span>NEXT EVIDENCE / 下一步补证</span></div>
            <p>先补齐一个主项目和一个小型案例的真实过程：用户与场景、需求取舍、产品需求文档（PRD）、原型、测试记录和复盘。简历与作品同步更新，不把尚未掌握的技能写成“熟练”。</p>
          </section>
        </div>
      </div>
      <footer className="resume-footer"><strong>CHENG ARCHIVE</strong><p>事实、判断与待验证内容分别归档。</p><span>RECRUITER COPY · V0.3</span></footer>
    </article>
  </main>;
}
