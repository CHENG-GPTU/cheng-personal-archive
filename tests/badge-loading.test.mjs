import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('cold loading never renders the oversized portrait placeholder',async()=>{
 const [badge,entry,scene]=await Promise.all(['app/interactive-badge.tsx','app/resume-envelope.tsx','components/react-bits/Lanyard/Lanyard.tsx'].map(read));
 assert.match(badge,/loading: \(\) => null/);
 assert.match(entry,/prepareInteractiveBadge\(\)/);
 assert.match(scene,/useGLTF.preload\(cardGLB\)/);
 for(const pose of ['[0, -1, 0]','[0, -2, 0]','[0, -3, 0]','[0, -4.45, 0]'])assert.ok(scene.includes(`position={${pose}}`));
 assert.doesNotMatch(scene,/position=\{\[2, 0, 0\]\}/);
});
