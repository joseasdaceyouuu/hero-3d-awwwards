"use client";

/**
 * FlyingBirds.tsx
 *
 * Aves silueta volando a través del hero. Técnica:
 *   - SVG paths estilizados (siluetas de pájaros)
 *   - GSAP anima cada pájaro con trayectoria + wing flap
 *   - Spawn aleatorio: 1-3 pájaros cada 8-15s
 *   - Diferentes tamaños para profundidad
 *   - Color: dark silhouette contra el fog amber (se ven como sombras)
 *
 * Performance: SVG + CSS transforms (no WebGL). Cero impacto en FPS.
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface Bird {
  id: number;
  size: number;
  duration: number;
  delay: number;
  startY: number;
  direction: "left" | "right";
  wingFlapSpeed: number;
}

const BIRD_SVG_PATHS = [
  // Pájaro con alas extendidas (variación 1)
  "M 0 10 Q 5 5 10 8 Q 15 5 20 10 Q 18 12 15 11 Q 12 13 10 11 Q 8 13 5 11 Q 2 12 0 10 Z",
  // Pájero con alas arriba (variación 2)
  "M 0 12 Q 5 2 10 8 Q 15 2 20 12 Q 15 10 10 11 Q 5 10 0 12 Z",
  // Pájaro con alas abajo (variación 3)
  "M 0 8 Q 5 12 10 9 Q 15 12 20 8 Q 15 9 10 11 Q 5 9 0 8 Z",
];

export function FlyingBirds() {
  const [birds, setBirds] = useState<Bird[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const birdIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const spawnBird = () => {
      if (!mounted) return;

      const direction = Math.random() > 0.5 ? "left" : "right";
      const bird: Bird = {
        id: birdIdRef.current++,
        size: 30 + Math.random() * 40, // 30-70px (más grandes)
        duration: 6 + Math.random() * 5, // 6-11s (más rápidos)
        delay: 0,
        startY: 20 + Math.random() * 40, // 20-60% from top
        direction,
        wingFlapSpeed: 0.25 + Math.random() * 0.35, // 0.25-0.6s per flap
      };

      setBirds((prev) => [...prev, bird]);

      // Remover el pájaro después de que termine su animación
      setTimeout(() => {
        if (!mounted) return;
        setBirds((prev) => prev.filter((b) => b.id !== bird.id));
      }, bird.duration * 1000 + 500);
    };

    // Spawn inicial después de 1s
    const initialTimer = setTimeout(spawnBird, 1000);
    // Segundo pájaro pronto para verlos
    const initialTimer2 = setTimeout(spawnBird, 3500);

    // Spawn periódico: cada 4-8s
    const scheduleNext = () => {
      const delay = 4000 + Math.random() * 4000;
      return setTimeout(() => {
        spawnBird();
        // A veces spawn 2 pájaros juntos
        if (Math.random() > 0.5) {
          setTimeout(spawnBird, 600 + Math.random() * 1000);
        }
        scheduleNext();
      }, delay);
    };

    const recurringTimer = scheduleNext();

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      clearTimeout(initialTimer2);
      clearTimeout(recurringTimer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
      aria-hidden
    >
      {birds.map((bird) => (
        <BirdSprite key={bird.id} bird={bird} />
      ))}
    </div>
  );
}

function BirdSprite({ bird }: { bird: Bird }) {
  const birdRef = useRef<SVGSVGElement>(null);
  const wingRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!birdRef.current) return;

    const startX = bird.direction === "left" ? -100 : window.innerWidth + 100;
    const endX = bird.direction === "left" ? window.innerWidth + 100 : -100;
    const startY = (bird.startY / 100) * window.innerHeight;

    // Set initial position
    gsap.set(birdRef.current, {
      x: startX,
      y: startY,
      opacity: 0,
    });

    // Animar el pájaro cruzando la pantalla — opacity constante alta
    const tl = gsap.timeline();

    // Fade in rápido (primer 10% del tiempo)
    tl.to(birdRef.current, {
      opacity: 0.6,
      duration: bird.duration * 0.1,
      ease: "power2.out",
    });

    // Mantener opacity mientras cruza
    tl.to(birdRef.current, {
      x: endX,
      y: startY + Math.sin(bird.id) * 30,
      opacity: 0.6,
      duration: bird.duration * 0.8,
      ease: "none",
    });

    // Fade out al final (último 10%)
    tl.to(birdRef.current, {
      opacity: 0,
      duration: bird.duration * 0.1,
      ease: "power2.in",
    });

    // Wing flap animation — ciclar entre los 3 SVG paths
    if (wingRef.current) {
      const flapTl = gsap.timeline({ repeat: -1 });
      flapTl
        .to(wingRef.current, {
          duration: bird.wingFlapSpeed,
          attr: { d: BIRD_SVG_PATHS[1] },
          ease: "power2.inOut",
        })
        .to(wingRef.current, {
          duration: bird.wingFlapSpeed,
          attr: { d: BIRD_SVG_PATHS[0] },
          ease: "power2.inOut",
        })
        .to(wingRef.current, {
          duration: bird.wingFlapSpeed,
          attr: { d: BIRD_SVG_PATHS[2] },
          ease: "power2.inOut",
        })
        .to(wingRef.current, {
          duration: bird.wingFlapSpeed,
          attr: { d: BIRD_SVG_PATHS[0] },
          ease: "power2.inOut",
        });
    }

    return () => {
      tl.kill();
    };
  }, [bird]);

  return (
    <svg
      ref={birdRef}
      width={bird.size}
      height={bird.size * 0.6}
      viewBox="0 0 20 15"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity: 0,
        // Voltear horizontalmente si va hacia la derecha
        transform: bird.direction === "right" ? "scaleX(-1)" : "none",
      }}
    >
      <path
        ref={wingRef}
        d={BIRD_SVG_PATHS[0]}
        fill="#1a1208"
        stroke="#0a0804"
        strokeWidth="0.3"
        style={{
          filter: "blur(0.5px)", // ligero blur para integrar con la niebla
        }}
      />
    </svg>
  );
}
