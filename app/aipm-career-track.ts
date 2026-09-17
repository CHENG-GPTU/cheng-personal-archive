import type { AipmKnowledgeUnit } from "./aipm-knowledge-map";

export type AipmCareerPractice = {
  track: string;
  jdSignal: string;
  hiringEvidence: string;
  workSimulation: string;
  steps: [string, string, string];
  deliverable: string;
  interviewQuestion: string;
  acceptance: [string, string, string];
};

const chapterCareerFrames: Record<number, Pick<AipmCareerPractice, "track" | "jdSignal" | "hiringEvidence">> = {
  1: { track: "求职起跑与工作方法", jdSignal: "能把模糊目标转成有边界、可验收、可追溯的工作任务。", hiringEvidence: "项目章程、决定日志和证据索引，证明你不是只会听课或调用 AI。" },
  2: { track: "AIPM 岗位认知", jdSignal: "能识别 AI 适用边界，分清产品、项目、算法和研发各自负责的判断。", hiringEvidence: "岗位能力矩阵与赛道判断，证明你的转型方向不是追逐概念。" },
  3: { track: "与研发对话的技术底座", jdSignal: "能用产品语言解释模型、数据和多模态限制，并把限制写进方案与验收。", hiringEvidence: "技术链路图、失败分类和数据生命周期，证明你能参与技术方案评审。" },
  4: { track: "AI 方案设计与可控执行", jdSignal: "能在 Prompt、RAG、微调、Agent 和规则之间做选择，并设计权限、评测与停止条件。", hiringEvidence: "AI 方案包、评测集与可运行原型，证明你能把模型能力变成受控产品能力。" },
  5: { track: "AI 原生交互", jdSignal: "能处理不确定输出、等待、失败和恢复，而不是只设计理想路径。", hiringEvidence: "状态原型与异常恢复矩阵，证明你关注真实体验和系统韧性。" },
  6: { track: "商业化与成本", jdSignal: "能连接用户价值、调用成本、付费者和持续竞争优势。", hiringEvidence: "单位经济模型与商业假设，证明你不仅会列功能，也能考虑产品是否可持续。" },
  7: { track: "端到端产品落地", jdSignal: "能从需求、POC、PRD、架构、评测走到上线后的 Bad Case 迭代。", hiringEvidence: "完整 PRD、原型、评测报告与迭代记录，证明你具备初级 AIPM 的交付闭环。" },
  8: { track: "案例迁移与行业判断", jdSignal: "能拆解不同 AI 产品，并把通用方法迁移到具体行业与工作流。", hiringEvidence: "案例拆解、失败尸检与可恢复工作流，证明你能分析现成答案之外的问题。" },
  9: { track: "作品集与面试", jdSignal: "能以真实边界讲清个人判断、技术取舍、验证结果和下一步。", hiringEvidence: "一页简历、双项目证据索引与压力面试记录，证明你的材料经得起连续追问。" },
};

/**
 * 59 个单元各自必须留下不同的求职证据。课程结构可参考公开目录，
 * 但任务、产物与验收均围绕本项目重新编写，不复刻第三方正文。
 */
