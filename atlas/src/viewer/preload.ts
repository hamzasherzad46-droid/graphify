/**
 * Which soft-tissue models this device gets, and an early start on downloading them. No three.js here: the dock
 * (main bundle) uses it to warm the cache before the 3D code asks for a model.
 */
export const DETAILED =
  import.meta.env.MODE !== 'artifact' && // the shareable preview build carries the phone versions only
  typeof window !== 'undefined' &&
  Math.min(window.screen.width, window.screen.height) >= 700 &&
  ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) >= 4

export const TISSUE_URL = {
  organs: DETAILED ? 'models/tissue/organs-male.glb' : 'models/tissue/organs-male-phone.glb',
  muscles: DETAILED ? 'models/tissue/layers-male.glb' : 'models/tissue/layers-male-phone.glb',
}

let started = false
/** Start fetching the organs model (the layer control's first step) into the HTTP cache. */
export function preloadOrgans() {
  if (started) return
  started = true
  void fetch(TISSUE_URL.organs).catch(() => (started = false))
}
