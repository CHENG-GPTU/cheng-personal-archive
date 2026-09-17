"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const TOTAL_SETS = 4;
const DEFAULT_REST_SECONDS = 90;
const SESSION_STORAGE_KEY = "fitness-companion-mvp-session-v1";
const FEEDBACK_STORAGE_KEY = "fitness-companion-mvp-feedback-v1";

type RestMode = "countdown" | "countup";

type SessionState = {
  version: 1;
  sessionId: string;
  completedSets: number;
  completionTimes: number[];
  undoCount: number;
  restStartedAt: number | null;
  restMode: RestMode;
  restSeconds: number;
  finishedAt: number | null;
};

type FeedbackDraft = {
  setAccuracy: "" | "一致" | "不一致" | "无法确认";
  interruption: "" | "1" | "2" | "3" | "4" | "5";
  timerValue: "" | "有帮助" | "一般" | "没有帮助";
  issue: string;
};

type FeedbackRecord = {
  feedbackId: string;
  sessionId: string;
  createdAt: number;
  sessionFacts: {
    completedSets: number;
    targetSets: number;
    undoCount: number;
    restMode: RestMode;
  };
  answers: FeedbackDraft;
};

const EMPTY_FEEDBACK: FeedbackDraft = {
  setAccuracy: "",
  interruption: "",
  timerValue: "",
  issue: "",
};

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createSession(): SessionState {
  return {
    version: 1,
    sessionId: createLocalId("session"),
    completedSets: 0,
    completionTimes: [],
    undoCount: 0,
    restStartedAt: null,
    restMode: "countdown",
    restSeconds: DEFAULT_REST_SECONDS,
    finishedAt: null,
  };
}

function restoreSession(value: string | null): SessionState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SessionState>;
    if (parsed.version !== 1 || typeof parsed.sessionId !== "string") return null;

    const completedSets = Math.min(
      TOTAL_SETS,
      Math.max(0, Math.trunc(Number(parsed.completedSets) || 0)),
    );
    const completionTimes = Array.isArray(parsed.completionTimes)
      ? parsed.completionTimes
          .filter((time): time is number => typeof time === "number" && Number.isFinite(time))
          .slice(0, completedSets)
      : [];

    return {
      version: 1,
      sessionId: parsed.sessionId,
      completedSets,
      completionTimes,
      undoCount: Math.max(0, Math.trunc(Number(parsed.undoCount) || 0)),
      restStartedAt:
        completedSets > 0 && completedSets < TOTAL_SETS && typeof parsed.restStartedAt === "number"
          ? parsed.restStartedAt
          : null,
      restMode: parsed.restMode === "countup" ? "countup" : "countdown",
      restSeconds: DEFAULT_REST_SECONDS,
      finishedAt:
        completedSets === TOTAL_SETS && typeof parsed.finishedAt === "number"
          ? parsed.finishedAt
          : null,
    };
  } catch {
    return null;
  }
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function feedbackText(record: FeedbackRecord) {
  const mode = record.sessionFacts.restMode === "countdown" ? "90 秒倒计时" : "正计时";
  return [
    "健身训练陪伴 MVP｜匿名测试反馈",
    `匿名编号：${record.feedbackId.replace("feedback-", "").slice(0, 8)}`,
    `本次记录：${record.sessionFacts.completedSets}/${record.sessionFacts.targetSets} 组，撤销 ${record.sessionFacts.undoCount} 次，${mode}`,
    `组数是否一致：${record.answers.setAccuracy}`,
    `打断感：${record.answers.interruption}/5（1=几乎不打断，5=非常打断）`,
    `休息计时：${record.answers.timerValue}`,
    `停顿或出错：${record.answers.issue.trim() || "未填写"}`,
    "说明：本记录不含姓名、联系方式和健身房位置。",
  ].join("\n");
}

