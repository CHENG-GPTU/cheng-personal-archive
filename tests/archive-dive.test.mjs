import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('the opening reveals one mounted Home instead of a black screen overlay',async()=>{
 const [entry,envelope,css]=await Promise.all(['app/archive-entry.tsx','app/resume-envelope.tsx','app/archive-dive.css'].map(read));
 assert.match(entry,/homePrepared && pathname === '\/'/);
 assert.match(entry,/inert=\{showEntry \|\| undefined\}/);
 assert.equal((entry.match(/\{children\}/g)||[]).length,1);
 assert.match(envelope,/onPrepare\?\.\(\)/);
 assert.match(envelope,/!opening \? <SideRaysBackground/);
 assert.doesNotMatch(envelope,/archive-dive-shade/);
 assert.match(css,/mask-image:radial-gradient/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/archive-front-v2/);
 assert.match(css,/archive-papers-v2/);
});
