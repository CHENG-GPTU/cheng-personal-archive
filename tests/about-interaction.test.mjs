import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
test('Home badge opens About only, preserving reduced motion and cleanup', async () => {
  const source = await read('app/archive-navigation.tsx');
  assert.match(source, /distance < 45/);
  assert.match(source, /busy.current/);
  assert.match(source, /pathname !== '\/'/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /router.push\('\/about'\)/);
  assert.doesNotMatch(source, /router.push\('\/#home'\)|AboutPullBadge/);
  assert.match(source, /clearTimeout/);
  assert.match(source, /resolveRoute.current/);
});
test('original Home 3D badge is anchored below About; About badge has no route action', async () => {
  const home = await read('app/lanyard-home.tsx');
  const currentHome = await read('app/cheng-home.tsx');
  const about = await read('app/about/about-badge.tsx');
  const nav = await read('app/portfolio-site-nav.tsx');
  assert.match(home, /querySelector\('\.dossier-site-about'\)/);
  assert.match(home, /<InteractiveBadge onPullRelease=\{goAbout\}/);
  assert.match(home, /observer.disconnect\(\)/);
  assert.match(currentHome, /querySelector\("\.dossier-site-about"\)/);
  assert.match(currentHome, /<InteractiveBadge onPullRelease=\{goAbout\}/);
  assert.match(currentHome, /observer.disconnect\(\)/);
  assert.doesNotMatch(about, /onPullRelease|useArchive/);
  assert.doesNotMatch(nav, /AboutPullBadge/);
});
test('About keeps original artwork with no failed crystal overlay', async () => {
  const source = await read('components/react-bits/Lanyard/Lanyard.tsx');
  assert.match(source, /map=\{cardMap\}/);
  assert.doesNotMatch(source, /CrystalCard|transmission=|dispersion=/);
});
