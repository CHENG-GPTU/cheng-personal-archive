"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import HealthExpert from "./health-expert";
import "./life-schedule-center.css";
import {
  LIFE_SCHEDULE_END,
  LIFE_SCHEDULE_START,
  LIFE_SCHEDULE_STORAGE_KEY,
  lifeScheduleCategories,
  lifeScheduleDays,
  type LifeScheduleCategory,
} from "./life-schedule-data";

interface LifeScheduleCenterProps {
  onHome: () => void;
  initialView?: "schedule" | "health";
}

interface LifeScheduleState {
  version: 1;
  selectedDay: number;
  completed: Record<string, boolean>;
  weights: Record<string, string>;
  notes: Record<string, string>;
}

const EMPTY_STATE: LifeScheduleState = {
  version: 1,
  selectedDay: 1,
  completed: {},
  weights: {},
  notes: {},
};

const EMPTY_STATE_JSON = JSON.stringify(EMPTY_STATE);
const STATE_EVENT = "life20-schedule-state-change";

function getShanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getSuggestedDay() {
  const today = getShanghaiDate();
  const exactDay = lifeScheduleDays.find((day) => day.date === today);
  if (exactDay) return exactDay.day;
  return today < LIFE_SCHEDULE_START ? 1 : 20;
}

function getStoredState() {
  if (typeof window === "undefined") return EMPTY_STATE_JSON;
  try {
    return (
      window.localStorage.getItem(LIFE_SCHEDULE_STORAGE_KEY) ||
      JSON.stringify({ ...EMPTY_STATE, selectedDay: getSuggestedDay() })
    );
  } catch {
    return EMPTY_STATE_JSON;
  }
}

function subscribeToStoredState(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === LIFE_SCHEDULE_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STATE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STATE_EVENT, callback);
  };
}

