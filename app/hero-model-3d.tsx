"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Three.js is loaded from a vendored browser module at runtime. */

import { useEffect, useRef } from "react";

type DisposableMaterial = {
  dispose?: () => void;
  [key: string]: unknown;
};

const assetUrl = (path: string) => new URL(path, new URL(".", window.location.href)).href;

export default function HeroModel3D() {
  const stageRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let renderer: any;
    let model: any;

    const disposeMaterial = (material: DisposableMaterial) => {
      Object.values(material).forEach((value: any) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose?.();
    };

    const start = async () => {
      try {
        const THREE = await import(/* @vite-ignore */ assetUrl("vendor/three/three.module.min.js"));
        const { GLTFLoader } = await import(
          /* @vite-ignore */ assetUrl("vendor/three/examples/jsm/loaders/GLTFLoader.js")
        );
        if (disposed) return;

        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          precision: "highp",
        });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        // The embedded texture is already colour-corrected photography.
        // Filmic tone mapping or PBR lighting changes the face unnecessarily.
        renderer.toneMapping = THREE.NoToneMapping;

        const scene = new THREE.Scene();
        // faithful-relief-v3 uses front-projected UVs. Perspective shifts vertices by
        // their Z depth while the UVs stay in the original front projection,
        // visibly stretching the eyes, nose and jaw. Keep it orthographic.
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);

        const rig = new THREE.Group();
        scene.add(rig);

        const loader = new GLTFLoader();
        // This relief is generated directly from the approved cutout: its XY
        // coordinates, UVs and silhouette share the exact same source pixels.
        // Do not fall back to the older reconstruction, whose inferred face
        // geometry is the source of the visible deformation.
        const gltf = await loader.loadAsync(
          assetUrl("models/cheng-upper-body-faithful-relief-v3.glb"),
        );
        stage.dataset.modelQuality = "faithful-relief";
        if (disposed) return;

        model = gltf.scene;
        const maxAnisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
        model.traverse((child: any) => {
          if (!child.isMesh) return;
          child.castShadow = false;
          child.receiveShadow = false;
          const originalMaterials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          const displayMaterials = originalMaterials.map((material: any) => {
            const map = material?.map ?? null;
            if (map) {
              map.colorSpace = THREE.SRGBColorSpace;
              map.anisotropy = maxAnisotropy;
              map.magFilter = THREE.LinearFilter;
              map.minFilter = THREE.LinearMipmapLinearFilter;
              map.generateMipmaps = true;
              map.needsUpdate = true;
            }

            // Show the embedded photograph directly. This keeps facial colour
            // unchanged while the underlying object remains genuine 3D mesh.
            const displayMaterial = new THREE.MeshBasicMaterial({
              map,
              color: map ? 0xffffff : 0x171817,
              transparent: Boolean(map && material?.transparent),
              // Preserve glTF MASK materials as a crisp cutout without blend
              // halos. GLTFLoader exposes the authored cutoff on alphaTest.
              alphaTest: map ? Math.max(material?.alphaTest ?? 0, 0.025) : 0,
              side: THREE.DoubleSide,
              toneMapped: false,
            });
            material?.dispose?.();
            return displayMaterial;
          });
          child.material = Array.isArray(child.material)
            ? displayMaterials
            : displayMaterials[0];
        });

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        // Normalize by portrait height. The dynamic orthographic frustum below
        // fits both dimensions with a precise 6% safety margin.
        const scale = 2.24 / Math.max(size.y, 0.001);
        model.position.sub(center);

        const normalizedModel = new THREE.Group();
        normalizedModel.scale.setScalar(scale);
        normalizedModel.add(model);
        rig.add(normalizedModel);

        const fittedWidth = size.x * scale;
        const fittedHeight = size.y * scale;

        const renderAtCurrentSize = () => {
          const { width, height } = stage.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          const aspect = width / height;
          const viewHeight = Math.max(
            fittedHeight * 1.06,
            (fittedWidth * 1.06) / aspect,
          );
          const viewWidth = viewHeight * aspect;
          camera.left = -viewWidth / 2;
          camera.right = viewWidth / 2;
          camera.top = viewHeight / 2;
          camera.bottom = -viewHeight / 2;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };

        resizeObserver = new ResizeObserver(renderAtCurrentSize);
        resizeObserver.observe(stage);
        renderAtCurrentSize();
        stage.dataset.modelState = "ready";
      } catch (error) {
        stage.dataset.modelState = "fallback";
        console.warn("3D character could not be initialized; using the transparent portrait fallback.", error);
      }
    };

    void start();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (model) {
        model.traverse((child: any) => {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) child.material.forEach(disposeMaterial);
          else if (child.material) disposeMaterial(child.material);
        });
      }
      renderer?.dispose?.();
    };
  }, []);

  return (
    <span ref={stageRef} className="model-stage" data-model-state="loading">
      <canvas ref={canvasRef} aria-label="陈俊呈的高清三维人物模型" />
      {/* eslint-disable-next-line @next/next/no-img-element -- this local transparent fallback must remain available before WebGL initializes. */}
      <img
        className="model-stage-fallback"
        src="models/cheng-upper-body-transparent-v4.png"
        alt="陈俊呈上半身人物"
        draggable="false"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <span className="model-stage-status" aria-hidden="true">TEXTURED 3D / LOCKED FRONT</span>
    </span>
  );
}
