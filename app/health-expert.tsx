"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  DEFAULT_DAILY_DEFICIT_PERCENT,
  DEFAULT_HEALTH_PROFILE,
  HEALTH_EXPERT_STORAGE_KEY,
  activityOptions,
  buildExpertInsight,
  calculateBmr,
  calculateCalorieBalance,
  calculateDailyNutritionTargets,
  calculateFoodTotals,
  calculateTdee,
  foodPresets,
  type DailyEnergySetting,
  type FoodEntry,
  type FoodMeal,
  type HealthExpertState,
  type HealthProfile,
} from "./health-expert-data";
import type { LifeScheduleMode } from "./life-schedule-data";
import "./health-expert.css";

interface HealthExpertProps {
  selectedDate: string;
  dayLabel: string;
  mode: LifeScheduleMode;
  dailyWeight: string;
  onDailyWeightChange: (value: string) => void;
}

const mealSections: Array<{
  id: FoodMeal;
  label: string;
  english: string;
  hint: string;
}> = [
  { id: "breakfast", label: "早餐", english: "BREAKFAST", hint: "第一餐" },
  { id: "lunch", label: "午餐", english: "LUNCH", hint: "第二餐" },
  { id: "dinner", label: "晚餐", english: "DINNER", hint: "第三餐" },
];

const EMPTY_STATE: HealthExpertState = {
  version: 1,
  profile: DEFAULT_HEALTH_PROFILE,
  foodsByDate: {},
  settingsByDate: {},
  bodyFatByDate: {},
};

const EMPTY_STATE_JSON = JSON.stringify(EMPTY_STATE);
const HEALTH_STATE_EVENT = "life20-health-expert-state-change";

function readStoredState() {
  if (typeof window === "undefined") return EMPTY_STATE_JSON;
  try {
    return window.localStorage.getItem(HEALTH_EXPERT_STORAGE_KEY) || EMPTY_STATE_JSON;
  } catch {
    return EMPTY_STATE_JSON;
  }
}

function subscribeToStoredState(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === HEALTH_EXPERT_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(HEALTH_STATE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(HEALTH_STATE_EVENT, callback);
  };
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeMeal(value: unknown): FoodMeal {
  return value === "breakfast" || value === "dinner" ? value : "lunch";
}

function parseStoredState(value: string): HealthExpertState {
  try {
    const parsed = JSON.parse(value) as Partial<HealthExpertState> | null;
    if (!parsed || parsed.version !== 1) return EMPTY_STATE;

    const savedProfile = parsed.profile ?? DEFAULT_HEALTH_PROFILE;
    const foodsByDate = Object.fromEntries(
      Object.entries(
        parsed.foodsByDate && typeof parsed.foodsByDate === "object"
          ? parsed.foodsByDate
          : {},
      ).map(([date, foods]) => [
        date,
        Array.isArray(foods)
          ? foods.map((food, index) => {
              const saved = food as Partial<FoodEntry>;
              return {
                id: stringValue(saved.id, `legacy-${date}-${index}`),
                name: stringValue(saved.name, "未命名食物"),
                meal: normalizeMeal(saved.meal),
                grams: stringValue(saved.grams, "0"),
                caloriesPer100g: stringValue(saved.caloriesPer100g, "0"),
                proteinPer100g: stringValue(saved.proteinPer100g, "0"),
                carbsPer100g: stringValue(saved.carbsPer100g, "0"),
                fatPer100g: stringValue(saved.fatPer100g, "0"),
                source: saved.source === "preset" ? "preset" : "custom",
              } satisfies FoodEntry;
            })
          : [],
      ]),
    );
    const settingsByDate = Object.fromEntries(
      Object.entries(
        parsed.settingsByDate && typeof parsed.settingsByDate === "object"
          ? parsed.settingsByDate
          : {},
      ).map(([date, setting]) => {
        const saved = setting as Partial<DailyEnergySetting>;
        return [
          date,
          {
            activityFactor: stringValue(saved.activityFactor, "1.55"),
            manualExpenditure: stringValue(saved.manualExpenditure),
            deficitPercent: stringValue(
              saved.deficitPercent,
              DEFAULT_DAILY_DEFICIT_PERCENT,
            ),
          } satisfies DailyEnergySetting,
        ];
      }),
    );
    const bodyFatByDate = Object.fromEntries(
      Object.entries(
        parsed.bodyFatByDate && typeof parsed.bodyFatByDate === "object"
          ? parsed.bodyFatByDate
          : {},
      ).map(([date, bodyFat]) => [date, stringValue(bodyFat)]),
    );

    return {
      version: 1,
      profile: {
        sex: savedProfile.sex === "female" ? "female" : "male",
        age: stringValue(savedProfile.age),
        heightCm: stringValue(savedProfile.heightCm, "190"),
        weightKg: stringValue(savedProfile.weightKg, "96.4"),
        bodyFatPercent: stringValue(savedProfile.bodyFatPercent, "25"),
      },
      foodsByDate,
      settingsByDate,
      bodyFatByDate,
    };
  } catch {
    return EMPTY_STATE;
  }
}

function writeStoredState(next: HealthExpertState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HEALTH_EXPERT_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(HEALTH_STATE_EVENT));
  } catch {
    // The calculator remains usable when local storage is unavailable.
  }
}

