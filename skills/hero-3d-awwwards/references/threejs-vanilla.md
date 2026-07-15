# Three.js Vanilla Stack Guide

> Stack para máximo control del render loop, proyectos sin React, o cuando
> necesitas acceso directo a WebGLRenderer sin overhead de reconciler.

## Tabla de contenidos
1. Setup completo
2. Estructura de archivos
3. Render loop manual
4. Gestión de escena y dispose
5. Shaders sin React
6. GSAP integration sin useFrame
7. Performance patterns específicos

---

## 1. Setup completo

Ejecuta `bash scripts/setup-threejs.sh`. Instala:

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "gsap": "^3.12.5",
    "lenis": "^1.1.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@types/three": "^0.160.0"
  }
}
```

**Por qué Vite**: build rápido, HMR instantáneo, tree-shaking efectivo para
Three.js. No uses Webpack para vanilla 3D.

---

## 2. Estructura de archivos recomendada

```
src/
├── main.ts                    # Entry point
├── scenes/
│   └── HeroScene.ts           # Clase principal de la escena
├── objects/
│   ├── HeroModel.ts           # GLB wrapper
│   ├── ShaderPlane.ts         # Plane con shader
│   └── ParticleField.ts       # Sistema de partículas
├── shaders/
│   ├── noise.frag
│   ├── distortion.vert
│   └── hero.vert / hero.frag
├── utils/
│   ├── GLTFLoader.ts          # Singleton loader
│   ├── mouseTracker.ts        # Mouse normalizado
│   └── scrollProgress.ts      # Scroll 0..1
└── styles/
    └── main.css
```

---

## 3. Render loop manual

```typescript
// scenes/HeroScene.ts
import * as THREE from 'three'

export class HeroScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private rafId: number | null = null

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
    this.setupObjects()
    this.setupResize()
    this.start()
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    const directional = new THREE.DirectionalLight(0xffffff, 1.5)
    directional.position.set(5, 8, 5)
    this.scene.add(ambient, directional)
  }

  private setupObjects() {
    // Cargar modelos, shaders, etc. aquí
  }

  private animate = () => {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    // Update objects
    this.scene.children.forEach((obj) => {
      if (obj.userData.update) {
        obj.userData.update(delta, elapsed)
      }
    })

    this.renderer.render(this.scene, this.camera)
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

  dispose() {
    this.stop()
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material?.dispose()
        }
      }
    })
    this.renderer.dispose()
  }
}
```

---

## 4. Gestión de escena y dispose

**CRÍTICO**: Three.js NO garbage-collectea geometrías ni materiales. Si no haces
dispose, hay memory leaks en SPAs.

### Dispose completo al desmontar

```typescript
function disposeObject(obj: THREE.Object3D) {
  obj.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry?.dispose()
      const mat = node.material
      if (Array.isArray(mat)) {
        mat.forEach((m) => disposeMaterial(m))
      } else if (mat) {
        disposeMaterial(mat)
      }
    }
  })
}

function disposeMaterial(mat: THREE.Material) {
  Object.keys(mat).forEach((key) => {
    const value = (mat as any)[key]
    if (value && typeof value === 'object' && 'isTexture' in value) {
      value.dispose()
    }
  })
  mat.dispose()
}
```

### Cargar GLB con Draco

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const draco = new DRACOLoader()
draco.setDecoderPath('https://www.gstatic.com/draco/version1/decoders/')

const loader = new GLTFLoader()
loader.setDRACOLoader(draco)

export function loadGLB(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject)
  })
}
```

---

## 5. Shaders sin React

```typescript
import * as THREE from 'three'

const vertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;

  // Simplex noise (incluido desde assets/glsl/noise.frag)
  ${noiseGLSL}

  void main() {
    vUv = uv;
    vec3 pos = position;
    float noise = snoise(vec3(pos.x * 2.0, pos.y * 2.0, uTime * 0.3)) * 0.3;
    pos.z += noise;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec3 color = vec3(vUv, 0.5 + 0.5 * sin(uTime));
    gl_FragColor = vec4(color, 1.0);
  }
`

const geometry = new THREE.PlaneGeometry(8, 5, 256, 256)
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  },
})

const mesh = new THREE.Mesh(geometry, material)
mesh.userData.update = (delta: number, elapsed: number) => {
  material.uniforms.uTime.value = elapsed
}
```

---

## 6. GSAP integration sin useFrame

En vanilla, conecta GSAP ScrollTrigger directamente a uniforms o positions:

```typescript
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const cameraTargetZ = { value: 5 }

ScrollTrigger.create({
  trigger: '#hero',
  start: 'top top',
  end: 'bottom top',
  scrub: 1,
  onUpdate: (self) => {
    cameraTargetZ.value = 5 - self.progress * 3
  },
})

// En el render loop:
function animate() {
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, cameraTargetZ.value, 0.1)
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

---

## 7. Performance patterns específicos

### Pause render offscreen

```typescript
let isVisible = true
const observer = new IntersectionObserver(([entry]) => {
  isVisible = entry.isIntersecting
})
observer.observe(canvas)

function animate() {
  if (isVisible) {
    renderer.render(scene, camera)
  }
  requestAnimationFrame(animate)
}
```

### Pixel ratio clamp dinámico

```typescript
function setOptimalPixelRatio() {
  const dpr = window.devicePixelRatio
  // Mobile: max 1.5, desktop: max 2
  const maxDpr = window.innerWidth < 768 ? 1.5 : 2
  renderer.setPixelRatio(Math.min(dpr, maxDpr))
}
```

### Frame rate adaptativo

```typescript
let lastTime = performance.now()
let frameTime = 16

function animate() {
  const now = performance.now()
  frameTime = frameTime * 0.95 + (now - lastTime) * 0.05  // EMA
  lastTime = now

  // Si drop a <45fps, baja dpr
  if (frameTime > 22 && renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(renderer.getPixelRatio() - 0.25)
  }

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

### WebGL detection + fallback

```typescript
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

if (!isWebGLAvailable()) {
  // Renderizar versión CSS fallback
  document.getElementById('hero-fallback').style.display = 'block'
}
```

---

## Cuándo usar vanilla vs R3F

| Criterio | Vanilla | R3F |
|---|---|---|
| Proyecto sin React | ✅ | ❌ |
| Bundle <100KB | ✅ | ❌ (React overhead) |
| Reutilización de componentes | ❌ | ✅ |
| Hot reload deseado | ⚠️ (Vite) | ✅ |
| Shaders muy custom | ✅ | ✅ |
| Equipos grandes | ⚠️ | ✅ (TS + componentes) |

Si tienes dudas, **usa R3F**. Solo elige vanilla si tienes una razón técnica
clara.