function parseStoredState(value: string): LifeScheduleState {
  try {
    const parsed = JSON.parse(value) as Partial<LifeScheduleState> | null;
    if (!parsed || parsed.version !== 1) return EMPTY_STATE;
    const selectedDay = Number(parsed.selectedDay);
    return {
      version: 1,
      selectedDay:
        Number.isInteger(selectedDay) && selectedDay >= 1 && selectedDay <= 20
          ? selectedDay
          : 1,
      completed:
        parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
      weights: parsed.weights && typeof parsed.weights === "object" ? parsed.weights : {},
      notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeStoredState(next: LifeScheduleState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIFE_SCHEDULE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(STATE_EVENT));
  } catch {
    // The schedule remains usable when storage is unavailable.
  }
}

function progressLabel(completed: number, total: number) {
  return total === 0 ? "0%" : `${Math.round((completed / total) * 100)}%`;
}

export default function LifeScheduleCenter({ onHome, initialView = "schedule" }: LifeScheduleCenterProps) {
  const [activeView, setActiveView] = useState<"schedule" | "health">(initialView);
  const storedJson = useSyncExternalStore(
    subscribeToStoredState,
    getStoredState,
    () => EMPTY_STATE_JSON,
  );
  const state = useMemo(() => parseStoredState(storedJson), [storedJson]);
  const selectedDay = lifeScheduleDays[state.selectedDay - 1] ?? lifeScheduleDays[0];

  const updateState = useCallback(
    (updater: (current: LifeScheduleState) => LifeScheduleState) => {
      writeStoredState(updater(parseStoredState(getStoredState())));
    },
    [],
  );

  const selectDay = useCallback(
    (day: number) => {
      updateState((current) => ({ ...current, selectedDay: day }));
    },
    [updateState],
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      updateState((current) => ({
        ...current,
        completed: {
          ...current.completed,
          [taskId]: !current.completed[taskId],
        },
      }));
    },
    [updateState],
  );

  const updateWeight = useCallback(
    (date: string, value: string) => {
      updateState((current) => ({
        ...current,
        weights: { ...current.weights, [date]: value },
      }));
    },
    [updateState],
  );

  const updateNote = useCallback(
    (date: string, value: string) => {
      updateState((current) => ({
        ...current,
        notes: { ...current.notes, [date]: value },
      }));
    },
    [updateState],
  );

  const completedToday = selectedDay.tasks.filter((task) => state.completed[task.id]).length;
  const allTasks = lifeScheduleDays.flatMap((day) => day.tasks);
  const completedOverall = allTasks.filter((task) => state.completed[task.id]).length;
  const completedDays = lifeScheduleDays.filter((day) =>
    day.tasks.every((task) => state.completed[task.id]),
  ).length;

  const categoryCounts = selectedDay.tasks.reduce<Record<LifeScheduleCategory, number>>(
    (counts, task) => {
      counts[task.category] += 1;
      return counts;
    },
    { aipm: 0, fitness: 0, media: 0, life: 0, free: 0 },
  );

  return (
    <main className="life20-shell">
      <header className="life20-header">
        <button className="life20-home" type="button" onClick={onHome}>
          <span aria-hidden="true">←</span>
          返回首页
        </button>
        <div className="life20-brand" aria-label="20 天生活日程中心">
          <strong>LIFE / 20</strong>
          <span>日程中心</span>
        </div>
        <div className="life20-overall" aria-label={`总进度 ${completedOverall} 项`}>
          <span>{completedDays}/20 完整日</span>
          <div className="life20-overall-track" aria-hidden="true">
            <i style={{ width: progressLabel(completedOverall, allTasks.length) }} />
          </div>
          <strong>{progressLabel(completedOverall, allTasks.length)}</strong>
        </div>
      </header>

      <section className="life20-intro" aria-labelledby="life20-title">
        <div className="life20-intro-copy">
          <p className="life20-kicker">
            20 DAY PRACTICE · {LIFE_SCHEDULE_START.replaceAll("-", ".")} — {LIFE_SCHEDULE_END.replaceAll("-", ".")}
          </p>
          <h1 id="life20-title">今天，只推进三件事。</h1>
        </div>
        <div className="life20-intro-rule" aria-hidden="true">
          <span>学会做产品</span>
          <span>练好身体</span>
          <span>拍出审美</span>
        </div>
        <p className="life20-intro-note">
          二十天，把注意力收回到今天：交付一个 AIPM 成果，完成一次有效训练，
          留下一段可复盘的画面。完成、打勾、留下证据。
        </p>
      </section>

      <nav className="life20-workspace-switch" aria-label="二十天计划功能">
        <div>
          <button
            type="button"
            aria-pressed={activeView === "schedule"}
            onClick={() => setActiveView("schedule")}
          >
            <span>01</span>
            <strong>今日日程</strong>
            <small>任务、打卡与复盘</small>
          </button>
          <button
            type="button"
            aria-pressed={activeView === "health"}
            onClick={() => setActiveView("health")}
          >
            <span>02</span>
            <strong>健康专家</strong>
            <small>饮食、热量与蛋白质</small>
          </button>
        </div>
        <p>{activeView === "schedule" ? "执行今天的三条成长线" : "记录真实摄入，查看估算热量差"}</p>
      </nav>

      <div className="life20-layout">
        <aside className="life20-calendar" aria-label="选择计划日期">
          <div className="life20-calendar-head">
            <p>JUL — AUG / 2026</p>
            <strong>20 天 · 四练一休</strong>
          </div>
          <ol className="life20-day-list">
            {lifeScheduleDays.map((day) => {
              const done = day.tasks.filter((task) => state.completed[task.id]).length;
              const isComplete = done === day.tasks.length;
              return (
                <li key={day.date}>
                  <button
                    type="button"
                    className="life20-day-button"
                    aria-current={day.day === selectedDay.day ? "date" : undefined}
                    onClick={() => selectDay(day.day)}
                  >
                    <span className="life20-day-index">{String(day.day).padStart(2, "0")}</span>
                    <span className="life20-day-date">
                      <strong>{day.monthDay}</strong>
                      <small>{day.weekday} · {day.trainingShort}</small>
                    </span>
                    <span className="life20-day-progress" aria-label={`${done} / ${day.tasks.length} 项`}>
                      {isComplete ? "DONE" : `${done}/${day.tasks.length}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="life20-content">
          {activeView === "schedule" ? (
            <>
          <section className="life20-day-hero" aria-labelledby="life20-day-title">
            <div className="life20-day-number" aria-hidden="true">
              D.{String(selectedDay.day).padStart(2, "0")}
            </div>
            <div className="life20-day-summary">
              <p>
                第 {selectedDay.cycle} 轮 · {selectedDay.mode === "recovery" ? "恢复日" : "训练日"}
              </p>
              <h2 id="life20-day-title">{selectedDay.monthDay} · {selectedDay.weekday}</h2>
              <strong>{selectedDay.training}</strong>
            </div>
            <div className="life20-today-progress">
              <span>今日完成</span>
              <strong>{progressLabel(completedToday, selectedDay.tasks.length)}</strong>
              <div aria-hidden="true">
                <i style={{ width: progressLabel(completedToday, selectedDay.tasks.length) }} />
              </div>
            </div>
          </section>

          <section className="life20-focus-grid" aria-label="今日重点成果">
            <article className="life20-focus-card life20-focus-aipm">
              <p>A / 今日 AIPM 交付物</p>
              <h3>{selectedDay.aipmMilestone}</h3>
              <span>完成标准：必须留下可放入作品集的文件、截图或结论。</span>
            </article>
            <article className="life20-focus-card life20-focus-media">
              <p>M / 今日拍摄训练</p>
              <h3>{selectedDay.mediaMilestone}</h3>
              <span>先练画面控制，再决定是否发布；不为数量牺牲质量。</span>
            </article>
          </section>

          <div className="life20-work-grid">
            <section className="life20-timeline" aria-labelledby="life20-timeline-title">
              <div className="life20-section-head">
                <div>
                  <p>DAILY RUNWAY</p>
                  <h2 id="life20-timeline-title">今日时间表</h2>
                </div>
                <div className="life20-legend" aria-label="日程分类">
                  {(Object.keys(lifeScheduleCategories) as LifeScheduleCategory[]).map((key) => (
                    <span key={key} data-category={key}>
                      {lifeScheduleCategories[key].shortLabel}
                      <small>{categoryCounts[key]}</small>
                    </span>
                  ))}
                </div>
              </div>

              <ol className="life20-task-list">
                {selectedDay.tasks.map((task) => {
                  const checked = Boolean(state.completed[task.id]);
                  return (
                    <li key={task.id} className={checked ? "is-complete" : undefined}>
                      <button
                        type="button"
                        className="life20-task-button"
                        onClick={() => toggleTask(task.id)}
                        aria-pressed={checked}
                      >
                        <span className="life20-task-time">
                          <strong>{task.start}</strong>
                          <small>{task.end}</small>
                        </span>
                        <span className="life20-task-marker" data-category={task.category} aria-hidden="true" />
                        <span className="life20-task-copy">
                          <span className="life20-task-category">
                            {lifeScheduleCategories[task.category].label}
                          </span>
                          <strong>{task.title}</strong>
                          {task.detail ? <small>{task.detail}</small> : null}
                        </span>
                        <span className="life20-check" aria-hidden="true">
                          {checked ? "✓" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>

            <aside className="life20-log" aria-labelledby="life20-log-title">
              <div className="life20-log-sticky">
                <div className="life20-section-head">
                  <div>
                    <p>DAILY EVIDENCE</p>
                    <h2 id="life20-log-title">今日记录</h2>
                  </div>
                </div>

                <label className="life20-field">
                  <span>晨起体重</span>
                  <span className="life20-weight-wrap">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="40"
                      max="200"
                      step="0.1"
                      value={state.weights[selectedDay.date] ?? ""}
                      onChange={(event) => updateWeight(selectedDay.date, event.target.value)}
                      placeholder="95.0"
                    />
                    <small>KG</small>
                  </span>
                </label>

                <label className="life20-field life20-note-field">
                  <span>当天复盘</span>
                  <textarea
                    rows={8}
                    value={state.notes[selectedDay.date] ?? ""}
                    onChange={(event) => updateNote(selectedDay.date, event.target.value)}
                    placeholder="今天完成了什么？卡在哪里？明天第一步做什么？"
                  />
                </label>

                <div className="life20-proof-rule">
                  <p>每天至少留下三项证据</p>
                  <ul>
                    <li>AIPM 可展示成果</li>
                    <li>训练重量或身体数据</li>
                    <li>一段拍摄练习或审美拆解</li>
                  </ul>
                </div>

                <p className="life20-save-note">打卡、体重和复盘会自动保存在当前设备。</p>
              </div>
            </aside>
          </div>
            </>
          ) : (
            <HealthExpert
              selectedDate={selectedDay.date}
              dayLabel={`${selectedDay.monthDay} · ${selectedDay.weekday}`}
              mode={selectedDay.mode}
              dailyWeight={state.weights[selectedDay.date] ?? ""}
              onDailyWeightChange={(value) => updateWeight(selectedDay.date, value)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
