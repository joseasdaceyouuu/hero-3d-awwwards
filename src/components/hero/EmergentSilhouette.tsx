"use client";

/**
 * EmergentSilhouette.tsx
 *
 * Texto que emerge de la niebla. Técnica:
 *   - CSS mask-image con gradient que va de transparent a opaque
 *   - GSAP anima la posición del mask para "revelar" el texto desde abajo
 *   - text-shadow con blur grande para integrar con la niebla
 *   - color: blanco cálido con tinte amber para coherencia con el shader
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

    const ctx = gsap.context(() => {
      // Animar el mask-image del contenedor
      gsap.fromTo(
        containerRef.current,
        {
          // Empezar completamente enmascarado (invisible)
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, transparent 100%)",
          opacity: 0,
          filter: "blur(20px)",
        },
        {
          // Revelar de abajo hacia arriba
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 40%, black 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 40%, black 100%)",
          opacity: 1,
          filter: "blur(0px)",
          duration,
          ease: "power3.out",
          delay,
        }
      );

      // Stagger sutil en cada palabra (movimiento vertical)
      const wordEls = containerRef.current?.querySelectorAll(".emergent-word");
      if (wordEls) {
        gsap.from(wordEls, {
          y: 30,
          opacity: 0,
          duration: 1.5,
          ease: "power3.out",
          stagger: 0.15,
          delay: delay + 0.3,
        });
      }
    }, containerRef);

    return () => ctx.revert();
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
          "0 0 30px rgba(245,230,211,0.4), 0 0 60px rgba(212,165,116,0.3), 0 0 100px rgba(212,165,116,0.15)",
        // Mask inicial (será animado por GSAP)
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 100%)",
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
