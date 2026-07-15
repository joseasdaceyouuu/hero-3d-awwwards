#!/usr/bin/env bash
# setup-css3d.sh
# Inicializa un proyecto Vite + GSAP + ScrollTrigger + Lenis.
# Para heroes 2.5D con CSS 3D transforms (sin WebGL). Más liviano.

set -e

PROJECT_NAME="${1:-.}"

echo "🚀 Setting up CSS 3D + GSAP project: $PROJECT_NAME"

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
echo "📦 Installing GSAP dependencies..."
npm install \
  gsap@3.12.5 \
  lenis@1.1.0

npm install -D \
  vite@5.0.0 \
  typescript@5.3.0

# Folder structure
mkdir -p \
  src/scenes \
  src/utils \
  src/styles \
  public/layers

# Create main.ts
cat > src/main.ts << 'EOF'
import './styles/main.css'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Lenis smooth scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
})

lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)

// Mouse parallax
const mouse = { x: 0, y: 0 }
const mouseCurrent = { x: 0, y: 0 }

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
})

// Update parallax layers
const layers = document.querySelectorAll<HTMLElement>('.parallax-layer')
function tick() {
  mouseCurrent.x += (mouse.x - mouseCurrent.x) * 0.08
  mouseCurrent.y += (mouse.y - mouseCurrent.y) * 0.08

  layers.forEach((layer) => {
    const depth = parseFloat(layer.dataset.depth || '0')
    const z = parseFloat(layer.dataset.z || '0')
    const x = mouseCurrent.x * depth * 25
    const y = mouseCurrent.y * depth * 25
    layer.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`
  })

  requestAnimationFrame(tick)
}
tick()

// ScrollTrigger parallax
gsap.utils.toArray<HTMLElement>('.parallax-layer').forEach((layer) => {
  const depth = parseFloat(layer.dataset.depth || '0')
  gsap.to(layer, {
    yPercent: depth * 30,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
    },
  })
})

// Headline stagger entry
const headline = document.querySelector<HTMLElement>('.hero-headline')
if (headline) {
  const words = headline.textContent?.split(' ') || []
  headline.innerHTML = words
    .map((w) => `<span class="word"><span class="word-inner">${w}</span></span>`)
    .join(' ')

  gsap.from('.hero-headline .word-inner', {
    yPercent: 120,
    opacity: 0,
    duration: 1.2,
    ease: 'power4.out',
    stagger: 0.08,
    delay: 0.3,
  })
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
    <section id="hero" class="hero-scene">
      <div class="parallax-layers">
        <!-- Add your layer images here. data-depth = -1 (far) to 1 (close) -->
        <!-- <div class="parallax-layer" data-depth="-1" data-z="-400" style="background-image: url('/layers/bg.webp')"></div> -->
        <!-- <div class="parallax-layer" data-depth="0" data-z="0" style="background-image: url('/layers/subject.webp')"></div> -->
        <!-- <div class="parallax-layer" data-depth="0.8" data-z="150" style="background-image: url('/layers/fg.webp')"></div> -->
      </div>

      <div class="hero-overlay">
        <h1 class="hero-headline">Brand Name</h1>
        <p class="hero-tagline">A tagline that captures attention</p>
      </div>
    </section>

    <section style="height: 100vh; display: flex; align-items: center; justify-content: center;">
      <p>Next section content</p>
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

.hero-scene {
  position: relative;
  height: 100vh;
  perspective: 1000px;
  perspective-origin: 50% 50%;
  overflow: hidden;
}

.parallax-layers {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.parallax-layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  will-change: transform;
}

.hero-overlay {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.hero-headline {
  font-size: clamp(3rem, 12vw, 10rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.95;
}

.hero-headline .word {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
  margin: 0 0.15em;
}

.hero-headline .word-inner {
  display: inline-block;
  will-change: transform;
}

.hero-tagline {
  font-size: clamp(1rem, 2vw, 1.5rem);
  opacity: 0.7;
  margin-top: 1rem;
  font-weight: 300;
}
EOF

echo ""
echo "✅ CSS 3D + GSAP project setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_NAME"
echo "  2. Add your layer PNG/WebP images to public/layers/"
echo "  3. Uncomment the parallax-layer divs in index.html with your image paths"
echo "  4. npm run dev"
echo "  5. Open http://localhost:5173"
