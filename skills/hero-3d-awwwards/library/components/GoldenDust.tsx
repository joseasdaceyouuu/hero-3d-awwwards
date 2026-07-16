"use client";

/**
 * GoldenDust.tsx — Partículas doradas que aparecen al hacer click.
 *
 * Patrón: 1.4g (golden dust al click — micro-reward)
 *
 * Al hacer click en cualquier parte del document, spawnan N partículas
 * que se expanden radialmente con cubic-bezier(0.16, 1, 0.3, 1).
 * Cada partícula tiene un ángulo fijo (360°/N) y velocidad aleatoria.
 * Duración ~800-1200ms, desaparecen con scale(0).
 *
 * Props:
 *  - color: string HSL hue o color CSS (default "#C9A84C" gold)
 *  - count: number partículas por click (default 12)
 *  - minVelocity: number px (default 80)
 *  - maxVelocity: number px (default 200)
 *  - minSize: number px (default 3)
 *  - maxSize: number px (default 7)
 *  - duration: number ms (default 800)
 *  - enabled: boolean (default true)
 *
 * Performance: 12 partículas × 60fps = impacto mínimo. pointer-events: none.
 * Accesibilidad: respeta prefers-reduced-motion (no spawn partículas).
 */

import { useEffect, useRef } from "react";

interface GoldenDustProps {
  color?: string;
  count?: number;
  minVelocity?: number;
  maxVelocity?: number;
  minSize?: number;
  maxSize?: number;
  duration?: number;
  enabled?: boolean;
}

export function GoldenDust({
  color = "#C9A84C",
  count = 12,
  minVelocity = 80,
  maxVelocity = 200,
  minSize = 3,
  maxSize = 7,
  duration = 800,
  enabled = true,
}: GoldenDustProps) {
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    if (!enabled) return;

    // Respetar prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      const color = colorRef.current;
      // Aceptar cualquier color CSS — si es hex, lo usamos directo
      // Para variación, generamos HSL alrededor del hue si es hex
      const isHex = color.startsWith("#");
      let hue: number | null = null;
      if (isHex && color.length === 7) {
        // Convertir hex a HSL para variar el hue ±10
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          let h = 0;
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          else if (max === g) h = ((b - r) / d + 2) / 6;
          else h = ((r - g) / d + 4) / 6;
          hue = h * 360;
        }
      }

      for (let i = 0; i < count; i++) {
        const dust = document.createElement("div");
        const size = minSize + Math.random() * (maxSize - minSize);
        const particleColor = hue !== null
          ? `hsl(${hue + (Math.random() - 0.5) * 20}, 70%, 60%)`
          : color;

        dust.style.cssText = `
          position: fixed;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          width: ${size}px;
          height: ${size}px;
          background: ${particleColor};
          border-radius: 50%;
          pointer-events: none;
          z-index: 100;
          box-shadow: 0 0 ${size * 2}px ${particleColor};
          will-change: transform, opacity;
        `;
        document.body.appendChild(dust);

        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const velocity = minVelocity + Math.random() * (maxVelocity - minVelocity);
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        const particleDuration = duration + Math.random() * 400;

        const animation = dust.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${vx}px, ${vy + 50}px) scale(0)`, opacity: 0 },
          ],
          {
            duration: particleDuration,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
          }
        );
        animation.onfinish = () => dust.remove();
      }
    };

    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, [enabled, count, minVelocity, maxVelocity, minSize, maxSize, duration]);
}
