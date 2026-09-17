"use client";

import { aipmProgramDays } from "./aipm-program-data";
import "./project-validation.css";

type MilestoneState = "locked" | "open" | "current" | "complete";

interface ValidationMilestone {
  unit: number;
  day: number;
  label: string;
  title: string;
  evidence: string;
}

interface ValidationProject {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  span: string;
  milestones: readonly ValidationMilestone[];
}

export interface ProjectValidationProps {
  completedUnitIds?: readonly number[];
  unlockedUnit?: number;
  selectedUnit?: number;
  onOpenUnit?: (unitId: number) => void;
}

export const validationProjects: readonly ValidationProject[] = [
  {
    id: "meeting-signal",
    index: "PROJECT / 01",
    title: "Meeting Signal",
    subtitle: "会议决策助手",
    span: "DAY 19—23",
    milestones: [
      { unit: 38, day: 19, label: "立项", title: "锁定真实问题", evidence: "项目章程与招募计划" },
      { unit: 39, day: 20, label: "研究", title: "完成真实访谈", evidence: "5 份匿名访谈记录" },
      { unit: 40, day: 20, label: "洞察", title: "从证据到机会点", evidence: "行为旅程与洞察卡" },
      { unit: 41, day: 21, label: "方案", title: "设计 AI 交互闭环", evidence: "流程、状态与责任边界" },
      { unit: 42, day: 21, label: "原型", title: "做出可点击版本", evidence: "原型链接与用户任务卡" },
      { unit: 43, day: 22, label: "验证", title: "完成可用性测试", evidence: "5 场测试与问题排行" },
      { unit: 44, day: 22, label: "评估", title: "建立 AI 质量样本集", evidence: "20 条 Eval 与错误分类" },
      { unit: 45, day: 23, label: "交付", title: "写成作品案例", evidence: "案例、附件与 3 分钟讲稿" },
    ],
  },
  {
    id: "signal-before-scale",
    index: "PROJECT / 02",
    title: "Signal Before Scale",
    subtitle: "内容验证助手",
    span: "DAY 23—27",
    milestones: [
      { unit: 46, day: 23, label: "立项", title: "把经历变成问题优势", evidence: "项目章程与 Top 3 风险" },
      { unit: 47, day: 24, label: "研究", title: "还原内容决策工作流", evidence: "访谈与现状流程" },
      { unit: 48, day: 24, label: "洞察", title: "选择可验证机会", evidence: "机会地图与放弃项" },
      { unit: 49, day: 25, label: "方案", title: "设计证据卡工作流", evidence: "七步流程与状态图" },
      { unit: 50, day: 25, label: "原型", title: "构建可测试决策体验", evidence: "原型与两套标注数据" },
      { unit: 51, day: 26, label: "验证", title: "验证判断是否改善", evidence: "前后判断量表与测试报告" },
      { unit: 52, day: 26, label: "评估", title: "测试提示与证据忠实度", evidence: "20 条 Eval 与两轮结果" },
      { unit: 53, day: 27, label: "交付", title: "形成差异化作品案例", evidence: "案例、原型与能力对照表" },
    ],
  },
] as const;

function getMilestoneState(
  unit: number,
  completedUnits: ReadonlySet<number>,
  unlockedUnit: number,
  selectedUnit?: number,
): MilestoneState {
  if (completedUnits.has(unit)) return "complete";
  if (selectedUnit === unit) return "current";
  return unit <= unlockedUnit ? "open" : "locked";
}

function getDayState(
  unitIds: readonly [number, number],
  completedUnits: ReadonlySet<number>,
  unlockedUnit: number,
  selectedUnit?: number,
): MilestoneState {
  if (unitIds.every((unit) => completedUnits.has(unit))) return "complete";
  if (selectedUnit && unitIds.includes(selectedUnit)) return "current";
  return unitIds[0] <= unlockedUnit ? "open" : "locked";
}

