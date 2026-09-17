import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAipmIdentity } from "../../../aipm-identity";
import { callDeepSeek, parseJsonObject } from "../../../deepseek";
import { getAipmLevel } from "../../../aipm-levels";
import { getAipmContextualTerms, getAipmLessonGuide } from "../../../aipm-course-content";
import { getAipmKnowledgeUnits } from "../../../aipm-knowledge-map";
import { getAipmCareerPractice } from "../../../aipm-career-track";
import { ensureAipmSchema, getDb } from "../../../../db";
import { aipmEvidence, aipmLevelRecords, aipmMessages, aipmProfiles } from "../../../../db/schema";
import { getLocalAipmState, saveLocalAipmEvaluation, saveLocalAipmMessage, useLocalAipmStore } from "../../../../db/local-aipm-store";

export const dynamic = "force-dynamic";

type Evaluation = {
  understanding: number;
  application: number;
  expression: number;
  evidence: number;
  total: number;
  criticalOmission: boolean;
  feedback: string;
  nextAction: string;
  strengths: string[];
};

const learnerContext = `学员于 2025 年本科毕业于大连工业大学表演专业，已取得 PMP；曾在口腔机构担任院长助理约一年半，主要承担跨部门协调、任务推进和咨询协作。没有正式互联网或 AI 产品岗位经验，正在全职转向 AI 产品经理，杭州优先、苏州备选。不得编造或夸大经历；真实顾客、患者、同事、公司和业务数据必须匿名化。专业术语第一次出现时先用日常语言解释，再给出专业名称。`;

function clampScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(25, Math.round(score))) : 0;
}

function normalizeEvaluation(raw: unknown): Evaluation {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const understanding = clampScore(value.understanding);
  const application = clampScore(value.application);
  const expression = clampScore(value.expression);
  const evidence = clampScore(value.evidence);
  const total = understanding + application + expression + evidence;
  return {
    understanding,
    application,
    expression,
    evidence,
    total,
    criticalOmission: value.criticalOmission === true,
    feedback: typeof value.feedback === "string" ? value.feedback.slice(0, 1200) : "请根据验收标准继续修改。",
    nextAction: typeof value.nextAction === "string" ? value.nextAction.slice(0, 600) : "补齐最薄弱的一项后重新提交。",
    strengths: Array.isArray(value.strengths) ? value.strengths.filter((item): item is string => typeof item === "string").slice(0, 3) : [],
  };
}

async function saveMessage(ownerId: string, levelId: number, role: "user" | "assistant", content: string) {
  if (useLocalAipmStore()) return saveLocalAipmMessage(ownerId, levelId, role, content);
  const db = getDb();
  await db.insert(aipmMessages).values({ id: crypto.randomUUID(), ownerId, levelId, role, content, createdAt: new Date().toISOString() });
}

