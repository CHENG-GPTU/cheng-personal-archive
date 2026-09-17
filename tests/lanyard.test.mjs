import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = name => readFile(new URL('../' + name, import.meta.url));
const source = (await read('components/react-bits/Lanyard/Lanyard.tsx')).toString().replaceAll('\r\n', '\n');
const physicalSource = source
  .replace('            onPullRelease={onPullRelease}\n', '')
  .replace('              if (dragStartY.current !== null) onPullRelease?.(e.clientY - dragStartY.current);\n              dragStartY.current = null;\n', '')
  .replace('            onPointerCancel={() => { dragStartY.current = null; drag(false); }}\n', '')
  .replace('              dragStartY.current = e.clientY;\n', '')
  .replace('            chengHardware={chengHardware}\n', '')
  .replace('        onCreated={({ gl, camera }) => {\n          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1);\n          if (cameraTarget) camera.lookAt(...cameraTarget);\n        }}', '        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}')
  .replace('      // Meshline uses instanceof Vector3 internally. Numeric coordinates avoid\n      // NaNs after a dev hot reload crosses Three module identities; same curve.\n', '')
  .replace('curve.getPoints(isMobile ? 16 : 32).flatMap(point => [point.x, point.y, point.z])', 'curve.getPoints(isMobile ? 16 : 32)');
const hash = value => createHash('sha256').update(value).digest('hex');

test('official Lanyard camera, lighting, physics, joints and pointer handling remain unchanged', () => {
  const blocks = [
    ['      <Canvas', '      </Canvas>', '56540a4657f18c030e0ac8a5bce1f17a5a0788d3c63025b2a95d8364e904e019'],
    ['  useFrame((state, delta) => {', '  curve.curveType', '15948076b527babbe8b88d9756dd63e1e57be6e241d362ff3124cce065cf93ec'],
    ['  useRopeJoint(fixed', '  useEffect(() => {', '753bbe52a1c952ebf79d31adde55715244c87b8847dd416a310721bec3cfb807'],
    ['            onPointerOver', '            <mesh geometry={nodes.card.geometry}>', '2b3540254f7af8cdb1f73b0c1a73b245fea8445ab3950e0736445b180cda531f'],
  ];
  for (const [start, end, expected] of blocks) {
    const a = physicalSource.indexOf(start), b = physicalSource.indexOf(end, a);
    assert.ok(a >= 0 && b > a);
    assert.equal(hash(physicalSource.slice(a, b)), expected, start);
  }
  assert.match(source, /position = \[0, 0, 30\]/);
  assert.match(source, /gravity = \[0, -40, 0\]/);
  assert.doesNotMatch(source, /SceneProbe|data-scene-probe|setRotation/);
});

test('rope numeric serialization survives meshline module identities and responsive sample counts', async () => {
  const { MeshLineGeometry } = await import('meshline');
  const { CatmullRomCurve3, Vector3 } = await import('three');
  const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(.3, 1, 0), new Vector3(.1, 2, 0), new Vector3(0, 3, 0)]);
  curve.curveType = 'chordal';
  const geometry = new MeshLineGeometry();
  for (const count of [32, 16, 32, 16]) {
    const coordinates = curve.getPoints(count).map(p => ({ x: p.x, y: p.y, z: p.z })).flatMap(p => [p.x, p.y, p.z]);
    geometry.setPoints(coordinates);
    assert.ok(Array.from(geometry.getAttribute('position').array).every(Number.isFinite));
    assert.ok(Number.isFinite(geometry.boundingSphere.radius));
    assert.equal(geometry.getAttribute('position').count, (count + 1) * 2);
  }
  geometry.dispose();
});

