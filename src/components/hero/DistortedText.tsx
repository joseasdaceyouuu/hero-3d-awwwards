"use client";

/**
 * DistortedText.tsx
 *
 * Tipografía con shader custom que distorsiona UVs según noise + mouse.
 * No usa WebGL para el texto mismo (más liviano): usa CSS + SVG filters.
 *
 * Técnica:
 *   - SVG <feTurbulence> + <feDisplacementMap> para distorsión procedural
 *   - GSAP para entrada con stagger (Arquetipo 5 del skill)
 *   - Mouse move ajusta la escala de la turbulencia (efecto "el texto reacciona")
 *   - Tiempo anima el baseFrequency para "flujo" constante
 */

import { useRef, useEffect, useState, useId } from "react";
import gsap from "gsap";

interface DistortedTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  accentColor?: string;
}

export function DistortedText({
  text,
  className = "",
  delay = 0.4,
  stagger = 0.12,
  duration = 1.4,
  accentColor = "#00d4ff",
}: DistortedTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const filterRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const filterId = useId().replace(/:/g, "");

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

  // Mouse tracking para ajustar la distorsión
  useEffect(() => {
    let raf: number;
    const targetMouse = { x: 0.5, y: 0.5 };
    const currentMouse = { x: 0.5, y: 0.5 };

    const onMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = e.clientY / window.innerHeight;
    };

    const animate = () => {
      currentMouse.x += (targetMouse.x - currentMouse.x) * 0.05;
      currentMouse.y += (targetMouse.y - currentMouse.y) * 0.05;

      // Ajustar baseFrequency de la turbulencia según mouse
      if (filterRef.current) {
        const fx = 0.015 + (currentMouse.x - 0.5) * 0.02;
        const fy = 0.015 + (currentMouse.y - 0.5) * 0.02;
        filterRef.current.setAttribute("baseFrequency", `${fx} ${fy}`);
      }
      // Ajustar escala del displacement
      if (displacementRef.current) {
        const scale = 15 + Math.abs(currentMouse.x - 0.5) * 30;
        displacementRef.current.setAttribute("scale", String(scale));
      }

      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove);
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* SVG filter definido globalmente */}
      <svg
        aria-hidden
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter
            id={filterId}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={filterRef}
              type="fractalNoise"
              baseFrequency="0.015 0.015"
              numOctaves={3}
              seed={2}
              result="noise"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="noise"
              scale={15}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <h1
        ref={containerRef}
        className={`distorted-text ${className}`}
        style={{
          fontSize: "clamp(3rem, 13vw, 11rem)",
          fontWeight: 900,
          letterSpacing: "-0.05em",
          lineHeight: 0.9,
          margin: 0,
          filter: `url(#${filterId})`,
          color: "#ffffff",
          textShadow: `0 0 40px ${accentColor}40, 0 0 80px ${accentColor}20`,
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
              margin: "0 0.1em",
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
    </>
  );
}
