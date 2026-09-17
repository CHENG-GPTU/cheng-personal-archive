import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../app/aipm-career-track.ts", import.meta.url);

async function loadCareerTrack() {
  const source = await readFile(sourceUrl, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors, []);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
}

test("all fifty-nine knowledge units create a distinct job-search artifact", async () => {
  const { aipmCareerDeliverables } = await loadCareerTrack();
  const entries = Object.entries(aipmCareerDeliverables);
  assert.equal(entries.length, 59);
  assert.equal(new Set(entries.map(([, deliverable]) => deliverable)).size, 59);
  for (const [id, deliverable] of entries) {
    assert.match(id, /^[1-9]-\d{1,2}$/);
    assert.ok(deliverable.length >= 12, `${id} deliverable depth`);
  }
});

test("career practice links product judgment, projects, evidence and interview readiness", async () => {
  const { getAipmCareerPractice } = await loadCareerTrack();
  const practice = getAipmCareerPractice({
    id: "7-2",
    chapterIndex: 7,
    title: "AI PRD框架与任务契约",
    decision: "明确产品责任与失败负责人。",
    projectUse: "为学习评审写出结构化任务契约。",
    checkpoint: "团队能否按同一份标准验收？",
  });
  assert.match(practice.jdSignal, /端到端|PRD|评测/);
  assert.match(practice.workSimulation, /初级 AIPM/);
  assert.equal(practice.steps.length, 3);
  assert.match(practice.deliverable, /PRD/);
  assert.equal(practice.interviewQuestion, "团队能否按同一份标准验收？");
  assert.equal(practice.acceptance.length, 3);
});
