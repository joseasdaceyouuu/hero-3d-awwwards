'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
// Simple in-view hook (replaces react-intersection-observer dep)
import { useInView } from '@/lib/hooks/useInView'

export function HeroText() {
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const [ref, inView] = useInView({ threshold: 0.1 })
  
  useEffect(() => {
    if (inView && headlineRef.current) {
      // Cinematic timing with power3.out (C11)
      gsap.fromTo(
        headlineRef.current,
        { 
          y: 50, 
          opacity: 0,
          filter: 'blur(20px)'
        },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.5,
          ease: 'power3.out',
          delay: 0.3
        }
      )
    }
  }, [inView])
  
  return (
    <div 
      ref={ref}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <h1 
        ref={headlineRef}
        className="text-5xl md:text-7xl font-bold text-center"
        style={{ 
          color: '#ffffff',
          textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
          opacity: 0.95, // WCAG AA contrast (C15)
          focusVisible: 'outline: 3px solid #00d4ff; outline-offset: 2px;' // C18
        }}
      >
        Chrome Surface
      </h1>
    </div>
  )
}