export default function FitnessCompanionMvp() {
  const [session, setSession] = useState<SessionState>(() => createSession());
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState("当前进度会自动保存在这台设备上");
  const [feedback, setFeedback] = useState<FeedbackDraft>(EMPTY_FEEDBACK);
  const [savedFeedback, setSavedFeedback] = useState<FeedbackRecord | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const lastCompletionTap = useRef(0);

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      let restored: SessionState | null = null;
      try {
        restored = restoreSession(window.localStorage.getItem(SESSION_STORAGE_KEY));
      } catch {
        setNotice("当前浏览器未开放本地恢复，请保持页面开启");
      }
      if (restored) {
        setSession(restored);
        setNotice(
          restored.completedSets === TOTAL_SETS
            ? "已从当前设备恢复完成记录"
            : `已恢复到第 ${Math.min(restored.completedSets + 1, TOTAL_SETS)} 组`,
        );
      }
      setNow(Date.now());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(restoreFrame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let failureNotice: number | undefined;
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      failureNotice = window.setTimeout(() => setNotice("当前浏览器未能保存进度，请保持页面开启"), 0);
    }
    return () => {
      if (failureNotice !== undefined) window.clearTimeout(failureNotice);
    };
  }, [hydrated, session]);

  useEffect(() => {
    if (!session.restStartedAt || session.completedSets >= TOTAL_SETS) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.completedSets, session.restStartedAt]);

  const elapsedRestSeconds = session.restStartedAt
    ? Math.max(0, Math.floor((now - session.restStartedAt) / 1000))
    : 0;
  const timerSeconds =
    session.restMode === "countdown"
      ? Math.max(0, session.restSeconds - elapsedRestSeconds)
      : elapsedRestSeconds;
  const restHasEnded =
    session.restMode === "countdown" &&
    Boolean(session.restStartedAt) &&
    elapsedRestSeconds >= session.restSeconds;
  const isComplete = session.completedSets === TOTAL_SETS;
  const currentSet = Math.min(session.completedSets + 1, TOTAL_SETS);

  const timerStatus = useMemo(() => {
    if (isComplete) return "训练记录完成";
    if (!session.restStartedAt) return session.completedSets === 0 ? "完成第 1 组后自动开始" : "已撤销，等待重新确认";
    if (restHasEnded) return "休息结束，可开始下一组";
    return session.restMode === "countdown" ? "距离建议休息结束" : "本次已休息";
  }, [isComplete, restHasEnded, session.completedSets, session.restMode, session.restStartedAt]);

  function completeSet() {
    if (isComplete) return;
    const completedAt = Date.now();
    if (completedAt - lastCompletionTap.current < 650) {
      setNotice("已忽略连续点击；如需修正可使用撤销");
      return;
    }
    lastCompletionTap.current = completedAt;
    const nextCount = session.completedSets + 1;
    setSession((previous) => {
      if (previous.completedSets >= TOTAL_SETS) return previous;
      const count = previous.completedSets + 1;
      return {
        ...previous,
        completedSets: count,
        completionTimes: [...previous.completionTimes, completedAt],
        restStartedAt: count === TOTAL_SETS ? null : completedAt,
        finishedAt: count === TOTAL_SETS ? completedAt : null,
      };
    });
    setNow(completedAt);
    setNotice(nextCount === TOTAL_SETS ? "4 组已记录，匿名测试反馈已生成" : `第 ${nextCount} 组已记录`);
  }

  function undoLastSet() {
    if (session.completedSets === 0) return;
    const undoneSet = session.completedSets;
    setSession((previous) => {
      if (previous.completedSets === 0) return previous;
      return {
        ...previous,
        completedSets: previous.completedSets - 1,
        completionTimes: previous.completionTimes.slice(0, -1),
        undoCount: previous.undoCount + 1,
        restStartedAt: null,
        finishedAt: null,
      };
    });
    setSavedFeedback(null);
    setFeedback(EMPTY_FEEDBACK);
    setNotice(`已撤销第 ${undoneSet} 组，请完成后重新确认`);
  }

  function setRestMode(restMode: RestMode) {
    setSession((previous) => ({ ...previous, restMode }));
    setNow(Date.now());
    setNotice(restMode === "countdown" ? "已切换为 90 秒倒计时" : "已切换为正计时");
  }

  function resetSession() {
    const nextSession = createSession();
    setSession(nextSession);
    setFeedback(EMPTY_FEEDBACK);
    setSavedFeedback(null);
    setCopyState("idle");
    setNow(Date.now());
    setNotice("新的 4 组训练已开始");
  }

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const record: FeedbackRecord = {
      feedbackId: createLocalId("feedback"),
      sessionId: session.sessionId,
      createdAt: Date.now(),
      sessionFacts: {
        completedSets: session.completedSets,
        targetSets: TOTAL_SETS,
        undoCount: session.undoCount,
        restMode: session.restMode,
      },
      answers: { ...feedback, issue: feedback.issue.trim().slice(0, 240) },
    };

    try {
      const existingValue = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
      const existing = existingValue ? JSON.parse(existingValue) : [];
      const records = Array.isArray(existing) ? existing.slice(-19) : [];
      window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([...records, record]));
      setNotice("匿名反馈已保存在当前设备，可复制后发送给测试组织者");
    } catch {
      setNotice("反馈未能保存在当前设备，但仍可复制下方记录");
    }
    setSavedFeedback(record);
    setCopyState("idle");
  }

  async function copyFeedback() {
    if (!savedFeedback) return;
    try {
      await navigator.clipboard.writeText(feedbackText(savedFeedback));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <main className="fitness-mvp-shell">
      <div className="fitness-mvp-stage">
        <section className="fitness-console" aria-label="四组训练计组器">
          <header className="fitness-console-header">
            <a href="/work/fitness-companion" aria-label="返回健身训练陪伴案例">
              <span aria-hidden="true">←</span> 案例
            </a>
            <div>
              <strong>器械旁模式</strong>
              <span>本地保存 · 无需登录</span>
            </div>
            <span className="fitness-live-dot">MVP</span>
          </header>

          <div className="fitness-console-body">
            <div className="fitness-set-heading">
              <p>{isComplete ? "本次训练" : `现在完成第 ${currentSet} 组`}</p>
              <div className="fitness-set-counter" aria-label={`已完成 ${session.completedSets} 组，共 ${TOTAL_SETS} 组`}>
                <strong>{session.completedSets}</strong>
                <span>/ {TOTAL_SETS}</span>
              </div>
            </div>

            <ol className="fitness-set-rail" aria-label="四组完成进度">
              {Array.from({ length: TOTAL_SETS }, (_, index) => {
                const setNumber = index + 1;
                const status = setNumber <= session.completedSets ? "done" : setNumber === currentSet && !isComplete ? "current" : "pending";
                return (
                  <li className={`is-${status}`} key={setNumber} aria-label={`第 ${setNumber} 组：${status === "done" ? "已完成" : status === "current" ? "当前组" : "待完成"}`}>
                    <span>{String(setNumber).padStart(2, "0")}</span>
                    <i aria-hidden="true" />
                  </li>
                );
              })}
            </ol>

            {!isComplete ? (
              <>
                <section className={`fitness-timer ${restHasEnded ? "is-ready" : ""}`} aria-live="polite">
                  <div>
                    <span>休息计时</span>
                    <p>{timerStatus}</p>
                  </div>
                  <strong>{session.restStartedAt ? formatTime(timerSeconds) : "--:--"}</strong>
                </section>

                <div className="fitness-timer-mode" role="group" aria-label="休息计时方式">
                  <span>当前判断</span>
                  <button className={session.restMode === "countdown" ? "is-active" : ""} onClick={() => setRestMode("countdown")} type="button">
                    90 秒倒计时
                  </button>
                  <button className={session.restMode === "countup" ? "is-active" : ""} onClick={() => setRestMode("countup")} type="button">
                    正计时
                  </button>
                </div>

                <button className="fitness-complete-button" onClick={completeSet} type="button">
                  <span>完成本组</span>
                  <small>点击后记录第 {currentSet} 组并开始休息</small>
                </button>
              </>
            ) : (
              <section className="fitness-complete-card" aria-labelledby="fitness-complete-title">
                <span>SESSION COMPLETE</span>
                <h1 id="fitness-complete-title">4 组已记录</h1>
                <p>下面只生成空白测试问题与本次操作事实，不代表任何用户研究结论。</p>
              </section>
            )}

            <div className="fitness-utility-row">
              <button disabled={session.completedSets === 0} onClick={undoLastSet} type="button">
                <span aria-hidden="true">↶</span> 撤销上一组
              </button>
              <p aria-live="polite">{hydrated ? notice : "正在检查本地进度…"}</p>
            </div>
          </div>
        </section>

        <aside className="fitness-evidence-panel" aria-label="产品证据边界">
          <header>
            <span>PRODUCT EVIDENCE</span>
            <h2>哪些已知，<br />哪些还不能下结论</h2>
          </header>
          <dl>
            <div className="is-fact">
              <dt>事实</dt>
              <dd>本人通常每个动作做 4 组，训练中经常忘记组数；手机会放在器械旁。</dd>
            </div>
            <div className="is-judgment">
              <dt>当前判断</dt>
              <dd>大按钮手动确认、计时、撤销和本地恢复，可能降低低注意力场景下的记录负担。</dd>
            </div>
            <div className="is-test">
              <dt>待验证</dt>
              <dd>其他健身者是否也高频遇到；组数记录是否准确；操作是否打断训练；90 秒是否合适。</dd>
            </div>
          </dl>
          <p className="fitness-evidence-boundary">当前没有外部测试结果。本页不会把预设选项或单次自测写成用户结论。</p>
        </aside>

        {isComplete ? (
          <section className="fitness-feedback" aria-labelledby="fitness-feedback-title">
            <div className="fitness-feedback-intro">
              <span>ANONYMOUS TEST FORM</span>
              <h2 id="fitness-feedback-title">匿名测试反馈</h2>
              <p>不收集姓名、联系方式、健身房或定位。请勿在开放题中填写可识别信息。</p>
              <div>
                <span>本次操作事实</span>
                <strong>{session.completedSets}/{TOTAL_SETS} 组 · 撤销 {session.undoCount} 次</strong>
              </div>
            </div>

            {!savedFeedback ? (
              <form onSubmit={submitFeedback}>
                <fieldset>
                  <legend>1. 页面显示的完成组数与实际完成是否一致？</legend>
                  <div className="fitness-choice-row">
                    {["一致", "不一致", "无法确认"].map((value) => (
                      <label key={value}>
                        <input required name="setAccuracy" type="radio" value={value} checked={feedback.setAccuracy === value} onChange={() => setFeedback((current) => ({ ...current, setAccuracy: value as FeedbackDraft["setAccuracy"] }))} />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>2. 记录动作对训练的打断感有多强？</legend>
                  <div className="fitness-scale-row">
                    {["1", "2", "3", "4", "5"].map((value) => (
                      <label key={value}>
                        <input required name="interruption" type="radio" value={value} checked={feedback.interruption === value} onChange={() => setFeedback((current) => ({ ...current, interruption: value as FeedbackDraft["interruption"] }))} />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                  <div className="fitness-scale-caption"><span>几乎不打断</span><span>非常打断</span></div>
                </fieldset>

                <fieldset>
                  <legend>3. 休息计时对决定何时开始下一组是否有帮助？</legend>
                  <div className="fitness-choice-row">
                    {["有帮助", "一般", "没有帮助"].map((value) => (
                      <label key={value}>
                        <input required name="timerValue" type="radio" value={value} checked={feedback.timerValue === value} onChange={() => setFeedback((current) => ({ ...current, timerValue: value as FeedbackDraft["timerValue"] }))} />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="fitness-open-question">
                  <span>4. 哪一步让你停顿、误触或出错？（可选）</span>
                  <textarea maxLength={240} rows={4} value={feedback.issue} onChange={(event) => setFeedback((current) => ({ ...current, issue: event.target.value }))} placeholder="只写操作过程，不要填写姓名或位置信息" />
                  <small>{feedback.issue.length}/240</small>
                </label>

                <button className="fitness-feedback-submit" type="submit">生成匿名反馈记录</button>
              </form>
            ) : (
              <div className="fitness-feedback-result" aria-live="polite">
                <span>已生成 · 仅保存在当前设备</span>
                <pre>{feedbackText(savedFeedback)}</pre>
                <div>
                  <button onClick={copyFeedback} type="button">{copyState === "copied" ? "已复制" : "复制匿名反馈"}</button>
                  <button onClick={resetSession} type="button">开始新的 4 组</button>
                </div>
                {copyState === "failed" ? <p>浏览器未允许复制，请长按上方文字手动选择。</p> : null}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
