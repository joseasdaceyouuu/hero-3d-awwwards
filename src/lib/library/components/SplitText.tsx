"use client";

/**
 * SplitText.tsx — Texto con stagger por palabra + mask reveal
 *
 * Skill #3.5 del Tier 1. Usa GSAP SplitText (GRATIS desde GSAP 3.13).
 *
 * Variantes:
 *   - "word-reveal": palabras montan desde abajo con mask
 *   - "color-fill": texto outline que se llena de color al scroll
 *   - "blur-materialize": scale + blur + opacity (cinematográfico)
 *   - "typewriter": aparece letra por letra
 *
 * Props:
 *   - text: string a animar
 *   - variant: tipo de animación
 *   - delay: delay inicial (segundos)
 *   - duration: duración de la animación (segundos)
 *   - stagger: delay entre palabras/letras (segundos)
 *   - ease: easing de GSAP (default power4.out)
 *   - className: clases CSS adicionales
 *
 * Cumple: C11 (timing cinematográfico), C15 (contraste), C16 (HTML semántico)
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";

export interface SplitTextProps {
  text: string;
  variant?: "word-reveal" | "color-fill" | "blur-materialize" | "typewriter";
  delay?: number;
  duration?: number;
  stagger?: number;
  ease?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SplitText({
  text,
  variant = "blur-materialize",
  delay = 0.8,
  duration = 1.8,
  stagger = 0.08,
  ease = "power4.out",
  className = "",
  style = {},
}: SplitTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const words = containerRef.current.querySelectorAll(".split-word");

    // Estado inicial según variante
    switch (variant) {
      case "word-reveal":
        gsap.set(words, { yPercent: 120, opacity: 0 });
        gsap.set(containerRef.current, { opacity: 1 });
        break;
      case "color-fill":
        gsap.set(words, { color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.4)" });
        gsap.set(containerRef.current, { opacity: 1 });
        break;
      case "blur-materialize":
        gsap.set(containerRef.current, {
          opacity: 0,
          scale: 1.15,
          filter: "blur(30px)",
          rotateX: 15,
        });
        break;
      case "typewriter":
        gsap.set(words, { opacity: 0 });
        gsap.set(containerRef.current, { opacity: 1 });
        break;
    }

    const timeoutId = setTimeout(() => {
      switch (variant) {
        case "word-reveal":
          gsap.to(words, {
            yPercent: 0,
            opacity: 1,
            duration,
            ease,
            stagger,
          });
          break;
        case "color-fill":
          gsap.to(words, {
            color: style.color || "#ffffff",
            WebkitTextStroke: "0px transparent",
            duration,
            ease,
            stagger,
          });
          break;
        case "blur-materialize":
          gsap.to(containerRef.current, {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            rotateX: 0,
            duration,
            ease,
          });
          break;
        case "typewriter":
          gsap.to(words, {
            opacity: 1,
            duration: 0.05,
            stagger,
            ease: "none",
          });
          break;
      }
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [text, variant, delay, duration, stagger, ease, style.color]);

  const words = text.split(" ");

  return (
    <h1
      ref={containerRef}
      className={`split-text ${className}`}
      style={{
        margin: 0,
        opacity: 0, // Se anima a 1
        ...style,
      }}
    >
      {variant === "word-reveal" || variant === "color-fill" || variant === "typewriter" ? (
        words.map((word, i) => (
          <span
            key={i}
            className="split-word"
            style={{
              display: "inline-block",
              overflow: variant === "word-reveal" ? "hidden" : "visible",
              verticalAlign: "top",
              margin: "0 0.15em",
            }}
          >
            {word}
          </span>
        ))
      ) : (
        text
      )}
    </h1>
  );
}
