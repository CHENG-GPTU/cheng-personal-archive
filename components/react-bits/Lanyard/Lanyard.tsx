/* eslint-disable react/no-unknown-property */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, type ThreeElement, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
  type RigidBodyProps
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

// Official React Bits model; visual-only integration notes in SOURCE.md.
const cardGLB = '/assets/lanyard/card.glb';
const lanyard = '/assets/lanyard/strap.png';

export function preloadBadgeAssets() {
  useGLTF.preload(cardGLB);
  for (const file of ['card-front.png', 'card-back.png', 'strap.png', 'connector.png', 'leather.png']) {
    useTexture.preload(`/assets/lanyard/cheng-v2/${file}`);
  }
}

import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

// 1x1 transparent pixel — lets useTexture be called unconditionally when a
// front/back image isn't supplied.
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas and the back face to the RIGHT half (measured from card.glb). Each
// custom image is composited into its own half so the two faces render
// independently, aspect-preserving (no stretching).
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

interface LanyardProps {
  position?: [number, number, number];
  cameraTarget?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  chengHardware?: boolean;
  onPullRelease?: (distance: number) => void;
}

export default function Lanyard({
  position = [0, 0, 30],
  cameraTarget,
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  chengHardware = false,
  onPullRelease
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = (): void => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1);
          if (cameraTarget) camera.lookAt(...cameraTarget);
        }}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            isMobile={isMobile}
            frontImage={frontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
            chengHardware={chengHardware}
            onPullRelease={onPullRelease}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
  isMobile?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  chengHardware?: boolean;
  onPullRelease?: (distance: number) => void;
}

