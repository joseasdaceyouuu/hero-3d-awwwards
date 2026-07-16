"use client";

/**
 * LenisProvider.tsx — smooth scroll global (referencias/r3f-gsap.md §6)
 * Lenis con smoothWheel=true, smoothTouch=false (touch usa native scroll).
 *
 * IMPORTANTE: sincroniza Lenis con GSAP ScrollTrigger vía:
 *   - lenis.on('scroll', ScrollTrigger.update)  → ST lee la posición real de Lenis
 *   - gsap.ticker.add(t => lenis.raf(t*1000))   → un solo loop de animación
 *   - gsap.ticker.lagSmoothing(0)               → sin saltos cuando hay jank
 * Sin esto, ScrollTrigger se confunde y los triggers se disparan en posiciones
 * equivocadas (el hero "se sale" antes de tiempo).
 */

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });

    // Sincroniza Lenis con ScrollTrigger — sin esto, los ScrollTrigger usan
    // window.scrollY nativo (que se queda atrás del smooth scroll de Lenis)
    // y disparan los onUpdate con progreso equivocado.
    lenis.on("scroll", ScrollTrigger.update);

    // Un solo loop de animación. gsap.ticker usa requestAnimationFrame por
    // debajo, así que Lenis y GSAP comparten el mismo frame.
    const tickerFn = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    // Recalcula después de que todo esté montado
    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      window.clearTimeout(refreshId);
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
