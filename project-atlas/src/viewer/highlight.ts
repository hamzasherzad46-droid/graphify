import * as THREE from 'three'
import { meshMatchesAny } from '../lib/meshMatch'

export const ACCENT = new THREE.Color('#e5484d')

export interface Palette {
  bone: string
  boneOpacity: number
}

// Ivory bone, nearly opaque so it reads as real bone; the target also shows
// through anything in front of it (x-ray overlay), so hidden bones stay findable.
export const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: { bone: '#e9e1cf', boneOpacity: 0.9 },
  light: { bone: '#ddd3bf', boneOpacity: 0.94 },
}

/** Fresnel rim shell: a slightly inflated copy of the mesh that glows at its edges. */
function makeGlowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: ACCENT.clone() },
      intensity: { value: 0 },
      thickness: { value: 0.0012 },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      varying float vRim;
      void main() {
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position + normal * thickness, 1.0);
        vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float intensity;
      varying float vRim;
      void main() {
        gl_FragColor = vec4(color, pow(vRim, 3.0) * intensity);
      }`,
    transparent: true,
    depthWrite: false,
  })
}

/**
 * Owns the materials of one model instance. Dims every mesh and colours the
 * meshes matching `keys` red with an emissive glow. `progress` (0..1) fades
 * the highlight in so camera moves and colour changes feel like one motion.
 */
export class Highlighter {
  readonly base: THREE.MeshStandardMaterial
  readonly target: THREE.MeshStandardMaterial
  readonly glow: THREE.ShaderMaterial
  /** Drawn only where another bone is in front (GreaterDepth), so hidden parts of the target show through. */
  readonly xray: THREE.MeshBasicMaterial
  private meshes: THREE.Mesh[] = []
  private glows: THREE.Mesh[] = []

  constructor(root: THREE.Object3D, palette: Palette, private withGlow = true) {
    this.base = new THREE.MeshStandardMaterial({
      color: palette.bone,
      roughness: 0.62,
      metalness: 0,
      transparent: true,
      opacity: palette.boneOpacity,
    })
    this.target = new THREE.MeshStandardMaterial({
      color: ACCENT,
      emissive: ACCENT,
      emissiveIntensity: 0,
      roughness: 0.5,
      metalness: 0,
    })
    this.glow = makeGlowMaterial()
    this.xray = new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthFunc: THREE.GreaterDepth,
    })
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) this.meshes.push(o as THREE.Mesh)
    })
  }

  setPalette(palette: Palette) {
    this.base.color.set(palette.bone)
    this.base.opacity = palette.boneOpacity
  }

  /** Returns the matched meshes. */
  apply(keys: string[]): THREE.Mesh[] {
    for (const g of this.glows) g.removeFromParent()
    this.glows = []
    const matched: THREE.Mesh[] = []
    for (const m of this.meshes) {
      const hit = keys.length > 0 && meshMatchesAny(m.name, keys)
      m.material = hit ? this.target : this.base
      m.renderOrder = hit ? 0 : 1
      if (hit) {
        matched.push(m)
        const overlays = this.withGlow ? [this.glow, this.xray] : [this.xray]
        for (const mat of overlays) {
          const g = new THREE.Mesh(m.geometry, mat)
          g.raycast = () => {}
          g.renderOrder = mat === this.xray ? 3 : 2
          m.add(g)
          this.glows.push(g)
        }
      }
    }
    return matched
  }

  setProgress(t: number) {
    this.target.emissiveIntensity = 0.22 * t
    this.target.color.copy(ACCENT).lerp(this.base.color, 1 - t)
    this.glow.uniforms.intensity.value = 0.7 * t
    this.xray.opacity = 0.35 * t
  }

  /** Bounding box of the matched meshes, in root's parent space. */
  static boundsOf(meshes: THREE.Mesh[]): THREE.Box3 {
    const box = new THREE.Box3()
    for (const m of meshes) box.expandByObject(m)
    return box
  }

  dispose() {
    for (const g of this.glows) g.removeFromParent()
    this.base.dispose()
    this.target.dispose()
    this.glow.dispose()
    this.xray.dispose()
  }
}
