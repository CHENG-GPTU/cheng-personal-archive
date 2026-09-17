import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const desktop = 'C:/Users/陈俊呈/Desktop';
const output = path.resolve('public/assets/lanyard/cheng-v2');
await mkdir(output, { recursive: true });
// Deterministic extraction of supplied artwork, preserving lettering and color.
const parts = [
  ['card-front.png','exec-37129099-d234-4bfb-9b4f-f9c0c7cb834a.png',{left:122,top:414,width:715,height:1131}],
  ['card-back.png','exec-ac5438b2-77b9-46bb-acfa-bf8ab4da5c0a.png',{left:122,top:414,width:715,height:1131}],
  ['strap.png','带子.png',{left:100,top:242,width:1974,height:247}],
  ['connector.png','扣.png',{left:335,top:367,width:250,height:40}],
  ['leather.png','扣.png',{left:884,top:284,width:452,height:367}],
];
const report=[];
for (const [target,source,crop] of parts) {
  const bytes=await readFile(path.join(desktop,source));
  const meta=await sharp(bytes).metadata();
  let pipeline=sharp(bytes).extract(crop);
  if (target==='strap.png') pipeline=pipeline.flop();
  await pipeline.png().toFile(path.join(output,target));
  report.push({source,sourceSize:[meta.width,meta.height],sha256:createHash('sha256').update(bytes).digest('hex'),target,crop,horizontalFlip:target==='strap.png'});
}
await writeFile(path.resolve('work/cheng-badge-v2-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
