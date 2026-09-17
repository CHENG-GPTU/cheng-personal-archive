import EyeResumeLink from '../eye-resume-link';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import AboutBadge from './about-badge';
import PolaroidCard from '../polaroid-card';
import PortfolioSiteNav from '../portfolio-site-nav';
import SideRaysBackground from '../side-rays-background';
import ContactCard from '../contact-card';
import './about.css';

export const metadata: Metadata = {
  title: 'About Me · 陈俊呈的个人档案',
  description: '陈俊呈的个人信息、工作经历与实践记录。',
};

export default function AboutPage() {
  return <main className="about-archive">
    <SideRaysBackground />
    <PortfolioSiteNav active="about" />
    <article className="about-dossier" aria-label="展开的陈俊呈个人档案">
      <aside className="about-dossier__badge" aria-label="可拖动的个人工牌">
        <div className="about-dossier__badge-poster"><Image src="/assets/lanyard/manga-poster.png" alt="我会越走越高，漫画海报" fill priority sizes="(max-width: 800px) 80vw, 28vw" /></div>
        <div className="about-dossier__badge-scene"><AboutBadge /></div>
        <p>拖动工牌 · 翻看另一面</p>
      </aside>

      <div className="about-dossier__paper">
        <header className="about-dossier__heading">
          <div><h1>ABOUT ME</h1><p>陈俊呈 <span>/ CHEN JUN CHENG /</span></p></div>
        </header>
        <div className="about-dossier__body">
          <div className="about-dossier__copy">
            <section>
              <h2>个人信息 <span>PROFILE</span></h2>
              <p>2025 年本科毕业于大连工业大学表演专业。<br />已取得 PMP 项目管理专业人士认证。</p>
              <p className="about-dossier__direction">求职方向：AI 产品经理 / 产品与项目协同</p>
            </section>
            <section>
              <h2>工作经历 <span>EXPERIENCE</span></h2>
              <div className="about-dossier__job"><h3>口腔机构 · 院长助理</h3><span>约一年半</span></div>
              <p>负责跨部门协调、任务推进与咨询协作。曾拆解退费处理任务，协调多个部门逐项处理，在一天内完成并获得顾客明确认可。</p>
              <p>依据医生检查结论，围绕顾客需求与价格顾虑进行针对性解释，不独立进行医疗判断。</p>
            </section>
            <section>
              <h2>实践经历 <span>PRACTICE</span></h2>
              <p>参与时装周模特工作，学习服装设计并完成成衣。开展过 TikTok、小红书及私域运营的个人小规模实践。</p>
              <p>目前全职转型，围绕自己的学习与健身需求，推进 AI 产品实践与作品集建设。</p>
              <Link className="about-dossier__work-link" href="/work">查看我的项目 <span aria-hidden="true">↗</span></Link>
            </section>
          </div>
          <aside className="about-dossier__portrait" aria-label="互动拍立得">
            <PolaroidCard />
            <p>另一面的我<span>悬浮照片，打个招呼。</span></p>
            <div className="about-dossier__note"><span>FIELD NOTE / 01</span><p>从真实问题出发，<br />把每一步尝试留在档案里。</p></div>
          </aside>
        </div>
        <footer className="about-dossier__footer"><span>个人探索持续更新 · 尚无正式互联网或 AI 产品岗位经验</span><span>01 / ABOUT</span></footer>
      </div>
    </article>
    <footer className="about-archive__bottom"><Link href="/#home">返回 Home</Link><span>CHENG · AN ONGOING STORY</span><div className="about-archive__contact-actions"><ContactCard compact /><EyeResumeLink label="完整简历" compact /></div></footer>
  </main>;
}
