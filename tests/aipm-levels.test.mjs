import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../app/aipm-levels.ts", import.meta.url);

async function loadLevels() {
  const source = await readFile(sourceUrl, "utf8");
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors, []);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
}

test("curriculum is a continuous 30-level campaign", async () => {
  const { aipmLevels } = await loadLevels();
  assert.equal(aipmLevels.length, 30);
  assert.deepEqual(aipmLevels.map((level) => level.id), Array.from({ length: 30 }, (_, index) => index + 1));
  assert.deepEqual(aipmLevels.filter((level) => level.boss).map((level) => level.id), [7, 14, 18, 21, 25, 30]);
});

test("every level teaches, demonstrates, practices and evaluates", async () => {
  const { aipmLevels } = await loadLevels();
  for (const level of aipmLevels) {
    assert.ok(level.lesson.length >= 2, `Level ${level.id} lesson`);
    assert.ok(level.keyPoints.length >= 3, `Level ${level.id} key points`);
    assert.ok(level.practice.length >= 4, `Level ${level.id} practice`);
    assert.ok(level.badExample && level.goodExample && level.scenario && level.deliverable, `Level ${level.id} learning flow`);
    assert.ok(level.criticalChecks.length >= 3, `Level ${level.id} critical checks`);
  }
});

test("the confirmed project phases and final outcomes remain intact", async () => {
  const { aipmLevels } = await loadLevels();
  assert.deepEqual(aipmLevels.slice(0, 7).map((level) => level.phase), Array(7).fill("基础校准"));
  assert.deepEqual(aipmLevels.slice(7, 18).map((level) => level.phase), Array(11).fill("项目一"));
  assert.deepEqual(aipmLevels.slice(18, 25).map((level) => level.phase), Array(7).fill("项目二"));
  assert.deepEqual(aipmLevels.slice(25).map((level) => level.phase), Array(5).fill("求职验收"));
  assert.match(aipmLevels[17].deliverable, /AIPM/);
  assert.match(aipmLevels[24].deliverable, /健身训练陪伴/);
  assert.match(aipmLevels[29].deliverable, /30 天最终验收/);
});

test("the fitness project preserves confirmed discovery evidence", async () => {
  const { aipmLevels } = await loadLevels();
  const fitnessProject = aipmLevels.slice(18, 25).map((level) => JSON.stringify(level)).join("\n");
  for (const marker of ["4 组", "第 3 组", "器械旁", "正计时", "倒计时", "撤销", "心率", "人工确认", "5—10 位"]) {
    assert.ok(fitnessProject.includes(marker), `fitness project is missing confirmed evidence: ${marker}`);
  }
  assert.match(fitnessProject, /低价会员订阅是商业假设/);
  assert.match(fitnessProject, /首版不把小米手环实时数据当作前置依赖/);
});
