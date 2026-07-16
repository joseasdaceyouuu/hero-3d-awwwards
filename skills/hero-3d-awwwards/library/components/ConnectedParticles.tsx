"use client";

/**
 * ConnectedParticles.tsx — Partículas con conexiones tipo constelación.
 *
 * Patrón: 1.4i (partículas con conexiones)
 *
 * 150 partículas en Canvas 2D que se mueven libremente. Cuando dos
 * partículas están a <100px de distancia, se dibuja una línea entre
 * ellas con opacity = (1 - dist/100) * 0.08. Resultado: red de
 * constelaciones dinámica.
 *
 * Props:
 *  - count: number partículas (default 150, máx 200 para perf)
 *  - color: string HSL hue o CSS color (default "#C9A84C")
 *  - connectionDistance: number px (default 100)
 *  - connectionOpacity: number 0..1 (default 0.08)
 *  - particleSize: number px (default 2)
 *  - speed: number 0..1 (default 0.3)
 *  - mouseInteraction: boolean (default true) — repele partículas cercanas
 *  - mouseRadius: number px (default 150)
 *  - driftUp: boolean (default true) — deriva suave hacia arriba como humo
 *
 * Performance: O(n²) con n=150 = 11K comparaciones/frame. Viable 60fps.
 * Para > 200, usar spatial hashing o migrar a WebGL.
 * Accesibilidad: respeta prefers-reduced-motion (estático).
 */

import { useEffect, useRef } from "react";

interface ConnectedParticlesProps {
  count?: number;
  color?: string;
  connectionDistance?: number;
  connectionOpacity?: number;
  particleSize?: number;
  speed?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  driftUp?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  opacity: number;
  baseOpacity: number;
  size: number;
  life: number;
  maxLife: number;
}

export function ConnectedParticles({
  count = 150,
  color = "#C9A84C",
  connectionDistance = 100,
  connectionOpacity = 0.08,
  particleSize = 2,
  speed = 0.3,
  mouseInteraction = true,
  mouseRadius = 150,
  driftUp = true,
  className,
}: ConnectedParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (count > 200) {
      console.warn("[ConnectedParticles] count > 200 puede causar jank. Considera WebGL.");
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respetar prefers-reduced-motion: render estático
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Convertir color a HSL para las partículas
    const isHex = color.startsWith("#");
    let baseHue = 45; // gold default
    let baseSat = 70;
    let baseLight = 60;
    if (isHex && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      baseLight = Math.round(l * 100);
      if (max !== min) {
        const d = max - min;
        let h = 0;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
        baseHue = Math.round(h * 360);
        baseSat = Math.round((d / (1 - Math.abs(2 * l - 1))) * 100);
      }
    }

    // Init partículas
    const initParticle = (): Particle => {
      const baseOpacity = Math.random() * 0.5 + 0.1;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * speed,
        speedY: (Math.random() - 0.5) * speed,
        opacity: baseOpacity,
        baseOpacity,
        size: Math.random() * particleSize + 0.5,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      };
    };
    particlesRef.current = Array.from({ length: count }, initParticle);

    // Mouse tracking — escuchar en window (no en canvas) porque el canvas
    // tiene pointer-events: none (no debe bloquear clicks del CTA subyacente).
    // Computamos la posición relativa al canvas via getBoundingClientRect.
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    if (mouseInteraction) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("mouseout", onMouseLeave);
    }

    const updateParticle = (p: Particle) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.life++;

      if (mouseInteraction) {
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius;
          p.speedX -= (dx / dist) * force * 0.5;
          p.speedY -= (dy / dist) * force * 0.5;
          p.opacity = Math.min(1, p.baseOpacity + force * 0.5);
        } else {
          p.opacity = p.baseOpacity;
        }
      }

      if (driftUp) {
        p.speedY -= 0.005; // deriva suave hacia arriba
      }

      // Reset si sale de bounds o muere
      if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50 || p.life > p.maxLife) {
        Object.assign(p, initParticle());
      }
    };

    const drawConnections = () => {
      const particles = particlesRef.current;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            const opacity = (1 - dist / connectionDistance) * connectionOpacity;
            ctx.strokeStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLight}%, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter"; // additive

      for (const p of particlesRef.current) {
        if (!reducedMotion) updateParticle(p);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLight}%, ${p.opacity})`;
        ctx.fill();
      }

      drawConnections();
      ctx.globalCompositeOperation = "source-over";

      if (!reducedMotion) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count, color, connectionDistance, connectionOpacity, particleSize, speed, mouseInteraction, mouseRadius, driftUp]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