export async function POST(request: Request) {
  const identity = await getAipmIdentity();
  if (!identity) return NextResponse.json({ error: "请先通过专属访问码进入学习工作台。" }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: "coach" | "evaluate"; levelId?: number; message?: string; draft?: string } | null;
  const action = body?.action;
  const levelId = Number(body?.levelId);
  const draft = typeof body?.draft === "string" ? body.draft.trim().slice(0, 24_000) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 6_000) : "";
  if ((action !== "coach" && action !== "evaluate") || !Number.isInteger(levelId) || levelId < 1 || levelId > 30) {
    return NextResponse.json({ error: "请求参数无效。" }, { status: 400 });
  }
  let currentLevel = 1;
  if (useLocalAipmStore()) {
    currentLevel = (await getLocalAipmState(identity.ownerId)).currentLevel;
  } else {
    await ensureAipmSchema();
    const db = getDb();
    const [profile] = await db.select().from(aipmProfiles).where(eq(aipmProfiles.ownerId, identity.ownerId)).limit(1);
    currentLevel = profile?.currentLevel ?? 1;
  }
  if (levelId > currentLevel) return NextResponse.json({ error: "该关卡尚未解锁。" }, { status: 403 });
  const level = getAipmLevel(levelId);
  const lessonGuide = getAipmLessonGuide(levelId);
  const knowledgeUnits = getAipmKnowledgeUnits(levelId);
  const courseTerms = lessonGuide
    ? lessonGuide.termGroups.flatMap((group) => group.terms)
    : getAipmContextualTerms(levelId);
  const courseContext = [
    lessonGuide ? `本关学习目标：\n${lessonGuide.objectives.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    courseTerms.length ? `本关术语：\n${courseTerms.map((item) => `- ${item.term}：${item.plain}`).join("\n")}` : "",
    lessonGuide?.deepDives.length ? `本关精讲主题：\n${lessonGuide.deepDives.map((item) => `- ${item.title}：${item.paragraphs.join("")}`).join("\n")}` : "",
    knowledgeUnits.length ? `本关系统知识单元：\n${knowledgeUnits.map((item) => {
      const career = getAipmCareerPractice(item);
      return `- ${item.id} ${item.title}\n  原理：${item.learn.join("")}\n  产品判断：${item.decision}\n  项目应用：${item.projectUse}\n  模拟工作：${career.workSimulation}\n  求职产物：${career.deliverable}\n  面试追问：${career.interviewQuestion}`;
    }).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  const rubric = level.criticalChecks.map((item, index) => `${index + 1}. ${item}`).join("\n");

  try {
    if (action === "coach") {
      if (!message) return NextResponse.json({ error: "请先写下你的问题或当前判断。" }, { status: 400 });
      await saveMessage(identity.ownerId, levelId, "user", message);
      const prompt = `当前为第 ${level.id} 关「${level.title}」。本关目标：${level.promise}\n交付物：${level.deliverable}\n\n${courseContext}\n\n验收关键项：\n${rubric}\n学员当前草稿：\n${draft || "尚未提交草稿"}\n学员刚才说：\n${message}`;
      const { content, model } = await callDeepSeek({
        action,
        userId: identity.ownerId,
        messages: [
          { role: "system", content: `${learnerContext}\n你是站内 AIPM 闯关教练。优先依据当前关的学习目标、术语解释和精讲内容回答，并把专业术语放回当前任务。只处理当前关卡，不重排 30 天目标，不跳关，不代写完整交付物。每轮先指出一个具体问题并说明原因，可以给一个微型示例，然后只问一个最关键的问题。若信息涉及可识别个人或公司数据，先提醒匿名化。` },
          { role: "user", content: prompt },
        ],
      });
      await saveMessage(identity.ownerId, levelId, "assistant", content);
      return NextResponse.json({ reply: content, model });
    }

    if (draft.length < 120) return NextResponse.json({ error: "交付物至少需要 120 字，先把你的真实判断写完整。" }, { status: 400 });
    const system = `${learnerContext}\n你是严格但公平的 AIPM 关卡评审。按理解、应用、表达、证据四项各 0—25 分。理解项必须检查学员是否真正使用了本关系统知识，而不是堆术语。总分必须等于四项之和。只有总分至少 80 且不存在关键缺项才通过。关键缺项包括：未回应本关交付物、核心判断无证据、编造经历、泄露可识别隐私、完全由 AI 代写且没有学员判断。请只返回 JSON，不要 Markdown。JSON 示例：{"understanding":20,"application":18,"expression":21,"evidence":16,"criticalOmission":false,"feedback":"具体反馈","nextAction":"只写一个最优先修改动作","strengths":["一项真实优点"]}`;
    const user = `第 ${level.id} 关「${level.title}」\n目标：${level.promise}\n场景题：${level.scenario}\n交付物：${level.deliverable}\n关键验收项：\n${rubric}\n\n${courseContext}\n\n学员提交：\n${draft}`;
    const result = await callDeepSeek({ action, userId: identity.ownerId, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
    const evaluation = normalizeEvaluation(parseJsonObject(result.content));
    const passed = evaluation.total >= 80 && !evaluation.criticalOmission;
    const now = new Date().toISOString();
    if (useLocalAipmStore()) {
      await saveLocalAipmEvaluation({ ownerId: identity.ownerId, levelId, draft, scoreJson: JSON.stringify(evaluation), feedback: evaluation.feedback, passed, project: level.phase, title: level.deliverable });
    } else {
      const db = getDb();
      await db.insert(aipmLevelRecords).values({
        ownerId: identity.ownerId, levelId, status: passed ? "passed" : "revise", draft,
        scoreJson: JSON.stringify(evaluation), feedback: evaluation.feedback,
        evidence: passed ? draft : null, passedAt: passed ? now : null, updatedAt: now,
      }).onConflictDoUpdate({
        target: [aipmLevelRecords.ownerId, aipmLevelRecords.levelId],
        set: { status: passed ? "passed" : "revise", draft, scoreJson: JSON.stringify(evaluation), feedback: evaluation.feedback, evidence: passed ? draft : null, passedAt: passed ? now : null, updatedAt: now },
      });
      if (passed) {
        const nextLevel = Math.min(30, Math.max(currentLevel, levelId + 1));
        const profileNow = new Date().toISOString();
        await db.insert(aipmProfiles).values({ ownerId: identity.ownerId, currentLevel: nextLevel, createdAt: profileNow, updatedAt: profileNow }).onConflictDoUpdate({
          target: aipmProfiles.ownerId,
          set: { currentLevel: nextLevel, updatedAt: profileNow },
        });
        const evidenceId = `${identity.ownerId}-${levelId}`;
        await db.insert(aipmEvidence).values({ id: evidenceId, ownerId: identity.ownerId, levelId, project: level.phase, title: level.deliverable, content: draft, publicSelected: false, createdAt: now, updatedAt: now }).onConflictDoUpdate({
          target: aipmEvidence.id,
          set: { title: level.deliverable, content: draft, updatedAt: now },
        });
      }
    }
    return NextResponse.json({ evaluation, passed, model: result.model, nextLevel: passed ? Math.min(30, levelId + 1) : levelId });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "AI 教练暂时不可用。";
    const status = messageText === "DEEPSEEK_NOT_CONFIGURED" ? 503 : 502;
    return NextResponse.json({ error: status === 503 ? "DeepSeek 密钥尚未在服务器中配置。你的草稿没有丢失。" : `AI 教练暂时不可用：${messageText}` }, { status });
  }
}
