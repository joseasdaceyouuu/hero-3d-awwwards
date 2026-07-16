"use client";

/**
 * SplitScreen.tsx — Pantalla dividida que sigue al cursor.
 *
 * Patrón: Split-screen interactivo (extraído de PRISMA escena 3)
 *
 * Dos lados (oscuro/claro o custom) divididos por clipPath polygon.
 * La división sigue al cursor en tiempo real. Texto overlay que se
 * desplaza proporcionalmente.
 *
 * Props:
 *  - leftContent: ReactNode (lado izquierdo)
 *  - rightContent: ReactNode (lado derecho)
 *  - leftBg: string CSS background (default "#02030a")
 *  - rightBg: string CSS background (default "#f5f5f0")
 *  - dividerColor: string (default "#ff0055")
 *  - minPos: number % (default 10)
 *  - maxPos: number % (default 90)
 */

import { useState, useEffect, useRef, type ReactNode } from "react";

interface SplitScreenProps {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  leftBg?: string;
  rightBg?: string;
  dividerColor?: string;
  minPos?: number;
  maxPos?: number;
  className?: string;
}

export function SplitScreen({
  leftContent,
  rightContent,
  leftBg = "#02030a",
  rightBg = "#f5f5f0",
  dividerColor = "#ff0055",
  minPos = 10,
  maxPos = 90,
  className,
}: SplitScreenProps) {
  const [splitPos, setSplitPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.max(minPos, Math.min(maxPos, x)));
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [minPos, maxPos]);

  return (
    <div ref={containerRef} className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Lado izquierdo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: leftBg,
          clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
          transition: "clip-path 0.1s linear",
        }}
      >
        {leftContent}
      </div>

      {/* Lado derecho */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: rightBg,
          clipPath: `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`,
          transition: "clip-path 0.1s linear",
        }}
      >
        {rightContent}
      </div>

      {/* Línea divisoria */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${splitPos}%`,
          width: "2px",
          background: `linear-gradient(to bottom, transparent, ${dividerColor}, transparent)`,
          boxShadow: `0 0 20px ${dividerColor}`,
          transition: "left 0.1s linear",
          zIndex: 5,
          pointerEvents: "none",
        }}
        aria-hidden
      />
    </div>
  );
}