test('official model is unmodified and has independent, correctly oriented front/back UVs', async () => {
  const data = await read('public/assets/lanyard/card.glb');
  assert.equal(hash(data), 'fd540ead33cf3f86651a13c45790d0b3e9bde868cf69ac8c2307fb3dc2b3d591');
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString());
  const binary = 28 + length;
  assert.deepEqual(json.nodes.filter(n => n.mesh !== undefined).map(n => n.name), ['card', 'clip', 'clamp']);
  const access = index => {
    const a = json.accessors[index], v = json.bufferViews[a.bufferView];
    const n = a.type === 'VEC3' ? 3 : 2;
    const base = binary + (v.byteOffset || 0) + (a.byteOffset || 0);
    return Array.from({ length: a.count }, (_, i) => Array.from({ length: n }, (_, c) => data.readFloatLE(base + i * (v.byteStride || n * 4) + c * 4)));
  };
  const pos = access(0), normal = access(1), uv = access(2);
  for (const sign of [1, -1]) {
    const face = pos.map((p, i) => ({ p, n: normal[i], uv: uv[i] })).filter(v => v.n[2] * sign > .99);
    assert.ok(face.every(v => sign > 0 ? v.uv[0] < .5 : v.uv[0] > .5));
    const left = face.reduce((a, b) => a.p[0] < b.p[0] ? a : b);
    const right = face.reduce((a, b) => a.p[0] > b.p[0] ? a : b);
    assert.ok((right.uv[0] - left.uv[0]) * sign > 0, 'each face must read left-to-right when viewed from its own side');
    const top = face.reduce((a, b) => a.p[1] > b.p[1] ? a : b);
    const bottom = face.reduce((a, b) => a.p[1] < b.p[1] ? a : b);
    assert.ok(top.uv[1] < bottom.uv[1], 'canvas image origin stays at the top');
  }
});

test('cropped local texture resources preserve source resolution and intentionally opaque card stock', async () => {
  for (const [file, width, height] of [['card-front.png', 677, 1080], ['card-back.png', 677, 1080], ['strap.png', 1974, 247], ['connector.png', 120, 60]]) {
    const png = await read('public/assets/lanyard/' + file);
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height]);
    assert.equal(png[25], 2, 'sources are opaque RGB; dark artwork must not be keyed away');
  }
});

test('texture adaptation preserves aspect, color space, correct repetition and cleanup', () => {
  assert.match(source, /faceAspect = 0\.7164179/);
  assert.match(source, /composite\.flipY = baseMap\.flipY/);
  assert.match(source, /composite\.colorSpace = THREE\.SRGBColorSpace/);
  assert.match(source, /repeat=\{\[-1, 1\]\}/);
  assert.match(source, /cardMap\.dispose\(\)/);
  assert.match(source, /hardwareMaterial\.dispose\(\)/);
  assert.doesNotMatch(source, /ctx\.drawImage\(baseImg/);
  assert.doesNotMatch(source, /https:\/\//);
});

test('homepage changes its central content while retaining the archive navigation and original controls', async () => {
  const home = (await read('app/lanyard-home.tsx')).toString();
  const badge = (await read('app/interactive-badge.tsx')).toString();
  const page = (await read('app/page.tsx')).toString();
  assert.match(badge, /ssr: false/);
  assert.match(badge, /imageFit="contain"/);
  assert.equal((home.match(/<SideRaysBackground/g) || []).length, 1);
  assert.match(badge, /card-front\.png/);
  assert.match(badge, /card-back\.png/);
  const entry = (await read('app/archive-entry.tsx')).toString();
  assert.match(entry, /<ResumeEnvelope onComplete=\{enter\}/);
  assert.doesNotMatch(home, /ResumeEnvelope|hashchange|setEntered/);
  assert.match(home, /<PortfolioSiteNav active="home"/);
  assert.match(home, /onNavigate\(item\.target\)/);
  assert.match(page, /<ChengHome onNavigate=\{navigate\}/);
  const currentHome = (await read('app/cheng-home.tsx')).toString();
  assert.match(currentHome, /<PortfolioSiteNav active=\{workOnly \? "work" : "home"\}/);
  assert.match(currentHome, /<EyeResumeLink label="个人简历" compact/);
  assert.match(currentHome, /<ContactCard word/);
  assert.doesNotMatch(page, /<LearningHome|<ResumeEnvelope|<StoryScroll/);
});
