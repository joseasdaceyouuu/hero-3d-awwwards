'use client'

/**
 * HeroText.tsx — Text overlay for the chrome hero.
 *
 * Generado por Creator agent (GLM-5.2), adaptado para usar
 * GSAP directo (sin react-intersection-observer).
 *
 * C11: Cinematic timing (1.5s, power3.out)
 * C15: Text opacity 0.95 para WCAG AA
 * C16: Semantic HTML (h1, p, a)
 * C18: focus-visible en CTA
 */

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export function HeroText() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const elements = containerRef.current.querySelectorAll('[data-animate]')
    if (elements.length === 0) return

    // Set initial state
    gsap.set(elements, { opacity: 0, y: 30 })

    // Animate with stagger (C11: power3.out, 1.5s)
    const timeoutId = setTimeout(() => {
      gsap.to(elements, {
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: 'power3.out',
        stagger: 0.15,
      })
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center px-6 text-center"
    >
      {/* Top label */}
      <div data-animate>
        <span
          className="text-[10px] uppercase font-light"
          style={{
            color: '#c0c0c0',
            letterSpacing: '0.6em',
            opacity: 0.95,
          }}
        >
          Liquid · Reflective · 2026
        </span>
      </div>

      {/* Main headline */}
      <h1
        data-animate
        className="font-playfair mt-8"
        style={{
          fontSize: 'clamp(2.5rem, 11vw, 9rem)',
          fontWeight: 200,
          letterSpacing: '0.02em',
          lineHeight: 0.95,
          margin: 0,
          color: '#ffffff',
          textShadow:
            '0 0 30px rgba(192,192,192,0.4), 0 0 60px rgba(0,212,255,0.3)',
        }}
      >
        CHROME SURFACE
      </h1>

      {/* Tagline */}
      <p
        data-animate
        className="mt-10 max-w-xl text-base md:text-lg font-light"
        style={{
          color: 'rgba(255,255,255,0.95)',
          lineHeight: 1.8,
          letterSpacing: '0.04em',
        }}
      >
        Liquid metal rendered live. Every pixel a reflection.
        <br />
        Touch the surface. Watch it ripple.
      </p>

      {/* CTA */}
      <div data-animate className="mt-14">
        <a
          href="#explore"
          data-hover
          className="group relative inline-flex items-center justify-center px-10 py-4 text-xs font-light uppercase tracking-wider transition-all"
          style={{
            border: '1px solid rgba(192,192,192,0.4)',
            color: '#ffffff',
            background: 'transparent',
            overflow: 'hidden',
          }}
        >
          <span
            className="absolute inset-0 transform translate-y-full transition-transform duration-700 group-hover:translate-y-0"
            style={{ background: 'rgba(192,192,192,0.15)' }}
            aria-hidden
          />
          <span className="relative z-10">Explore the Surface</span>
        </a>
      </div>
    </div>
  )
}
