import * as THREE from 'three'

export interface Palette {
  bone: string
  context: string
  selected: string
  glow: string
  ghostOpacity: number
  rim: [number, number, number]
  hud: string
}

export const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: { bone: '#dcdcd4', context: '#8f9a98', selected: '#8ff0e4', glow: '#3fe0d0', ghostOpacity: 0.07, rim: [0.18, 0.55, 0.55], hud: '#3fd8c8' },
  light: { bone: '#ebe5d9', context: '#b9b4aa', selected: '#2bb5a6', glow: '#0d9488', ghostOpacity: 0.12, rim: [0.05, 0.12, 0.12], hud: '#0d9488' },
}

/**
 * A procedural matcap (no texture download): soft key light from upper left, wrap-around
 * fill, and a faint tinted rim. Matcaps cost one texture lookup per pixel, which keeps 300k
 * triangles at 60 fps on mid-range phones.
 */
function makeMatcap(rim: [number, number, number]): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const L = new THREE.Vector3(-0.45, 0.6, 0.66).normalize()
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1
      const ny = 1 - (y / (size - 1)) * 2
      const r2 = nx * nx + ny * ny
      const i = (y * size + x) * 4
      if (r2 > 1) {
        img.data[i + 3] = 255
        continue
      }
      const nz = Math.sqrt(1 - r2)
      const ndl = nx * L.x + ny * L.y + nz * L.z
      const diffuse = Math.max(0, ndl * 0.5 + 0.5) ** 1.6 // wrapped Lambert: soft terminator
      const spec = Math.max(0, ndl) ** 24 * 0.12
      const fresnel = (1 - nz) ** 3
      const base = 0.16 + 0.84 * diffuse
      // Warm-white diffuse, cool shadows.
      const rr = base * 1.0 + spec + fresnel * rim[0]
      const gg = base * 0.985 + spec + fresnel * rim[1]
      const bb = base * 0.95 + spec + 0.03 * (1 - diffuse) + fresnel * rim[2]
      img.data[i] = Math.min(255, rr * 255)
      img.data[i + 1] = Math.min(255, gg * 255)
      img.data[i + 2] = Math.min(255, bb * 255)
      img.data[i + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const glowVertex = /* glsl */ `
  uniform float uPush;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position + normal * uPush, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor, clamp(f * uIntensity, 0.0, 1.0));
  }
`

export function glowMaterial(color: string, intensity: number, power: number, xray = false) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uPower: { value: power }, uPush: { value: 0 } },
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
  })
  if (xray) {
    // Draws only where the bone is hidden behind other bones, as a faint silhouette.
    m.depthFunc = THREE.GreaterDepth
    m.polygonOffset = true
    m.polygonOffsetFactor = -2
    m.polygonOffsetUnits = -2
  }
  return m
}

export function createMaterials(theme: 'dark' | 'light') {
  const p = PALETTES[theme]
  const matcap = makeMatcap(p.rim)
  const bone = new THREE.MeshMatcapMaterial({ matcap, color: p.bone })
  const context = new THREE.MeshMatcapMaterial({ matcap, color: p.context })
  const ghost = new THREE.MeshMatcapMaterial({ matcap, color: p.bone, transparent: true, opacity: p.ghostOpacity, depthWrite: false })
  const contextGhost = new THREE.MeshMatcapMaterial({ matcap, color: p.context, transparent: true, opacity: p.ghostOpacity * 0.6, depthWrite: false })
  const selected = new THREE.MeshMatcapMaterial({ matcap, color: p.selected })
  const glow = glowMaterial(p.glow, theme === 'dark' ? 1.4 : 1.1, 2.2)
  const xray = glowMaterial(p.glow, theme === 'dark' ? 0.55 : 0.45, 1.2, true)
  return { bone, context, ghost, contextGhost, selected, glow, xray, palette: p }
}

export type Materials = ReturnType<typeof createMaterials>
