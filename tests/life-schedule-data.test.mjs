import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadScheduleModule() {
  const source = await readFile(new URL("../app/life-schedule-data.ts", import.meta.url), "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], "life-schedule-data.ts must transpile without syntax errors");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`;
  return import(moduleUrl);
}

const schedulePromise = loadScheduleModule();

function minutes(value) {
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
}

test("life schedule contains 20 continuous days across four five-day cycles", async () => {
  const { lifeScheduleDays, LIFE_SCHEDULE_START, LIFE_SCHEDULE_END } = await schedulePromise;
  assert.equal(LIFE_SCHEDULE_START, "2026-07-28");
  assert.equal(LIFE_SCHEDULE_END, "2026-08-16");
  assert.equal(lifeScheduleDays.length, 20);
  assert.deepEqual(lifeScheduleDays.map((day) => day.day), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(
    lifeScheduleDays.map((day) => day.trainingShort),
    Array.from({ length: 4 }, () => ["胸 / 三头", "背 / 二头", "肩 / 腹", "腿部", "恢复"]).flat(),
  );
});

test("every day preserves the fixed timetable and all three goals", async () => {
  const { lifeScheduleDays } = await schedulePromise;
  for (const day of lifeScheduleDays) {
    const categories = new Set(day.tasks.map((task) => task.category));
    for (const category of ["aipm", "fitness", "media", "life", "free"]) {
      assert.ok(categories.has(category), `Day ${day.day} is missing ${category}`);
    }
    assert.ok(day.aipmMilestone.trim().length > 12, `Day ${day.day}: AIPM milestone`);
    assert.ok(day.mediaMilestone.trim().length > 12, `Day ${day.day}: media milestone`);

    for (let index = 0; index < day.tasks.length - 1; index += 1) {
      const current = day.tasks[index];
      const next = day.tasks[index + 1];
      const currentEnd = current.end === "00:00" ? 24 * 60 : minutes(current.end);
      assert.ok(currentEnd <= minutes(next.start), `Day ${day.day}: overlapping tasks`);
    }

    const freeBlock = day.tasks.find((task) => task.category === "free");
    assert.equal(freeBlock?.start, "22:00");
    assert.equal(freeBlock?.end, "00:00");
  }
});

test("recovery days explicitly remove stair climbing and strength training", async () => {
  const { lifeScheduleDays } = await schedulePromise;
  const recoveryDays = lifeScheduleDays.filter((day) => day.mode === "recovery");
  assert.deepEqual(recoveryDays.map((day) => day.day), [5, 10, 15, 20]);
  for (const day of recoveryDays) {
    const scheduleText = day.tasks.map((task) => `${task.title} ${task.detail ?? ""}`).join(" ");
    assert.doesNotMatch(scheduleText, /空腹爬楼|四分化力量训练/);
    assert.match(scheduleText, /不爬楼、不做力量训练/);
  }
});

test("life progress uses a storage key separate from AIPM learning progress", async () => {
  const { LIFE_SCHEDULE_STORAGE_KEY } = await schedulePromise;
  assert.equal(LIFE_SCHEDULE_STORAGE_KEY, "life20-schedule-state-v1");
  assert.notEqual(LIFE_SCHEDULE_STORAGE_KEY, "aipm-v3-state");
});
