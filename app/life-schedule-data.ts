export const LIFE_SCHEDULE_STORAGE_KEY = "life20-schedule-state-v1";

export type LifeScheduleCategory =
  | "aipm"
  | "fitness"
  | "media"
  | "life"
  | "free";

export type LifeScheduleMode = "training" | "recovery";

export interface LifeScheduleTask {
  id: string;
  start: string;
  end: string;
  title: string;
  detail?: string;
  category: LifeScheduleCategory;
}

export interface LifeScheduleDay {
  day: number;
  date: string;
  monthDay: string;
  weekday: string;
  cycle: number;
  cycleDay: number;
  mode: LifeScheduleMode;
  training: string;
  trainingShort: string;
  aipmMilestone: string;
  mediaMilestone: string;
  tasks: LifeScheduleTask[];
}

export const lifeScheduleCategories: Record<
  LifeScheduleCategory,
  { label: string; shortLabel: string }
> = {
  aipm: { label: "AIPM 学习", shortLabel: "AIPM" },
  fitness: { label: "健身减脂", shortLabel: "训练" },
  media: { label: "穿搭自媒体", shortLabel: "内容" },
  life: { label: "生活恢复", shortLabel: "生活" },
  free: { label: "自由时间", shortLabel: "自由" },
};

const trainingLabels = [
  {
    full: "胸＋三头＋爬楼有氧",
    short: "胸 / 三头",
  },
  {
    full: "背＋二头＋爬楼有氧",
    short: "背 / 二头",
  },
  {
    full: "肩＋腹＋爬楼有氧",
    short: "肩 / 腹",
  },
  {
    full: "腿部训练＋低至中强度爬楼",
    short: "腿部",
  },
  {
    full: "完全恢复：轻松散步与拉伸",
    short: "恢复",
  },
] as const;

const aipmMilestones = [
  "完成个人 AI 工作说明书，并收集 10 个杭州 / 苏州 AIPM 岗位",
  "拆解岗位要求，做出一张“已有能力 / 能力缺口 / 证据”地图",
  "掌握用户、场景、痛点、需求，输出一页真实问题定义",
  "复盘现有学习网站，整理需求、决策与迭代证据",
  "确定旗舰项目“AI 穿搭健身内容助手”，完成项目一页纸",
  "建立目标用户画像，写出核心场景与待验证假设",
  "完成访谈提纲，并进行至少 2 次目标用户访谈",
  "累计完成 5 次访谈，整理洞察、原话与机会点",
  "拆解 3—5 个竞品，完成 MVP 功能优先级与用户流程",
  "完成结构清晰、可评审的 PRD V1",
  "完成信息架构和核心用户流程图",
  "完成低保真原型，跑通一条完整核心任务",
  "完成可点击的高保真原型，并自测关键路径",
  "设计 AI 工作流、提示词与 20 条评测集",
  "邀请 3—5 人测试，根据证据完成产品 V2 迭代",
  "搭建旗舰项目案例结构，补齐过程证据",
  "完成旗舰项目案例初稿：问题、方案、验证与反思",
  "将现有 AIPM 学习系统整理为第二个轻量项目案例",
  "完成简历、作品集首页、自我介绍和 20—30 个岗位清单",
  "完成两次模拟面试，开始第一轮精准投递",
] as const;

const mediaMilestones = [
  "收藏 20 条高质量穿搭健身内容，拆解其中 3 条的构图、灯光与机位",
  "练习固定机位和全身取景，拍 3 组 10 秒测试片段",
  "练习走位、转身和 3 镜头顺序，不追求发布",
  "完成第 1 组正式拍摄，保留原片与布光记录",
  "复盘素材并完成剪辑；质量达标再发布",
  "建立参考库 2.0，明确自己的黑灰穿搭视觉关键词",
  "练习远景 / 中景 / 特写组合，固定一套拍摄参数",
  "练习训练动作镜头与自然转场，剪出 20 秒样片",
  "完成第 2 组正式拍摄，对比第一组的画面提升",
  "完成剪辑、封面与文案，只发布自己愿意保留的版本",
  "拆解 3 位同体型创作者，提取显高、显瘦的画面方法",
  "练习正侧逆三角度和人物留白，形成个人机位清单",
  "把穿搭展示与训练动作编成一条完整分镜",
  "完成第 3 组正式拍摄，主动控制光线和人物比例",
  "复盘前三组数据与素材，确定一个可重复的内容模板",
  "更新高质量参考库，确定下一阶段的系列主题",
  "在同一地点拍出 3 种景别，减少试错时间",
  "练习开场 3 秒、动作衔接和结尾定格",
  "完成第 4 组正式拍摄，按成熟模板一次拍全",
  "完成最终剪辑与 20 天复盘；质量达标再发布",
] as const;

