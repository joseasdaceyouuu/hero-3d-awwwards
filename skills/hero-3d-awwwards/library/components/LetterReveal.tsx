"use client";

/**
 * LetterReveal.tsx — Título con entrada letra por letra.
 *
 * Patrones: 1.4f (letter reveal secuencial), 1.4j (deco-line con gradient)
 *
 * Cada letra entra con translateY(60px) rotateX(-40deg) → translateY(0) rotateX(0)
 * con cubic-bezier(0.16, 1, 0.3, 1) y stagger 0.08s.
 *
 * Variantes:
 *  - "reveal": fadeUp + rotateX (default, estilo ARAGAL)
 *  - "blur": filter blur(20px) → blur(0) + opacity
 *  - "scale": scale(0.5) → scale(1) + opacity
 *
 * Props:
 *  - text: string (required)
 *  - variant: "reveal" | "blur" | "scale" (default "reveal")
 *  - baseDelay: number segundos (default 0.8)
 *  - stagger: number segundos por letra (default 0.08)
 *  - duration: number segundos por letra (default 1.0)
 *  - className: string
 *  - as: keyof JSX.IntrinsicElements (default "h1")
 */

import { useMemo, type ElementType } from "react";

type Variant = "reveal" | "blur" | "scale";

interface LetterRevealProps {
  text: string;
  variant?: Variant;
  baseDelay?: number;
  stagger?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: ElementType;
}

const VARIANT_KEYFRAMES: Record<Variant, string> = {
  reveal: `
    @keyframes letterReveal_reveal {
      from { opacity: 0; transform: translateY(60px) rotateX(-40deg); }
      to { opacity: 1; transform: translateY(0) rotateX(0); }
    }
  `,
  blur: `
    @keyframes letterReveal_blur {
      from { opacity: 0; filter: blur(20px); transform: scale(1.5); }
      to { opacity: 1; filter: blur(0); transform: scale(1); }
    }
  `,
  scale: `
    @keyframes letterReveal_scale {
      from { opacity: 0; transform: scale(0.3) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `,
};

const VARIANT_ANIMATION: Record<Variant, string> = {
  reveal: "letterReveal_reveal",
  blur: "letterReveal_blur",
  scale: "letterReveal_scale",
};

export function LetterReveal({
  text,
  variant = "reveal",
  baseDelay = 0.8,
  stagger = 0.08,
  duration = 1.0,
  className,
  style,
  as: Tag = "h1",
}: LetterRevealProps) {
  const animName = VARIANT_ANIMATION[variant];
  const keyframes = VARIANT_KEYFRAMES[variant];

  // Espacios como no-breaking para que el stagger los respete
  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <>
      <style>{keyframes}</style>
      <Tag
        className={className}
        style={{
          ...style,
          perspective: "1000px",
          // opacity inicial 0 para evitar flash antes de la animación
          opacity: 0,
          animation: `fadeUpContainer 0.1s ${baseDelay}s forwards`,
        }}
      >
        {chars.map((char, i) => (
          <span
            key={`${char}-${i}`}
            style={{
              display: "inline-block",
              opacity: 0,
              animation: `${animName} ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${baseDelay + i * stagger}s forwards`,
              transformOrigin: "bottom center",
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            {char}
          </span>
        ))}
      </Tag>
      <style>{`
        @keyframes fadeUpContainer {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
