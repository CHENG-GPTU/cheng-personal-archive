export const HEALTH_EXPERT_STORAGE_KEY = "life20-health-expert-state-v1";

export type HealthSex = "male" | "female";

export type FoodMeal = "breakfast" | "lunch" | "dinner";

export interface HealthProfile {
  sex: HealthSex;
  age: string;
  heightCm: string;
  weightKg: string;
  bodyFatPercent: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  meal: FoodMeal;
  grams: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  source: "preset" | "custom";
}

export interface DailyEnergySetting {
  activityFactor: string;
  manualExpenditure: string;
  deficitPercent: string;
}

export interface HealthExpertState {
  version: 1;
  profile: HealthProfile;
  foodsByDate: Record<string, FoodEntry[]>;
  settingsByDate: Record<string, DailyEnergySetting>;
  bodyFatByDate: Record<string, string>;
}

export interface FoodPreset {
  id: string;
  name: string;
  defaultGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  note: string;
}

export interface DailyNutritionTargets {
  expenditure: number;
  deficitPercent: number;
  calorieDeficit: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  leanBodyMassKg: number | null;
}

export const DEFAULT_DAILY_DEFICIT_PERCENT = "20";

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  sex: "male",
  age: "",
  heightCm: "190",
  weightKg: "96.4",
  bodyFatPercent: "25",
};

export const activityOptions = [
  { value: "1.2", label: "休息 / 久坐", detail: "1.20" },
  { value: "1.375", label: "轻量活动", detail: "1.375" },
  { value: "1.55", label: "训练日", detail: "1.55" },
  { value: "1.725", label: "高活动日", detail: "1.725" },
] as const;

export const foodPresets: FoodPreset[] = [
  {
    id: "chicken-breast",
    name: "鸡胸肉（熟）",
    defaultGrams: 300,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    note: "去皮、熟重参考",
  },
  {
    id: "broccoli",
    name: "西兰花",
    defaultGrams: 300,
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    carbsPer100g: 7.2,
    fatPer100g: 0.4,
    note: "熟重参考",
  },
  {
    id: "potato",
    name: "土豆",
    defaultGrams: 300,
    caloriesPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20.1,
    fatPer100g: 0.1,
    note: "水煮熟重参考",
  },
  {
    id: "carrot",
    name: "胡萝卜",
    defaultGrams: 150,
    caloriesPer100g: 35,
    proteinPer100g: 0.8,
    carbsPer100g: 8.2,
    fatPer100g: 0.2,
    note: "熟重参考",
  },
  {
    id: "blueberry",
    name: "蓝莓",
    defaultGrams: 50,
    caloriesPer100g: 57,
    proteinPer100g: 0.7,
    carbsPer100g: 14.5,
    fatPer100g: 0.3,
    note: "鲜果参考",
  },
  {
    id: "whey",
    name: "蛋白粉",
    defaultGrams: 30,
    caloriesPer100g: 400,
    proteinPer100g: 80,
    carbsPer100g: 10,
    fatPer100g: 4,
    note: "请按包装标签修改",
  },
  {
    id: "oil",
    name: "食用油",
    defaultGrams: 10,
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    note: "容易漏记，建议称重",
  },
];

function finitePositive(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function calculateBmr(profile: HealthProfile, dailyWeight?: string) {
  const age = finitePositive(profile.age);
  const height = finitePositive(profile.heightCm);
  const weight = finitePositive(dailyWeight || profile.weightKg);
  if (
    !age ||
    !height ||
    !weight ||
    age < 18 ||
    age > 100 ||
    height < 120 ||
    height > 230 ||
    weight < 35 ||
    weight > 250
  ) return null;

  const sexOffset = profile.sex === "male" ? 5 : -161;
  return Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset);
}

export function calculateTdee(
  profile: HealthProfile,
  activityFactor: string,
  dailyWeight?: string,
  manualExpenditure?: string,
) {
  const manual = finitePositive(manualExpenditure || "");
  if (manual && manual >= 800 && manual <= 8000) return Math.round(manual);

  const bmr = calculateBmr(profile, dailyWeight);
  const factor = finitePositive(activityFactor);
  if (!bmr || !factor || factor < 1 || factor > 2.5) return null;
  return Math.round(bmr * factor);
}

