'use client'

/**
 * ChromeHero.tsx — Container for the AI-generated chrome hero.
 *
 * Generado por Creator agent (GLM-5.2), adaptado para funcionar con
 * la infraestructura existente (LenisProvider en layout.tsx, ChromeShader
 * con Canvas propio + IntersectionObserver).
 *
 * Cambios vs output original del Creator:
 *   - Eliminado Lenis duplicado (ya está en layout.tsx)
 *   - Eliminado useIntersect de drei (ChromeShader ya tiene IntersectionObserver)
 *   - Simplificado a: ChromeShader (background) + HeroText (overlay)
 */

import { useEffect, useState } from 'react'
import { ChromeShader } from './ChromeShader'
import { HeroText } from './HeroText'

export function ChromeHero() {
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  useEffect(() => {
    setIsReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  // C7: prefers-reduced-motion fallback
  if (isReducedMotion) {
    return (
      <div
        className="relative h-screen w-full overflow-hidden flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, #1a1a2e 0%, #0a0a0f 50%, #2a2a3e 100%)',
        }}
      >
        <h1
          className="text-5xl md:text-7xl font-bold text-center"
          style={{ color: '#c0c0c0', letterSpacing: '-0.02em' }}
        >
          CHROME SURFACE
        </h1>
      </div>
    )
  }

  return (
    <section
      className="relative h-screen w-full overflow-hidden"
      aria-label="Chrome Surface Hero"
      style={{ background: '#0a0a0f' }}
    >
      {/* Chrome shader background (has own Canvas + IntersectionObserver) */}
      <ChromeShader />

      {/* Text overlay */}
      <HeroText />
    </section>
  )
}
