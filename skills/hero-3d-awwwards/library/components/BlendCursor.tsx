"use client";

/**
 * BlendCursor.tsx — Cursor custom con mix-blend-mode
 *
 * Skill #3.7 del Tier 1. Cursor que sigue al mouse con lerp suave.
 *
 * Características:
 *   - mix-blend-mode: difference (se invierte sobre cualquier color)
 *   - Crece al hover sobre elementos interactivos
 *   - Solo en desktop (pointer: fine)
 *   - Lerp 0.15 para movimiento suave
 *
 * Props:
 *   - color: color del cursor (default blanco, con blend mode se invierte)
 *   - size: tamaño base en px (default 24)
 *   - hoverSize: tamaño al hover (default 48)
 *   - lerp: suavizado del movimiento (default 0.15)
 */

import { useEffect, useRef } from "react";

export interface BlendCursorProps {
  color?: string;
  size?: number;
  hoverSize?: number;
  lerp?: number;
}

export function BlendCursor({
  color = "#ffffff",
  size = 24,
  hoverSize = 48,
  lerp = 0.15,
}: BlendCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo en desktop con cursor fino
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };
    let isHovering = false;
    let isVisible = false;

    const onMouseMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!isVisible) {
        isVisible = true;
        if (cursorRef.current) cursorRef.current.style.opacity = "0.8";
      }
    };

    const onMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.matches("a, button, [data-hover], input, textarea, [role='button']")) {
        isHovering = true;
        if (cursorRef.current) {
          cursorRef.current.style.width = `${hoverSize}px`;
          cursorRef.current.style.height = `${hoverSize}px`;
        }
      }
    };

    const onMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.matches("a, button, [data-hover], input, textarea, [role='button']")) {
        isHovering = false;
        if (cursorRef.current) {
          cursorRef.current.style.width = `${size}px`;
          cursorRef.current.style.height = `${size}px`;
        }
      }
    };

    let raf: number;
    const tick = () => {
      current.x += (target.x - current.x) * lerp;
      current.y += (target.y - current.y) * lerp;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseEnter);
    document.addEventListener("mouseout", onMouseLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseEnter);
      document.removeEventListener("mouseout", onMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, [size, hoverSize, lerp]);

  // No renderizar en touch devices
  if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        border: `1px solid ${color}`,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "difference",
        transition: "width 0.3s ease, height 0.3s ease, opacity 0.3s ease",
        opacity: 0,
        backgroundColor: "transparent",
      }}
    />
  );
}
