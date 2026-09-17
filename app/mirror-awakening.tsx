"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import "./mirror-awakening.css";

type MirrorAwakeningProps = {
  onComplete: () => void;
  className?: string;
};

type MirrorPhase = "waiting" | "entering";

type CapillaryPoint = {
  x: number;
  y: number;
};

type Capillary = {
  points: CapillaryPoint[];
  angle: number;
  turn: number;
  speed: number;
  age: number;
  maxAge: number;
  maxPoints: number;
  width: number;
  depth: number;
  branched: boolean;
};

const ENTER_DURATION = 10_000;
const REDUCED_MOTION_DURATION = 220;
const MAX_CAPILLARIES = 56;

function createCapillary(
  x: number,
  y: number,
  angle: number,
  depth = 0,
): Capillary {
  const maxPoints = Math.round(12 + Math.random() * (depth ? 9 : 17));
  return {
    points: [{ x, y }],
    angle,
    turn: (Math.random() - 0.5) * (depth ? 0.07 : 0.045),
    speed: (depth ? 1.05 : 1.45) + Math.random() * 0.85,
    age: 0,
    maxAge: maxPoints + 52 + Math.round(Math.random() * 30),
    maxPoints,
    width: (depth ? 0.5 : 0.9) + Math.random() * (depth ? 0.45 : 0.6),
    depth,
    branched: false,
  };
}

