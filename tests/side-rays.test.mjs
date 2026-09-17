import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const source = await read("components/react-bits/SideRays/SideRays.tsx");
const wrapper = await read("app/side-rays-background.tsx");
const css = await read("app/side-rays-background.css");

test("official SideRays shaders remain byte-for-byte unchanged", () => {
  const expected = {"vert":"0808b927f21bbcf4224b279e39c8d9bfb39af7850f97b80c910d5466cc1b5b70","frag":"3723fa091ece288e8f9c51d6330008fd5e1758c7c7db0a93f986ed7f7e8db153"};
  for (const name of ["vert", "frag"]) {
    const shader = source.match(new RegExp("const " + name + " = `([\\s\\S]*?)`;"))?.[1];
    assert.ok(shader);
    assert.equal(createHash("sha256").update(shader).digest("hex"), expected[name]);
  }
});
test("requested parameters, client boundary and reduced-motion policy are fixed", () => {
  assert.match(source, /^"use client";/);
  assert.match(wrapper, /ssr: false/);
  assert.match(wrapper, /origin="top-left" intensity=\{1\.9\} speed=\{2\.9\} opacity=\{0\.75\} blend=\{0\.8\}/);
  assert.match(wrapper, /!document.hidden && !reduced.matches/);
  assert.match(wrapper, /removeEventListener\("visibilitychange", sync\)/);
  assert.match(wrapper, /reduced.removeEventListener\("change", sync\)/);
  assert.doesNotMatch(wrapper + source, /iframe|https:\/\//);
});
test("WebGL owns one canvas and releases all owned resources", () => {
  for (const marker of [
    "disposed = true", "window.clearTimeout(initializeTimer)", "cancelAnimationFrame(animationIdRef.current)",
    "window.removeEventListener('resize', updateSize)", "resizeObserver.disconnect()", "geometry.remove()",
    "program.remove()", "loseCtx.loseContext()", "canvas.parentNode.removeChild(canvas)",
    "observerRef.current.disconnect()", "gl.canvas.removeEventListener('webglcontextlost', contextLost)"
  ]) assert.ok(source.includes(marker), marker);
  assert.match(source, /if \(disposed \|\| !containerRef.current\) return/);
  assert.equal((source.match(/new Renderer\(/g) || []).length, 1);
  assert.equal((source.match(/appendChild\(gl.canvas\)/g) || []).length, 1);
});
test("background remains non-interactive and confined without editing foreground styles", async () => {
  assert.match(css, /pointer-events: none !important/);
  assert.match(css, /position: fixed/);
  assert.match(css, /z-index: -1/);
  assert.match(css, /overflow: hidden/);
  assert.match(css, /\.site-side-rays--entry \{ position: absolute/);
  assert.doesNotMatch(css, /font|margin|padding|folio-nav|story-stage|sealed-file/);
  const manifest = JSON.parse(await read("package.json"));
  assert.equal(manifest.dependencies.ogl, "1.0.11");
  assert.match(await read("components/react-bits/SideRays/LICENSE.md"), /Copyright \(c\) 2026 David Haz/);
});

