"use client";

/**
 * Preloader.tsx — Pantalla de carga que transiciona al hero
 *
 * Skill #2.2 del Tier 2. Basado en research/gsap-scroll-choreography.md §4.
 *
 * Características:
 *   - Barra de progreso o porcentaje
 *   - Transición suave al hero (no un spinner feo)
 *   - Tipografía que se materializa (coherente con el hero)
 *   - GSAP timeline para entrada/salida
 *
 * Variantes:
 *   - "progress": barra horizontal que crece
 *   - "percentage": número 0-100%
 *   - "morph": texto que morfea al título del hero
 *
 * Props:
 *   - variant: tipo de preloader
 *   - duration: duración mínima (ms, default 2000)
 *   - brandText: texto a mostrar (default "CARGANDO")
 *   - onComplete: callback cuando termina
 *   - accentColor: color de acento
 */

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";

export interface PreloaderProps {
  variant?: "progress" | "percentage" | "morph";
  duration?: number;
  brandText?: string;
  heroTitle?: string; // para variant "morph"
  accentColor?: string;
  onComplete?: () => void;
}

export function Preloader({
  variant = "percentage",
  duration = 2000,
  brandText = "CARGANDO",
  heroTitle,
  accentColor = "#9966ff",
  onComplete,
}: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => {
        // Fade out del preloader
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.8,
          ease: "power2.inOut",
          onComplete: () => {
            setDone(true);
            onComplete?.();
          },
        });
      },
    });

    // Animar progreso de 0 a 100
    const counter = { val: 0 };
    tl.to(counter, {
      val: 100,
      duration: duration / 1000,
      ease: "power2.inOut",
      onUpdate: () => {
        setProgress(Math.round(counter.val));
        if (barRef.current) {
          barRef.current.style.width = `${counter.val}%`;
        }
      },
    });

    // Si es morph, animar texto al título del hero
    if (variant === "morph" && heroTitle && textRef.current) {
      tl.to(textRef.current, {
        scale: 2,
        y: -50,
        filter: "blur(20px)",
        opacity: 0,
        duration: 0.6,
        ease: "power3.in",
      }, "+=0.2");
    }

    return () => { tl.kill(); };
  }, [duration, variant, heroTitle, onComplete]);

  if (done) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0f",
        pointerEvents: "none",
      }}
    >
      {/* Texto principal */}
      <div
        ref={textRef}
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize: variant === "morph" ? "clamp(1.5rem, 4vw, 3rem)" : "clamp(0.8rem, 2vw, 1.2rem)",
          fontWeight: 300,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#ffffff",
          marginBottom: "2rem",
          opacity: 0.9,
        }}
      >
        {variant === "morph" && heroTitle ? heroTitle : brandText}
      </div>

      {/* Barra de progreso */}
      {variant === "progress" && (
        <div
          style={{
            width: "min(300px, 60vw)",
            height: "1px",
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            ref={barRef}
            style={{
              width: "0%",
              height: "100%",
              background: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
              transition: "width 0.1s linear",
            }}
          />
        </div>
      )}

      {/* Porcentaje */}
      {variant === "percentage" && (
        <div
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "clamp(2rem, 6vw, 4rem)",
            fontWeight: 200,
            color: accentColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(progress).padStart(3, "0")}
        </div>
      )}

      {/* Morph: sin indicador de progreso visual */}
      {variant === "morph" && (
        <div
          style={{
            width: "min(300px, 60vw)",
            height: "1px",
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            ref={barRef}
            style={{
              width: "0%",
              height: "100%",
              background: accentColor,
              transition: "width 0.1s linear",
            }}
          />
        </div>
      )}
    </div>
  );
}
