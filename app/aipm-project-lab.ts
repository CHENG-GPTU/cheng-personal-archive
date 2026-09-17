export type ProjectClaim = {
  status: "事实" | "当前判断" | "待验证";
  text: string;
};

export type AipmLiveProject = {
  id: "learning-system" | "fitness-companion";
  number: string;
  title: string;
  subtitle: string;
  stage: string;
  outcome: string;
  claims: ProjectClaim[];
};

export const aipmLiveProjects: AipmLiveProject[] = [
  {
    id: "learning-system",
    number: "PROJECT 01",
    title: "AIPM 闯关学习系统",
    subtitle: "你既是首位用户，也是负责取舍与验收的产品经理。",
    stage: "核心学习闭环 / 持续迭代",
    outcome: "完整端到端作品集案例",
    claims: [
      { status: "事实", text: "离开网站复制单条提示词，会丢失个人背景、当前关卡与验收标准。" },
      { status: "当前判断", text: "站内教学、练习、DeepSeek 评审和证据背包能把“看过”推进到“做出”。" },
      { status: "待验证", text: "30 关是否足以支持独立讲清问题、方案、AI 边界与项目取舍。" },
    ],
  },
  {
    id: "fitness-companion",
    number: "PROJECT 02",
    title: "健身训练陪伴 APP",
    subtitle: "从一个高频小问题切入：训练时忘记自己做到第几组。",
    stage: "问题发现 / MVP 定义",
    outcome: "可操作原型 + 5—10 人验证",
    claims: [
      { status: "事实", text: "本人通常每个动作做 4 组，经常忘记组数；忘记时会统一当作第 3 组。" },
      { status: "当前判断", text: "V1 用器械旁手机的大按钮手动确认，自动计组、计时并支持撤销；AI 只提出建议。" },
      { status: "待验证", text: "其他健身者是否同样高频遇到，以及低价订阅能否对应持续价值。" },
    ],
  },
];

export const fitnessMvpDecisions = [
  "iPhone 15 Pro Max 放在器械旁",
  "默认 4 组，点击一次完成本组",
  "休息支持正计时 / 倒计时",
  "误触可撤销，刷新可恢复",
  "蓝牙耳机播报关键状态",
  "手环与心率不作为 V1 前置依赖",
];
