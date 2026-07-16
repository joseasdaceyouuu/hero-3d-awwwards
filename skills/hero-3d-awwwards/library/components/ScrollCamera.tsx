"use client";

/**
 * ScrollCamera.tsx — Cámara 3D que se mueve con scroll usando quaternions
 *
 * Skill #2.1 del Tier 2. Basado en research/gsap-scroll-choreography.md.
 *
 * 3 patrones de scroll-driven camera:
 *   1. "dolly": cámara avanza en Z (flythrough)
 *   2. "orbit": cámara orbita alrededor del centro
 *   3. "rise": cámara sube de abajo hacia arriba
 *
 * Usa QUATERNIONS (no Euler) para evitar gimbal lock.
 * Integración: Lenis (smooth scroll) + GSAP ScrollTrigger + R3F useFrame
 *
 * Props:
 *   - mode: "dolly" | "orbit" | "rise"
 *   - startZ / endZ: rango de movimiento en Z
 *   - startAngle / endAngle: rango angular (modo orbit)
 *   - lerp: suavizado (0-1, default 0.1)
 *
 * Cumple: DINAMISMO-5 (scroll choreography)
 */

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollCameraProps {
  mode?: "dolly" | "orbit" | "rise";
  startZ?: number;
  endZ?: number;
  startAngle?: number; // grados
  endAngle?: number;   // grados
  startY?: number;
  endY?: number;
  lerp?: number;
  trigger?: string; // selector del trigger element (default "#hero")
}

export function ScrollCamera({
  mode = "dolly",
  startZ = 5,
  endZ = 1,
  startAngle = -15,
  endAngle = 15,
  startY = -1,
  endY = 1,
  lerp = 0.1,
  trigger = "#hero",
}: ScrollCameraProps) {
  const { camera } = useThree();
  const scrollProgress = useRef(0);
  const targetPos = useMemo(() => new THREE.Vector3(0, 0, startZ), [startZ]);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const tempEuler = useMemo(() => new THREE.Euler(0, 0, 0), []);
  const tempQuat = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: trigger,
      start: "top top",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        scrollProgress.current = self.progress;
      },
    });
    return () => st.kill();
  }, [trigger]);

  useFrame(() => {
    const p = scrollProgress.current;

    switch (mode) {
      case "dolly": {
        // Cámara avanza en Z
        targetPos.set(0, 0, THREE.MathUtils.lerp(startZ, endZ, p));
        tempEuler.set(0, 0, 0);
        break;
      }
      case "orbit": {
        // Cámara orbita alrededor del centro
        const angle = THREE.MathUtils.lerp(
          THREE.MathUtils.degToRad(startAngle),
          THREE.MathUtils.degToRad(endAngle),
          p
        );
        const radius = THREE.MathUtils.lerp(startZ, endZ, p);
        targetPos.set(
          Math.sin(angle) * radius,
          0,
          Math.cos(angle) * radius
        );
        // Mirar al centro
        tempEuler.set(0, -angle, 0);
        break;
      }
      case "rise": {
        // Cámara sube
        targetPos.set(0, THREE.MathUtils.lerp(startY, endY, p), THREE.MathUtils.lerp(startZ, endZ, p));
        // Ligera inclinación hacia abajo al subir
        tempEuler.set(THREE.MathUtils.lerp(0, -0.2, p), 0, 0);
        break;
      }
    }

    // Euler → Quaternion (evita gimbal lock)
    tempQuat.setFromEuler(tempEuler);

    // Lerp suave
    camera.position.lerp(targetPos, lerp);
    camera.quaternion.slerp(tempQuat, lerp);
  });

  return null;
}

/**
 * Hook: useScrollProgress
 * Devuelve el progreso de scroll (0-1) de un elemento.
 * Reutilizable independientemente de ScrollCamera.
 */
export function useScrollProgress(trigger: string = "#hero") {
  const progress = useRef(0);

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger,
      start: "top top",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => { progress.current = self.progress; },
    });
    return () => st.kill();
  }, [trigger]);

  return progress;
}
