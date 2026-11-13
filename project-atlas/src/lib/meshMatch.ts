/**
 * Map content `meshName` keys to scene mesh names.
 *
 * Mesh names differ between exporters: Z-Anatomy uses names like "Humerus.l",
 * and three's GLTFLoader strips "." from node names ("Humerusl"). So both sides
 * are reduced to lower-case alphanumerics, and a mesh matches a key if it equals
 * the key or the key followed only by a side/index suffix (l, r, left, right, digits).
 */

export function normalizeMeshName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const SUFFIX = /^(\d*)(l|r|left|right)?(\d*)$/

export function meshMatchesKey(meshName: string, key: string): boolean {
  const m = normalizeMeshName(meshName)
  const k = normalizeMeshName(key)
  if (!k || !m.startsWith(k)) return false
  return SUFFIX.test(m.slice(k.length))
}

export function meshKeys(meshName: string | string[]): string[] {
  return Array.isArray(meshName) ? meshName : [meshName]
}

export function meshMatchesAny(meshName: string, keys: string[]): boolean {
  return keys.some((k) => meshMatchesKey(meshName, k))
}
