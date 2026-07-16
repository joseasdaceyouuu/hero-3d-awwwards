"use client";

/**
 * TextToParticles.tsx — Texto formado por partículas que se dispersan con el cursor.
 *
 * Patrón: Text-to-particles (extraído de PRISMA escena 1)
 *
 * Genera partículas desde texto usando canvas temporal + getImageData.
 * Las partículas forman el texto y se dispersan cuando el cursor se acerca
 * (repel radius). Al alejarlo, se reforman (atracción al target + fricción).
 *
 * Props:
 *  - text: string (required)
 *  - colors: string[] (default ["#00f3ff", "#ff0055", "#aaff00", "#ffaa00"])
 *  - repelRadius: number px (default 80)
 *  - repelForce: number (default 4)
 *  - attractForce: number (default 0.04)
 *  - friction: number (default 0.88)
 *  - particleSize: number (default 1.5)
 *  - sampleStep: number (default 4) — densidad de partículas
 *  - fontSize: string (default "clamp(3rem, 15vw, 180px)")
 *  - fontWeight: number (default 800)
 *  - fontFamily: string (default "Syne, sans-serif")
 */

import { useRef, useEffect } from "react";

interface TextToParticlesProps {
  text: string;
  colors?: string[];
  repelRadius?: number;
  repelForce?: number;
  attractForce?: number;
  friction?: number;
  particleSize?: number;
  sampleStep?: number;
  fontSize?: string;
  fontWeight?: number;
  fontFamily?: string;
  className?: string;
}

export function TextToParticles({
  text,
  colors = ["#00f3ff", "#ff0055", "#aaff00", "#ffaa00"],
  repelRadius = 80,
  repelForce = 4,
  attractForce = 0.04,
  friction = 0.88,
  particleSize = 1.5,
  sampleStep = 4,
  fontSize = "clamp(3rem, 15vw, 180px)",
  fontWeight = 800,
  fontFamily = "Syne, sans-serif",
  className,
}: TextToParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      tx: number;
      ty: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = 1;
    let width = 0;
    let height = 0;

    const generateParticles = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d")!;

      // Parse font size from string (extract number)
      const sizeMatch = fontSize.match(/(\d+)/);
      const baseSize = sizeMatch ? parseInt(sizeMatch[1]) : 120;
      const actualFontSize = Math.min(width * 0.15, baseSize);

      tempCtx.fillStyle = "white";
      tempCtx.font = `bold ${actualFontSize}px ${fontFamily}`;
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText(text, width / 2, height / 2);

      const imageData = tempCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const particles: typeof particlesRef.current = [];
      for (let y = 0; y < height; y += sampleStep) {
        for (let x = 0; x < width; x += sampleStep) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 128) {
            particles.push({
              x: Math.random() * width,
              y: Math.random() * height,
              tx: x,
              ty: y,
              vx: 0,
              vy: 0,
              size: particleSize + Math.random() * particleSize,
              color: colors[Math.floor(Math.random() * colors.length)],
            });
          }
        }
      }
      particlesRef.current = particles;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      generateParticles();
    };

    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseout", onMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (const p of particlesRef.current) {
        if (!reducedMotion) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < repelRadius && dist > 0) {
            const force = (repelRadius - dist) / repelRadius;
            p.vx += (dx / dist) * force * repelForce;
            p.vy += (dy / dist) * force * repelForce;
          }

          p.vx += (p.tx - p.x) * attractForce;
          p.vy += (p.ty - p.y) * attractForce;
          p.vx *= friction;
          p.vy *= friction;
          p.x += p.vx;
          p.y += p.vy;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, colors, repelRadius, repelForce, attractForce, friction, particleSize, sampleStep, fontSize, fontFamily]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