export const aipmCareerDeliverables: Record<string, string> = {
  "1-1": "《30 天学习—项目—求职证据链》一页图",
  "1-2": "《个人能力缺口与 30 关映射表》",
  "1-3": "《项目资料边界、决定日志与匿名化清单》",
  "2-1": "《规则 / 预测 / 生成 / Agent 任务分类表》",
  "2-2": "《确定性功能与生成式功能验收对比卡》",
  "2-3": "《AI PM 五项能力个人证据矩阵》",
  "2-4": "《产品、项目、算法、研发责任边界图》",
  "2-5": "《教育、健身与第三赛道机会对比表》",
  "3-1": "《LLM 从输入到输出的产品链路图》",
  "3-2": "《模型局限—用户影响—产品防线表》",
  "3-3": "《Prompt、检索与微调选择说明》",
  "3-4": "《评分失败样本根因分类报告》",
  "3-5": "《学习系统数据生命周期与权限图》",
  "3-6": "《健身多模态识别假设与人工确认规则》",
  "4-1": "《站内教练 Prompt v1 与正反示例集》",
  "4-2": "《关卡上下文清单、Token 预算与裁剪规则》",
  "4-3": "《提示注入、越权与隐私攻击测试表》",
  "4-4": "《课程知识库 RAG 链路与故障树》",
  "4-5": "《30 条 RAG 问答评测集与发布阈值》",
  "4-6": "《知识入库、更新、引用与删除 Pipeline》",
  "4-7": "《RAG / 微调 / Prompt 决策备忘录》",
  "4-8": "《教练 Agent 状态机、工具与停止条件》",
  "4-9": "《MCP / A2A / Skills 接入边界说明》",
  "4-10": "《一个开源 Agent 的可复现拆解报告》",
  "4-11": "《AI 编程任务契约与首个可运行切片》",
  "4-12": "《从需求到测试的 AI 编程交接包》",
  "4-13": "《开发环境权限、日志与验证 Harness 清单》",
  "4-14": "《Agent 执行—验证—停止 Loop 测试记录》",
  "4-15": "《学习教练 AI 技术选型 ADR》",
  "5-1": "《站内教练 LUI 对话状态原型》",
  "5-2": "《等待阶段、进度反馈与取消策略表》",
  "5-3": "《AI 失败、降级、重试与恢复矩阵》",
  "6-1": "《单次成功评审成本模型与质量护栏》",
  "6-2": "《个人订阅 / 机构席位商业假设画布》",
  "6-3": "《学习系统可持续优势与证据缺口图》",
  "7-1": "《核心假设 POC 计划与继续 / 停止门槛》",
  "7-2": "《AI 学习教练核心闭环 PRD》",
  "7-3": "《任务型学习助手产品方案与责任链》",
  "7-4": "《任务调度状态机与 Given-When-Then 验收集》",
  "7-5": "《离线评测、在线指标与人工校准方案》",
  "7-6": "《Bad Case 根因、修复与回归报告》",
  "7-7": "《双项目风险登记册与剩余风险说明》",
  "7-8": "《AI 学习系统逻辑架构与数据流图》",
  "7-9": "《三档定价假设与验证访谈提纲》",
  "8-1": "《AIGC 内容工作流案例拆解》",
  "8-2": "《企业知识库权限、引用与拒答方案》",
  "8-3": "《可信课程知识助手最小项目包》",
  "8-4": "《建议—代办—自动执行授权阶梯》",
  "8-5": "《可暂停、审批、恢复的单 Agent 演示》",
  "8-6": "《健身垂直 AI 责任边界与证据表》",
  "8-7": "《匿名跨部门客户问题闭环案例》",
  "8-8": "《一次真实 AI 失败的无责尸检报告》",
  "9-1": "《经历事实底稿与简历项目 bullet 库》",
  "9-2": "《双项目复现说明、演示入口与已知限制》",
  "9-3": "《10 道技术追问与项目证据链接》",
  "9-4": "《8 道方案选型与 Agent 交付答辩卡》",
  "9-5": "《产品设计与商业判断答题框架》",
  "9-6": "《20 分钟项目压力面试复盘》",
  "9-7": "《AIPM 官方信息源与每周决策更新模板》",
};

export function getAipmCareerPractice(unit: AipmKnowledgeUnit): AipmCareerPractice {
  const frame = chapterCareerFrames[unit.chapterIndex];
  const deliverable = aipmCareerDeliverables[unit.id];
  if (!frame || !deliverable) throw new Error(`Missing career practice for AIPM unit ${unit.id}`);

  return {
    ...frame,
    workSimulation: `你以初级 AIPM 身份参加「${unit.title}」工作评审。团队正在把判断落进你的 AIPM 学习系统或健身训练陪伴 APP；你需要基于证据完成这项决定：${unit.decision}`,
    steps: [
      `先用自己的话解释「${unit.title}」，并写出它会影响质量、成本、体验或风险中的哪一项。`,
      `回到两个真实项目完成这次应用：${unit.projectUse}`,
      `把事实、你的判断、仍待验证的内容分开写进「${deliverable}」，再交给站内 AI 教练反方追问。`,
    ],
    deliverable,
    interviewQuestion: unit.checkpoint,
    acceptance: [
      "至少包含一个由你做出的具体选择，并说明没有选择什么。",
      "关键主张能指向测试、用户行为、项目记录或可靠来源；不能补造结果。",
      "脱稿回答面试追问时，能在两分钟内说清结论、依据、边界和下一步。",
    ],
  };
}
