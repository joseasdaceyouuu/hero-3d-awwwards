"use client";

/**
 * ShaderBackground.tsx — Componente reutilizable de background WebGL
 *
 * Skill #3.3 del Tier 1. Componente base para todos los heroes.
 *
 * Props:
 *   - shader: vertex + fragment shader strings
 *   - palette: colores del hero
 *   - speed: velocidad de animación (default 0.3 = visible)
 *   - mouseInteraction: "ripple" | "parallax" | "push" | "none"
 *   - godRays: número de rayos de luz (0 = desactivado)
 *   - geometry: "plane" | "sphere" (default plane)
 *
 * Cumple: C5, C7, C9, C12, PERF-1, A11Y-3
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface ShaderBackgroundProps {
  vertexShader: string;
  fragmentShader: string;
  speed?: number;
  mouseInteraction?: "ripple" | "parallax" | "push" | "none";
  geometry?: "plane" | "sphere";
  subdivisions?: number;
  className?: string;
}

export function ShaderBackground({
  vertexShader,
  fragmentShader,
  speed = 0.3,
  mouseInteraction = "parallax",
  geometry = "plane",
  subdivisions = 64,
  className,
}: ShaderBackgroundProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // C7: prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // C12: WebGL availability check
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  // PERF-1: IntersectionObserver pause-offscreen
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // A11Y-3: Keyboard navigation
  const keyboardMouseRef = useRef(new THREE.Vector2(0, 0));
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      const step = 0.1;
      switch (e.key) {
        case "ArrowLeft": keyboardMouseRef.current.x = Math.max(-1, keyboardMouseRef.current.x - step); break;
        case "ArrowRight": keyboardMouseRef.current.x = Math.min(1, keyboardMouseRef.current.x + step); break;
        case "ArrowUp": keyboardMouseRef.current.y = Math.min(1, keyboardMouseRef.current.y + step); break;
        case "ArrowDown": keyboardMouseRef.current.y = Math.max(-1, keyboardMouseRef.current.y - step); break;
        case "Enter": case " ":
          const cta = document.querySelector('[data-hover]') as HTMLAnchorElement;
          if (cta) cta.click();
          break;
      }
      window.dispatchEvent(new MouseEvent("mousemove", {
        clientX: ((keyboardMouseRef.current.x + 1) / 2) * window.innerWidth,
        clientY: ((1 - keyboardMouseRef.current.y) / 2) * window.innerHeight,
      }));
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!webglAvailable || reducedMotion) {
    return (
      <div
        className={`absolute inset-0 ${className || ""}`}
        style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)" }}
        aria-hidden
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${className || ""}`}
      role="application"
      aria-label="Fondo interactivo. Usa las flechas para mover y Enter para activar."
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        frameloop={isVisible && !reducedMotion ? "always" : "demand"}
      >
        <ShaderPlane
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          speed={speed}
          mouseInteraction={mouseInteraction}
          geometry={geometry}
          subdivisions={subdivisions}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}

// ============================================================
// SHADER PLANE — implementa el shader con uniforms estándar
// ============================================================

interface ShaderPlaneProps {
  vertexShader: string;
  fragmentShader: string;
  speed: number;
  mouseInteraction: string;
  geometry: string;
  subdivisions: number;
  reducedMotion: boolean;
}

function ShaderPlane({
  vertexShader,
  fragmentShader,
  speed,
  mouseInteraction,
  geometry,
  subdivisions,
  reducedMotion,
}: ShaderPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();

  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));
  const mouseStrength = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouseStrength: { value: 0 },
      uSpeed: { value: speed },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (mouseInteraction === "none") return;
    const onMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseStrength.current = 1.0;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [mouseInteraction]);

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  useFrame((state) => {
    if (!materialRef.current) return;
    if (!reducedMotion) {
      uniforms.uTime.value = state.clock.elapsedTime;
    }
    mouseCurrent.current.lerp(mouseTarget.current, 0.05);
    uniforms.uMouse.value.copy(mouseCurrent.current);
    uniforms.uMouseStrength.value = mouseStrength.current;
    mouseStrength.current = Math.max(0, mouseStrength.current - 0.015);
  });

  const geom = geometry === "sphere"
    ? <sphereGeometry args={[1, subdivisions, subdivisions]} />
    : <planeGeometry args={[1, 1, subdivisions, subdivisions]} />;

  // Overscan: plano 10% más grande que el viewport para que el parallax
  // nunca deje bordes negros visibles
  const overscan = 1.1;

  return (
    <mesh ref={meshRef} scale={[viewport.width * overscan, viewport.height * overscan, 1]}>
      {geom}
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
