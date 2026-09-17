import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const port = 3417;
let server;

test.before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited with ${server.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Next server did not become ready in time");
});

test.after(() => {
  server?.kill();
});

async function renderHomePage() {
  return fetch(`http://127.0.0.1:${port}/`, { headers: { accept: "text/html" } });
}

async function renderResumePage() {
  return fetch(`http://127.0.0.1:${port}/resume`, { headers: { accept: "text/html" } });
}

async function readPageClientBundle() {
  const root = new URL("../.next/static/chunks/", import.meta.url);
  async function collect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
      const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      return entry.isDirectory() ? collect(url) : entry.name.endsWith(".js") ? readFile(url, "utf8") : "";
    }));
    return files.flat(Infinity).join("\n");
  }
  return collect(root);
}

function pngSize(buffer) {
  assert.equal(buffer.toString("hex", 0, 8), "89504e470d0a1a0a");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("personal dossier portrait and social card are production-sized image files", async () => {
  const [portrait, social] = await Promise.all([
    readFile(new URL("../public/images/cheng-portrait-silver-v1.jpg", import.meta.url)),
    readFile(new URL("../public/og-dossier-silver-v1.png", import.meta.url)),
  ]);

  assert.ok(portrait.length > 300_000);
  assert.ok(social.length > 1_000_000);
  assert.deepEqual(pngSize(social), [1731, 909]);
  assert.equal(portrait.toString("hex", 0, 2), "ffd8", "portrait should remain a JPEG file");
});

test("home page restores the sealed archive entrance and retains the public portfolio", async () => {
  const response = await renderHomePage();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /<html[^>]*lang=["']zh-CN["']/i);
  assert.match(html, /<title>[^<]*个人履历、作品与人生档案[^<]*<\/title>/i);
  assert.match(html, /打开陈俊呈的档案，展开人生记录/);
  assert.match(html, /跳过动画，进入首页/);
  assert.match(html, /archive-room-light-v2/);
  assert.doesNotMatch(html, /id="polaroid"/);
  assert.match(html, /href="\/resume"/);
  assert.doesNotMatch(html, /id="__next_error__"/);
  assert.doesNotMatch(html, /点击眼睛进入|直接进入|与正在成为的自己见一面/);
  assert.match(html, /陈俊呈/);
  const work = await fetch(`http://127.0.0.1:${port}/work`);
  assert.equal(work.status, 200);
  const workHtml = await work.text();
  for (const route of ["aipm-coach", "fitness-companion", "project-retrospective", "personal-archive"]) {
    assert.ok(workHtml.includes(`href="/work/${route}"`), `project route missing: ${route}`);
  }
  assert.doesNotMatch(html, /看见问题，|再让行动留下证据/);
  assert.doesNotMatch(html, /从董事长助理，\s*转向 AI 产品经理/);
  assert.doesNotMatch(html, /<video\b|cloudfront|images\.higgs\.ai/i);
});

test("About delivers the entrance plus dossier biography and interactive portrait resources", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/about`);
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ['ABOUT ME', '个人信息', '工作经历', '实践经历', 'PMP', '大连工业大学', '尚无正式互联网或 AI 产品岗位经验']) assert.ok(html.includes(text), text);
  // The persistent entrance gates the client navigation; verify its live links in the browser suite.
  assert.match(html, /sealed-entry/);
  assert.ok(html.includes('href="/resume"'));
  assert.doesNotMatch(html, /id="__next_error__"/);
  for (const path of ['/assets/lanyard/card.glb', '/assets/lanyard/card-front.png', '/assets/lanyard/card-back.png', '/assets/lanyard/strap.png', '/assets/polaroid/pixel-original.jpg', '/assets/polaroid/hover-composite-v1.png', '/images/archive-paper-fiber-v2.png', '/images/archive-string-closed-v1.png', '/images/archive-string-loose-v1.png', '/images/archive-string-open-v1.png']) {
    assert.equal((await fetch(`http://127.0.0.1:${port}${path}`)).status, 200, path);
  }
});

