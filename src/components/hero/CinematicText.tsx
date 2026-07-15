"use client";

/**
 * CinematicText.tsx — Arquetipo 5 (Tipografía 3D cinemática)
 * Basado en assets/components/Cinematic3DText.tsx del skill.
 *
 * Entrada con stagger por palabra usando GSAP:
 *   - Cada palabra monta desde yPercent:120 con overflow hidden
 *   - Duration 1.2s con power4.out (timing cinematográfico, skill C11)
 *   - Stagger 0.08s entre palabras
 *   - Delay inicial 0.4s
 *
 * Sin WebGL para el texto — usa CSS transforms (más liviano, más accesible).
 * El "3D" viene del shader background, no del texto (C9: una idea dominante).
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface CinematicTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}

export function CinematicText({
  text,
  className = "",
  delay = 0.4,
  stagger = 0.08,
  duration = 1.2,
}: CinematicTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const wordInners = containerRef.current?.querySelectorAll(".word-inner");
      if (!wordInners) return;

      gsap.from(wordInners, {
        yPercent: 120,
        opacity: 0,
        duration,
        ease: "power4.out",
        stagger,
        delay,
      });
    }, containerRef);

    return () => ctx.revert();
  }, [text, delay, stagger, duration]);

  return (
    <h1
      ref={containerRef}
      className={`cinematic-text ${className}`}
      style={{
        fontSize: "clamp(2.5rem, 10vw, 8rem)",
        fontWeight: 900,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        margin: 0,
      }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="word"
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "top",
            margin: "0 0.15em",
          }}
        >
          <span
            className="word-inner"
            style={{
              display: "inline-block",
              willChange: "transform, opacity",
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </h1>
  );
}
