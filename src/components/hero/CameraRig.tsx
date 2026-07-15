"use client";

/**
 * CameraRig.tsx
 *
 * Scroll-driven camera dolly + mouse parallax sobre el contenido overlay.
 * Cuando el usuario hace scroll, el overlay se mueve en Y (parallax) y
 * la cámara virtual (en shader) intensifica el efecto.
 *
 * Implementación: useEffect + GSAP, no usa WebGL (el shader ya está en CosmicBackground).
 * Esto evita tener 2 canvas WebGL simultáneos (mejor performance).
 */

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function CameraRig({
  children,
}: {
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / heroHeight, 1);

      if (overlayRef.current) {
        // Parallax: el overlay se mueve más lento que el scroll
        gsap.to(overlayRef.current, {
          y: -progress * 150,
          opacity: 1 - progress * 1.5,
          scale: 1 - progress * 0.1,
          duration: 0.3,
          ease: "none",
          overwrite: true,
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
      {children}
      <div
        ref={overlayRef}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        {/* Children rendered here */}
      </div>
    </section>
  );
}
