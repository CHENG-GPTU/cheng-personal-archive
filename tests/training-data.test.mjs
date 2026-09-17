import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../app/training-data.ts", import.meta.url);

async function loadTrainingDays() {
  const source = await readFile(sourceUrl, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });

  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], "training-data.ts must transpile without syntax errors");

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`;
  const curriculumModule = await import(moduleUrl);
  assert.ok(Array.isArray(curriculumModule.trainingDays));
  return curriculumModule.trainingDays;
}

const trainingDaysPromise = loadTrainingDays();

test("curriculum contains 60 continuously numbered training days", async () => {
  const trainingDays = await trainingDaysPromise;
  assert.equal(trainingDays.length, 60);
  assert.deepEqual(
    trainingDays.map((day) => day.day),
    Array.from({ length: 60 }, (_, index) => index + 1),
  );
});

test("every day has the required teaching, practice and review depth", async () => {
  const trainingDays = await trainingDaysPromise;

  for (const day of trainingDays) {
    assert.equal(day.keyPoints.length, 3, `Day ${day.day}: keyPoints`);
    assert.equal(day.evaluation.length, 3, `Day ${day.day}: evaluation`);
    assert.equal(day.reflection.length, 2, `Day ${day.day}: reflection`);
    assert.ok(
      day.practiceSteps.length >= 4 && day.practiceSteps.length <= 6,
      `Day ${day.day}: practiceSteps must contain 4–6 steps`,
    );

    for (const field of [
      "phase",
      "title",
      "promise",
      "duration",
      "conceptTitle",
      "badExample",
      "goodExample",
      "practiceBrief",
      "starterTemplate",
      "deliverable",
      "aiObjective",
      "aiInstructions",
    ]) {
      assert.equal(typeof day[field], "string", `Day ${day.day}: ${field}`);
      assert.ok(day[field].trim().length > 0, `Day ${day.day}: ${field} is empty`);
    }

    assert.ok(Array.isArray(day.conceptBody), `Day ${day.day}: conceptBody`);
    assert.ok(day.conceptBody.length >= 2, `Day ${day.day}: conceptBody needs at least 2 paragraphs`);
  }
});

test("every AI handoff contains the anti-drift learning contract", async () => {
  const trainingDays = await trainingDaysPromise;
  const requiredRules = ["不要重新制定学习计划", "一次只问一个问题", "等待用户回答"];

  for (const day of trainingDays) {
    for (const rule of requiredRules) {
      assert.ok(day.aiInstructions.includes(rule), `Day ${day.day} aiInstructions is missing: ${rule}`);
    }
    assert.match(day.starterTemplate, /我对今天任务的理解/);
    assert.match(day.starterTemplate, /今天只需要解决/);
    assert.match(day.starterTemplate, /按步骤完成/);
  }
});

test("Day 30 and Day 60 are oral-defense gates", async () => {
  const trainingDays = await trainingDaysPromise;

  for (const dayNumber of [30, 60]) {
    const day = trainingDays[dayNumber - 1];
    const gateCopy = [day.title, day.practiceBrief, day.deliverable, day.aiInstructions].join("\n");
    assert.match(gateCopy, /答辩/, `Day ${dayNumber} must include an oral defense`);
  }

  assert.match(trainingDays[29].title, /能力闸门/);
  assert.match(trainingDays[59].title, /最终答辩/);
});

test("the second half contains two separate, substantial project stages", async () => {
  const trainingDays = await trainingDaysPromise;
  const projectOne = trainingDays.filter((day) => day.phase === "项目一：会议决策助手");
  const projectTwo = trainingDays.filter((day) => day.phase === "项目二：内容验证助手");

  assert.deepEqual(projectOne.map((day) => day.day), [38, 39, 40, 41, 42, 43, 44, 45]);
  assert.deepEqual(projectTwo.map((day) => day.day), [46, 47, 48, 49, 50, 51, 52, 53]);
  assert.ok(projectOne.every((day) => day.title.includes("项目一")));
  assert.ok(projectTwo.every((day) => day.title.includes("项目二")));
  assert.equal(new Set(projectOne.map((day) => day.deliverable)).size, 8);
  assert.equal(new Set(projectTwo.map((day) => day.deliverable)).size, 8);
});
