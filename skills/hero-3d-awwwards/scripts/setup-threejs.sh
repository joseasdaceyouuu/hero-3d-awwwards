#!/usr/bin/env bash
# setup-threejs.sh
# Inicializa un proyecto Vite + Three.js vanilla + GSAP + Lenis.
# Para heroes sin React, máximo control del render loop.

set -e

PROJECT_NAME="${1:-.}"

echo "🚀 Setting up Three.js vanilla project: $PROJECT_NAME"

if [ "$PROJECT_NAME" != "." ]; then
  npm create vite@latest "$PROJECT_NAME" -- --template vanilla-ts
  cd "$PROJECT_NAME"
else
  if [ ! -f "package.json" ]; then
    echo "❌ No package.json found. Run from project root or pass a name."
    exit 1
  fi
fi

# Install deps
echo "📦 Installing Three.js dependencies..."
npm install \
  three@0.160.0 \
  gsap@3.12.5 \
  lenis@1.1.0

npm install -D \
  @types/three@0.160.0 \
  vite@5.0.0 \
  typescript@5.3.0

# Folder structure
mkdir -p \
  src/scenes \
  src/objects \
  src/shaders \
  src/utils \
  src/styles \
  public/models \
  public/textures

# Copy shaders if available
SKILL_PATH="${SKILL_PATH:-$HOME/.skills/hero-3d-awwwards}"
if [ -d "$SKILL_PATH/assets/glsl" ]; then
  cp "$SKILL_PATH/assets/glsl/"*.frag src/shaders/ 2>/dev/null || true
  cp "$SKILL_PATH/assets/glsl/"*.vert src/shaders/ 2>/dev/null || true
fi

# Create main scene class
cat > src/scenes/HeroScene.ts << 'EOF'
import * as THREE from 'three'

export class HeroScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private rafId: number | null = null
  private isVisible = true

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(0, 0, 5)

    this.setupLights()
    this.setupResize()
    this.setupVisibility()
    this.start()
  }

  private setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(5, 8, 5)
    this.scene.add(dir)
  }

  // TODO: Add your objects, models, shaders here

  private animate = () => {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    this.scene.children.forEach((obj) => {
      if (obj.userData.update) obj.userData.update(delta, elapsed)
    })

    if (this.isVisible) {
      this.renderer.render(this.scene, this.camera)
    }
    this.rafId = requestAnimationFrame(this.animate)
  }

  start() {
    if (this.rafId === null) this.animate()
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  private setupVisibility() {
    const observer = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting
    })
    observer.observe(this.renderer.domElement)
  }

  dispose() {
    this.stop()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      }
    })
    this.renderer.dispose()
  }
}
EOF

# Create main.ts
cat > src/main.ts << 'EOF'
import './styles/main.css'
import { HeroScene } from './scenes/HeroScene'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Lenis smooth scroll
const lenis = new Lenis({ duration: 1.2, smoothWheel: true, smoothTouch: false })
function raf(time: number) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// Init hero scene
const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas')
if (canvas) {
  const scene = new HeroScene(canvas)

  // Cleanup on page hide
  window.addEventListener('beforeunload', () => scene.dispose())
}
EOF

# Create index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hero 3D</title>
  </head>
  <body>
    <section id="hero" style="height: 100vh; position: relative;">
      <canvas id="hero-canvas" style="position: absolute; inset: 0;"></canvas>
      <div style="position: relative; z-index: 1; height: 100%; display: flex; align-items: center; justify-content: center;">
        <h1>Hero Section</h1>
      </div>
    </section>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
EOF

# CSS
cat > src/styles/main.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  background: #0a0a0f;
  color: #ffffff;
  overflow-x: hidden;
}

h1 {
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 900;
  letter-spacing: -0.04em;
}
EOF

echo ""
echo "✅ Three.js vanilla project setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_NAME"
echo "  2. npm run dev"
echo "  3. Open http://localhost:5173"
echo ""
echo "Edit src/scenes/HeroScene.ts to add your 3D objects."