type LanyardRigidBody = RapierRigidBody & {
  lerped?: THREE.Vector3;
};

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  chengHardware = false,
  onPullRelease
}: BandProps) {
  const lineArgs = useMemo<[ConstructorParameters<typeof MeshLineMaterial>[0]]>(
    () => [{ resolution: new THREE.Vector2(1000, isMobile ? 2000 : 1000) }],
    [isMobile]
  );
  const band = useRef<THREE.Mesh<InstanceType<typeof MeshLineGeometry>, InstanceType<typeof MeshLineMaterial>>>(null!);
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<LanyardRigidBody>(null!);
  const j2 = useRef<LanyardRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const dragStartY = useRef<number | null>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: RigidBodyProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4
  };

  const getLerped = (body: LanyardRigidBody): THREE.Vector3 => {
    if (!body.lerped) {
      body.lerped = new THREE.Vector3().copy(body.translation());
    }

    return body.lerped;
  };

  const { nodes, materials } = useGLTF(cardGLB) as any;
  const texture = useTexture(lanyardImage || lanyard);
  // useTexture must be called unconditionally; use a blank pixel when an image
  // isn't supplied for a given face, then skip compositing it below.
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);
  const connectorTex = useTexture(chengHardware ? '/assets/lanyard/cheng-v2/connector.png' : '/assets/lanyard/connector.png');
  const leatherTex = useTexture(chengHardware ? '/assets/lanyard/cheng-v2/leather.png' : BLANK_PIXEL);
  useEffect(() => {
    leatherTex.colorSpace = THREE.SRGBColorSpace;
    leatherTex.anisotropy = 16;
    leatherTex.needsUpdate = true;
  }, [leatherTex]);
  const hardwareMaterial = useMemo(() => {
    const material = materials.metal.clone() as THREE.MeshStandardMaterial;
    material.map = connectorTex;
    material.color.set('#b7b7b7');
    connectorTex.colorSpace = THREE.SRGBColorSpace;
    connectorTex.wrapS = connectorTex.wrapT = THREE.RepeatWrapping;
    connectorTex.anisotropy = 16;
    return material;
  }, [materials.metal, connectorTex]);
  useEffect(() => () => hardwareMaterial.dispose(), [hardwareMaterial]);

  // Composite the front/back images into the card's texture atlas (front = left
  // half, back = right half). Each image is drawn aspect-preserving (no stretch).
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map as THREE.Texture;
    if (!frontImage && !backImage) return baseMap;

    const baseImg = baseMap.image as any;
    const W = baseImg.width;
    const H = baseImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    // Do not expose the original branding through contain margins or alpha.
    // The supplied artwork is opaque; its dark card stock is intentional.
    ctx.fillStyle = '#121314';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const drawFitted = (img: any, rect: typeof FRONT_UV_RECT) => {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      // Fit in physical face space, then project into the UV rectangle. The
      // model is 0.7164179 units wide and 1 unit tall, not a 0.5/0.755 rectangle.
      // Compensating for that UV density keeps the portrait and text undistorted.
      const faceAspect = 0.7164179;
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(faceAspect / img.width, 1 / img.height);
      const dw = img.width * scale / faceAspect * rw;
      const dh = img.height * scale * rh;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + (rh - dh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      if (imageFit === 'contain' && dw < rw) {
        // Extend only the supplied crystal edge into the side gutters. The
        // central portrait, lettering and their proportions stay untouched.
        const edge = Math.max(1, Math.round(img.width * 0.035));
        const edgeOnFace = edge / img.width * dw;
        ctx.drawImage(img, 0, 0, edge, img.height,
          rx, dy, dx - rx + edgeOnFace, dh);
        ctx.drawImage(img, img.width - edge, 0, edge, img.height,
          dx + dw - edgeOnFace, dy, rx + rw - (dx + dw) + edgeOnFace, dh);
      }
      ctx.restore();
    };

    if (frontImage && frontTex.image) drawFitted(frontTex.image, FRONT_UV_RECT);
    if (backImage && backTex.image) drawFitted(backTex.image, BACK_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.minFilter = THREE.LinearMipmapLinearFilter;
    composite.magFilter = THREE.LinearFilter;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);
  useEffect(() => () => {
    if (cardMap !== materials.base.map) cardMap.dispose();
  }, [cardMap, materials.base.map]);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0]
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => {
        document.body.style.cursor = 'auto';
      };
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged && typeof dragged !== 'boolean') {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z
      });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        const lerped = getLerped(ref.current);
        const clampedDistance = Math.max(0.1, Math.min(1, lerped.distanceTo(ref.current.translation())));
        lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(getLerped(j2.current));
      curve.points[2].copy(getLerped(j1.current));
      curve.points[3].copy(fixed.current.translation());
      // Meshline uses instanceof Vector3 internally. Numeric coordinates avoid
      // NaNs after a dev hot reload crosses Three module identities; same curve.
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32).flatMap(point => [point.x, point.y, point.z]));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0, -1, 0]} ref={j1} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0, -2, 0]} ref={j2} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0, -3, 0]} ref={j3} {...segmentProps} type="dynamic">
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[0, -4.45, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: ThreeEvent<PointerEvent>) => {
              (e.target as Element).releasePointerCapture(e.pointerId);
              drag(false);
              if (dragStartY.current !== null) onPullRelease?.(e.clientY - dragStartY.current);
              dragStartY.current = null;
            }}
            onPointerCancel={() => { dragStartY.current = null; drag(false); }}
            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
              dragStartY.current = e.clientY;
              (e.target as Element).setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={chengHardware ? 0 : isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} scale={[chengHardware ? 1.35 : 1, 1, 1]} material={hardwareMaterial} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} scale={[chengHardware ? 2.2 : 1, 1, 1]} material={hardwareMaterial} />
            {chengHardware ? <group>
              {/* One centered assembly: woven strap -> leather loop/ring ->
                  riveted metal clip -> card. All pieces follow the card body. */}
              <group position={[0, 1.17, 0.055]}>
                <mesh><boxGeometry args={[0.15, 0.122, 0.028]} /><meshStandardMaterial color="#121212" roughness={0.9} /></mesh>
                <mesh position={[0, 0, 0.0145]}><planeGeometry args={[0.15, 0.1218]} /><meshStandardMaterial map={leatherTex} roughness={0.8} metalness={0.1} /></mesh>
                <mesh position={[0, 0, -0.0145]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.15, 0.1218]} /><meshStandardMaterial map={leatherTex} roughness={0.8} metalness={0.1} /></mesh>
              </group>
              {[1.075, 1.005].map(y => <mesh key={y} position={[0, y, 0.049]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.017, 0.017, 0.009, 24]} />
                <meshStandardMaterial color="#303236" metalness={0.85} roughness={0.3} />
              </mesh>)}
            </group> : null}
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={lineArgs}
          color="white"
          depthTest={chengHardware}
          depthWrite={!chengHardware}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap={1}
          map={texture}
          repeat={[-1, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}
