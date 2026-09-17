import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const card=readFileSync(new URL('../app/contact-card.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/contact-card.css',import.meta.url),'utf8');
test('contact uses the user-approved email without third-party identity or calendar',()=>{
 assert.match(card,/CONTACT_EMAIL = '1653600957@qq.com'/);
 assert.match(card,/mailto:\$\{CONTACT_EMAIL\}/);
 assert.match(card,/clipboard.writeText\(CONTACT_EMAIL\)/);
 assert.doesNotMatch(card,/cal\.com|rockystudio|Rocky Paroky|<iframe/);
});
test('shared contact card supports tap, native dismissal and reduced motion',()=>{
 assert.match(card,/popover="auto"/); assert.match(card,/onClick=/);
 assert.match(card,/offsetWidth/); assert.match(card,/role="status"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const path of ['../app/cheng-home.tsx','../app/lanyard-home.tsx','../app/about/page.tsx'])assert.match(readFileSync(new URL(path,import.meta.url),'utf8'),/<ContactCard/);
});

test('Home finale is one sentence with the last word as contact trigger',()=>{
 const home=readFileSync(new URL('../app/cheng-home.tsx',import.meta.url),'utf8');
 const finale=home.slice(home.indexOf('<section className="contact-finale"'));
 assert.match(finale,/Let's talk about the next opportunity\./);
 assert.match(finale,/<ContactCard word/);
 assert.doesNotMatch(finale,/查看简历|持续更新|欢迎交流|contact-finale__signature/);
 assert.match(card,/word \? 'opportunity'/);
 assert.match(card,/word \? "Let's Talk"/);
 assert.match(css,/contact-control--word/);
});

test('Home reference layout is a compact bottom dropdown with staged entrances',()=>{
 assert.match(card,/const useBelow = word \|\|/);
 assert.match(card,/word \? button.right - card.width/);
 assert.match(css,/width:min\(300px,calc\(100vw - 32px\)\)/);
 assert.match(css,/contact-reference-photo \.8s \.3s/);
 assert.match(css,/contact-reference-details \.8s \.5s/);
 assert.match(css,/contact-reference-email \.8s \.6s/);
});