const trainingTemplate: Omit<LifeScheduleTask, "id">[] = [
  { start: "08:30", end: "08:50", title: "起床、喝水、称重与整理", category: "life" },
  {
    start: "08:50",
    end: "09:15",
    title: "回顾昨天，确定今天唯一交付物",
    category: "aipm",
  },
  { start: "09:15", end: "09:30", title: "换衣与前往爬楼地点", category: "fitness" },
  {
    start: "09:30",
    end: "10:30",
    title: "空腹爬楼有氧及往返",
    detail: "腿部训练日保持低至中等强度；头晕立即停止。",
    category: "fitness",
  },
  { start: "10:30", end: "11:00", title: "洗澡与缓冲", category: "life" },
  { start: "11:00", end: "12:30", title: "做饭与午餐", category: "life" },
  { start: "12:30", end: "12:50", title: "20 分钟午睡", category: "life" },
  { start: "12:50", end: "13:40", title: "概念学习与案例拆解", category: "aipm" },
  { start: "13:40", end: "13:50", title: "离屏休息", category: "life" },
  { start: "13:50", end: "14:40", title: "AIPM 动手练习", category: "aipm" },
  { start: "14:40", end: "15:00", title: "准备、通勤与热身", category: "fitness" },
  { start: "15:00", end: "16:30", title: "四分化力量训练", category: "fitness" },
  { start: "16:30", end: "17:00", title: "回家、洗澡与恢复", category: "life" },
  { start: "17:00", end: "18:30", title: "做饭与晚餐", category: "life" },
  { start: "18:30", end: "19:20", title: "AIPM 项目制作 · 第一段", category: "aipm" },
  { start: "19:20", end: "19:30", title: "离屏休息", category: "life" },
  { start: "19:30", end: "20:20", title: "AIPM 项目制作 · 第二段", category: "aipm" },
  { start: "20:20", end: "21:00", title: "整理作品证据与当日复盘", category: "aipm" },
  { start: "21:00", end: "22:00", title: "穿搭审美与拍摄训练", category: "media" },
  {
    start: "22:00",
    end: "00:00",
    title: "自由娱乐、社交与放松",
    detail: "23:30 后降低屏幕刺激，00:00 入睡。",
    category: "free",
  },
];

const recoveryTemplate: Omit<LifeScheduleTask, "id">[] = [
  { start: "08:30", end: "09:00", title: "起床、喝水、称重与整理", category: "life" },
  { start: "09:00", end: "11:00", title: "AIPM 深度工作", category: "aipm" },
  { start: "11:00", end: "12:30", title: "做饭与午餐", category: "life" },
  { start: "12:30", end: "12:50", title: "20 分钟午睡", category: "life" },
  { start: "12:50", end: "15:20", title: "AIPM 项目冲刺", category: "aipm" },
  {
    start: "15:20",
    end: "16:00",
    title: "轻松散步与拉伸",
    detail: "恢复日不爬楼、不做力量训练。",
    category: "fitness",
  },
  { start: "16:00", end: "17:00", title: "拍摄专项学习", category: "media" },
  { start: "17:00", end: "18:30", title: "做饭与晚餐", category: "life" },
  { start: "18:30", end: "20:30", title: "AIPM 项目交付与复盘", category: "aipm" },
  { start: "20:30", end: "22:00", title: "整理素材、剪辑与质量判断", category: "media" },
  { start: "22:00", end: "00:00", title: "完整自由时间，00:00 入睡", category: "free" },
];

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function buildTasks(day: number, mode: LifeScheduleMode) {
  const template = mode === "recovery" ? recoveryTemplate : trainingTemplate;
  return template.map((task, index) => ({
    ...task,
    id: `day-${String(day).padStart(2, "0")}-task-${String(index + 1).padStart(2, "0")}`,
  }));
}

export const lifeScheduleDays: LifeScheduleDay[] = Array.from({ length: 20 }, (_, index) => {
  const day = index + 1;
  const cycleDay = (index % 5) + 1;
  const cycle = Math.floor(index / 5) + 1;
  const mode: LifeScheduleMode = cycleDay === 5 ? "recovery" : "training";
  const date = new Date(Date.UTC(2026, 6, 28 + index));
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getUTCDate()).padStart(2, "0");
  const isoDate = `${date.getUTCFullYear()}-${month}-${dayOfMonth}`;
  const training = trainingLabels[cycleDay - 1];

  return {
    day,
    date: isoDate,
    monthDay: `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`,
    weekday: weekdays[date.getUTCDay()],
    cycle,
    cycleDay,
    mode,
    training: training.full,
    trainingShort: training.short,
    aipmMilestone: aipmMilestones[index],
    mediaMilestone: mediaMilestones[index],
    tasks: buildTasks(day, mode),
  };
});

export const LIFE_SCHEDULE_START = "2026-07-28";
export const LIFE_SCHEDULE_END = "2026-08-16";
