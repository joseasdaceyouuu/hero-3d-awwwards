#!/usr/bin/env bash
# setup-r3f.sh
# Inicializa un proyecto Next.js 14 con R3F + drei + GSAP + postprocessing + lenis.
# Versiones pinneadas para compatibilidad probada en producción 2024.
#
# USO:
#   bash setup-r3f.sh [project-name]
#
# Si no se pasa project-name, inicializa en el directorio actual.

set -e

PROJECT_NAME="${1:-.}"

echo "🚀 Setting up R3F + GSAP project: $PROJECT_NAME"

# 1. Create Next.js app
if [ "$PROJECT_NAME" != "." ]; then
  npx create-next-app@14.2.0 "$PROJECT_NAME" \
    --typescript \
    --tailwind \
    --eslint \
    --app \
    --src-dir \
    --import-alias "@/*" \
    --use-npm
  cd "$PROJECT_NAME"
else
  if [ ! -f "package.json" ]; then
    echo "❌ No package.json found in current directory. Run from project root or pass a name."
    exit 1
  fi
fi

# 2. Install R3F stack with pinned versions
echo "📦 Installing R3F dependencies..."
npm install \
  three@0.160.0 \
  @react-three/fiber@8.15.0 \
  @react-three/drei@9.92.0 \
  @react-three/postprocessing@2.16.0 \
  gsap@3.12.5 \
  @gsap/react@2.1.0 \
  lenis@1.1.0 \
  troika-three-text@0.49.0

# 3. Dev dependencies
npm install -D \
  @types/three@0.160.0

# 4. Create folder structure
echo "📁 Creating folder structure..."
mkdir -p \
  src/components/hero \
  src/components/providers \
  src/lib/shaders \
  src/lib/hooks \
  public/models \
  public/layers

# 5. Copy shaders if skill is available
SKILL_PATH="${SKILL_PATH:-$HOME/.skills/hero-3d-awwwards}"
if [ -d "$SKILL_PATH/assets/glsl" ]; then
  echo "📋 Copying shaders from skill..."
  cp "$SKILL_PATH/assets/glsl/"*.frag src/lib/shaders/ 2>/dev/null || true
  cp "$SKILL_PATH/assets/glsl/"*.vert src/lib/shaders/ 2>/dev/null || true
fi

# 6. Create Lenis provider
cat > src/components/providers/LenisProvider.tsx << 'EOF'
'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    })

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
EOF

# 7. Create hero page template
cat > src/app/page.tsx << 'EOF'
'use client'

import { Suspense } from 'react'

export default function Home() {
  return (
    <main>
      <section id="hero" className="relative h-screen">
        {/* TODO: Add Hero3DScene, Parallax2D, ShaderPlane, etc. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-6xl font-bold">Hero Section</h1>
        </div>
      </section>
    </main>
  )
}
EOF

# 8. Update layout.tsx with LenisProvider
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LenisProvider } from '@/components/providers/LenisProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hero 3D',
  description: 'Awwwards-level hero section',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  )
}
EOF

# 9. Add useful scripts to package.json
echo "📝 Updating package.json scripts..."
npx json -I -f package.json -e '
  this.scripts.dev = "next dev",
  this.scripts.build = "next build",
  this.scripts.start = "next start",
  this.scripts.lint = "next lint",
  this.scripts.analyze = "ANALYZE=true next build"
'

echo ""
echo "✅ R3F project setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_NAME"
echo "  2. npm run dev"
echo "  3. Open http://localhost:3000"
echo ""
echo "  Copy components from skill to src/components/hero/:"
echo "  - Hero3DScene.tsx (3D scene with GLB)"
echo "  - Parallax2D.tsx (2.5D parallax)"
echo "  - ShaderPlane.tsx (custom shaders)"
echo "  - DistortionImage.tsx (hover distortion)"
echo "  - Cinematic3DText.tsx (3D typography)"
