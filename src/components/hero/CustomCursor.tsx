"use client";

/**
 * CustomCursor.tsx — patrón Awwwards (referencias/awwwards-patterns.md §3.1)
 *
 * Cursor custom: círculo que sigue al mouse con lerp 0.15.
 * Crece al hover sobre elementos interactivos (a, button, [data-hover]).
 * Se oculta en touch devices.
 */

import { useEffect, useRef, useState } from "react";

export function CustomCursor({ cursorColor = "#ff0040" }: { cursorColor?: string }) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Solo en dispositivos con cursor fino (no touch)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };

    const onMouseMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!isVisible) setIsVisible(true);
    };

    const onMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.matches("a, button, [data-hover], input, textarea, [role='button']")
      ) {
        setIsHovering(true);
      }
    };

    const onMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.matches("a, button, [data-hover], input, textarea, [role='button']")
      ) {
        setIsHovering(false);
      }
    };

    let raf: number;
    const tick = () => {
      current.x += (target.x - current.x) * 0.15;
      current.y += (target.y - current.y) * 0.15;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseEnter);
    document.addEventListener("mouseout", onMouseLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseEnter);
      document.removeEventListener("mouseout", onMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, [isVisible]);

  if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: isHovering ? "48px" : "24px",
        height: isHovering ? "48px" : "24px",
        border: `1px solid ${cursorColor}`,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 9999,
        mixBlendMode: "difference",
        transition: "width 0.3s ease, height 0.3s ease, opacity 0.3s ease",
        opacity: isVisible ? 0.8 : 0,
        backgroundColor: isHovering ? `${cursorColor}1a` : "transparent",
      }}
    />
  );
}