export default function MirrorAwakening({
  onComplete,
  className = "",
}: MirrorAwakeningProps) {
  const [phase, setPhase] = useState<MirrorPhase>("waiting");
  const eyeRef = useRef<HTMLButtonElement>(null);
  const capillaryCanvasRef = useRef<HTMLCanvasElement>(null);
  const capillariesRef = useRef<Capillary[]>([]);
  const capillarySpawnRef = useRef({ x: 0, y: 0, time: 0 });
  const reducedMotionRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    completeRef.current();
  }, []);

  const beginEnter = useCallback(() => {
    if (phase !== "waiting") return;
    setPhase("entering");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timeoutRef.current = window.setTimeout(
      complete,
      reduced ? REDUCED_MOTION_DURATION : ENTER_DURATION,
    );
  }, [complete, phase]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = capillaryCanvasRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotion.matches;
    if (!canvas || reducedMotion.matches) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let needsResize = true;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const density = Math.min(window.devicePixelRatio || 1, 1.6);
      if (width === canvasWidth && height === canvasHeight) return;
      canvasWidth = width;
      canvasHeight = height;
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
      needsResize = false;
    };

    const requestResize = () => {
      needsResize = true;
    };

    const drawFrame = () => {
      if (needsResize) resizeCanvas();
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.lineCap = "round";
      context.lineJoin = "round";

      const newBranches: Capillary[] = [];
      for (const capillary of capillariesRef.current) {
        capillary.age += 1;

        if (capillary.points.length < capillary.maxPoints) {
          const head = capillary.points[capillary.points.length - 1];
          capillary.angle +=
            capillary.turn + Math.sin(capillary.age * 0.72 + head.x * 0.01) * 0.025;
          capillary.points.push({
            x: head.x + Math.cos(capillary.angle) * capillary.speed,
            y: head.y + Math.sin(capillary.angle) * capillary.speed,
          });

          if (
            capillary.depth === 0 &&
            !capillary.branched &&
            capillary.points.length >= Math.round(capillary.maxPoints * 0.46)
          ) {
            capillary.branched = true;
            const direction = Math.random() > 0.5 ? 1 : -1;
            newBranches.push(
              createCapillary(
                head.x,
                head.y,
                capillary.angle + direction * (0.42 + Math.random() * 0.38),
                1,
              ),
            );
          }
        }

        const fade = Math.max(0, 1 - capillary.age / capillary.maxAge);
        if (capillary.points.length > 1 && fade > 0) {
          context.beginPath();
          context.moveTo(capillary.points[0].x, capillary.points[0].y);
          for (let index = 1; index < capillary.points.length; index += 1) {
            const point = capillary.points[index];
            context.lineTo(point.x, point.y);
          }
          context.globalAlpha = fade * (capillary.depth ? 0.44 : 0.68);
          context.strokeStyle = capillary.depth ? "#ef3e52" : "#d1122f";
          context.lineWidth = capillary.width;
          context.stroke();
        }
      }

      context.globalAlpha = 1;
      capillariesRef.current = capillariesRef.current
        .filter((capillary) => capillary.age < capillary.maxAge)
        .concat(newBranches)
        .slice(-MAX_CAPILLARIES);
      frameId = window.requestAnimationFrame(drawFrame);
    };

    resizeCanvas();
    frameId = window.requestAnimationFrame(drawFrame);
    window.addEventListener("resize", requestResize);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", requestResize);
      capillariesRef.current = [];
    };
  }, []);

  const updateRefraction = (event: PointerEvent<HTMLButtonElement>) => {
    const eye = eyeRef.current;
    if (
      !eye ||
      event.pointerType === "touch" ||
      reducedMotionRef.current
    ) {
      return;
    }
    const rect = eye.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    eye.style.setProperty("--eye-pointer-x", x.toFixed(4));
    eye.style.setProperty("--eye-pointer-y", y.toFixed(4));

    const now = performance.now();
    const last = capillarySpawnRef.current;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const deltaX = last.time ? pointerX - last.x : 0;
    const deltaY = last.time ? pointerY - last.y : 0;
    const distance = Math.hypot(deltaX, deltaY);
    if (now - last.time >= 22 || distance >= 8) {
      const travelAngle = distance > 1 ? Math.atan2(deltaY, deltaX) : Math.random() * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.44;
      capillariesRef.current.push(
        createCapillary(pointerX, pointerY, travelAngle + Math.PI / 2 + jitter),
        createCapillary(pointerX, pointerY, travelAngle - Math.PI / 2 - jitter),
      );
      capillariesRef.current = capillariesRef.current.slice(-MAX_CAPILLARIES);
      capillarySpawnRef.current = { x: pointerX, y: pointerY, time: now };
    }
  };

  const resetRefraction = () => {
    eyeRef.current?.style.setProperty("--eye-pointer-x", "0");
    eyeRef.current?.style.setProperty("--eye-pointer-y", "0");
  };

  return (
    <section
      className={`mirror-awakening mirror-awakening--${phase} ${className}`.trim()}
      aria-label="AIPM 与个人成长工作台入口"
      aria-busy={phase !== "waiting"}
    >
      <button
        ref={eyeRef}
        className="mirror-awakening__eye"
        type="button"
        onClick={beginEnter}
        onPointerMove={updateRefraction}
        onPointerLeave={resetRefraction}
        onPointerCancel={resetRefraction}
        disabled={phase !== "waiting"}
        aria-label="点击眼睛进入主页"
      >
        <span className="mirror-awakening__image" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- the full-screen entrance must load before interaction. */}
          <img
            src="images/eye-awakening-natural-v2.png"
            alt=""
            width={1672}
            height={941}
            draggable="false"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </span>

        <canvas
          ref={capillaryCanvasRef}
          className="mirror-awakening__capillaries"
          aria-hidden="true"
        />

        <span className="mirror-awakening__reflection" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local transparent portrait creates the eye reflection. */}
          <img src="images/cheng-side-ink-v1.png" alt="" draggable="false" />
        </span>

        <span className="mirror-awakening__mist" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>

        <span className="mirror-awakening__tear-film" aria-hidden="true">
          <i />
          <i />
        </span>
      </button>

      <span className="mirror-awakening__fracture" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
      </span>

      <span className="mirror-awakening__red-ink" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>

      <span className="mirror-awakening__ink-wash" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </span>

      <span className="mirror-awakening__arrival" aria-hidden="true">
        <i />
        {/* eslint-disable-next-line @next/next/no-img-element -- the transparent character is part of the transition composition. */}
        <img src="images/cheng-front-ink-v1.png" alt="" draggable="false" />
      </span>

      <span className="mirror-awakening__grain" aria-hidden="true" />
      <span
        className="mirror-awakening__dive-cover"
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (
            phase === "entering" &&
            event.animationName === "eye-awakening-sequence"
          ) {
            complete();
          }
        }}
      />
      <span className="mirror-awakening__sequence-meter" aria-hidden="true"><i /></span>
      <span className="mirror-awakening__sr-only" aria-live="polite">
        {phase === "entering" ? "水墨正在铺开，准备进入主页" : ""}
      </span>
    </section>
  );
}
