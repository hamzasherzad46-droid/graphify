import * as THREE from 'three'

/**
 * Materials for the layered model (muscles, tendons and aponeuroses, eyes, cartilage).
 *
 * Muscle: deep red-brown with a satin sheen. Fibres follow the direction baked into each vertex (`_fibre`, from the
 * model build: the gradient of a harmonic field from one end of the muscle to the other), drawn as fine striations
 * in world space so they never swim as the camera moves. Each muscle gets a slightly different tone. Baked ambient
 * occlusion (vertex colour) darkens the creases between neighbouring muscles.
 */

export type TissueKind = 'muscle' | 'tendon' | 'aponeurosis' | 'fascia' | 'sheath' | 'bursa' | 'ligament' | 'eye' | 'cartilage'

const MUSCLE = new THREE.Color('#7c2a22')
const TENDON = new THREE.Color('#cdc3b6') // pearly off-white: close enough to muscle in tone that it never reads as white paint

/** A stable small number from a name, for per-muscle colour variation. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

/** Adds fibre striations (along `_fibre`) to a physical material. */
function withFibres(m: THREE.MeshPhysicalMaterial, opts: { spacing: number; depth: number; streak: number }) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSpacing = { value: opts.spacing }
    shader.uniforms.uDepth = { value: opts.depth }
    shader.uniforms.uStreak = { value: opts.streak }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 _fibre;\nvarying vec3 vFibreW;\nvarying vec3 vPosW;\nvarying vec3 vNormW;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvPosW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvFibreW = normalize(mat3(modelMatrix) * _fibre + 1e-6);\nvNormW = normalize(mat3(modelMatrix) * objectNormal);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uSpacing; uniform float uDepth; uniform float uStreak;
