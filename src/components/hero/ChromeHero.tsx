'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useIntersect } from '@react-three/drei'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { ChromeShader } from './ChromeShader'
import { HeroText } from './HeroText'

export function ChromeHero() {
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  
  useEffect(() => {
    setIsReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    })

    function animate(time: number) {
      lenis.animate(time)
      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
    
    return () => lenis.destroy()
  }, [])

  if (isReducedMotion) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-900 to-black">
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-300 text-center">
            Chrome Surface
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 5], fov: 75 }}
        >
          <ChromeScene />
        </Canvas>
        <HeroText />
      </Suspense>
    </div>
  )
}

function ChromeScene() {
  const { viewport } = useThree()
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  // IntersectionObserver for performance (PERF-1)
  const entry = useIntersect(ref, {
    threshold: 0.1,
    rootMargin: '100px',
  })
  
  useEffect(() => {
    setIsVisible(entry?.isIntersecting || false)
  }, [entry])

  useFrame((state, delta) => {
    if (!isVisible) return
    // Animation logic handled in ChromeShader
  })

  return (
    <div ref={ref} className="absolute inset-0">
      <ChromeShader />
    </div>
  )
}