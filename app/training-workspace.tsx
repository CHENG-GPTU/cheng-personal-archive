"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { trainingDays, type TrainingDay } from "./training-data";

const STORAGE_KEY = "aipm-v3-state";
const STATE_VERSION = 3;
const STATE_EVENT = "aipm-v3-state-change";

const stepLabels = ["今日简报", "概念学习", "正反示例", "动手练习", "AI 对练", "提交证据", "复盘过关"] as const;

type DayRecord = {
  highestStep: number;
  completed: boolean;
  practiceDraft: string;
  aiFeedback: string;
  evidence: string;
  evaluationChecks: boolean[];
  reflections: string[];
};

type TrainingState = {
  version: number;
  unlockedDay: number;
  selectedDay: number;
  days: Record<string, DayRecord>;
};

type TrainingWorkspaceProps = {
  onHome: () => void;
};

const createDayRecord = (): DayRecord => ({
  highestStep: 0,
  completed: false,
  practiceDraft: "",
  aiFeedback: "",
  evidence: "",
  evaluationChecks: [],
  reflections: [],
});

const createInitialState = (): TrainingState => ({
  version: STATE_VERSION,
  unlockedDay: 1,
  selectedDay: 1,
  days: {},
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function restoreState(raw: string | null): TrainingState {
  if (!raw) return createInitialState();

  try {
    const parsed = JSON.parse(raw) as Partial<TrainingState>;
    if (parsed.version !== STATE_VERSION || !parsed.days || typeof parsed.days !== "object") {
      return createInitialState();
    }

    const maximumDay = Math.max(1, trainingDays.length);
    const days: Record<string, DayRecord> = {};

    Object.entries(parsed.days).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      const record = value as Partial<DayRecord>;
      days[key] = {
        highestStep: clamp(Number(record.highestStep) || 0, 0, stepLabels.length - 1),
        completed: record.completed === true,
        practiceDraft: typeof record.practiceDraft === "string" ? record.practiceDraft : "",
        aiFeedback: typeof record.aiFeedback === "string" ? record.aiFeedback : "",
        evidence: typeof record.evidence === "string" ? record.evidence : "",
        evaluationChecks: Array.isArray(record.evaluationChecks)
          ? record.evaluationChecks.map((item) => item === true)
          : [],
        reflections: Array.isArray(record.reflections)
          ? record.reflections.map((item) => (typeof item === "string" ? item : ""))
          : [],
      };
    });

    let completedThrough = 0;
    for (const day of trainingDays) {
      if (day.day !== completedThrough + 1 || !days[String(day.day)]?.completed) break;
      completedThrough = day.day;
    }
    const unlockedDay = Math.min(maximumDay, completedThrough + 1);
    const selectedDay = clamp(Number(parsed.selectedDay) || 1, 1, unlockedDay);

    Object.entries(days).forEach(([key, record]) => {
      if (Number(key) > unlockedDay && record.completed) {
        days[key] = { ...record, completed: false };
      }
    });

    return { version: STATE_VERSION, unlockedDay, selectedDay, days };
  } catch {
    return createInitialState();
  }
}

function readStoredState() {
  if (typeof window === "undefined") return createInitialState();
  try {
    return restoreState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return createInitialState();
  }
}

function getRecord(state: TrainingState, day: number) {
  return state.days[String(day)] ?? createDayRecord();
}

