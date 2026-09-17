"use client";

import { useMemo, useSyncExternalStore } from "react";
import { trainingDays } from "./training-data";
import "./milestone-center.css";

const TRAINING_STORAGE_KEY = "aipm-v3-state";
const TRAINING_STATE_VERSION = 3;
const TRAINING_STATE_EVENT = "aipm-v3-state-change";
const EMPTY_SNAPSHOT = "";

interface StoredDayRecord {
  completed?: boolean;
  evidence?: string;
  practiceDraft?: string;
}

interface StoredTrainingState {
  version?: number;
  unlockedDay?: number;
  selectedDay?: number;
  days?: Record<string, StoredDayRecord>;
}

interface MilestoneSnapshot {
  completedUnitIds: number[];
  unlockedUnit: number;
  selectedUnit: number;
  records: Record<string, StoredDayRecord>;
}

interface AcceptanceOutcome {
  id: string;
  label: string;
  title: string;
  description: string;
  requiredUnits: readonly number[];
}

export interface MilestoneCenterProps {
  onOpenUnit?: (unitId: number) => void;
  onOpenProjects?: () => void;
}

const acceptanceOutcomes: readonly AcceptanceOutcome[] = [
  {
    id: "prototypes",
    label: "PROTOTYPE",
    title: "两个可点击原型",
    description: "Meeting Signal 与 Signal Before Scale 均能跑通一条核心任务。",
    requiredUnits: [42, 50],
  },
  {
    id: "cases",
    label: "CASE STUDY",
    title: "两份证据型项目案例",
    description: "问题、研究、关键决策、验证结果与个人贡献能够被追问。",
    requiredUnits: [45, 53],
  },
  {
    id: "evals",
    label: "AI EVALUATION",
    title: "两套 AI 质量评估",
    description: "每个项目都有样本、人工标注、评分规则与错误分类。",
    requiredUnits: [44, 52],
  },
  {
    id: "portfolio",
    label: "PORTFOLIO",
    title: "作品集与一页简历",
    description: "能力声明均能回到可打开、可解释的训练证据。",
    requiredUnits: [54, 56],
  },
  {
    id: "interview",
    label: "DEFENSE",
    title: "现场题与最终答辩",
    description: "在限时和追问下独立说明假设、取舍、指标与风险。",
    requiredUnits: [59, 60],
  },
  {
    id: "application",
    label: "JOB LAUNCH",
    title: "Top 3 定制投递包",
    description: "作品集、简历与岗位要求完成事实核对并进入真实投递。",
    requiredUnits: [57, 60],
  },
] as const;

function getStoredSnapshot() {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  try {
    return window.localStorage.getItem(TRAINING_STORAGE_KEY) || EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function subscribeToTrainingState(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === TRAINING_STORAGE_KEY) callback();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", callback);
  window.addEventListener(TRAINING_STATE_EVENT, callback);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", callback);
    window.removeEventListener(TRAINING_STATE_EVENT, callback);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function readMilestoneSnapshot(raw: string): MilestoneSnapshot {
  const fallback: MilestoneSnapshot = {
    completedUnitIds: [],
    unlockedUnit: 1,
    selectedUnit: 1,
    records: {},
  };

  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as StoredTrainingState | null;
    if (!parsed || parsed.version !== TRAINING_STATE_VERSION || !parsed.days) return fallback;

    const records = Object.fromEntries(
      Object.entries(parsed.days).filter(([, record]) => record && typeof record === "object"),
    );
    const completedUnitIds = trainingDays
      .filter((unit) => records[String(unit.day)]?.completed === true)
      .map((unit) => unit.day);
    const unlockedUnit = Math.min(
      trainingDays.length,
      Math.max(1, Number(parsed.unlockedDay) || 1),
    );
    const selectedUnit = Math.min(
      unlockedUnit,
      Math.max(1, Number(parsed.selectedDay) || 1),
    );

    return { completedUnitIds, unlockedUnit, selectedUnit, records };
  } catch {
    return fallback;
  }
}

function excerpt(value: string | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized) return "尚未提交可核验的证据说明。";
  return normalized.length > 110 ? `${normalized.slice(0, 110)}…` : normalized;
}

