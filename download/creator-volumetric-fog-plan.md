## Manifest
```json
{
  "archetype": "Shaders GLSL custom",
  "stack": "R3F + drei + GSAP",
  "asset_list": ["amber-sepia-texture.webp", "black-gradient.webp"],
  "palette": ["#0a0a0f", "#d4a574", "#8b6914"],
  "timing_seconds": 2.5,
  "cta": "Explore",
  "user_constraints": ["SEO crítico", "mobile-first", "60fps target", "prefers-reduced-motion fallback"]
}
```

## Technical Approach

**Shader Technique**: For volumetric fog + god rays in a single fragment shader, I'll use a multi-layer approach:
1. **Depth-based fog density** - Calculate distance from camera to fragment, with exponential falloff
2. **God rays via light shafts** - Simulate by:
   - Creating a "light source" position in world space
   - Calculate ray direction from light through fragment to camera
   - Use noise (Simplex/Perlin) along ray length to create volumetric scattering
   - Apply exponential falloff based on ray distance and fog density
3. **Mouse interaction** - Uniform vec2 that pushes fog density away from cursor position using radial falloff

**Component Structure**:
- `HeroVolumetricFog` - Main container with Canvas and camera setup
- `FogPlane` - Large plane covering viewport with custom shader material
- `Headline` - HTML overlay with semantic text for SEO
- `Letterbox` - CSS bars that animate on scroll

**Performance Risks**:
- Fragment shader calculations on mobile (target 60fps)
- Mouse interaction causing shader re-renders
- DPR clamp to [1,2] critical for performance
- Need to simplify shader complexity if mobile drops below 60fps

## Setup Commands
```bash
bash scripts/setup-r3f.sh
npm install @react-three/postprocessing
npm install gsap
```