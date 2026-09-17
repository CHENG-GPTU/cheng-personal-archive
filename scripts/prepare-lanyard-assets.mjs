import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const root = process.cwd();
const input = path.join(root, 'work/lanyard/source');
const output = path.join(root, 'public/assets/lanyard');
await mkdir(output, { recursive: true });

// Pixel-only extraction from the user's supplied mockups. No generated artwork,
// lettering, repainting, color changes, or destructive resizing.
const crops = {
  front: { left: 145, top: 433, width: 677, height: 1080 },
  back: { left: 145, top: 433, width: 677, height: 1080 },
  strap: { left: 100, top: 242, width: 1974, height: 247 },
  connector: { left: 200, top: 350, width: 120, height: 60 },
};
const report = [];
for (const [name, crop] of Object.entries(crops)) {
  const file = path.join(input, name + '.png');
  const raw = await readFile(file);
  const meta = await sharp(raw).metadata();
  let result = sharp(raw).extract(crop);
  // MeshLine's official negative repeat traverses U in reverse. Preflip only
  // the supplied strip so CHENG reads normally once mapped to the rope.
  if (name === 'strap') result = result.flop();
  const target = name === 'front' || name === 'back' ? `card-${name}.png` : `${name}.png`;
  await result.png({ compressionLevel: 9 }).toFile(path.join(output, target));
  report.push({ source: name + '.png', sourceSize: [meta.width, meta.height], sha256: createHash('sha256').update(raw).digest('hex'), crop, target, horizontalFlip: name === 'strap' });
}

const model = await readFile(path.join(output, 'card.glb'));
const jsonSize = model.readUInt32LE(12);
const gltf = JSON.parse(model.subarray(20, 20 + jsonSize).toString());
const binaryStart = 20 + jsonSize + 8;
const embedded = gltf.bufferViews[gltf.images[0].bufferView];
const atlas = model.subarray(binaryStart + embedded.byteOffset, binaryStart + embedded.byteOffset + embedded.byteLength);
const atlasInfo = await sharp(atlas).metadata();
const readAccessor = (index) => {
  const a = gltf.accessors[index];
  const view = gltf.bufferViews[a.bufferView];
  const components = { VEC2: 2, VEC3: 3, SCALAR: 1 }[a.type];
  const start = binaryStart + (view.byteOffset || 0) + (a.byteOffset || 0);
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: components }, (_, c) => model.readFloatLE(start + i * (view.byteStride || components * 4) + c * 4)));
};
const pos = readAccessor(0), normals = readAccessor(1), uv = readAccessor(2);
const faces = {};
for (const [name, sign] of [['positiveZ', 1], ['negativeZ', -1]]) {
  const vertices = pos.map((p, i) => ({ p, n: normals[i], uv: uv[i] })).filter(v => v.n[2] * sign > .99);
  faces[name] = { count: vertices.length, sample: vertices.filter((_, i) => i < 8), uvMin: [0, 1].map(c => Math.min(...vertices.map(v => v.uv[c]))), uvMax: [0, 1].map(c => Math.max(...vertices.map(v => v.uv[c]))) };
}
const result = { assets: report, modelSha256: createHash('sha256').update(model).digest('hex'), modelMeshes: gltf.nodes.filter(n => n.mesh !== undefined).map(n => n.name), atlasSize: [atlasInfo.width, atlasInfo.height], cardBounds: gltf.accessors[0], faces };
await writeFile(path.join(root, 'work/lanyard/asset-audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
