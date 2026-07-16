"use client";

/**
 * MagneticElement.tsx — Elemento UI atraído magnéticamente al cursor.
 *
 * Patrón: Efecto magnético real (extraído de PRISMA escena 2)
 *
 * El elemento se desplaza hacia el cursor con fuerza proporcional a la
 * distancia. NO es hover scale — es atracción física real con transform
 * translate. Al salir el cursor, regresa con cubic-bezier suave.
 *
 * Props:
 *  - children: ReactNode (required)
 *  - strength: number 0..1 (default 0.3) — cuánto se atrae
 *  - transition: string (default "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)")
 */

import { useRef, useEffect, useCallback, type ReactNode } from "react";

interface MagneticElementProps {
  children: ReactNode;
  strength?: number;
  transition?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MagneticElement({
  children,
  strength = 0.3,
  transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  className,
  style,
}: MagneticElementProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [strength]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0, 0)";
  }, []);

  useEffect(() => {
    // Solo en dispositivos con mouse (no touch)
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      ref={ref}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transition,
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
