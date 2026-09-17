"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { aipmLevels, getAipmLevel } from "../aipm-levels";
import { getAipmContextualTerms, getAipmLessonGuide, getAipmSources } from "../aipm-course-content";
import { aipmKnowledgeChapterCount, aipmKnowledgeUnitCount, getAipmKnowledgeUnits } from "../aipm-knowledge-map";
import { getAipmCareerPractice } from "../aipm-career-track";
import { aipmLiveProjects, fitnessMvpDecisions } from "../aipm-project-lab";
import "./aipm-game.css";

type RecordState = {
  levelId: number;
  status: "open" | "revise" | "passed";
  draft: string;
  scoreJson: string | null;
  feedback: string | null;
};

type Evidence = { id: string; levelId: number; project: string; title: string; content: string };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type Evaluation = { understanding: number; application: number; expression: number; evidence: number; total: number; criticalOmission: boolean; feedback: string; nextAction: string; strengths: string[] };
type StateResponse = { currentLevel: number; records: RecordState[]; evidence: Evidence[]; messages: ChatMessage[] };

const phaseMeta = [
  { range: "01—07", title: "基础校准", note: "会表达、会分析、会判断" },
  { range: "08—18", title: "项目一", note: "AIPM 闯关教练" },
  { range: "19—25", title: "项目二", note: "健身训练陪伴 APP" },
  { range: "26—30", title: "求职验收", note: "作品集、简历、答辩" },
];

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function parseEvaluation(record?: RecordState): Evaluation | null {
  if (!record?.scoreJson) return null;
  try { return JSON.parse(record.scoreJson) as Evaluation; } catch { return null; }
}