varying vec3 vFibreW; varying vec3 vPosW; varying vec3 vNormW;
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  vec3 nW = normalize(vNormW);
  vec3 fib = vFibreW - nW * dot(vFibreW, nW);
  if (dot(fib, fib) > 1e-8) {
    fib = normalize(fib);
    vec3 across = normalize(cross(nW, fib));
    // Position across the fibres (with a little noise so the bundles are not perfectly regular).
    // Streaks: noise stretched along the fibre direction, so they always run with the fibres however the surface
    // curves (fine fibres and coarser fascicles). Relief comes from the slope of the same streaks across the fibres.
    float k = 1.0 / uSpacing;
    vec3 q = (vPosW - fib * dot(vPosW, fib) * 0.96) * k;
    float h = vnoise(q) * 0.65 + vnoise(q * 0.22 + 7.3) * 0.35;
    vec3 q2 = q + across * 0.35;
    float h2 = vnoise(q2) * 0.65 + vnoise(q2 * 0.22 + 7.3) * 0.35;
    float fade = clamp(1.4 - 1.6 * fwidth(dot(vPosW, across) * k), 0.0, 1.0);  // no shimmer below a pixel
    float slope = (h2 - h) / 0.35 * fade;
    normal = normalize(normal + (viewMatrix * vec4(across * slope * uDepth, 0.0)).xyz);
    float ridge = (h - 0.5) * 2.0 * fade;
    diffuseColor.rgb *= 1.0 - uStreak * (0.5 + 0.5 * ridge);
  }
}`,
      )
  }
  m.customProgramCacheKey = () => `fibres-${opts.spacing}-${opts.depth}-${opts.streak}`
  return m
}

/** One material per mesh (they share the same shader program). */
export function tissueMaterial(kind: TissueKind, name: string): THREE.Material {
  const h = hash(name)
  if (kind === 'muscle') {
    const c = MUSCLE.clone().offsetHSL((h - 0.5) * 0.02, (h - 0.5) * 0.08, (h - 0.5) * 0.05)
    return withFibres(
      new THREE.MeshPhysicalMaterial({ color: c, vertexColors: true, roughness: 0.5, sheen: 0.65, sheenRoughness: 0.42, sheenColor: new THREE.Color('#eba79b'), clearcoat: 0.14, clearcoatRoughness: 0.45 }),
      { spacing: 0.0011, depth: 0.32, streak: 0.12 },
    )
  }
  if (kind === 'tendon' || kind === 'aponeurosis' || kind === 'ligament') {
    const c = TENDON.clone().offsetHSL(0, 0, (h - 0.5) * 0.03)
    // Thin sheets and bands (the scalp's galea aponeurotica, the retinacula at the wrist and ankle, the transverse metacarpal ligament) are see-through,
    // so the skull's shape, frontalis and occipitalis, and the tendons beneath read through them.
    const sheer = /epicranial|retinacul|transverse_metacarpal/i.test(name)
    return withFibres(
      new THREE.MeshPhysicalMaterial({
        color: c, vertexColors: true, roughness: 0.46, sheen: 0.7, sheenRoughness: 0.35, sheenColor: new THREE.Color('#e9eff1'), clearcoat: 0.1, clearcoatRoughness: 0.4,
        ...(sheer ? { transparent: true, opacity: 0.38, depthWrite: false } : {}),
      }),
      { spacing: 0.0006, depth: 0.4, streak: 0.06 },
    )
  }
  if (kind === 'fascia' || kind === 'sheath' || kind === 'bursa') {
    return new THREE.MeshPhysicalMaterial({ color: '#e4e1d8', vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.35, depthWrite: false, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') })
  }
  if (kind === 'eye') {
    // Anatomical, not glossy: no highlight dot. The cornea is a faint clear layer; the sclera soft off-white and matte.
    if (/cornea/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.06, depthWrite: false })
    // The back of the eye (retina), seen through the pupil: dark.
    if (/retina/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: '#160d0b', roughness: 0.9, side: THREE.DoubleSide })
    if (/iris/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: '#5e4a3c', roughness: 0.8, vertexColors: true })
    return new THREE.MeshPhysicalMaterial({ color: '#e3dacd', roughness: 0.72, vertexColors: true })
  }
  // Hyaline cartilage (nose, ribs): pale ivory-grey, slightly translucent and glassy.
  return cartilageMaterial()
}

/** Hyaline cartilage (nose, costal cartilages): pale ivory-grey, slightly translucent and glassy. */
export function cartilageMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: '#d6d0c4', roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.25, sheen: 0.35, sheenColor: new THREE.Color('#f4efe6'), transparent: true, opacity: 0.88 })
}

/** A soft round shadow on the ground under the model (a radial gradient, no shadow maps: cheap on phones). */
export function groundShadow(radius = 0.45): THREE.Mesh {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.55)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0.22)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 1.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }))
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.001
  m.renderOrder = -1
  return m
}

/**
 * Studio lighting for the layered model: warm key, cool fill, cyan rim (the Atlas HUD colour), a little ambient.
 * Positions are relative to the camera (add the directional lights to the camera, pointing down its -Z), so the rim
 * light always sits behind the model whichever way it is turned.
 */
export function anatomyLights(): THREE.Object3D[] {
  // Soft key from the upper front-left, gentle fill from the right, a subtle cyan rim from behind, ambient for overall
  // brightness. (Camera-relative: x right, y up, z towards the viewer.)
  const key = new THREE.DirectionalLight('#fff6ee', 2.4)
  key.position.set(-1.1, 1.5, 1.2)
  const fill = new THREE.DirectionalLight('#e6eeff', 1.0)
  fill.position.set(1.6, 0.3, 0.8)
  const rim = new THREE.DirectionalLight('#46e0d0', 0.7)
  rim.position.set(0.3, 0.9, -1.6)
  const front = new THREE.DirectionalLight('#ffffff', 0.45)
  front.position.set(0, 0.2, 1.6)
  const amb = new THREE.HemisphereLight('#f6f0ea', '#2a2020', 0.75)
  return [key, fill, rim, front, amb]
}
