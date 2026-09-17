import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/story-motion.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { ARCHIVE_OPEN_DURATION, clampProgress, chapterMotion, chapterAtProgress, progressForChapter } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("archive opening is brief and scroll progress clamps invalid input", () => {
  assert.equal(ARCHIVE_OPEN_DURATION, 2200);
  assert.equal(clampProgress(NaN), 0);
  assert.equal(clampProgress(Infinity), 0);
  assert.equal(clampProgress(-2), 0);
  assert.equal(clampProgress(2), 1);
});
test("scene motion leaves a still reading interval in every chapter", () => {
  for (let index = 0; index < 7; index++) {
    for (const local of [0.3, 0.5, 0.7]) {
      const motion = chapterMotion(0.14 + (index + local) / 7 * 0.86, 7);
      assert.equal(motion.index, index);
      assert.equal(motion.offset, 0);
    }
  }
  assert.ok(chapterMotion(0.14 + 0.05 / 7 * 0.86, 7).offset > 0);
  assert.ok(chapterMotion(0.14 + 0.95 / 7 * 0.86, 7).offset < 0);
});
test("every direct chapter selection maps back to exactly that chapter", () => {
  for (const count of [2, 7, 15]) {
    for (let index = 0; index < count; index++) {
      assert.equal(chapterAtProgress(progressForChapter(index, count), count), index);
    }
  }
  assert.equal(chapterAtProgress(-1, 7), 0);
  assert.equal(chapterAtProgress(0.14, 7), 0);
  assert.equal(chapterAtProgress(1, 7), 6);
  assert.equal(chapterAtProgress(2, 7), 6);
  assert.equal(chapterAtProgress(1, 1), 0);
  assert.equal(progressForChapter(99, 1), 0);
});
test("new cinematic assets and motion fallbacks exist without distorting portraits", async () => {
  for (const name of ["archive-nanmu-desk-v1.png", "life-mounted-scroll-v1.png"]) {
    const image = await readFile(new URL(`../public/images/${name}`, import.meta.url));
    assert.equal(image.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.ok(image.readUInt32BE(16) >= 1500);
    assert.ok(image.readUInt32BE(20) >= 700);
  }
  const css = await readFile(new URL("../app/archive-cinematic.css", import.meta.url), "utf8");
  const fluid = await readFile(new URL("../app/ink-surface.tsx", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /min-width:761px.*min-height:640px/);
  assert.match(fluid, /cancelAnimationFrame/);
  assert.match(fluid, /strength.current > 0.15/);
  assert.doesNotMatch(fluid, /<Image|cheng-portrait.*filter/);
});
test("string envelope frames load locally and use a bounded non-scroll entrance", async () => {
  for (const name of ["closed", "loose", "open"]) {
    const image = await readFile(new URL(`../public/images/archive-string-${name}-v1.png`, import.meta.url));
    assert.equal(image.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [1024, 1536]);
  }
  const cover = await readFile(new URL("../app/resume-envelope.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/archive-sealed.css", import.meta.url), "utf8");
  assert.match(cover, /completedRef.current/);
  assert.match(cover, /assetFailed \|\| reduced.matches/);
  assert.match(cover, /window.clearTimeout/);
  assert.match(cover, /ready \? ARCHIVE_OPEN_DURATION : 5000/);
  assert.doesNotMatch(cover, /addEventListener\("scroll"|继续展开|paperExpansion/);
  assert.match(styles, /height:100svh/);
  assert.match(styles, /clip-path:polygon/);
  assert.match(styles, /sealed-unthread/);
});
