"use client";

/**
 * EmergentSilhouette.tsx
 *
 * Texto que emerge de la bruma. Técnica simplificada:
 *   - opacity 0 → 1 con blur grande → 0 (texto "se materializa")
 *   - GSAP stagger por palabra
 *   - text-shadow con glow amber para integrar con la niebla
 *   - color: blanco cálido con tinte amber
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface EmergentSilhouetteProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

export function EmergentSilhouette({
  text,
  className = "",
  delay = 1.2,
  duration = 3.0,
}: EmergentSilhouetteProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    if (!containerRef.current) return;

    // Set initial state explicitly
    gsap.set(containerRef.current, {
      opacity: 0,
      y: 20,
    });

    // Usar setTimeout para el delay (más confiable que gsap delay)
    const timeoutId = setTimeout(() => {
      gsap.to(containerRef.current, {
        opacity: 1,
        y: 0,
        duration,
        ease: "power3.out",
      });

      // Stagger por palabra
      const wordEls = containerRef.current!.querySelectorAll(".emergent-word");
      gsap.from(wordEls, {
        y: 15,
        opacity: 0,
        duration: 1.5,
        ease: "power3.out",
        stagger: 0.12,
      });
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [text, delay, duration]);

  return (
    <h1
      ref={containerRef}
      className={`emergent-silhouette ${className}`}
      style={{
        fontSize: "clamp(2.5rem, 11vw, 9rem)",
        fontWeight: 200,
        letterSpacing: "0.02em",
        lineHeight: 0.95,
        margin: 0,
        color: "#f5e6d3",
        textShadow:
          "0 0 30px rgba(245,230,211,0.5), 0 0 60px rgba(212,165,116,0.4), 0 0 100px rgba(212,165,116,0.2)",
        opacity: 0, // estado inicial antes de que GSAP tome control
      }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="emergent-word"
          style={{
            display: "inline-block",
            margin: "0 0.2em",
          }}
        >
          {word}
        </span>
      ))}
    </h1>
  );
}