export default function AipmGame({ displayName, signOutPath }: { displayName: string; signOutPath: string }) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [selectedId, setSelectedId] = useState(1);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState<"loading" | "saving" | "coach" | "evaluate" | "">("loading");
  const [notice, setNotice] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, Record<string, number>>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const level = getAipmLevel(selectedId);
  const lessonGuide = getAipmLessonGuide(selectedId);
  const contextualTerms = getAipmContextualTerms(selectedId);
  const knowledgeUnits = getAipmKnowledgeUnits(selectedId);
  const lessonSources = lessonGuide ? getAipmSources(lessonGuide.sourceIds) : [];
  const selectedQuizAnswers = quizAnswers[selectedId] ?? {};
  const quizPassed = !lessonGuide?.quiz.length || lessonGuide.quiz.every((item) => selectedQuizAnswers[item.id] === item.correctIndex);
  const unlocked = selectedId <= (state?.currentLevel ?? 1);
  const passedCount = state?.records.filter((item) => item.status === "passed").length ?? 0;

  const loadState = useCallback(async (levelId?: number) => {
    const response = await fetchWithTimeout(`/api/aipm/state${levelId ? `?level=${levelId}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error("学习进度暂时无法读取。请刷新后重试。");
    const payload = await response.json() as StateResponse;
    setState(payload);
    const nextSelected = levelId ?? Math.min(30, payload.currentLevel);
    setSelectedId(nextSelected);
    const nextRecord = payload.records.find((item) => item.levelId === nextSelected);
    setDraft(nextRecord?.draft ?? "");
    setEvaluation(parseEvaluation(nextRecord));
    setMessages(payload.messages ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadState().catch((error) => setNotice(error instanceof Error ? error.message : "加载失败")).finally(() => setBusy(""));
    }, 0);
    // Initial cloud restore runs once; later level changes use chooseLevel.
    return () => window.clearTimeout(timer);
  }, [loadState]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);

  const chooseLevel = async (levelId: number) => {
    if (!state || levelId > state.currentLevel || busy) return;
    setSelectedId(levelId);
    setNotice("");
    setBusy("loading");
    try {
      const response = await fetchWithTimeout(`/api/aipm/state?level=${levelId}`, { cache: "no-store" });
      const payload = await response.json() as StateResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "关卡加载失败。");
      setState(payload);
      const nextRecord = payload.records.find((item) => item.levelId === levelId);
      setDraft(nextRecord?.draft ?? "");
      setEvaluation(parseEvaluation(nextRecord));
      setMessages(payload.messages ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "关卡加载失败。");
    } finally { setBusy(""); }
  };

  const saveDraft = async (quiet = false) => {
    if (!unlocked) return false;
    setBusy("saving");
    try {
      const response = await fetch("/api/aipm/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelId: selectedId, draft }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "保存失败。");
      if (!quiet) setNotice("草稿已安全保存到你的私有学习档案。");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败。");
      return false;
    } finally { setBusy(""); }
  };

  const askCoach = async () => {
    if (!question.trim() || busy) return;
    const userText = question.trim();
    setQuestion("");
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content: userText }]);
    setBusy("coach");
    setNotice("");
    try {
      const response = await fetch("/api/aipm/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "coach", levelId: selectedId, message: userText, draft }) });
      const payload = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || "AI 教练没有返回内容。");
      setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: "assistant", content: payload.reply! }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI 教练暂时不可用。");
    } finally { setBusy(""); }
  };

  const submitEvaluation = async () => {
    if (busy) return;
    setBusy("evaluate");
    setNotice("");
    try {
      await saveDraft(true);
      setBusy("evaluate");
      const response = await fetch("/api/aipm/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "evaluate", levelId: selectedId, draft }) });
      const payload = await response.json() as { evaluation?: Evaluation; passed?: boolean; error?: string; nextLevel?: number };
      if (!response.ok || !payload.evaluation) throw new Error(payload.error || "评分失败。");
      setEvaluation(payload.evaluation);
      setNotice(payload.passed ? `第 ${String(selectedId).padStart(2, "0")} 关已通过，证据已收入背包。` : "尚未过关。只修最优先的一处，再提交一次。" );
      await loadState(selectedId);
      if (payload.passed && payload.nextLevel && payload.nextLevel !== selectedId) {
        setState((current) => current ? { ...current, currentLevel: Math.max(current.currentLevel, payload.nextLevel!) } : current);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "评分失败。");
    } finally { setBusy(""); }
  };

  const groupedLevels = useMemo(() => phaseMeta.map((phase) => ({ ...phase, levels: aipmLevels.filter((item) => item.phase === phase.title) })), []);

  if (!state && busy === "loading") return <main className="aipm-loading"><span>SYNCING PRIVATE WORKSPACE</span><strong>正在恢复你的闯关进度</strong><small>首次连接通常需要几秒；超过 12 秒会自动显示重试入口。</small></main>;

  if (!state) return <main className="aipm-loading is-error"><span>WORKSPACE CONNECTION</span><strong>学习进度暂时没有连接成功</strong><small>{notice || "请确认网络后重新连接。你的本地页面和已保存数据不会因此删除。"}</small><button type="button" onClick={() => { setBusy("loading"); setNotice(""); void loadState().catch((error) => setNotice(error instanceof Error ? error.message : "加载失败")).finally(() => setBusy("")); }}>重新连接</button><Link href="/">返回首页</Link></main>;

  return (
    <main className="aipm-game-shell">
      <header className="aipm-topbar">
        <Link className="aipm-wordmark" href="/"><strong>CHENG / AIPM</strong><span>PRIVATE LEARNING SYSTEM</span></Link>
        <div className="aipm-progress-head"><span>{passedCount} / 30 PASSED</span><progress max="30" value={passedCount} /><strong>{Math.round(passedCount / 30 * 100)}%</strong></div>
        <div className="aipm-account"><span>{displayName}</span><button type="button" onClick={() => setBackpackOpen(true)}>证据背包 · {state?.evidence.length ?? 0}</button><a href={signOutPath}>退出</a></div>
      </header>

      <div className="aipm-game-grid">
        <aside className="aipm-level-map" aria-label="30 关地图">
          <div className="aipm-map-intro"><span>30 LEVEL MAP</span><h1>把学习变成<br />可验证的作品</h1><p>不靠打卡解锁。每一关都要留下你自己的判断和证据。</p></div>
          {groupedLevels.map((group) => <section key={group.title} className="aipm-phase-block"><header><span>{group.range}</span><div><strong>{group.title}</strong><small>{group.note}</small></div></header><ol>{group.levels.map((item) => {
            const itemRecord = state?.records.find((value) => value.levelId === item.id);
            const isLocked = item.id > (state?.currentLevel ?? 1);
            return <li key={item.id}><button type="button" disabled={isLocked} aria-current={selectedId === item.id ? "step" : undefined} onClick={() => void chooseLevel(item.id)}><span>{String(item.id).padStart(2, "0")}</span><strong>{item.title}</strong><i>{itemRecord?.status === "passed" ? "PASS" : itemRecord?.status === "revise" ? "REVISE" : isLocked ? "LOCK" : item.boss ? "BOSS" : "OPEN"}</i></button></li>;
          })}</ol></section>)}
        </aside>

        <section className="aipm-mission" aria-label={`第 ${selectedId} 关任务`}>
          <header className="aipm-mission-hero"><div><span>LEVEL {String(level.id).padStart(2, "0")} / 30 · {level.phase}</span>{level.boss ? <b>BOSS GATE</b> : null}</div><h2>{level.title}</h2><p>{level.promise}</p><aside><span>本关产物</span><strong>{level.deliverable}</strong><small>工具练习 · {level.tool}</small></aside></header>
          <nav className="aipm-evidence-thread-strip" aria-label="本关证据形成路径">
            {["知识输入", "形成判断", "完成产物", "面试表达"].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}<i /></span>)}
          </nav>

          <section className="aipm-live-project" aria-label="边学边做实时项目台">
            <header><div><span>LIVE PROJECT DESK · LEARN → DECIDE → BUILD → VERIFY</span><h3>边学，边把判断<br />更新进真实产品。</h3></div><p>这里不是预先包装好的成功案例。每次学习都要改变一个决定、补一份证据或暴露一个未知；最终自动沉淀为可以在面试中展开的项目过程。</p></header>
            <div className="aipm-project-contact-sheet">
              {aipmLiveProjects.map((project) => <details key={project.id} open={project.id === (selectedId >= 19 && selectedId <= 25 ? "fitness-companion" : "learning-system")}>
                <summary><span>{project.number}</span><div><strong>{project.title}</strong><small>{project.stage}</small></div><i>查看项目证据</i></summary>
                <div className="aipm-project-body"><p>{project.subtitle}</p><dl>{project.claims.map((claim) => <div key={`${claim.status}-${claim.text}`}><dt>{claim.status}</dt><dd>{claim.text}</dd></div>)}</dl><footer><span>本阶段交付</span><strong>{project.outcome}</strong></footer></div>
              </details>)}
            </div>
            <div className="aipm-set-rail" aria-label="健身产品已确认 MVP 决策">
              <div><span>FITNESS MVP / CONFIRMED INPUT</span><strong>01</strong><strong>02</strong><strong className="is-current">03?</strong><strong>04</strong></div>
              <ol>{fitnessMvpDecisions.map((decision) => <li key={decision}>{decision}</li>)}</ol>
              <a href="#aipm-practice">把本关知识写进项目 ↓</a>
            </div>
          </section>

          {lessonGuide ? <section className="aipm-course-brief" aria-label="本关课程导学">
            <div className="aipm-course-brief-main"><span>{lessonGuide.chapter}</span><h3>先完成输入，<br />再开始输出。</h3><p>{lessonGuide.whyItMatters}</p><small>建议学习 {lessonGuide.estimatedMinutes} 分钟 · 测验正确后开放过关提交</small></div>
            <ol>{lessonGuide.objectives.map((objective, index) => <li key={objective}><span>{String(index + 1).padStart(2, "0")}</span><p>{objective}</p></li>)}</ol>
          </section> : null}

          <section className="aipm-knowledge-atlas" aria-label="AIPM系统知识课">
            <header>
              <div><span>ORIGINAL KNOWLEDGE ATLAS · {aipmKnowledgeChapterCount} CHAPTERS / {aipmKnowledgeUnitCount} UNITS</span><h3>先把原理弄懂，<br />再放进真实项目。</h3></div>
              <p>只把公开目录作为知识地图，讲解、工作情境、任务和验收全部为求职目标重新编写。每个单元必须留下项目证据并通过面试追问；不复制受限课程正文。</p>
            </header>
            <aside className="aipm-job-ready-standard">
              <span>JOB-READY EDITION</span>
              <strong>读完不算会，能做、能交、能讲才算。</strong>
              <ol>
                <li><b>01</b> 理解原理与边界</li>
                <li><b>02</b> 处理模拟工作任务</li>
                <li><b>03</b> 回填两个真实项目</li>
                <li><b>04</b> 留下产物并通过追问</li>
              </ol>
            </aside>
            <div className="aipm-knowledge-units">
              {knowledgeUnits.map((item, index) => {
                const career = getAipmCareerPractice(item);
                return <details key={item.id} open={index === 0}>
                  <summary><span>{item.id}</span><div><small>第 {item.chapterIndex} 章 · {career.track}</small><strong>{item.title}</strong></div><i>学习 / 收起</i></summary>
                  <div className="aipm-knowledge-unit-body">
                    <section><span>先用日常语言理解</span>{item.learn.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
                    <dl>
                      <div><dt>产品经理要做的判断</dt><dd>{item.decision}</dd></div>
                      <div><dt>放进你的项目</dt><dd>{item.projectUse}</dd></div>
                      <div><dt>学完必须能回答</dt><dd>{item.checkpoint}</dd></div>
                    </dl>
                    <section className="aipm-career-practice">
                      <header><div><span>JOB SIMULATION · 求职训练</span><h4>{career.workSimulation}</h4></div><aside><small>JD 能力信号</small><p>{career.jdSignal}</p></aside></header>
                      <ol>{career.steps.map((step, stepIndex) => <li key={step}><b>{String(stepIndex + 1).padStart(2, "0")}</b><p>{step}</p></li>)}</ol>
                      <div className="aipm-career-evidence"><span>本节必须留下的证据</span><strong>{career.deliverable}</strong><p>{career.hiringEvidence}</p></div>
                      <div className="aipm-career-interview"><span>面试官会继续追问</span><p>{career.interviewQuestion}</p></div>
                      <ul>{career.acceptance.map((rule) => <li key={rule}>{rule}</li>)}</ul>
                    </section>
                    <a href={item.reference.url} target="_blank" rel="noreferrer">核对一手资料 · {item.reference.label} ↗</a>
                  </div>
                </details>;
              })}
            </div>
          </section>

          {lessonGuide?.videoEmbedUrl ? <section className="aipm-media-lesson"><div className="aipm-media-copy"><span>OFFICIAL VIDEO · DEEPLEARNING.AI</span><h3>吴恩达：AI for Everyone</h3><p>先观看并记录三个问题：AI 能做什么、不能做什么；什么任务适合机器学习；AIPM 在业务与技术之间负责哪些判断。</p><a href="https://www.deeplearning.ai/alpha/courses/ai-for-everyone" target="_blank" rel="noreferrer">打开官方课程与完整大纲 ↗</a></div><div className="aipm-video-frame"><iframe src={lessonGuide.videoEmbedUrl} title="DeepLearning.AI AI for Everyone 官方视频" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section> : null}

          {lessonGuide?.termGroups.map((group, groupIndex) => <details className="aipm-term-group" key={group.title} open={selectedId === 1 ? groupIndex === 0 : true}><summary><div><span>术语预热 · {String(groupIndex + 1).padStart(2, "0")}</span><h3>{group.title}</h3><p>{group.note}</p></div><i>展开 / 收起</i></summary><div className="aipm-term-grid">{group.terms.map((item) => <article key={item.term}><strong>{item.term}</strong><p>{item.plain}</p><small>工作中怎么用</small><p>{item.atWork}</p></article>)}</div></details>)}

          {!lessonGuide && contextualTerms.length ? <details className="aipm-term-group" open><summary><div><span>CONTEXT GLOSSARY</span><h3>本关先会说这些工作语言</h3><p>第一次遇到专业词，先理解日常含义，再看它怎样改变产品决定。</p></div><i>展开 / 收起</i></summary><div className="aipm-term-grid">{contextualTerms.map((item) => <article key={item.term}><strong>{item.term}</strong><p>{item.plain}</p><small>工作中怎么用</small><p>{item.atWork}</p></article>)}</div></details> : null}

          {lessonGuide?.deepDives.map((section, index) => <article className="aipm-deep-dive" key={section.title}><header><span>{section.eyebrow}</span><i>{String(index + 1).padStart(2, "0")}</i></header><h3>{section.title}</h3><div className="aipm-deep-copy">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className="aipm-deep-example"><span>把概念放进工作</span><p>{section.example}</p></div><div className="aipm-work-question"><span>产品经理要追问</span><p>{section.workQuestion}</p></div></article>)}

          <article className="aipm-lesson-card"><div className="aipm-section-tag"><span>01</span><strong>核心摘要</strong><small>LESSON NOTES</small></div><div className="aipm-lesson-copy">{level.lesson.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<ul>{level.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></div></article>

          {lessonGuide ? <section className={`aipm-knowledge-gate${quizPassed ? " is-passed" : ""}`} aria-label="知识测验"><header><div><span>KNOWLEDGE GATE</span><h3>不是看完就算会了</h3><p>每道题答对后才开放过关提交。选错会立即告诉你判断错在什么地方。</p></div><strong>{lessonGuide.quiz.filter((item) => selectedQuizAnswers[item.id] === item.correctIndex).length} / {lessonGuide.quiz.length}</strong></header><div className="aipm-quiz-list">{lessonGuide.quiz.map((item, questionIndex) => {
            const answer = selectedQuizAnswers[item.id];
            const answered = Number.isInteger(answer);
            const correct = answer === item.correctIndex;
            return <article key={item.id}><span>QUESTION {String(questionIndex + 1).padStart(2, "0")}</span><h4>{item.question}</h4><div>{item.options.map((option, optionIndex) => <button className={answered ? optionIndex === item.correctIndex ? "is-correct" : optionIndex === answer ? "is-wrong" : "" : ""} type="button" key={option} onClick={() => setQuizAnswers((current) => ({ ...current, [selectedId]: { ...(current[selectedId] ?? {}), [item.id]: optionIndex } }))}><i>{String.fromCharCode(65 + optionIndex)}</i>{option}</button>)}</div>{answered ? <p className={correct ? "is-correct" : "is-wrong"}>{correct ? "判断正确。" : "再看一次概念。"}{item.explanation}</p> : null}</article>;
          })}</div><footer>{quizPassed ? <strong>知识闸门已通过，可以进入实践。</strong> : <span>完成并答对全部题目后，再提交你的真实产物。</span>}</footer></section> : null}

          {lessonSources.length ? <section className="aipm-source-deck"><header><span>SOURCE DECK</span><h3>课程参考与继续学习</h3><p>本站提炼公开课程结构并重新编写中文讲解，不复制付费正文或逐字稿。需要更深入时回到原始课程。</p></header><div>{lessonSources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind} · {source.provider}</span><strong>{source.title}</strong><p>{source.note}</p><i>访问原始来源 ↗</i></a>)}</div></section> : null}

          <article className="aipm-example-pair"><div className="is-bad"><span>错误示范</span><p>{level.badExample}</p></div><div className="is-good"><span>有效示范</span><p>{level.goodExample}</p></div></article>
          <article className="aipm-practice-card" id="aipm-practice"><div className="aipm-section-tag"><span>02</span><strong>亲手完成</strong><small>PRACTICE</small></div><ol>{level.practice.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol><div className="aipm-scenario"><span>情境挑战</span><p>{level.scenario}</p></div><label className="aipm-draft"><span>你的交付物 · 不是 AI 的标准答案</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`在这里完成${level.deliverable}。写出事实、判断、取舍和证据。`} rows={14} /><small>{draft.trim().length} 字 · 自动评分前至少 120 字{!quizPassed ? " · 还需通过知识测验" : ""}</small></label><div className="aipm-draft-actions"><button type="button" disabled={Boolean(busy)} onClick={() => void saveDraft(false)}>{busy === "saving" ? "保存中…" : "保存草稿"}</button><button className="is-primary" type="button" disabled={Boolean(busy) || draft.trim().length < 120 || !quizPassed} onClick={() => void submitEvaluation()}>{busy === "evaluate" ? "DeepSeek 正在评审…" : !quizPassed ? "先通过知识测验" : "提交过关评审"}</button></div></article>

          <article className="aipm-rubric"><header><div className="aipm-section-tag"><span>03</span><strong>以证据过关</strong><small>REVIEW</small></div><p>理解、应用、表达、证据各 25 分；总分 ≥ 80 且没有关键缺项才会解锁下一关。可以无限修改。</p></header><ul>{level.criticalChecks.map((check) => <li key={check}>{check}</li>)}</ul>{evaluation ? <div className={`aipm-score${evaluation.total >= 80 && !evaluation.criticalOmission ? " is-pass" : ""}`}><div><strong>{evaluation.total}</strong><span>/ 100</span><b>{evaluation.total >= 80 && !evaluation.criticalOmission ? "PASS" : "REVISE"}</b></div><dl><div><dt>理解</dt><dd>{evaluation.understanding}</dd></div><div><dt>应用</dt><dd>{evaluation.application}</dd></div><div><dt>表达</dt><dd>{evaluation.expression}</dd></div><div><dt>证据</dt><dd>{evaluation.evidence}</dd></div></dl><section><p>{evaluation.feedback}</p><strong>下一步只做这一件事</strong><p>{evaluation.nextAction}</p></section></div> : <div className="aipm-score-empty">完成真实交付后，这里会出现四维评分与唯一的优先修改动作。</div>}</article>
        </section>

        <aside className="aipm-coach-panel"><header><div><i /><span>DEEPSEEK COACH</span></div><strong>只问一件事，<br />把你的判断问清楚。</strong><p>教练知道当前关卡、验收标准和你的草稿，不会另起一套学习计划。</p></header><div className="aipm-chat-log">{messages.length === 0 ? <div className="aipm-coach-empty"><span>建议第一问</span><p>“我现在最不确定的判断是……请先指出我缺少哪一类信息。”</p></div> : messages.map((item) => <div key={item.id} className={`aipm-message is-${item.role}`}><span>{item.role === "assistant" ? "COACH" : "YOU"}</span><p>{item.content}</p></div>)}{busy === "coach" ? <div className="aipm-thinking"><i /><i /><i /><span>正在校准问题</span></div> : null}<div ref={chatEndRef} /></div><footer><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void askCoach(); }} placeholder="写下你的判断、卡点或问题…" rows={4} /><button type="button" disabled={Boolean(busy) || !question.trim()} onClick={() => void askCoach()}>发送给教练 <span>⌘↵</span></button><small>原始对话与评分仅你登录后可见。</small></footer></aside>
      </div>

      {notice ? <div className="aipm-toast" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")}>×</button></div> : null}
      {backpackOpen ? <div className="aipm-backpack-layer" role="dialog" aria-modal="true" aria-label="证据背包"><button className="aipm-backdrop" type="button" aria-label="关闭" onClick={() => setBackpackOpen(false)} /><section><header><div><span>PRIVATE EVIDENCE BACKPACK</span><h2>每一次过关，<br />都留下可讲述的证据。</h2></div><button type="button" onClick={() => setBackpackOpen(false)}>关闭</button></header><div className="aipm-evidence-grid">{state?.evidence.length ? state.evidence.map((item) => <article key={item.id}><span>LEVEL {String(item.levelId).padStart(2, "0")} · {item.project}</span><h3>{item.title}</h3><p>{item.content.slice(0, 280)}{item.content.length > 280 ? "…" : ""}</p><small>默认私密 · 公开前需主动选择并脱敏</small></article>) : <div className="aipm-evidence-empty">通过第一关后，你的第一份证据会出现在这里。</div>}</div></section></div> : null}
    </main>
  );
}