test("recruiter resume renders confirmed facts, project evidence and honest boundaries", async () => {
  const response = await renderResumePage();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AI 产品经理候选人简历/);
  assert.match(html, /RECRUITER COPY/);
  assert.match(html, /约一年半/);
  assert.match(html, /PMP/);
  assert.match(html, /暂无正式互联网或 AI 产品岗位经验/);
  assert.match(html, /AIPM 学习与求职系统/);
  assert.match(html, /健身训练陪伴产品/);
  assert.match(html, /代码由 AI 协作完成/);
  assert.match(html, /待本人确认后公开/);
  assert.match(html, /项目复盘 Skill/);
  assert.match(html, /V0.3/);
  assert.doesNotMatch(html, /985|211|独立开发|大厂经验/);
});

test("all public case pages expose actual stage, AI contribution and validation gaps", async () => {
  for (const slug of ["aipm-coach", "fitness-companion", "project-retrospective", "personal-archive"]) {
    const response = await fetch(`http://127.0.0.1:${port}/work/${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    assert.doesNotMatch(html, /id="__next_error__"/);
    assert.match(html, /AI 辅助/);
    assert.match(html, /依据：/);
    assert.match(html, /未验证|尚未|没有/);
    assert.match(html, /href="\/work"/);
    assert.match(html, /非效果数据/);
    assert.doesNotMatch(html, /sk-[a-zA-Z0-9]{20,}/);
  }
});

test("portfolio structure keeps public content separate from private records", async () => {
  const content = await readFile(new URL("../app/portfolio-content.ts", import.meta.url), "utf8");
  const cases = await readFile(new URL("../app/work/case-content.ts", import.meta.url), "utf8");
  const parts = await readFile(new URL("../app/portfolio-parts.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(content + cases + parts, /localStorage|indexedDB|process\.env|from ["'].*(?:health-expert-data|db\/)/);
  assert.match(content, /待外部验证/);
  assert.match(content, /待效果评测/);
  assert.match(parts, /aria-hidden="true"/);
});

test("built client keeps every learning, health, validation and local studio workflow reachable", async () => {
  const bundle = await readPageClientBundle();
  const requiredMarkers = [
    "aipm-v3-state",
    "建立你的 AI 工作说明书",
    "今日简报",
    "概念学习",
    "AI 对练",
    "提交证据",
    "不要重新制定学习计划",
    "30 天冲刺",
    "60 个训练单元",
    "PROJECT VALIDATION",
    "Meeting Signal",
    "Signal Before Scale",
    "最后一天",
    "life20-health-expert-state-v1",
    "今日应该摄入",
    "当天体脂率",
    "Mifflin–St Jeor",
    "aipm-personal-studio-v1",
    "仅保存在当前设备",
    "选择本地图片",
    "自媒体模块",
    "暂未启用",
    "AIPM 学习系统",
    "作品集",
    "产品原型",
    "项目验证",
    "健康记录",
    "穿搭审美",
    "自媒体",
    "30 天验收",
    "card-front.png",
    "card-back.png",
  ];
  for (const marker of requiredMarkers) {
    assert.ok(bundle.includes(marker), `built page bundle is missing: ${marker}`);
  }
});

test("source shell keeps the lifelong dossier identity and routes every action", async () => {
  const [page, home, homeStyles, dossier, dossierStyles, resume, resumeActions, resumeStyles, workspace, program, validation] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/learning-home.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/portfolio.css", import.meta.url), "utf8"),
    readFile(new URL("../app/classified-dossier.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/classified-dossier.css", import.meta.url), "utf8"),
    readFile(new URL("../app/resume/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/resume/resume-actions.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/resume/resume.css", import.meta.url), "utf8"),
    readFile(new URL("../app/training-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/aipm-program-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/project-validation.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type Screen = "home" \| "workspace" \| "schedule" \| "validation" \| "studio" \| "milestone" \| "media"/);
  assert.match(page, /window\.location\.assign\("\/learn"\)/);
  assert.match(page, /window\.location\.assign\("\/work"\)/);
  assert.match(page, /target === "prototype" \|\| target === "fashion"/);
  assert.match(page, /initialView=\{scheduleView\}/);
  assert.match(page, /<ChengHome onNavigate=\{navigate\}/);
  assert.doesNotMatch(page, /<LearningHome|<ResumeEnvelope|<StoryScroll/);
  assert.match(home, /ResumeEnvelope/);
  assert.match(home, /portfolioProjects\.map/);
  assert.match(home, /archiveLinks\.map/);
  assert.match(home, /PortfolioNav home/);
  assert.match(home, /StoryScroll/);
  assert.match(home, /PERSONAL WORKSPACE/);
  assert.doesNotMatch(home, /HeroModel3D|<video\b/);
  assert.match(homeStyles, /position:sticky/);
  assert.match(homeStyles, /folio-project-grid/);
  assert.match(homeStyles, /folio-chronicle/);
  assert.match(homeStyles, /folio-workbench/);
  assert.match(homeStyles, /backdrop-filter:blur/);
  assert.match(homeStyles, /prefers-reduced-motion:reduce/);
  assert.match(homeStyles, /folio-portrait__image img\{[^}]*filter:none/);
  assert.match(home, /showingCover = !awakened \|\| replay/);
  assert.match(home, /setReplay\(true\)/);
  assert.match(home, /window\.location\.hash/);
  assert.match(home, /focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(home, /localStorage\.setItem|indexedDB|fetch\(/);
  assert.match(dossier, /aria-label="调阅陈俊呈个人档案"/);
  assert.match(dossier, /OPEN_DURATION = 1850/);
  assert.match(dossier, /PERSONAL RECORD · 0001/);
  assert.match(dossier, /DE归档|DECLASSIFIED/);
  assert.match(dossierStyles, /dossierCoverOpen/);
  assert.match(dossierStyles, /dossierPaperA/);
  assert.match(dossierStyles, /dossierEntryFallback/);
  assert.match(dossierStyles, /--folder:#ad925b/);
  assert.match(dossierStyles, /prefers-reduced-motion:reduce/);
  assert.match(dossier, /<EyeResumeLink[^>]+label="快速调阅简历"/);
  assert.match(home, /<EyeResumeLink[^>]+label="阅读完整履历"/);
  assert.match(resume, /事实边界/);
  assert.match(resumeActions, /打印 \/ 保存 PDF/);
  assert.match(resumeStyles, /@media print/);
  assert.match(resumeStyles, /--glass:/);
  assert.match(resumeStyles, /backdrop-filter:blur\(32px\)/);
  assert.doesNotMatch(resumeStyles, /filter:saturate\(\.52\)/);
  assert.match(workspace, /AIPM \/ 30D · 60U/);
  assert.match(workspace, /STATE_VERSION = 3/);
  assert.match(program, /AIPM_PROGRAM_DAYS = 30/);
  assert.match(program, /AIPM_UNITS_PER_DAY = 2/);
  assert.match(validation, /unit: 38[\s\S]*unit: 45[\s\S]*unit: 46[\s\S]*unit: 53/);
});

test("story scroll has synchronized accessible chapter controls and safe cover motion", async () => {
  const [story, cover, styles, data, ink] = await Promise.all([
    readFile(new URL("../app/story-scroll.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/resume-envelope.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/story-scroll.css", import.meta.url), "utf8"),
    readFile(new URL("../app/story-scroll-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/images/life-ink-scroll-v1.png", import.meta.url)),
  ]);
  assert.match(story, /role="tablist"/);
  assert.match(story, /role="tabpanel"/);
  assert.match(story, /aria-selected=\{active === index\}/);
  assert.match(story, /ArrowRight:[\s\S]*ArrowLeft:[\s\S]*Home:[\s\S]*End:/);
  assert.match(story, /type="range"[\s\S]*value=\{active\}/);
  assert.match(story, /Math\.max\(0, Math\.min\(storyChapters\.length - 1, index\)\)/);
  assert.match(story, /onClick=\{\(\) => select\(index\)\}/);
  assert.match(story, /href=\{chapter\.href\}/);
  assert.match(story, /viewport\.scrollTo/);
  assert.match(cover, /ready \? ARCHIVE_OPEN_DURATION : 5000/);
  assert.match(cover, /window\.clearTimeout\(timer\)/);
  assert.match(cover, /window\.cancelAnimationFrame/);
  assert.doesNotMatch(cover, /addEventListener\("scroll"|paperExpansion|continueScroll|向下滚动/);
  assert.match(cover, /prefers-reduced-motion: reduce/);
  assert.match(cover, /archive-nanmu-desk-v1\.png/);
  assert.match(story, /chapterAtProgress\(progress, storyChapters.length\)/);
  assert.match(story, /progressForChapter\(next, storyChapters.length\)/);
  assert.match(story, /data-scene=\{chapter.kind\}/);
  assert.match(story, /chapterMotion\(progress, storyChapters.length\)/);
  assert.match(story, /mounted-scroll__rod--left/);
  assert.match(story, /mounted-scroll__rod--right/);
  assert.match(cover, /disabled=\{opening\}/);
  assert.match(styles, /preserve-3d/);
  assert.match(styles, /rotateY\(-155deg\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /overflow-x:auto/);
  assert.match(styles, /scroll-unroll/);
  assert.doesNotMatch(story + cover + data, /localStorage\.setItem|indexedDB|fetch\(/);
  assert.deepEqual(pngSize(ink), [2172, 724]);
  const chapterIds = [...data.matchAll(/\{ id: "([a-z]+)"/g)].map(match => match[1]);
  assert.deepEqual(chapterIds, ["present", "exploration", "career", "aipm", "fitness", "skill", "archive"]);
  assert.match(data, /未完成系统性效果评测/);
});

test("personal uploads stay device-local and reject executable image formats", async () => {
  const [studio, store, safety] = await Promise.all([
    readFile(new URL("../app/personal-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/personal-media-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/personal-image-safety.ts", import.meta.url), "utf8"),
  ]);
  assert.match(studio, /仅保存在当前设备 \/ 当前浏览器/);
  assert.match(store, /indexedDB\.open/);
  assert.match(store, /containsPhotos: false/);
  assert.match(safety, /image\/jpeg,image\/png,image\/webp/);
  assert.match(safety, /HEIC、SVG、GIF 和网页文件不会被读取/);
  assert.match(safety, /context\.drawImage/);
  assert.doesNotMatch(studio, /dangerouslySetInnerHTML/);
});

test("learning workspace renders the complete knowledge atlas and gives it to the AI coach", async () => {
  const [game, styles, coach, careerTrack] = await Promise.all([
    readFile(new URL("../app/learn/aipm-game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/learn/aipm-game.css", import.meta.url), "utf8"),
    readFile(new URL("../app/api/aipm/coach/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/aipm-career-track.ts", import.meta.url), "utf8"),
  ]);
  assert.match(game, /aipm-knowledge-atlas/);
  assert.match(game, /aipmKnowledgeUnitCount/);
  assert.match(game, /核对一手资料/);
  assert.match(game, /JOB-READY EDITION/);
  assert.match(game, /JOB SIMULATION · 求职训练/);
  assert.match(game, /本节必须留下的证据/);
  assert.match(styles, /\.aipm-knowledge-atlas/);
  assert.match(styles, /\.aipm-career-practice/);
  assert.match(coach, /getAipmKnowledgeUnits/);
  assert.match(coach, /getAipmCareerPractice/);
  assert.match(coach, /本关系统知识单元/);
  assert.match(coach, /求职产物/);
  assert.match(coach, /真正使用了本关系统知识/);
  assert.match(careerTrack, /59 个单元各自必须留下不同的求职证据/);
  assert.match(careerTrack, /《AI 学习教练核心闭环 PRD》/);
  assert.match(careerTrack, /《20 分钟项目压力面试复盘》/);
});

test("learning workspace keeps live project evidence beside the curriculum", async () => {
  const [game, projectLab, styles] = await Promise.all([
    readFile(new URL("../app/learn/aipm-game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/aipm-project-lab.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/learn/aipm-game.css", import.meta.url), "utf8"),
  ]);
  assert.match(game, /aipm-live-project/);
  assert.match(game, /边学，边把判断/);
  assert.match(projectLab, /通常每个动作做 4 组/);
  assert.match(projectLab, /统一当作第 3 组/);
  assert.match(projectLab, /事实[\s\S]*当前判断[\s\S]*待验证/);
  assert.match(styles, /\.aipm-set-rail/);
});
