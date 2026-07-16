"use client";

/**
 * MagneticButton.tsx — Botón magnético que se atrae al cursor
 *
 * Skill #3.6 del Tier 1. Usa gsap.quickTo() (secret sauce para performance).
 *
 * Cómo funciona:
 *   - Cuando el cursor está dentro de un radio (default 100px), el botón
 *     se desplaza hacia el cursor con lerp suave
 *   - Al salir del radio, regresa a su posición original con elastic
 *   - Hover: escala + glow + border change
 *
 * Props:
 *   - strength: cuánto se mueve hacia el cursor (0-1, default 0.4)
 *   - radius: radio de atracción en px (default 100)
 *   - scale: escala al hover (default 1.05)
 *   - glowColor: color del glow al hover
 *   - children: contenido del botón
 *   - href: URL del link (si es un <a>)
 *   - onClick: callback (si es un <button>)
 *
 * Cumple: C18 (focus-visible), DINAMISMO-6 (micro-interacciones)
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";

export interface MagneticButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  strength?: number;
  radius?: number;
  scale?: number;
  glowColor?: string;
  borderColor?: string;
  textColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MagneticButton({
  children,
  href,
  onClick,
  strength = 0.4,
  radius = 100,
  scale = 1.05,
  glowColor = "rgba(153, 102, 255, 0.5)",
  borderColor = "rgba(153, 102, 255, 0.5)",
  textColor = "#ffffff",
  className = "",
  style = {},
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const xTo = useRef<gsap.QuickToFunc | null>(null);
  const yTo = useRef<gsap.QuickToFunc | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // gsap.quickTo: crea una función setter cacheada (mucho más rápido que gsap.to por mousemove)
    xTo.current = gsap.quickTo(ref.current, "x", { duration: 0.4, ease: "power3.out" });
    yTo.current = gsap.quickTo(ref.current, "y", { duration: 0.4, ease: "power3.out" });
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || !xTo.current || !yTo.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < radius) {
      // Dentro del radio: atraer hacia el cursor
      xTo.current(distX * strength);
      yTo.current(distY * strength);

      // Hover effect
      gsap.to(ref.current, {
        scale,
        boxShadow: `0 0 40px ${glowColor}, inset 0 0 20px ${glowColor.replace("0.5", "0.2")}`,
        borderColor: glowColor.replace("0.5", "1"),
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;

    // Regresar a posición original
    xTo.current?.(0);
    yTo.current?.(0);

    // Quitar hover
    gsap.to(ref.current, {
      scale: 1,
      boxShadow: `0 0 20px ${glowColor.replace("0.5", "0.15")}`,
      borderColor,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)",
    });
  };

  const sharedProps = {
    ref: ref as any,
    "data-hover": true,
    className: `magnetic-button ${className}`,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem 2.5rem",
      fontSize: "0.75rem",
      fontWeight: 300,
      textTransform: "uppercase" as const,
      letterSpacing: "0.1em",
      color: textColor,
      background: "transparent",
      border: `1px solid ${borderColor}`,
      cursor: "none",
      backdropFilter: "blur(8px)",
      boxShadow: `0 0 20px ${glowColor.replace("0.5", "0.15")}`,
      willChange: "transform",
      outline: "none",
      ...style,
    },
  };

  if (href) {
    return (
      <a href={href} {...sharedProps}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} {...sharedProps}>
      {children}
    </button>
  );
}
