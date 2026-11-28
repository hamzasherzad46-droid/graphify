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

const MUSCLE = new THREE.Color('#b1463b') // studio muscle red: lighter and warmer, shapes read in soft light
const TENDON = new THREE.Color('#dcc9c0') // soft pinkish-white: pale but close in tone to the muscle, never white paint

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
      new THREE.MeshPhysicalMaterial({ color: c, vertexColors: true, roughness: 0.5, sheen: 0.65, sheenRoughness: 0.42, sheenColor: new THREE.Color('#f2b6aa'), clearcoat: 0.14, clearcoatRoughness: 0.45 }),
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
        color: c, vertexColors: true, roughness: 0.46, sheen: 0.7, sheenRoughness: 0.35, sheenColor: new THREE.Color('#f6eeea'), clearcoat: 0.1, clearcoatRoughness: 0.4,
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
export type OrganKind =
  | 'heart' | 'artery' | 'vein' | 'lung' | 'airway' | 'liver' | 'bile' | 'gut' | 'mouth' | 'gland' | 'kidney' | 'urinary'
  | 'spleen' | 'brain' | 'cord' | 'genital' | 'membrane'

// Organ colours: natural tissue tones, with the textbook convention for vessels (arteries red, veins blue).
const ORGAN: Record<OrganKind, string> = {
  heart: '#9a3a31', artery: '#b8332b', vein: '#3f5d9a', lung: '#d39189', airway: '#e2d3c2', liver: '#7a3026',
  bile: '#5d7a3c', gut: '#d49a86', mouth: '#c0605a', gland: '#d6a56e', kidney: '#8a3a2e', urinary: '#d8b39a',
  spleen: '#6f2b3b', brain: '#e2c2b6', cord: '#ebdfcf', genital: '#c98e7c', membrane: '#efe0b4',
}

/** Organs: moist, so a soft clear coat over a satin base; baked occlusion in the vertex colours. */
export function organMaterial(kind: OrganKind, name: string): THREE.Material {
  const h = hash(name)
  let colour = ORGAN[kind] ?? ORGAN.gut
  if (kind === 'heart' && /leaflet/i.test(name)) colour = '#e3cfc0' // valve leaflets: thin, pale fibrous tissue
  if (kind === 'gland' && /thyroid/i.test(name)) colour = '#a9493f'
  if (kind === 'gland' && /suprarenal/i.test(name)) colour = '#d8a43f'
  if (kind === 'mouth' && /gingiva/i.test(name)) colour = '#d27c78'
  const c = new THREE.Color(colour).offsetHSL(0, 0, (h - 0.5) * 0.03)
  if (kind === 'membrane') {
    return new THREE.MeshPhysicalMaterial({ color: c, vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })
  }
  const wet = kind === 'brain' || kind === 'cord' ? 0.15 : 0.35
  return new THREE.MeshPhysicalMaterial({
    color: c, vertexColors: true, roughness: kind === 'lung' ? 0.7 : 0.5, sheen: 0.4, sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#ffe6dc'), clearcoat: wet, clearcoatRoughness: 0.35,
    side: THREE.DoubleSide, // some source surfaces are single sheets (the pharynx, valve leaflets): seen from both sides
  })
}

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
/** Bone for the studio look: warm cream ivory. */
export function studioBoneMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#d8c59c', roughness: 0.7 })
}

/**
 * Studio backdrop: a blue-grey gradient behind the model and a softly lit floor that fades into it, with a soft
 * contact shadow under the feet. Returns the background texture (for scene.background) and the floor.
 */
export function studioBackdrop(): { background: THREE.Texture; floor: THREE.Object3D } {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#2b3442')
  grad.addColorStop(0.55, '#3d4859')
  grad.addColorStop(1, '#4a5a6f')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const background = new THREE.CanvasTexture(c)
  background.colorSpace = THREE.SRGBColorSpace
  const f = document.createElement('canvas')
  f.width = f.height = 256
  const fg = f.getContext('2d')!
  const fr = fg.createRadialGradient(128, 128, 0, 128, 128, 128)
  fr.addColorStop(0, 'rgba(120,140,165,0.55)')
  fr.addColorStop(0.6, 'rgba(95,112,135,0.3)')
  fr.addColorStop(1, 'rgba(70,85,105,0)')
  fg.fillStyle = fr
  fg.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(f)
  tex.colorSpace = THREE.SRGBColorSpace
  const floor = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
  disc.rotation.x = -Math.PI / 2
  floor.add(disc, groundShadow(0.42))
  return { background, floor }
}

export function anatomyLights(): THREE.Object3D[] {
  // Soft, bright studio light: a broad key from the upper front-left, a gentle fill from the right, a low front light
  // to open the shadows, a faint cyan rim from behind, and sky/floor ambient. (Camera-relative: x right, y up, z
  // towards the viewer.)
  const key = new THREE.DirectionalLight('#fff4ec', 2.7)
  key.position.set(-1.2, 1.6, 1.3)
  const fill = new THREE.DirectionalLight('#e8eefc', 1.1)
  fill.position.set(1.6, 0.4, 0.9)
  const front = new THREE.DirectionalLight('#ffffff', 0.6)
  front.position.set(0, 0.1, 1.6)
  const rim = new THREE.DirectionalLight('#7fe6dc', 0.35)
  rim.position.set(0.3, 0.9, -1.6)
  const amb = new THREE.HemisphereLight('#f4f2f0', '#55606f', 0.62)
  return [key, fill, front, rim, amb]
}
