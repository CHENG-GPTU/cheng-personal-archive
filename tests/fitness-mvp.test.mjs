import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const port = 3421;
let server;

test.before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: new URL("..", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited with ${server.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/work/fitness-companion/mvp`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Fitness MVP server did not become ready in time");
});

test.after(() => {
  server?.kill();
});

test("fitness MVP server-renders its low-attention training surface", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/work/fitness-companion/mvp`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /器械旁模式/);
  assert.match(html, /完成本组/);
  assert.match(html, /90 秒倒计时/);
  assert.match(html, /撤销上一组/);
  assert.match(html, /事实/);
  assert.match(html, /当前判断/);
  assert.match(html, /待验证/);
});

test("fitness MVP keeps recovery, undo and anonymous feedback boundaries in source", async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL("../app/work/fitness-companion/mvp/fitness-mvp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/work/fitness-companion/mvp/fitness-mvp.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /TOTAL_SETS = 4/);
  assert.match(component, /fitness-companion-mvp-session-v1/);
  assert.match(component, /now - session\.restStartedAt/);
  assert.match(component, /function undoLastSet/);
  assert.match(component, /匿名测试反馈/);
  assert.match(component, /不收集姓名、联系方式、健身房或定位/);
  assert.match(component, /本页不会把预设选项或单次自测写成用户结论/);
  assert.doesNotMatch(component, /type="(?:email|tel)"/);
  assert.match(styles, /min-height:128px/);
  assert.match(styles, /touch-action:manipulation/);
  const caseResponse = await fetch(`http://127.0.0.1:${port}/work/fitness-companion`);
  assert.equal(caseResponse.status, 200);
  assert.match(await caseResponse.text(), /href="\/work\/fitness-companion\/mvp"/);
});