export function calculateFoodTotals(entries: FoodEntry[]) {
  return entries.reduce(
    (totals, entry) => {
      const grams = Math.max(0, Number(entry.grams) || 0);
      const caloriesPer100g = Math.max(0, Number(entry.caloriesPer100g) || 0);
      const proteinPer100g = Math.max(0, Number(entry.proteinPer100g) || 0);
      const carbsPer100g = Math.max(0, Number(entry.carbsPer100g) || 0);
      const fatPer100g = Math.max(0, Number(entry.fatPer100g) || 0);
      totals.calories += (grams * caloriesPer100g) / 100;
      totals.protein += (grams * proteinPer100g) / 100;
      totals.carbs += (grams * carbsPer100g) / 100;
      totals.fat += (grams * fatPer100g) / 100;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function calculateDailyNutritionTargets(
  profile: HealthProfile,
  setting: DailyEnergySetting,
  dailyWeight?: string,
  dailyBodyFatPercent?: string,
): DailyNutritionTargets | null {
  const weight = finitePositive(dailyWeight || profile.weightKg);
  const expenditure = calculateTdee(
    profile,
    setting.activityFactor,
    dailyWeight,
    setting.manualExpenditure,
  );
  if (!weight || weight < 35 || weight > 250 || expenditure === null) return null;

  const requestedDeficit = Number(setting.deficitPercent);
  const deficitPercent =
    Number.isFinite(requestedDeficit) && requestedDeficit >= 0 && requestedDeficit <= 30
      ? requestedDeficit
      : Number(DEFAULT_DAILY_DEFICIT_PERCENT);
  const bodyFat = finitePositive(dailyBodyFatPercent || profile.bodyFatPercent);
  const hasUsableBodyFat = Boolean(bodyFat && bodyFat >= 3 && bodyFat <= 70);
  const leanBodyMassKg = hasUsableBodyFat ? weight * (1 - bodyFat! / 100) : null;

  // Lean mass keeps the target personal when body-fat data exists. The fallback
  // preserves useful targets for records saved before body-fat tracking was added.
  const protein = Math.round(
    leanBodyMassKg === null ? weight * 1.6 : leanBodyMassKg * 2,
  );
  const fat = Math.round(
    leanBodyMassKg === null ? weight * 0.6 : leanBodyMassKg * 0.8,
  );
  const calories = Math.round(expenditure * (1 - deficitPercent / 100));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    expenditure,
    deficitPercent,
    calorieDeficit: expenditure - calories,
    calories,
    protein,
    carbs,
    fat,
    leanBodyMassKg:
      leanBodyMassKg === null ? null : Math.round(leanBodyMassKg * 10) / 10,
  };
}

export function calculateCalorieBalance(expenditure: number | null, intake: number) {
  return expenditure === null ? null : Math.round(expenditure - intake);
}

export function buildExpertInsight({
  entryCount,
  intake,
  expenditure,
  balance,
  protein,
  carbs = 0,
  fat = 0,
  targets = null,
}: {
  entryCount: number;
  intake: number;
  expenditure: number | null;
  balance: number | null;
  protein: number;
  carbs?: number;
  fat?: number;
  targets?: Pick<DailyNutritionTargets, "calories" | "protein" | "carbs" | "fat"> | null;
}) {
  if (entryCount === 0) {
    return targets
      ? `今日计划为 ${targets.calories} kcal、蛋白质 ${targets.protein}g、碳水 ${targets.carbs}g、脂肪 ${targets.fat}g。先记录第一项食物，烹饪油、饮料和调味品也要记。`
      : "先完成年龄、晨重与体脂档案，再记录今天吃下的第一项食物。";
  }

  if (expenditure === null || balance === null) {
    return `今天已记录 ${entryCount} 项、约 ${Math.round(intake)} kcal。补充年龄后，系统才能估算日消耗与热量差。`;
  }

  const proteinMessage = targets
    ? protein < targets.protein
      ? `蛋白质已记录 ${Math.round(protein)}g，距离今日目标还差约 ${Math.max(0, Math.round(targets.protein - protein))}g。`
      : `蛋白质已记录 ${Math.round(protein)}g，已达到今日 ${targets.protein}g 目标。`
    : `蛋白质已记录 ${Math.round(protein)}g。`;

  const macroMessage = targets
    ? `碳水 ${Math.round(carbs)}/${targets.carbs}g，脂肪 ${Math.round(fat)}/${targets.fat}g。`
    : "";

  if (balance > 1000) {
    return `当前显示约 ${balance} kcal 估算赤字。先核对是否漏记烹饪油、饮料或加餐，不要根据单日估值继续加码。${proteinMessage}${macroMessage}`;
  }

  if (balance >= 0) {
    return `当前记录低于估算消耗约 ${balance} kcal。把它当作趋势信号，不是精确结论；连续记录 7 天后再结合体重和训练表现复盘。${proteinMessage}${macroMessage}`;
  }

  return `当前记录高于估算消耗约 ${Math.abs(balance)} kcal。先确认份量和烹饪方式是否准确，再观察连续趋势。${proteinMessage}${macroMessage}`;
}
