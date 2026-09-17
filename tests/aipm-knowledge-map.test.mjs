import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../app/aipm-knowledge-map.ts", import.meta.url);

async function loadKnowledgeMap() {
  const source = await readFile(sourceUrl, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors, []);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
}

test("knowledge atlas covers the public nine-chapter, fifty-nine-unit outline once", async () => {
  const { aipmKnowledgeUnits, aipmKnowledgeChapterCount, aipmKnowledgeUnitCount } = await loadKnowledgeMap();
  assert.equal(aipmKnowledgeChapterCount, 9);
  assert.equal(aipmKnowledgeUnitCount, 59);
  assert.equal(new Set(aipmKnowledgeUnits.map((item) => item.id)).size, 59);

  const expectedPerChapter = new Map([[1, 3], [2, 5], [3, 6], [4, 15], [5, 3], [6, 3], [7, 9], [8, 8], [9, 7]]);
  for (const [chapter, expected] of expectedPerChapter) {
    assert.equal(aipmKnowledgeUnits.filter((item) => item.chapterIndex === chapter).length, expected, `chapter ${chapter}`);
  }
});

test("every level receives teachable, project-linked and source-backed knowledge", async () => {
  const { aipmKnowledgeUnits, getAipmKnowledgeUnits } = await loadKnowledgeMap();
  for (let levelId = 1; levelId <= 30; levelId += 1) {
    assert.ok(getAipmKnowledgeUnits(levelId).length >= 1, `Level ${levelId} knowledge`);
  }
  for (const item of aipmKnowledgeUnits) {
    assert.equal(item.learn.length, 2, `${item.id} explanations`);
    assert.ok(item.learn.every((paragraph) => paragraph.length >= 20), `${item.id} explanation depth`);
    assert.ok(item.decision.length >= 15, `${item.id} product decision`);
    assert.ok(item.projectUse.length >= 15, `${item.id} project use`);
    assert.ok(item.checkpoint.length >= 15, `${item.id} checkpoint`);
    assert.match(item.reference.url, /^https:\/\//, `${item.id} primary source`);
  }
});

test("knowledge atlas includes the core technical, product and career topics", async () => {
  const { aipmKnowledgeUnits } = await loadKnowledgeMap();
  const searchable = aipmKnowledgeUnits.map((item) => `${item.title} ${item.learn.join(" ")} ${item.decision} ${item.reference.label}`).join("\n");
  for (const topic of [
    "Transformer", "Prompt", "Few-Shot", "Context Engineering", "RAG", "Agent", "MCP", "A2A",
    "Vibe Coding", "Token", "PRD", "Evals", "Bad Case", "简历", "面试",
  ]) {
    assert.ok(searchable.includes(topic), `missing topic: ${topic}`);
  }
});