function buildCoachPrompt(day: TrainingDay, draft: string) {
  const evaluation = day.evaluation.map((item, index) => `${index + 1}. ${item}`).join("\n");
  const workingDraft = draft.trim() || "我还没有写出草稿。请先用一个问题帮我启动，但不要直接替我完成。";

  return `你现在是我的 AI 产品经理训练教练。请完整遵守下面的背景、边界和流程，不要另起一套计划。

【我的固定背景】
- 我于 2025 年本科毕业于大连工业大学表演专业，已取得 PMP。
- 我在口腔机构工作约一年半，做过院长助理，主要承担跨部门协调、任务推进和咨询协作；这不是正式互联网或 AI 产品岗位经验。
- 我参加过时装周模特工作，学习过服装设计并完成过成衣，也做过 TikTok、小红书和私域运营的个人、小规模尝试。
- 我正在全职转型，杭州优先、苏州备选，目标以 AI 产品经理为主，同时接受承担项目推进职责的岗位。
- 我的优势是协调、推进和用户沟通；短板是 AI 工具使用仍较浅，原型、数据分析、技术系统和正式产品文档实践不足。
- 我正在执行固定的 30 天冲刺：保留 60 个训练单元，默认每天完成 2 个；第 30 天前完成端到端项目、小型案例、作品集、简历和一次模拟面试。

【绝对边界】
1. 不要重新制定、改写或延长我的学习计划。
2. 不要把对话带到其他训练单元、其他主题或泛泛的职业规划。
3. 不要一上来给标准答案，也不要替我完成交付物。
4. 只围绕今天的任务训练我；一次只问一个最关键的问题，等我回答后再继续。
5. 当我的表达模糊时，先指出缺少的是对象、场景、目标、约束、证据还是验收标准，再引导我补齐。
6. 每次第一次使用专业术语时，先用日常语言解释，再说明专业名称；不得假设我已经懂产品或 AI 术语。
7. 如果我的草稿出现真实患者、同事、公司或业务信息，先提醒我匿名化；不要复述或扩散可识别信息。

【今天的训练上下文】
- 自然日：Day ${String(Math.ceil(day.day / 2)).padStart(2, "0")} / 30
- 训练单元：Unit ${String(day.day).padStart(2, "0")} / 60
- 阶段：${day.phase}
- 主题：${day.title}
- 今日承诺：${day.promise}
- AI 对练目标：${day.aiObjective}
- 对练指令：${day.aiInstructions}
- 最终交付物：${day.deliverable}

【我的当前草稿】
${workingDraft}

【本次评价标准】
${evaluation}

【你现在应该做什么】
先用不超过 120 字复述你对“今天要训练什么、我当前卡在哪里”的理解；然后只提出第一个澄清问题。后续每轮都按“指出一个问题 → 解释为什么 → 只问一个问题”的方式推进。等我明确说“请评分”后，再按上述评价标准逐项给出 1—5 分、证据、一个最优先修改动作，并让我自己改写。`;
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy-failed");
}

