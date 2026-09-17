import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('entry belongs to the persistent layout, not the Home page or hash',async()=>{
 const [layout,entry,home,about]=await Promise.all(['app/layout.tsx','app/archive-entry.tsx','app/lanyard-home.tsx','app/about/page.tsx'].map(read));
 assert.match(layout,/<ArchiveEntry><ArchiveNavigationProvider>/);
 assert.match(entry,/useState\(false\)/);
 assert.doesNotMatch(entry,/sessionStorage|localStorage|location.hash/);
 assert.doesNotMatch(home,/ResumeEnvelope|setEntered|hashchange/);
 assert.match(about,/href="\/#home">返回 Home/);
 assert.doesNotMatch(about,/重新打开档案/);
});

test('only crystal edge strips extend into contain gutters',async()=>{
 const source=await read('components/react-bits/Lanyard/Lanyard.tsx');
 assert.match(source,/imageFit === 'contain' && dw < rw/);
 assert.match(source,/img.width \* 0.035/);
 assert.match(source,/ctx.drawImage\(img, dx, dy, dw, dh\)/);
 assert.match(source,/dx - rx \+ edgeOnFace/);
 assert.match(source,/rx \+ rw - \(dx \+ dw\) \+ edgeOnFace/);
});

test('Home and About share hardware while keeping independent camera framing',async()=>{
 const [badge,css,ticket]=await Promise.all(['app/interactive-badge.tsx','app/lanyard-home.css','app/resume-envelope.tsx'].map(read));
 assert.match(badge,/const assets = '\/assets\/lanyard\/cheng-v2'/);
 assert.match(badge,/lanyardWidth=\{3.2\} chengHardware/);
 assert.match(badge,/cameraTarget=\{dossier \? DOSSIER_TARGET : undefined\}/);
 assert.match(css,/height:72svh/);
 assert.match(css,/- 8.778svh/);
 assert.match(ticket,/archive-ticket__name">陈俊呈/);
 assert.match(ticket,/目标方向/);
 assert.doesNotMatch(ticket,/刘航|29 years|Wechat QR/);
});
