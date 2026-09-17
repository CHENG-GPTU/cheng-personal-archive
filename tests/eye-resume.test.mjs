import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eyeTarget} from '../app/eye-follow-math.ts';

test('source-derived eye geometry stays within the white eye',()=>{
 for(const [x,y] of [[0,0],[1000,0],[-1000,20],[30,-999],[.1,.2]]){
  const p=eyeTarget(x,y,-1.5,28,8.4);
  assert(Math.hypot(p.x,p.y)<=8.82+1e-9);
 }
 assert.deepEqual(eyeTarget(0,0,0,28,8.4),{x:0,y:0});
 assert(eyeTarget(-100,0,0,28,8.4).x<0);
 assert(eyeTarget(100,0,0,28,8.4).x>0);
});
test('all resume entry points use the shared eye component',()=>{
 for(const path of ['portfolio-site-nav.tsx','portfolio-parts.tsx','cheng-home.tsx','lanyard-home.tsx','about/page.tsx','resume-envelope.tsx','classified-dossier.tsx','learning-home.tsx']){
  const source=readFileSync(new URL(`../app/${path}`,import.meta.url),'utf8');
  assert.match(source,/<EyeResumeLink/);
  assert.doesNotMatch(source,/href="\/resume"/);
 }
 const source=readFileSync(new URL('../app/eye-resume-link.tsx',import.meta.url),'utf8');
 assert.match(source,/href="\/resume"/);
 assert.match(source,/prefers-reduced-motion/);
 assert.match(source,/cancelAnimationFrame/);
 assert.match(source,/removeEventListener/);
 assert.match(source,/observer.disconnect/);
});
