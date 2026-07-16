"use client";

/**
 * HeroPolish.tsx — Overlays de calidad que arreglan los 2 bugs sistémicos
 * detectados por el VLM en TODOS los heroes:
 *
 * 1. ZONAS NEGRAS MUERTAS en bordes → glow radial sutil + gradient overlay
 * 2. SCROLL INDICATOR invisible → indicator prominente con glow
 *
 * Uso: importar y añadir al final de cualquier hero:
 * <HeroPolish accentColor="#00ff88" />
 *
 * Props:
 *  - accentColor: string (default "#C9A05E")
 *  - showScrollIndicator: boolean (default true)
 *  - glowIntensity: number 0..1 (default 0.04)
 */

import { type CSSProperties } from "react";

interface HeroPolishProps {
  accentColor?: string;
  showScrollIndicator?: boolean;
  glowIntensity?: number;
  style?: CSSProperties;
}

export function HeroPolish({
  accentColor = "#C9A05E",
  showScrollIndicator = true,
  glowIntensity = 0.04,
  style,
}: HeroPolishProps) {
  // Convertir hex a rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <>
      <style jsx>{`
        @keyframes heroPolishScroll {
          0%, 100% { opacity: 0.4; transform: scaleY(0.5); transform-origin: top; }
          50% { opacity: 1; transform: scaleY(1); transform-origin: top; }
        }
        @keyframes heroPolishDot {
          0%, 100% { transform: translate(-50%, 0); opacity: 1; }
          50% { transform: translate(-50%, 14px); opacity: 0.3; }
        }
      `}</style>

      {/* FIX 1: Glow radial para eliminar zonas negras muertas en bordes */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          background: `radial-gradient(ellipse 90% 70% at 50% 50%, ${hexToRgba(accentColor, glowIntensity)} 0%, transparent 65%)`,
          ...style,
        }}
      />

      {/* FIX 2: Scroll indicator prominente y visible */}
      {showScrollIndicator && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: accentColor,
              fontWeight: 700,
              textShadow: `0 0 10px ${hexToRgba(accentColor, 0.5)}`,
            }}
          >
            ↓ Descubrir ↓
          </span>
          <div
            style={{
              width: "24px",
              height: "38px",
              border: `2px solid ${hexToRgba(accentColor, 0.6)}`,
              borderRadius: "12px",
              position: "relative",
              boxShadow: `0 0 15px ${hexToRgba(accentColor, 0.3)}, inset 0 0 8px ${hexToRgba(accentColor, 0.1)}`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "7px",
                left: "50%",
                width: "4px",
                height: "10px",
                background: accentColor,
                borderRadius: "2px",
                boxShadow: `0 0 8px ${accentColor}`,
                animation: "heroPolishDot 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
