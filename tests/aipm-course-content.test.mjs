import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../app/aipm-course-content.ts", import.meta.url);

async function loadCourseContent() {
  const source = await readFile(sourceUrl, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors, []);
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`);
}

test("foundation levels contain substantial teaching before practice", async () => {
  const { getAipmLessonGuide } = await loadCourseContent();
  for (let levelId = 1; levelId <= 7; levelId += 1) {
    const guide = getAipmLessonGuide(levelId);
    assert.ok(guide, `Level ${levelId} guide`);
    assert.ok(guide.objectives.length >= 3, `Level ${levelId} objectives`);
    assert.ok(guide.termGroups.flatMap((group) => group.terms).length >= 5, `Level ${levelId} terminology`);
    assert.ok(guide.deepDives.length >= 2, `Level ${levelId} deep dives`);
    assert.ok(guide.quiz.length >= 2, `Level ${levelId} knowledge gate`);
    assert.ok(guide.sourceIds.length >= 2, `Level ${levelId} sources`);
  }
});

test("level one starts with a broad AIPM glossary and official learning source", async () => {
  const { getAipmLessonGuide, getAipmSources } = await loadCourseContent();
  const guide = getAipmLessonGuide(1);
  const terms = guide.termGroups.flatMap((group) => group.terms).map((item) => item.term);
  assert.ok(terms.length >= 30);
  assert.ok(terms.some((item) => item.includes("AIPM")));
  assert.ok(terms.some((item) => item.includes("RAG")));
  assert.ok(terms.some((item) => item.includes("Agent")));
  assert.ok(terms.some((item) => item.includes("Eval")));
  assert.ok(getAipmSources(guide.sourceIds).some((source) => source.provider.includes("DeepLearning.AI")));
});

test("every project and job-search level has contextual work language", async () => {
  const { getAipmContextualTerms } = await loadCourseContent();
  for (let levelId = 8; levelId <= 30; levelId += 1) {
    const terms = getAipmContextualTerms(levelId);
    assert.ok(terms.length >= 3, `Level ${levelId} contextual terms`);
    for (const item of terms) {
      assert.ok(item.term && item.plain && item.atWork, `Level ${levelId} complete term card`);
    }
  }
});
