export type PortfolioProject = {
  slug: string;
  title: string;
  category: string;
  stage: string;
  description: string;
  href: string;
  visual: "coach" | "health" | "skill" | "archive" | "pet";
};

// Public, editorial content only. Do not import learning state or health records here.
export const portfolioProjects: PortfolioProject[] = [
  { slug: "aipm-coach", title: "AIPM 学习系统", category: "AI 应用产品", stage: "自用迭代 · 待外部验证", description: "从“知道要学什么，却不知道怎么做”出发，探索带讲解、练习与反馈的学习过程。", href: "/work/aipm-coach", visual: "coach" },
  { slug: "fitness-companion", title: "健身与减脂助手", category: "个人健康工具", stage: "原型探索 · 待场景验证", description: "从训练时忘记组数的真实困扰出发，探索更少打扰的训练记录与日常健康管理。", href: "/work/fitness-companion", visual: "health" },
  { slug: "project-retrospective", title: "项目复盘 Skill", category: "AI 工作流设计", stage: "v0.1 原型 · 待效果评测", description: "让 AI 按来源、决策与贡献梳理项目，为作品集和面试整理可信的表达材料。", href: "/work/project-retrospective", visual: "skill" },
  { slug: "ev-desktop", title: "EV · AI 桌面宠物", category: "桌面智能伙伴", stage: "本地版本迭代 · 待场景验证", description: "从桌面陪伴出发，探索语音唤醒、日常对话与受限电脑操作。以国风角色连接陪伴感与工具体验。", href: "/work/ev-desktop", visual: "pet" },
  { slug: "personal-archive", title: "个人作品与人生档案", category: "本网站 · 长期项目", stage: "框架迭代 · 持续记录", description: "让简历、作品与生活各有位置。今天是一份求职作品集，往后是不断续写的个人档案。", href: "/work/personal-archive", visual: "archive" },
];

export const lifeChapters = [
  { years: "大学时期—2025", tag: "探索", title: "先认识世界，也认识自己。", summary: "表演专业、时装周、服装设计与个人内容实践。", body: "2025 年本科毕业于大连工业大学表演专业。在校期间参加过时装周模特工作，学习过服装设计并完成成衣；有心理学学习及考研经历，也尝试过 TikTok、小红书与私域运营。", note: "个人、小规模探索，不作为正式互联网从业经历。" },
  { years: "2025—2026", tag: "工作", title: "在真实的协作里，学会推进。", summary: "约一年半助理工作，跨部门协调、任务推进与咨询协作。", body: "以院长助理为主要身份工作，期间短暂承担代理院长事务，后来参与董事长支持和咨询协作。已取得 PMP 认证，于 2026 年 7 月离职。", note: "同一段工作中的职责变化，不拆成多段任职；业务案例保持匿名。" },
  { years: "2026—此刻", tag: "正在写", title: "把问题，变成自己的产品实践。", summary: "全职转型 AI 产品，边学习、边做作品、边准备求职。", body: "以自己的学习与健身需求为起点，参与需求分析、方案取舍与体验反馈，借助 AI 完成文档和代码初稿。正在补齐可讲清的项目过程与验证证据。", note: "当前没有正式互联网或 AI 产品岗位经验；尚未验证的效果不写作成果。" },
];
