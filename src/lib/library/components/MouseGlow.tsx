"use client";

/**
 * MouseGlow.tsx — Glow suave que sigue al cursor con mix-blend-mode: screen.
 *
 * Patrón: 1.4h (mouse glow con mix-blend-mode: screen)
 *
 * Un círculo grande (default 400px) que sigue al mouse con
 * radial-gradient(circle, rgba(accent, 0.04) 0%, transparent 70%)
 * y mix-blend-mode: screen. Suma luz suave donde está el cursor.
 *
 * Props:
 *  - color: string CSS color (default "#C9A84C")
 *  - size: number px (default 400)
 *  - intensity: number 0..1 (default 0.04)
 *  - lerp: number 0..1 (default 0.15) — suavizado del movimiento
 *  - enabled: boolean (default true)
 *
 * Performance: position fixed, transition opacity, sin RAF loop continuo
 * (usa eventos mousemove + transform CSS).
 * Accesibilidad: se desactiva con prefers-reduced-motion y en touch devices.
 */

import { useEffect, useRef } from "react";

interface MouseGlowProps {
  color?: string;
  size?: number;
  intensity?: number;
  lerp?: number;
  enabled?: boolean;
}

export function MouseGlow({
  color = "#C9A84C",
  size = 400,
  intensity = 0.04,
  lerp = 0.15,
  enabled = true,
}: MouseGlowProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: -1000, y: -1000 });
  const currentRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    // No activar en touch devices ni con reduced motion
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const glow = glowRef.current;
    if (!glow) return;

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      glow.style.opacity = "1";
    };

    const onMouseLeave = () => {
      glow.style.opacity = "0";
    };

    const tick = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * lerp;
      glow.style.transform = `translate(${currentRef.current.x}px, ${currentRef.current.y}px) translate(-50%, -50%)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, lerp]);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}${Math.round(intensity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
        pointerEvents: "none",
        zIndex: 5,
        opacity: 0,
        transition: "opacity 0.3s",
        mixBlendMode: "screen",
        willChange: "transform, opacity",
        // initial position off-screen
        transform: "translate(-1000px, -1000px)",
      }}
    />
  );
}