export default function MilestoneCenter({ onOpenUnit, onOpenProjects }: MilestoneCenterProps) {
  const rawState = useSyncExternalStore(
    subscribeToTrainingState,
    getStoredSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  const snapshot = useMemo(() => readMilestoneSnapshot(rawState), [rawState]);
  const completedUnits = new Set(snapshot.completedUnitIds);
  const completedOutcomes = acceptanceOutcomes.filter((outcome) =>
    outcome.requiredUnits.every((unit) => completedUnits.has(unit)),
  ).length;
  const unitProgress = Math.round((snapshot.completedUnitIds.length / trainingDays.length) * 100);
  const finalUnits = trainingDays.filter((unit) => unit.day >= 59);

  return (
    <section className="mc-shell" aria-labelledby="mc-title">
      <header className="mc-hero">
        <div className="mc-title-block">
          <p>DAY 30 / FINAL CHECKPOINT</p>
          <h2 id="mc-title">最后一天，<br />只验收能打开的成果。</h2>
          <span>这里读取当前设备中的 AIPM V3 训练进度，不新增另一套打卡。</span>
        </div>
        <div className="mc-progress-block">
          <div>
            <span>60 UNIT PROGRESS</span>
            <strong>{unitProgress}%</strong>
          </div>
          <progress max={trainingDays.length} value={snapshot.completedUnitIds.length}>
            {snapshot.completedUnitIds.length} / {trainingDays.length}
          </progress>
          <p>{snapshot.completedUnitIds.length} / 60 单元完成 · 已解锁至 Unit {snapshot.unlockedUnit}</p>
        </div>
      </header>

      <section className="mc-final-cut" aria-labelledby="mc-final-title">
        <div className="mc-section-head">
          <div>
            <p>THE FINAL CUT</p>
            <h3 id="mc-final-title">第 30 天固定验收</h3>
          </div>
          <strong>{completedOutcomes}/{acceptanceOutcomes.length}</strong>
        </div>

        <ol className="mc-outcome-grid">
          {acceptanceOutcomes.map((outcome, index) => {
            const completed = outcome.requiredUnits.every((unit) => completedUnits.has(unit));
            const available = outcome.requiredUnits.some((unit) => unit <= snapshot.unlockedUnit);
            return (
              <li key={outcome.id} data-state={completed ? "complete" : available ? "open" : "locked"}>
                <span className="mc-outcome-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>{outcome.label} · UNIT {outcome.requiredUnits.join(" / ")}</small>
                  <h4>{outcome.title}</h4>
                  <p>{outcome.description}</p>
                </div>
                <span className="mc-outcome-state">{completed ? "PASSED" : available ? "IN PROGRESS" : "LOCKED"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mc-day-thirty" aria-labelledby="mc-day-thirty-title">
        <div className="mc-section-head">
          <div>
            <p>DAY 30 / TWO UNITS</p>
            <h3 id="mc-day-thirty-title">终局两次交付</h3>
          </div>
          {onOpenProjects ? (
            <button type="button" onClick={onOpenProjects}>查看双项目验证线</button>
          ) : null}
        </div>

        <div className="mc-final-units">
          {finalUnits.map((unit) => {
            const record = snapshot.records[String(unit.day)];
            const state = completedUnits.has(unit.day)
              ? "complete"
              : unit.day <= snapshot.unlockedUnit
                ? "open"
                : "locked";
            return (
              <article key={unit.day} data-state={state}>
                <div className="mc-unit-meta">
                  <span>UNIT {unit.day}</span>
                  <span>{unit.duration}</span>
                </div>
                <h4>{unit.title}</h4>
                <p>{unit.deliverable}</p>
                <blockquote>{excerpt(record?.evidence)}</blockquote>
                <button
                  type="button"
                  disabled={state === "locked" || !onOpenUnit}
                  onClick={() => onOpenUnit?.(unit.day)}
                >
                  {state === "complete" ? "重新查看训练单元" : state === "open" ? "进入训练单元" : "尚未解锁"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="mc-footnote">
        <span>LOCAL PROGRESS / AIPM V3</span>
        <p>验收状态来自当前设备，不会上传文件，也不会把尚未完成的成果标记为通过。</p>
      </footer>
    </section>
  );
}