export default function TrainingWorkspace({ onHome }: TrainingWorkspaceProps) {
  const [trainingState, setTrainingState] = useState<TrainingState>(() => (
    readStoredState()
  ));
  const [activeStep, setActiveStep] = useState(() => {
    const restored = readStoredState();
    const restoredRecord = getRecord(restored, restored.selectedDay);
    return restoredRecord.completed ? 0 : restoredRecord.highestStep;
  });
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [notice, setNotice] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let noticeFrame = 0;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trainingState));
      window.dispatchEvent(new Event(STATE_EVENT));
    } catch {
      noticeFrame = window.requestAnimationFrame(() => {
        setNotice("浏览器未能保存进度。请检查是否禁用了网站存储或设备空间已满，再继续训练。");
      });
    }
    return () => window.cancelAnimationFrame(noticeFrame);
  }, [ready, trainingState]);

  const selectedDay = trainingDays.find((item) => item.day === trainingState.selectedDay) ?? trainingDays[0];
  const calendarDay = Math.min(30, Math.ceil(selectedDay.day / 2));
  const dayRecord = getRecord(trainingState, selectedDay.day);
  const completedDays = trainingDays.filter((item) => getRecord(trainingState, item.day).completed).length;
  const overallProgress = Math.round((completedDays / Math.max(1, trainingDays.length)) * 100);
  const coachPrompt = useMemo(
    () => buildCoachPrompt(selectedDay, dayRecord.practiceDraft),
    [selectedDay, dayRecord.practiceDraft],
  );
  const selectedWeekStart = Math.floor((selectedDay.day - 1) / 7) * 7 + 1;
  const visibleDays = showFullCalendar
    ? trainingDays
    : trainingDays.filter((item) => item.day >= selectedWeekStart && item.day < selectedWeekStart + 7);

  const updateDayRecord = (updates: Partial<DayRecord>) => {
    setTrainingState((current) => {
      const currentRecord = getRecord(current, selectedDay.day);
      return {
        ...current,
        days: {
          ...current.days,
          [String(selectedDay.day)]: { ...currentRecord, ...updates },
        },
      };
    });
  };

  const chooseDay = (day: number) => {
    if (day > trainingState.unlockedDay) return;
    const record = getRecord(trainingState, day);
    setTrainingState((current) => ({ ...current, selectedDay: day }));
    setActiveStep(record.completed ? 0 : record.highestStep);
    setValidationMessage("");
    setNotice("");
    window.requestAnimationFrame(() => document.getElementById("v3-training-content")?.focus());
  };

  const chooseStep = (step: number) => {
    const highestAvailable = dayRecord.completed ? stepLabels.length - 1 : dayRecord.highestStep;
    if (step > highestAvailable) return;
    setActiveStep(step);
    setValidationMessage("");
    setNotice("");
  };

  const validateCurrentStep = () => {
    if (activeStep === 3 && dayRecord.practiceDraft.trim().length < 80) {
      return "请先写下至少 80 个字的真实草稿。无需完美，但要把对象、目标和你的初步判断写清楚。";
    }
    if (activeStep === 4 && dayRecord.aiFeedback.trim().length < 30) {
      return "请完成一次 AI 对练，并用至少 30 个字记录关键反馈、你的判断和修改动作。";
    }
    if (activeStep === 5 && dayRecord.evidence.trim().length < 40) {
      return "请用至少 40 个字记录交付物位置、关键结果和一个可核验的决策证据。";
    }
    if (activeStep === 5 && selectedDay.evaluation.some((_, index) => !dayRecord.evaluationChecks[index])) {
      return "请按真实结果完成全部三项过关自检；不满足时先回去修改交付物。";
    }
    if (activeStep === 6 && dayRecord.practiceDraft.trim().length < 80) {
      return "你的练习草稿还没有达到过关标准。请返回“动手练习”，补齐对象、目标和初步判断。";
    }
    if (activeStep === 6 && dayRecord.aiFeedback.trim().length < 30) {
      return "AI 对练记录还没有达到过关标准。请返回“AI 对练”，补充反馈、判断和修改动作。";
    }
    if (activeStep === 6 && dayRecord.evidence.trim().length < 40) {
      return "交付证据还没有达到过关标准。请返回“提交证据”，补充位置、结果和决策证据。";
    }
    if (activeStep === 6 && selectedDay.evaluation.some((_, index) => !dayRecord.evaluationChecks[index])) {
      return "三项验收自检尚未全部通过。请返回“提交证据”逐项核对，不能用复盘代替交付。";
    }
    if (
      activeStep === 6
      && selectedDay.reflection.some((_, index) => (dayRecord.reflections[index] ?? "").trim().length < 40)
    ) {
      return "请回答全部复盘问题，每题至少 40 个字，并写出事实和下一次的具体改进动作。";
    }
    return "";
  };

  const continueTraining = () => {
    if (dayRecord.completed) {
      const nextDay = selectedDay.day + 1;
      if (nextDay <= trainingState.unlockedDay && trainingDays.some((item) => item.day === nextDay)) {
        chooseDay(nextDay);
      }
      return;
    }

    if (activeStep < dayRecord.highestStep) {
      setActiveStep(activeStep + 1);
      setValidationMessage("");
      return;
    }

    const error = validateCurrentStep();
    if (error) {
      setValidationMessage(error);
      return;
    }

    if (activeStep < stepLabels.length - 1) {
      updateDayRecord({ highestStep: activeStep + 1 });
      setActiveStep(activeStep + 1);
      setValidationMessage("");
      setNotice(`第 ${activeStep + 1} 步已完成。现在只做下一步。`);
      return;
    }

    const nextDay = selectedDay.day + 1;
    const hasNextDay = trainingDays.some((item) => item.day === nextDay);
    setTrainingState((current) => ({
      ...current,
      unlockedDay: hasNextDay ? Math.max(current.unlockedDay, nextDay) : current.unlockedDay,
      days: {
        ...current.days,
        [String(selectedDay.day)]: { ...getRecord(current, selectedDay.day), completed: true },
      },
    }));
    setValidationMessage("");
    setNotice(hasNextDay ? `训练单元 ${selectedDay.day} 已过关，单元 ${nextDay} 已解锁。` : "60 个训练单元已全部完成。");
  };

  const handleCopyAndOpen = async () => {
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    try {
      await copyText(coachPrompt);
      setNotice("完整上下文已复制，并已请求打开 ChatGPT。请在新页面直接粘贴；如果没有出现新页面，请手动打开 ChatGPT。");
    } catch {
      setNotice("自动复制失败。请使用下面的“只复制完整指令”按钮重试，或手动全选复制。 ");
    }
  };

  if (!ready || !selectedDay) {
    return (
      <main className="v3-loading" aria-busy="true">
        <p>正在恢复你的训练进度…</p>
      </main>
    );
  }

  return (
    <div className="v3-workspace">
      <header className="v3-header">
        <div className="v3-brand-block">
          <button className="v3-home-button" type="button" onClick={onHome} aria-label="返回首页">
            AIPM / 30D · 60U
          </button>
          <p className="v3-edition">STRICT CAMP · V3</p>
        </div>

        <div className="v3-overall-status" aria-label={`总进度 ${overallProgress}%`}>
          <span>{completedDays} / {trainingDays.length} UNITS</span>
          <progress max={trainingDays.length} value={completedDays}>{overallProgress}%</progress>
          <strong>{overallProgress}%</strong>
        </div>
      </header>

      <div className="v3-layout">
        <nav className="v3-day-navigation" aria-label="60 个训练单元索引">
          <div className="v3-nav-heading">
            <p>TRAINING INDEX</p>
            <h2>训练单元</h2>
            <button
              className="v3-calendar-toggle"
              type="button"
              aria-expanded={showFullCalendar}
              aria-controls="v3-day-list"
              onClick={() => setShowFullCalendar((current) => !current)}
            >
              {showFullCalendar ? "只看当前批次" : "查看完整 60 单元"}
            </button>
          </div>
          <ol className="v3-day-list" id="v3-day-list">
            {visibleDays.map((item) => {
              const locked = item.day > trainingState.unlockedDay;
              const completed = getRecord(trainingState, item.day).completed;
              const selected = item.day === selectedDay.day;
              return (
                <li className="v3-day-item" key={item.day}>
                  <button
                    className="v3-day-button"
                    type="button"
                    disabled={locked}
                    aria-current={selected ? "page" : undefined}
                    aria-label={`第 ${item.day} 个训练单元，对应自然日 ${Math.ceil(item.day / 2)}，${item.title}，${locked ? "未解锁" : completed ? "已完成" : "已解锁"}`}
                    onClick={() => chooseDay(item.day)}
                  >
                    <span className="v3-day-number">{String(item.day).padStart(2, "0")}</span>
                    <span className="v3-day-name">{item.title}</span>
                    <span className="v3-day-state" aria-hidden="true">
                      {locked ? "LOCK" : completed ? "DONE" : selected ? "NOW" : "OPEN"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="v3-main" id="v3-training-content" tabIndex={-1}>
          <section className="v3-day-hero" aria-labelledby="v3-day-title">
            <div className="v3-day-kicker">
              <span>DAY {String(calendarDay).padStart(2, "0")} / 30</span>
              <span>UNIT {String(selectedDay.day).padStart(2, "0")} / 60</span>
              <span>{selectedDay.phase}</span>
              <span>{selectedDay.duration}</span>
            </div>
            <h1 id="v3-day-title">{selectedDay.title}</h1>
            <p>{selectedDay.promise}</p>
          </section>

          <nav className="v3-step-navigation" aria-label="今日 7 步训练流程">
            <ol className="v3-step-list">
              {stepLabels.map((label, index) => {
                const available = dayRecord.completed || index <= dayRecord.highestStep;
                const complete = dayRecord.completed || index < dayRecord.highestStep;
                return (
                  <li className="v3-step-item" key={label}>
                    <button
                      className="v3-step-button"
                      type="button"
                      disabled={!available}
                      aria-current={activeStep === index ? "step" : undefined}
                      aria-label={`第 ${index + 1} 步，${label}，${complete ? "已完成" : available ? "当前可做" : "未解锁"}`}
                      onClick={() => chooseStep(index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{label}</strong>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section className="v3-lesson" aria-labelledby="v3-step-title">
            <header className="v3-lesson-header">
              <p>STEP {String(activeStep + 1).padStart(2, "0")} / 07</p>
              <h2 id="v3-step-title">{stepLabels[activeStep]}</h2>
            </header>

            {activeStep === 0 && (
              <div className="v3-brief-panel">
                <p className="v3-lead">今天只解决一个问题：{selectedDay.promise}</p>
                <dl className="v3-brief-facts">
                  <div><dt>今日主题</dt><dd>{selectedDay.title}</dd></div>
                  <div><dt>预计投入</dt><dd>{selectedDay.duration}</dd></div>
                  <div><dt>过关证据</dt><dd>{selectedDay.deliverable}</dd></div>
                </dl>
                <aside className="v3-rule-note" aria-label="严格训练规则">
                  <h3>今天如何推进</h3>
                  <p>一次只完成当前一步。先自己思考，再让 AI 追问；留下真实证据后，下一个训练单元才会解锁。</p>
                </aside>
              </div>
            )}

            {activeStep === 1 && (
              <article className="v3-concept-panel">
                <p className="v3-eyebrow">CORE CONCEPT</p>
                <h3>{selectedDay.conceptTitle}</h3>
                <div className="v3-concept-body">
                  {(Array.isArray(selectedDay.conceptBody) ? selectedDay.conceptBody : [selectedDay.conceptBody])
                    .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <h4>必须记住</h4>
                <ul className="v3-key-point-list">
                  {selectedDay.keyPoints.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </article>
            )}

            {activeStep === 2 && (
              <div className="v3-example-grid">
                <article className="v3-example-card v3-example-bad">
                  <p>BAD / 模糊表达</p>
                  <h3>看起来像在提问，其实没有可执行上下文</h3>
                  <blockquote>{selectedDay.badExample}</blockquote>
                </article>
                <article className="v3-example-card v3-example-good">
                  <p>GOOD / 可执行表达</p>
                  <h3>对象、目标、约束和输出都清楚</h3>
                  <blockquote>{selectedDay.goodExample}</blockquote>
                </article>
                <p className="v3-example-hint">先说出两者最关键的差别，再进入练习。答案不需要写在网站里，但要能用自己的话解释。</p>
              </div>
            )}

            {activeStep === 3 && (
              <div className="v3-practice-panel">
                <div className="v3-practice-brief">
                  <h3>练习任务</h3>
                  <p>{selectedDay.practiceBrief}</p>
                  <ol>
                    {selectedDay.practiceSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </div>
                <div className="v3-starter-template">
                  <div>
                    <h3>起步模板</h3>
                    <p>模板只是脚手架，请替换成你的真实内容。</p>
                  </div>
                  <pre>{selectedDay.starterTemplate}</pre>
                  <button
                    type="button"
                    className="v3-template-button"
                    onClick={() => {
                      if (dayRecord.practiceDraft.trim() && !window.confirm("用起步模板覆盖你已经写下的草稿吗？")) return;
                      updateDayRecord({ practiceDraft: selectedDay.starterTemplate });
                      setNotice("起步模板已放入编辑区，请把占位内容替换成你的真实思考。");
                    }}
                  >
                    使用模板起步
                  </button>
                </div>
                <label className="v3-field" htmlFor="v3-practice-draft">
                  <span>我的第一版草稿</span>
                  <small>先自己写，不要先问 AI。系统会自动保存。</small>
                  <textarea
                    id="v3-practice-draft"
                    rows={14}
                    value={dayRecord.practiceDraft}
                    onChange={(event) => updateDayRecord({ practiceDraft: event.target.value })}
                    placeholder="在这里写下你的真实思考。哪怕不专业，也先把头脑里的内容说出来……"
                  />
                </label>
              </div>
            )}

            {activeStep === 4 && (
              <div className="v3-ai-panel">
                <div className="v3-ai-intro">
                  <p className="v3-eyebrow">CONTEXT-LOCKED COACH</p>
                  <h3>让 AI 训练你，不让 AI 带偏你</h3>
                  <p>{selectedDay.aiObjective}</p>
                  <p>下面的指令已经包含你的事实背景、30 天 / 60 单元固定计划、当前目标和刚才的草稿，并明确禁止 AI 另做计划。</p>
                </div>

                <div className="v3-prompt-box">
                  <label htmlFor="v3-coach-prompt">本日完整上下文指令</label>
                  <textarea id="v3-coach-prompt" rows={18} value={coachPrompt} readOnly />
                  <div className="v3-prompt-actions">
                    <button className="v3-primary-button" type="button" onClick={handleCopyAndOpen}>
                      一键复制并打开 ChatGPT
                    </button>
                    <button
                      className="v3-secondary-button"
                      type="button"
                      onClick={async () => {
                        try {
                          await copyText(coachPrompt);
                          setNotice("完整上下文已复制。请粘贴到同一轮 ChatGPT 对话中继续训练。");
                        } catch {
                          setNotice("复制失败，请在指令框内手动全选复制。");
                        }
                      }}
                    >
                      只复制完整指令
                    </button>
                  </div>
                </div>

                <label className="v3-field" htmlFor="v3-ai-feedback">
                  <span>记录 AI 反馈与我的修改决定</span>
                  <small>不必粘贴整段聊天，只记录最关键的反馈、你是否认同，以及你准备怎么改。</small>
                  <textarea
                    id="v3-ai-feedback"
                    rows={9}
                    value={dayRecord.aiFeedback}
                    onChange={(event) => updateDayRecord({ aiFeedback: event.target.value })}
                    placeholder="AI 指出的问题是……\n我认同 / 不认同，因为……\n我准备修改……"
                  />
                </label>
              </div>
            )}

            {activeStep === 5 && (
              <div className="v3-evidence-panel">
                <p className="v3-eyebrow">PROOF OF WORK</p>
                <h3>今天必须留下的证据</h3>
                <p className="v3-deliverable">{selectedDay.deliverable}</p>
                <label className="v3-field" htmlFor="v3-evidence">
                  <span>交付记录</span>
                  <small>可填写文件名、在线链接、保存位置，或直接粘贴最终结果摘要。不要填写虚构进度。</small>
                  <textarea
                    id="v3-evidence"
                    rows={10}
                    value={dayRecord.evidence}
                    onChange={(event) => updateDayRecord({ evidence: event.target.value })}
                    placeholder="例：已完成《Day01-问题定义-v1》，保存在……；我做出的关键决策是……"
                  />
                </label>
                <aside className="v3-evaluation-box">
                  <h4>过关检查</h4>
                  <p>逐项核对真实交付物。全部勾选后才能进入复盘。</p>
                  <ul>
                    {selectedDay.evaluation.map((item, index) => (
                      <li key={item}>
                        <label>
                          <input
                            type="checkbox"
                            checked={dayRecord.evaluationChecks[index] ?? false}
                            onChange={(event) => {
                              const next = [...dayRecord.evaluationChecks];
                              next[index] = event.target.checked;
                              updateDayRecord({ evaluationChecks: next });
                            }}
                          />
                          <span>{item}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            )}

            {activeStep === 6 && (
              <div className="v3-reflection-panel">
                <div className="v3-reflection-intro">
                  <p className="v3-eyebrow">DAILY DEBRIEF</p>
                  <h3>把今天的方法带到明天</h3>
                  <p>请用事实回答，不写“学到了很多”。全部完成后，下一天才会解锁。</p>
                </div>
                <div className="v3-reflection-fields">
                  {selectedDay.reflection.map((question, index) => (
                    <label className="v3-field" htmlFor={`v3-reflection-${index}`} key={question}>
                      <span>{index + 1}. {question}</span>
                      <textarea
                        id={`v3-reflection-${index}`}
                        rows={5}
                        value={dayRecord.reflections[index] ?? ""}
                        onChange={(event) => {
                          const next = [...dayRecord.reflections];
                          next[index] = event.target.value;
                          updateDayRecord({ reflections: next });
                        }}
                        placeholder="用一个具体事实、一次判断或一个改进动作回答……"
                      />
                    </label>
                  ))}
                </div>
                {dayRecord.completed && (
                  <div className="v3-complete-banner" role="status">
                    <strong>UNIT {String(selectedDay.day).padStart(2, "0")} / PASSED</strong>
                    <p>这个训练单元已经过关。你可以复习任一步，也可以进入已解锁的下一个单元。</p>
                  </div>
                )}
              </div>
            )}

            <footer className="v3-lesson-footer">
              <div className="v3-feedback" aria-live="polite" aria-atomic="true">
                {validationMessage && <p className="v3-validation-message">{validationMessage}</p>}
                {notice && <p className="v3-notice-message">{notice}</p>}
              </div>
              <div className="v3-lesson-actions">
                <button
                  className="v3-back-step-button"
                  type="button"
                  disabled={activeStep === 0}
                  onClick={() => chooseStep(activeStep - 1)}
                >
                  返回上一步
                </button>
                <button className="v3-continue-button" type="button" onClick={continueTraining}>
                  {dayRecord.completed
                    ? selectedDay.day < trainingState.unlockedDay ? "进入下一单元" : "本单元已完成"
                    : activeStep === stepLabels.length - 1 ? "完成复盘并解锁下一单元" : "完成这一步，继续"}
                </button>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
