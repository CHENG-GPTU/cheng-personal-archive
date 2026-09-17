import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const source = await read('app/polaroid-card.tsx');
const css = await read('app/polaroid-card.css');

test('polaroid crossfade shares one stable image box and keeps original at rest', () => {
  assert.match(css, /aspect-ratio: 838 \/ 1024/);
  assert.match(css, /object-fit: contain/);
  assert.match(css, /inset: 0/);
  assert.match(css, /opacity 350ms ease/);
  assert.match(css, /polaroid-image--hover \{ opacity: 0/);
  assert.match(source, /data-active="false"/);
  assert.match(source, /maskImage.current.naturalWidth > 0/);
  assert.match(source, /onError=/);
  assert.match(source, /hoverImage.current.naturalWidth > 0/);
});
test('polaroid motion is bounded, pointer-only and cleaned on exit or unmount', () => {
  assert.match(source, /event.pointerType !== 'mouse'/);
  assert.match(source, /Math.max\(-1, Math.min\(1/);
  assert.match(source, /-y \* 12/);
  assert.match(source, /x \* 12/);
  assert.match(css, /perspective: 800px/);
  assert.match(css, /translateZ\(32px\)/);
  assert.match(css, /scale\(1.05\)/);
  assert.match(source, /onPointerLeave=\{reset\} onPointerCancel=\{reset\}/);
  assert.match(source, /cancelAnimationFrame/);
  assert.match(source, /removeEventListener/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transform: none/);
});
test('polaroid belongs to the About dossier, not a standalone homepage section', async () => {
  const home = await read('app/lanyard-home.tsx');
  const about = await read('app/about/page.tsx');
  assert.match(home, /<InteractiveBadge onPullRelease=\{goAbout\} \/>/);
  assert.doesNotMatch(home, /<PolaroidCard/);
  assert.match(about, /<AboutBadge \/>/);
  assert.match(about, /<PolaroidCard \/>/);
  for (const name of ['pixel-original.jpg','hover-composite-v1.png']) {
    assert.ok((await readFile(new URL('../public/assets/polaroid/' + name, import.meta.url))).length > 100_000);
  }
});

test('foreground is independent of the fixed torn frame and can extend outside it', () => {
  assert.match(source, /className="polaroid-pop"/);
  assert.match(source, /torn-frame-v2.png/);
  assert.match(css, /mask-mode:luminance/);
  assert.match(css, /translateZ\(70px\)/);
  assert.match(css, /left:-28%;top:-30%;width:120%;height:120%/);
  assert.match(css, /clip-path:polygon/);
  assert.doesNotMatch(css, /overflow:\s*hidden/);
});
