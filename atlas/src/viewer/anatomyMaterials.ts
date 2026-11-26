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
const TENDON = new THREE.Color('#b9bcbd') // silvery grey-white, cooler and darker than bone's warm ivory

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
      new THREE.MeshPhysicalMaterial({ color: c, vertexColors: true, roughness: 0.58, sheen: 0.55, sheenRoughness: 0.45, sheenColor: new THREE.Color('#e9a397'), clearcoat: 0.06, clearcoatRoughness: 0.5 }),
      { spacing: 0.0011, depth: 0.32, streak: 0.12 },
    )
  }
  if (kind === 'tendon' || kind === 'aponeurosis' || kind === 'ligament') {
    // Aponeuroses (broad sheets such as the scalp's) a little darker and cooler than cord-like tendons.
    const c = TENDON.clone().offsetHSL(kind === 'aponeurosis' ? 0.02 : 0, 0, (h - 0.5) * 0.04 + (kind === 'aponeurosis' ? -0.1 : 0))
    return withFibres(
      new THREE.MeshPhysicalMaterial({ color: c, vertexColors: true, roughness: 0.36, sheen: 1.0, sheenRoughness: 0.28, sheenColor: new THREE.Color('#dff1f5'), clearcoat: 0.25, clearcoatRoughness: 0.3 }),
      { spacing: 0.0006, depth: 0.45, streak: 0.08 },
    )
  }
  if (kind === 'fascia' || kind === 'sheath' || kind === 'bursa') {
    return new THREE.MeshPhysicalMaterial({ color: '#e4e1d8', vertexColors: true, roughness: 0.4, transparent: true, opacity: 0.35, depthWrite: false, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') })
  }
  if (kind === 'eye') {
    if (/cornea/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 0.95, thickness: 0.0006, ior: 1.376, transparent: true, opacity: 0.25, clearcoat: 1, depthWrite: false })
    if (/iris/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: '#5a3a26', roughness: 0.55, vertexColors: true })
    return new THREE.MeshPhysicalMaterial({ color: '#efe9e1', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, vertexColors: true })
  }
  // Hyaline cartilage: pale blue-white, slightly glossy.
  return new THREE.MeshPhysicalMaterial({ color: '#d7dde2', roughness: 0.38, clearcoat: 0.3, sheen: 0.3, vertexColors: true })
}

/**
 * Studio lighting for the layered model: warm key, cool fill, cyan rim (the Atlas HUD colour), a little ambient.
 * Positions are relative to the camera (add the directional lights to the camera, pointing down its -Z), so the rim
 * light always sits behind the model whichever way it is turned.
 */
export function anatomyLights(): THREE.Object3D[] {
  const key = new THREE.DirectionalLight('#fff4ea', 2.6)
  key.position.set(1.0, 1.4, 1.0)
  const fill = new THREE.DirectionalLight('#cfe0ff', 0.75)
  fill.position.set(-1.6, 0.2, 0.6)
  const rim = new THREE.DirectionalLight('#46e0d0', 1.6)
  rim.position.set(-1.0, 0.8, -1.6)
  const rim2 = new THREE.DirectionalLight('#46e0d0', 0.9)
  rim2.position.set(1.4, 0.3, -1.6)
  const amb = new THREE.HemisphereLight('#f2ece6', '#1b1414', 0.35)
  return [key, fill, rim, rim2, amb]
}
