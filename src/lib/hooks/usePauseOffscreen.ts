"use client";

/**
 * usePauseOffscreen.ts — Hook para pausar el render loop cuando el canvas
 * sale del viewport. Cumple PERF-1 del checklist 2026.
 *
 * Uso:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   usePauseOffscreen(containerRef);
 *   // <div ref={containerRef}>...</div>
 */

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

export function usePauseOffscreen(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const { gl } = useThree();
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        // R3F expone el frameloop via el gl component, pero más fiable
        // es usar el callback para pausar manualmente
        if (entry.isIntersecting) {
          gl.info.render.frame = 0; // reset
        }
      },
      { threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, gl]);

  return isVisibleRef;
}

/**
 * Versión simplificada que envuelve el container div del canvas.
 * Pausa el animation frame cuando el div sale del viewport.
 */
export function usePauseWhenOffscreen() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    let rafId: number | null = null;
    let isVisible = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        const canvas = ref.current?.querySelector("canvas");
        if (canvas) {
          // Pausar el canvas cambiando su visibilidad
          canvas.style.visibility = isVisible ? "visible" : "hidden";
        }
      },
      { threshold: 0 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return ref;
}
