import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadHealthModule() {
  const source = await readFile(new URL("../app/health-expert-data.ts", import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], "health-expert-data.ts must transpile without syntax errors");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`;
  return import(moduleUrl);
}

const healthPromise = loadHealthModule();

test("Mifflin-St Jeor estimate requires a complete adult profile", async () => {
  const { calculateBmr } = await healthPromise;
  const base = { age: "24", heightCm: "190", weightKg: "96.4", bodyFatPercent: "25" };
  assert.equal(calculateBmr({ ...base, sex: "male" }), 2037);
  assert.equal(calculateBmr({ ...base, sex: "female" }), 1871);
  assert.equal(calculateBmr({ ...base, age: "", sex: "male" }), null);
  assert.equal(calculateBmr({ ...base, age: "17", sex: "male" }), null);
  assert.equal(calculateBmr({ ...base, sex: "male" }, "95"), 2023);
});

test("daily expenditure supports an activity estimate or a manual override", async () => {
  const { calculateTdee } = await healthPromise;
  const profile = {
    age: "24",
    heightCm: "190",
    weightKg: "96.4",
    bodyFatPercent: "25",
    sex: "male",
  };
  assert.equal(calculateTdee(profile, "1.55"), 3157);
  assert.equal(calculateTdee(profile, "1.55", "", "2875"), 2875);
  assert.equal(calculateTdee({ ...profile, age: "" }, "1.55"), null);
});

test("food totals preserve decimals until the presentation layer", async () => {
  const { calculateFoodTotals } = await healthPromise;
  const entries = [
    {
      id: "chicken",
      name: "鸡胸肉（熟）",
      meal: "lunch",
      grams: "300",
      caloriesPer100g: "165",
      proteinPer100g: "31",
      carbsPer100g: "0",
      fatPer100g: "3.6",
      source: "preset",
    },
    {
      id: "blueberry",
      name: "蓝莓",
      meal: "dinner",
      grams: "50",
      caloriesPer100g: "57",
      proteinPer100g: "0.7",
      carbsPer100g: "14.5",
      fatPer100g: "0.3",
      source: "preset",
    },
  ];
  const totals = calculateFoodTotals(entries);
  assert.equal(totals.calories, 523.5);
  assert.equal(totals.protein, 93.35);
  assert.equal(totals.carbs, 7.25);
  assert.ok(Math.abs(totals.fat - 10.95) < 1e-10);
  assert.deepEqual(
    calculateFoodTotals([{ ...entries[0], grams: "-3", caloriesPer100g: "not-a-number" }]),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
});

test("legacy food records remain readable with zeroed missing macros", async () => {
  const { calculateFoodTotals } = await healthPromise;
  const legacyEntry = {
    id: "legacy-chicken",
    name: "鸡胸肉（熟）",
    grams: "300",
    caloriesPer100g: "165",
    proteinPer100g: "31",
    source: "preset",
  };
  assert.deepEqual(calculateFoodTotals([legacyEntry]), {
    calories: 495,
    protein: 93,
    carbs: 0,
    fat: 0,
  });
});

test("daily nutrition targets respond to weight, body fat and deficit settings", async () => {
  const { calculateDailyNutritionTargets } = await healthPromise;
  const profile = {
    age: "24",
    heightCm: "190",
    weightKg: "96.4",
    bodyFatPercent: "25",
    sex: "male",
  };
  const setting = {
    activityFactor: "1.55",
    manualExpenditure: "",
    deficitPercent: "20",
  };

  assert.deepEqual(calculateDailyNutritionTargets(profile, setting), {
    expenditure: 3157,
    deficitPercent: 20,
    calorieDeficit: 631,
    calories: 2526,
    protein: 145,
    carbs: 356,
    fat: 58,
    leanBodyMassKg: 72.3,
  });

  const dailyOverride = calculateDailyNutritionTargets(
    profile,
    { ...setting, manualExpenditure: "2800", deficitPercent: "15" },
    "95",
    "24",
  );
  assert.deepEqual(dailyOverride, {
    expenditure: 2800,
    deficitPercent: 15,
    calorieDeficit: 420,
    calories: 2380,
    protein: 144,
    carbs: 321,
    fat: 58,
    leanBodyMassKg: 72.2,
  });
});

test("legacy profiles get safe macro targets and invalid deficits use the default", async () => {
  const { calculateDailyNutritionTargets } = await healthPromise;
  const legacyProfile = {
    age: "24",
    heightCm: "190",
    weightKg: "96.4",
    sex: "male",
  };
  const targets = calculateDailyNutritionTargets(legacyProfile, {
    activityFactor: "1.55",
    manualExpenditure: "",
    deficitPercent: "not-a-number",
  });
  assert.deepEqual(targets, {
    expenditure: 3157,
    deficitPercent: 20,
    calorieDeficit: 631,
    calories: 2526,
    protein: 154,
    carbs: 347,
    fat: 58,
    leanBodyMassKg: null,
  });
  assert.equal(
    calculateDailyNutritionTargets(
      { ...legacyProfile, bodyFatPercent: "25" },
      { activityFactor: "1.55", manualExpenditure: "", deficitPercent: "40" },
    ).deficitPercent,
    20,
  );
});

test("calorie balance uses a positive number for a deficit and negative for a surplus", async () => {
  const { calculateCalorieBalance } = await healthPromise;
  assert.equal(calculateCalorieBalance(2500, 1800), 700);
  assert.equal(calculateCalorieBalance(2500, 2700), -200);
  assert.equal(calculateCalorieBalance(null, 1800), null);
});

test("expert insight protects against false precision and missing food records", async () => {
  const { buildExpertInsight } = await healthPromise;
  assert.match(
    buildExpertInsight({ entryCount: 0, intake: 0, expenditure: 3100, balance: 3100, protein: 0 }),
    /第一项食物/,
  );
  assert.match(
    buildExpertInsight({ entryCount: 4, intake: 1600, expenditure: 3100, balance: 1500, protein: 130 }),
    /漏记烹饪油/,
  );
  assert.match(
    buildExpertInsight({ entryCount: 4, intake: 2500, expenditure: null, balance: null, protein: 150 }),
    /补充年龄/,
  );
});

test("health records use a private key separate from both learning systems", async () => {
  const { HEALTH_EXPERT_STORAGE_KEY } = await healthPromise;
  assert.equal(HEALTH_EXPERT_STORAGE_KEY, "life20-health-expert-state-v1");
  assert.notEqual(HEALTH_EXPERT_STORAGE_KEY, "life20-schedule-state-v1");
  assert.notEqual(HEALTH_EXPERT_STORAGE_KEY, "aipm-v3-state");
});
