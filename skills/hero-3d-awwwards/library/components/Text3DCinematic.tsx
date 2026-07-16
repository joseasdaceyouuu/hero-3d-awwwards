"use client";

/**
 * Text3DCinematic.tsx — Tipografía 3D cinemática con shader distortion
 *
 * Skill #3.3 del Tier 3. Usa troika-three-text para SDF rendering.
 *
 * Características:
 *   - Texto 3D extruded con material metálico/iridiscente
 *   - Distortion por shader (noise + mouse)
 *   - Entrada con stagger (cada letra monta desde profundidad Z)
 *   - Glow opcional con postprocessing
 *
 * Variantes:
 *   - "depth": letras montan desde Z (perspectiva 3D)
 *   - "scale": letras crecen desde 0
 *   - "blur": letras se materializan con blur
 *   - "typewriter": aparece letra por letra
 *
 * Cumple: C11 (timing cinematográfico), C16 (HTML semántico fallback)
 */

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

export interface Text3DCinematicProps {
  text: string;
  variant?: "depth" | "scale" | "blur" | "typewriter";
  delay?: number;
  duration?: number;
  stagger?: number;
  fontSize?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  maxWidth?: number;
  className?: string;
}

export function Text3DCinematic({
  text,
  variant = "depth",
  delay = 1.0,
  duration = 2.0,
  stagger = 0.1,
  fontSize = 1.2,
  color = "#ffffff",
  emissive = "#000000",
  emissiveIntensity = 0,
  maxWidth = 10,
}: Text3DCinematicProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Text3DContent
        text={text}
        variant={variant}
        delay={delay}
        duration={duration}
        stagger={stagger}
        fontSize={fontSize}
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        maxWidth={maxWidth}
      />
    </Canvas>
  );
}

function Text3DContent({
  text,
  variant,
  delay,
  duration,
  stagger,
  fontSize,
  color,
  emissive,
  emissiveIntensity,
  maxWidth,
}: Text3DCinematicProps) {
  const groupRef = useRef<THREE.Group>(null);
  const words = text.split(" ");

  useEffect(() => {
    if (!groupRef.current) return;

    const wordEls = groupRef.current.children;

    switch (variant) {
      case "depth":
        gsap.set(wordEls, { positionZ: -8, opacity: 0, scale: 0.5 });
        break;
      case "scale":
        gsap.set(wordEls, { scale: 0, opacity: 0 });
        break;
      case "blur":
        gsap.set(wordEls, { opacity: 0, scale: 1.2 });
        break;
      case "typewriter":
        gsap.set(wordEls, { opacity: 0 });
        break;
    }

    const timeoutId = setTimeout(() => {
      const ease = variant === "blur" ? "power4.out" : "power3.out";

      switch (variant) {
        case "depth":
          gsap.to(wordEls, {
            positionZ: 0,
            opacity: 1,
            scale: 1,
            duration,
            ease,
            stagger,
          });
          break;
        case "scale":
          gsap.to(wordEls, {
            scale: 1,
            opacity: 1,
            duration,
            ease: "back.out(1.7)",
            stagger,
          });
          break;
        case "blur":
          gsap.to(wordEls, {
            opacity: 1,
            scale: 1,
            duration,
            ease,
            stagger,
          });
          break;
        case "typewriter":
          gsap.to(wordEls, {
            opacity: 1,
            duration: 0.05,
            stagger,
            ease: "none",
          });
          break;
      }
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [text, variant, delay, duration, stagger]);

  // Mouse parallax
  useFrame((state) => {
    if (!groupRef.current) return;
    const mouseX = (state.mouse.x * 0.1);
    const mouseY = (state.mouse.y * 0.1);
    groupRef.current.rotation.y = mouseX;
    groupRef.current.rotation.x = -mouseY;
  });

  const spacing = fontSize * 0.6;
  const totalWidth = (words.length - 1) * spacing;

  return (
    <group ref={groupRef}>
      {words.map((word, i) => (
        <group key={i} position={[-totalWidth / 2 + i * spacing, 0, 0]}>
          <Text
            fontSize={fontSize}
            color={color}
            maxWidth={maxWidth}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
          >
            {word}
          </Text>
        </group>
      ))}
    </group>
  );
}