function createEntryId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("zh-CN");
}

function progressPercent(actual: number, target: number | undefined) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, (actual / target) * 100));
}

export default function HealthExpert({
  selectedDate,
  dayLabel,
  mode,
  dailyWeight,
  onDailyWeightChange,
}: HealthExpertProps) {
  const storedJson = useSyncExternalStore(
    subscribeToStoredState,
    readStoredState,
    () => EMPTY_STATE_JSON,
  );
  const state = useMemo(() => parseStoredState(storedJson), [storedJson]);
  const defaultActivityFactor = mode === "training" ? "1.55" : "1.375";
  const dailySetting: DailyEnergySetting = state.settingsByDate[selectedDate] ?? {
    activityFactor: defaultActivityFactor,
    manualExpenditure: "",
    deficitPercent: DEFAULT_DAILY_DEFICIT_PERCENT,
  };
  const entries = useMemo(
    () => state.foodsByDate[selectedDate] ?? [],
    [selectedDate, state.foodsByDate],
  );
  const dailyBodyFat = state.bodyFatByDate[selectedDate] ?? "";
  const effectiveBodyFat = dailyBodyFat || state.profile.bodyFatPercent;
  const effectiveWeight = dailyWeight || state.profile.weightKg;
  const [activeMeal, setActiveMeal] = useState<FoodMeal>("breakfast");
  const [draft, setDraft] = useState({
    name: "",
    grams: "",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
  });

  const updateState = useCallback(
    (updater: (current: HealthExpertState) => HealthExpertState) => {
      writeStoredState(updater(parseStoredState(readStoredState())));
    },
    [],
  );

  const updateProfile = useCallback(
    (field: keyof HealthProfile, value: string) => {
      updateState((current) => ({
        ...current,
        profile:
          field === "sex"
            ? { ...current.profile, sex: value === "female" ? "female" : "male" }
            : { ...current.profile, [field]: value },
      }));
    },
    [updateState],
  );

  const updateSetting = useCallback(
    (field: keyof DailyEnergySetting, value: string) => {
      updateState((current) => {
        const previous = current.settingsByDate[selectedDate] ?? {
          activityFactor: defaultActivityFactor,
          manualExpenditure: "",
          deficitPercent: DEFAULT_DAILY_DEFICIT_PERCENT,
        };
        return {
          ...current,
          settingsByDate: {
            ...current.settingsByDate,
            [selectedDate]: { ...previous, [field]: value },
          },
        };
      });
    },
    [defaultActivityFactor, selectedDate, updateState],
  );

  const updateDailyBodyFat = useCallback(
    (value: string) => {
      updateState((current) => ({
        ...current,
        bodyFatByDate: {
          ...current.bodyFatByDate,
          [selectedDate]: value,
        },
      }));
    },
    [selectedDate, updateState],
  );

  const addEntry = useCallback(
    (entry: Omit<FoodEntry, "id">) => {
      updateState((current) => ({
        ...current,
        foodsByDate: {
          ...current.foodsByDate,
          [selectedDate]: [
            ...(current.foodsByDate[selectedDate] ?? []),
            { ...entry, id: createEntryId("food") },
          ],
        },
      }));
    },
    [selectedDate, updateState],
  );

  const addPreset = useCallback(
    (presetId: string) => {
      const preset = foodPresets.find((item) => item.id === presetId);
      if (!preset) return;
      addEntry({
        name: preset.name,
        meal: activeMeal,
        grams: String(preset.defaultGrams),
        caloriesPer100g: String(preset.caloriesPer100g),
        proteinPer100g: String(preset.proteinPer100g),
        carbsPer100g: String(preset.carbsPer100g),
        fatPer100g: String(preset.fatPer100g),
        source: "preset",
      });
    },
    [activeMeal, addEntry],
  );

  const addCustomEntry = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (
        !draft.name.trim() ||
        !(Number(draft.grams) > 0) ||
        !(Number(draft.caloriesPer100g) >= 0)
      ) {
        return;
      }

      addEntry({
        name: draft.name.trim(),
        meal: activeMeal,
        grams: draft.grams,
        caloriesPer100g: draft.caloriesPer100g,
        proteinPer100g: draft.proteinPer100g || "0",
        carbsPer100g: draft.carbsPer100g || "0",
        fatPer100g: draft.fatPer100g || "0",
        source: "custom",
      });
      setDraft({
        name: "",
        grams: "",
        caloriesPer100g: "",
        proteinPer100g: "",
        carbsPer100g: "",
        fatPer100g: "",
      });
    },
    [activeMeal, addEntry, draft],
  );

  const updateEntry = useCallback(
    (
      entryId: string,
      field: Exclude<keyof FoodEntry, "id" | "source">,
      value: string,
    ) => {
      updateState((current) => ({
        ...current,
        foodsByDate: {
          ...current.foodsByDate,
          [selectedDate]: (current.foodsByDate[selectedDate] ?? []).map((entry) =>
            entry.id === entryId ? { ...entry, [field]: value } : entry,
          ),
        },
      }));
    },
    [selectedDate, updateState],
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      updateState((current) => ({
        ...current,
        foodsByDate: {
          ...current.foodsByDate,
          [selectedDate]: (current.foodsByDate[selectedDate] ?? []).filter(
            (entry) => entry.id !== entryId,
          ),
        },
      }));
    },
    [selectedDate, updateState],
  );

  const totals = useMemo(() => calculateFoodTotals(entries), [entries]);
  const targets = calculateDailyNutritionTargets(
    state.profile,
    dailySetting,
    dailyWeight,
    effectiveBodyFat,
  );
  const bmr = calculateBmr(state.profile, dailyWeight);
  const expenditure =
    targets?.expenditure ??
    calculateTdee(
      state.profile,
      dailySetting.activityFactor,
      dailyWeight,
      dailySetting.manualExpenditure,
    );
  const calculatedBalance = calculateCalorieBalance(expenditure, totals.calories);
  const balance = entries.length === 0 ? null : calculatedBalance;
  const balanceState =
    balance === null
      ? "unknown"
      : balance > 50
        ? "deficit"
        : balance < -50
          ? "surplus"
          : "balanced";
  const balanceLabel =
    balance === null
      ? "等待饮食记录"
      : balanceState === "deficit"
        ? "当前估算赤字"
        : balanceState === "surplus"
          ? "当前估算盈余"
          : "当前接近平衡";
  const balanceValue = balance === null ? "—" : formatNumber(Math.abs(balance));
  const actualTrackPosition =
    expenditure && entries.length > 0
      ? Math.max(0, Math.min(100, (totals.calories / expenditure) * 100))
      : null;
  const targetTrackPosition =
    targets && expenditure
      ? Math.max(0, Math.min(100, (targets.calories / expenditure) * 100))
      : null;
  const insight = buildExpertInsight({
    entryCount: entries.length,
    intake: totals.calories,
    expenditure,
    balance,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    targets,
  });
  const metricItems = [
    { id: "calories", label: "热量", actual: totals.calories, target: targets?.calories, unit: "KCAL" },
    { id: "protein", label: "蛋白质", actual: totals.protein, target: targets?.protein, unit: "G" },
    { id: "carbs", label: "碳水", actual: totals.carbs, target: targets?.carbs, unit: "G" },
    { id: "fat", label: "脂肪", actual: totals.fat, target: targets?.fat, unit: "G" },
  ];

  return (
    <section className="health-expert" aria-labelledby="health-expert-title">
      <header className="health-expert-hero">
        <div className="health-expert-heading">
          <p>HEALTH EXPERT / DAILY NUTRITION PLAN</p>
          <h2 id="health-expert-title">
            今日应该摄入
            <strong>{targets ? formatNumber(targets.calories) : "完成档案"}</strong>
            {targets ? <small>kcal</small> : null}
          </h2>
          <div className="health-expert-target-strip" aria-label="今日宏量营养目标">
            <span><b>{targets ? `${targets.protein}g` : "—"}</b>蛋白质</span>
            <span><b>{targets ? `${targets.carbs}g` : "—"}</b>碳水</span>
            <span><b>{targets ? `${targets.fat}g` : "—"}</b>脂肪</span>
          </div>
          <div className="health-expert-vitals">
            <time className="health-expert-vitals-date" dateTime={selectedDate}>
              <span>当前记录日期</span>
              <strong>{selectedDate.replaceAll("-", ".")}</strong>
              <small>{dayLabel} · {mode === "training" ? "训练日" : "恢复日"}</small>
            </time>
            <label className="health-expert-vital-field health-expert-vital-weight">
              <span>当天晨重 / kg</span>
              <input
                type="number"
                inputMode="decimal"
                min="35"
                max="250"
                step="0.1"
                value={dailyWeight}
                onChange={(event) => onDailyWeightChange(event.target.value)}
                placeholder={state.profile.weightKg}
              />
              <small>{dailyWeight ? "使用当天记录" : `沿用档案 ${state.profile.weightKg}kg`}</small>
            </label>
            <label className="health-expert-vital-field health-expert-vital-bodyfat">
              <span>当天体脂率 / %</span>
              <input
                type="number"
                inputMode="decimal"
                min="3"
                max="70"
                step="0.1"
                value={dailyBodyFat}
                onChange={(event) => updateDailyBodyFat(event.target.value)}
                placeholder={state.profile.bodyFatPercent}
              />
              <small>{dailyBodyFat ? "使用当天记录" : `沿用档案 ${state.profile.bodyFatPercent}%`}</small>
            </label>
          </div>
          <span className="health-expert-device-note">当日目标随所选日期的晨重与体脂重新计算 · 仅保存在当前设备</span>
        </div>

        <div className="health-expert-balance" data-state={balanceState}>
          <span>ESTIMATED DAILY EXPENDITURE</span>
          <strong>{expenditure === null ? "—" : formatNumber(expenditure)}<small>kcal</small></strong>
          <p>{targets ? `计划热量缺口 ${formatNumber(targets.calorieDeficit)} kcal · ${targets.deficitPercent}%` : "填写年龄后生成当日计划"}</p>
          <div>
            <span>{balanceLabel}</span>
            <b>{balanceValue}{balance === null ? "" : " kcal"}</b>
          </div>
        </div>
      </header>

      <div className="health-expert-metrics" aria-label="今日目标与实际摄入对比">
        {metricItems.map((metric) => {
          const overTarget = Boolean(metric.target && metric.actual > metric.target);
          const remaining = metric.target ? Math.round(metric.target - metric.actual) : null;
          return (
            <div className="health-expert-metric" data-state={overTarget ? "over" : "within"} key={metric.id}>
              <span>{metric.label}</span>
              <div className="health-expert-metric-values">
                <strong>{formatNumber(metric.actual)}</strong>
                <small>/ {metric.target ? formatNumber(metric.target) : "—"} {metric.unit}</small>
              </div>
              <div className="health-expert-metric-progress" aria-hidden="true">
                <i style={{ width: `${progressPercent(metric.actual, metric.target)}%` }} />
              </div>
              <p>
                {remaining === null
                  ? "等待目标"
                  : remaining >= 0
                    ? `还差 ${formatNumber(remaining)} ${metric.unit}`
                    : `超出 ${formatNumber(Math.abs(remaining))} ${metric.unit}`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="health-expert-track" aria-label="今日摄入、目标与预计消耗">
        <div className="health-expert-track-labels">
          <span>已摄入 {formatNumber(totals.calories)}</span>
          <span>今日目标 {targets ? formatNumber(targets.calories) : "—"}</span>
          <span>预计消耗 {expenditure === null ? "—" : formatNumber(expenditure)}</span>
        </div>
        <div className="health-expert-track-line" aria-hidden="true">
          {targetTrackPosition === null ? null : (
            <i className="health-expert-track-target" style={{ left: `${targetTrackPosition}%` }} />
          )}
          {actualTrackPosition === null ? null : (
            <i className="health-expert-track-marker" style={{ left: `${actualTrackPosition}%` }} />
          )}
        </div>
        <p>空心刻度是今日计划摄入，实心圆点是已记录摄入；右端为预计全天消耗。</p>
      </div>

      <div className="health-expert-grid">
        <article className="health-expert-ledger">
          <div className="health-expert-section-head">
            <div><p>FOOD LOG / {selectedDate.replaceAll("-", ".")}</p><h3>一日三餐</h3></div>
            <span>{entries.length} ITEMS</span>
          </div>

          <div className="health-expert-meal-tabs" aria-label="选择要添加到哪一餐">
            {mealSections.map((meal) => {
              const mealEntries = entries.filter((entry) => entry.meal === meal.id);
              const mealTotals = calculateFoodTotals(mealEntries);
              return (
                <button
                  key={meal.id}
                  type="button"
                  aria-pressed={activeMeal === meal.id}
                  onClick={() => setActiveMeal(meal.id)}
                >
                  <span>{meal.english}</span>
                  <strong>{meal.label}</strong>
                  <small>{mealEntries.length} 项 · {formatNumber(mealTotals.calories)} kcal</small>
                </button>
              );
            })}
          </div>

          <div className="health-expert-quick-add">
            <span>快速添加到{mealSections.find((meal) => meal.id === activeMeal)?.label} · CPB 常用食物</span>
            <div>
              {foodPresets.map((preset) => (
                <button key={preset.id} type="button" onClick={() => addPreset(preset.id)}>
                  <strong>{preset.name}</strong>
                  <small>{preset.defaultGrams}g · P{preset.proteinPer100g} C{preset.carbsPer100g} F{preset.fatPer100g}/100g</small>
                </button>
              ))}
            </div>
          </div>

          <form className="health-expert-food-form" onSubmit={addCustomEntry}>
            <div className="health-expert-food-form-heading">
              <span>CUSTOM FOOD / {activeMeal.toUpperCase()}</span>
              <strong>新增到{mealSections.find((meal) => meal.id === activeMeal)?.label}</strong>
            </div>
            <label className="health-expert-food-form-name">
              <span>食物名称</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：米饭（熟）"
              />
            </label>
            <label><span>克数</span><input type="number" inputMode="decimal" min="0" step="0.1" value={draft.grams} onChange={(event) => setDraft((current) => ({ ...current, grams: event.target.value }))} placeholder="200" /></label>
            <label><span>kcal/100g</span><input type="number" inputMode="decimal" min="0" step="0.1" value={draft.caloriesPer100g} onChange={(event) => setDraft((current) => ({ ...current, caloriesPer100g: event.target.value }))} placeholder="130" /></label>
            <label><span>蛋白质/100g</span><input type="number" inputMode="decimal" min="0" step="0.1" value={draft.proteinPer100g} onChange={(event) => setDraft((current) => ({ ...current, proteinPer100g: event.target.value }))} placeholder="2.7" /></label>
            <label><span>碳水/100g</span><input type="number" inputMode="decimal" min="0" step="0.1" value={draft.carbsPer100g} onChange={(event) => setDraft((current) => ({ ...current, carbsPer100g: event.target.value }))} placeholder="28" /></label>
            <label><span>脂肪/100g</span><input type="number" inputMode="decimal" min="0" step="0.1" value={draft.fatPer100g} onChange={(event) => setDraft((current) => ({ ...current, fatPer100g: event.target.value }))} placeholder="0.3" /></label>
            <button type="submit">添加到{mealSections.find((meal) => meal.id === activeMeal)?.label}<span aria-hidden="true">＋</span></button>
          </form>

          <div className="health-expert-meals">
            {mealSections.map((meal) => {
              const mealEntries = entries.filter((entry) => entry.meal === meal.id);
              const mealTotals = calculateFoodTotals(mealEntries);
              return (
                <section className="health-expert-meal-panel" data-meal={meal.id} key={meal.id}>
                  <header className="health-expert-meal-summary">
                    <div>
                      <span>{meal.english} / {meal.hint}</span>
                      <h4>{meal.label}</h4>
                    </div>
                    <p>
                      <strong>{formatNumber(mealTotals.calories)} kcal</strong>
                      <span>P {formatNumber(mealTotals.protein)} · C {formatNumber(mealTotals.carbs)} · F {formatNumber(mealTotals.fat)}g</span>
                    </p>
                  </header>

                  {mealEntries.length === 0 ? (
                    <button className="health-expert-meal-empty" type="button" onClick={() => setActiveMeal(meal.id)}>
                      <span>＋</span>
                      <strong>还没有{meal.label}记录</strong>
                      <small>选择上方食物，或新增自定义食物</small>
                    </button>
                  ) : (
                    <ol className="health-expert-food-list">
                      {mealEntries.map((entry, index) => {
                        const entryTotals = calculateFoodTotals([entry]);
                        return (
                          <li key={entry.id}>
                            <span className="health-expert-food-index">{String(index + 1).padStart(2, "0")}</span>
                            <label className="health-expert-food-name">
                              <span>食物</span>
                              <input value={entry.name} onChange={(event) => updateEntry(entry.id, "name", event.target.value)} />
                            </label>
                            <label className="health-expert-food-grams">
                              <span>克数 / g</span>
                              <input type="number" min="0" step="0.1" value={entry.grams} onChange={(event) => updateEntry(entry.id, "grams", event.target.value)} />
                            </label>
                            <div className="health-expert-food-total">
                              <strong>{formatNumber(entryTotals.calories)} <small>kcal</small></strong>
                              <span>P {formatNumber(entryTotals.protein)}g · C {formatNumber(entryTotals.carbs)}g · F {formatNumber(entryTotals.fat)}g</span>
                            </div>
                            <button className="health-expert-remove" type="button" onClick={() => removeEntry(entry.id)} aria-label={`删除${entry.name}`}>×</button>
                            <details className="health-expert-food-details">
                              <summary>调整餐次与每 100g 营养数据</summary>
                              <div>
                                <label><span>所属餐次</span><select value={entry.meal} onChange={(event) => updateEntry(entry.id, "meal", event.target.value)}>{mealSections.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                                <label><span>kcal</span><input type="number" min="0" step="0.1" value={entry.caloriesPer100g} onChange={(event) => updateEntry(entry.id, "caloriesPer100g", event.target.value)} /></label>
                                <label><span>蛋白质</span><input type="number" min="0" step="0.1" value={entry.proteinPer100g} onChange={(event) => updateEntry(entry.id, "proteinPer100g", event.target.value)} /></label>
                                <label><span>碳水</span><input type="number" min="0" step="0.1" value={entry.carbsPer100g} onChange={(event) => updateEntry(entry.id, "carbsPer100g", event.target.value)} /></label>
                                <label><span>脂肪</span><input type="number" min="0" step="0.1" value={entry.fatPer100g} onChange={(event) => updateEntry(entry.id, "fatPer100g", event.target.value)} /></label>
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        </article>

        <aside className="health-expert-side">
          <section className="health-expert-profile">
            <div className="health-expert-section-head">
              <div><p>DYNAMIC PROFILE</p><h3>目标计算档案</h3></div>
              <span>{bmr ? `${bmr} BMR` : "SETUP"}</span>
            </div>
            <div className="health-expert-profile-grid">
              <label><span>生理性别</span><select value={state.profile.sex} onChange={(event) => updateProfile("sex", event.target.value)}><option value="male">男性</option><option value="female">女性</option></select></label>
              <label><span>年龄</span><input type="number" inputMode="numeric" min="18" max="100" value={state.profile.age} onChange={(event) => updateProfile("age", event.target.value)} placeholder="请填写" /></label>
              <label><span>身高 / cm</span><input type="number" inputMode="decimal" min="120" max="230" step="0.1" value={state.profile.heightCm} onChange={(event) => updateProfile("heightCm", event.target.value)} /></label>
              <label><span>档案体重 / kg</span><input type="number" inputMode="decimal" min="35" max="250" step="0.1" value={state.profile.weightKg} onChange={(event) => updateProfile("weightKg", event.target.value)} /></label>
              <label><span>档案体脂率 / %</span><input type="number" inputMode="decimal" min="3" max="70" step="0.1" value={state.profile.bodyFatPercent} onChange={(event) => updateProfile("bodyFatPercent", event.target.value)} /></label>
              <label><span>当天活动强度</span><select value={dailySetting.activityFactor} onChange={(event) => updateSetting("activityFactor", event.target.value)}>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.detail}</option>)}</select></label>
              <label><span>计划热量缺口 / %</span><input type="number" inputMode="decimal" min="0" max="30" step="1" value={dailySetting.deficitPercent} onChange={(event) => updateSetting("deficitPercent", event.target.value)} /></label>
            </div>
            <label className="health-expert-manual">
              <span>手动覆盖当天消耗 / kcal（可选）</span>
              <input type="number" inputMode="numeric" min="800" max="8000" step="1" value={dailySetting.manualExpenditure} onChange={(event) => updateSetting("manualExpenditure", event.target.value)} placeholder="有教练或设备估值时填写" />
            </label>
            <div className="health-expert-calculation-note">
              <span>本日计算使用</span>
              <strong>{effectiveWeight || "—"}kg · {effectiveBodyFat || "—"}% BF</strong>
              <p>当天晨重、当天体脂优先；缺少当日值时才沿用档案。切换 7 月 28、29、30 日时，每天会读取各自记录并重新计算。</p>
            </div>
            <p className="health-expert-profile-note">
              未手动覆盖时，以 Mifflin–St Jeor 静息消耗公式乘活动系数估算；宏量目标按当天瘦体重与计划热量计算，仅作为个人项目的起始估值。
            </p>
          </section>

          <section className="health-expert-insight" aria-live="polite">
            <span>EXPERT CHECK / TODAY</span>
            <h3>今日判断</h3>
            <p>{insight}</p>
            <div>
              <span>记录完整度</span>
              <strong>{entries.length === 0 ? "等待第一餐" : `${entries.length} 项已记录`}</strong>
            </div>
          </section>
        </aside>
      </div>

      <footer className="health-expert-footnote">
        <p>
          食物预设为每 100g 参考估值，品牌、烹饪方式和生熟重量都会造成差异，请优先使用包装标签与实际称重。日消耗、热量差与宏量目标均为估算，只适合成人自我记录，不构成医疗、营养或减脂建议。
        </p>
        <div>
          <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">USDA 食物数据 ↗</a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noreferrer">ISSN 蛋白质立场 ↗</a>
          <a href="https://www.nationalacademies.org/read/10872/chapter/7" target="_blank" rel="noreferrer">宏量营养范围 ↗</a>
          <a href="https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner" target="_blank" rel="noreferrer">NIH 估算说明 ↗</a>
        </div>
      </footer>
    </section>
  );
}