export default function ProjectValidation({
  completedUnitIds = [],
  unlockedUnit = 1,
  selectedUnit,
  onOpenUnit,
}: ProjectValidationProps) {
  const completedUnits = new Set(completedUnitIds);
  const completedMilestones = validationProjects
    .flatMap((project) => project.milestones)
    .filter((milestone) => completedUnits.has(milestone.unit)).length;
  const totalMilestones = validationProjects.flatMap((project) => project.milestones).length;

  return (
    <section className="pv-shell" aria-labelledby="pv-title">
      <header className="pv-hero">
        <div className="pv-hero-copy">
          <p>PROJECT VALIDATION / 30-DAY CUT</p>
          <h2 id="pv-title">把学习剪成一条<br />经得起追问的证据线。</h2>
          <span>两次真实问题验证 · 两个可点击原型 · 两份可讲述案例</span>
        </div>
        <div className="pv-counter" aria-label={`项目验证节点已完成 ${completedMilestones} / ${totalMilestones}`}>
          <span>VALIDATED</span>
          <strong>{String(completedMilestones).padStart(2, "0")}</strong>
          <small>/ {totalMilestones}</small>
        </div>
      </header>

      <section className="pv-film" aria-labelledby="pv-film-title">
        <div className="pv-section-heading">
          <div>
            <p>MASTER TIMELINE</p>
            <h3 id="pv-film-title">30 个自然日 / 60 个训练单元</h3>
          </div>
          <p>每一格是一天；上下两道刻痕对应当天两个训练单元。</p>
        </div>
        <ol className="pv-day-strip">
          {aipmProgramDays.map((day) => {
            const state = getDayState(day.unitIds, completedUnits, unlockedUnit, selectedUnit);
            return (
              <li key={day.calendarDay} data-state={state}>
                <span>{String(day.calendarDay).padStart(2, "0")}</span>
                <i aria-hidden="true" />
                <small>{day.unitIds[0]}·{day.unitIds[1]}</small>
              </li>
            );
          })}
        </ol>
        <div className="pv-act-legend" aria-label="30 天学习阶段">
          <span style={{ gridColumn: "span 15" }}>ACT I · AI 基础与协作</span>
          <span style={{ gridColumn: "span 3" }}>ACT II · 产品基本功</span>
          <span style={{ gridColumn: "span 5" }}>ACT III · 项目一</span>
          <span style={{ gridColumn: "span 4" }}>ACT IV · 项目二</span>
          <span style={{ gridColumn: "span 3" }}>ACT V · 作品集</span>
        </div>
      </section>

      <div className="pv-projects">
        {validationProjects.map((project) => {
          const projectCompleted = project.milestones.filter((item) => completedUnits.has(item.unit)).length;
          return (
            <article className="pv-project" key={project.id} aria-labelledby={`${project.id}-title`}>
              <header className="pv-project-head">
                <div>
                  <p>{project.index}</p>
                  <h3 id={`${project.id}-title`}>{project.title}</h3>
                  <span>{project.subtitle}</span>
                </div>
                <div>
                  <span>{project.span}</span>
                  <strong>{projectCompleted}/{project.milestones.length}</strong>
                </div>
              </header>

              <ol className="pv-milestones">
                {project.milestones.map((milestone, index) => {
                  const state = getMilestoneState(
                    milestone.unit,
                    completedUnits,
                    unlockedUnit,
                    selectedUnit,
                  );
                  const disabled = state === "locked" || !onOpenUnit;
                  return (
                    <li key={milestone.unit} data-state={state}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onOpenUnit?.(milestone.unit)}
                        aria-label={`自然日 ${milestone.day}，训练单元 ${milestone.unit}，${milestone.title}，${state === "complete" ? "已完成" : state === "current" ? "当前进行" : state === "open" ? "可进入" : "未解锁"}`}
                      >
                        <span className="pv-node-index">{String(index + 1).padStart(2, "0")}</span>
                        <span className="pv-node-copy">
                          <small>DAY {milestone.day} · UNIT {milestone.unit} · {milestone.label}</small>
                          <strong>{milestone.title}</strong>
                          <span>{milestone.evidence}</span>
                        </span>
                        <span className="pv-node-state" aria-hidden="true">
                          {state === "complete" ? "DONE" : state === "current" ? "NOW" : state === "open" ? "OPEN" : "LOCK"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}

