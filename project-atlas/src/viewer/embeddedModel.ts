import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { publicUrl } from '../lib/paths'

/**
 * The artifact build (`--mode artifact`) runs on hosts that won't serve .glb files and may
 * block network fetches, so there each model ships as a JS module (`models/<file>.js`,
 * `export default "<base64>"`) and is parsed in memory. Normal builds load GLBs as usual.
 */
export const EMBEDDED_MODELS = import.meta.env.MODE === 'artifact'

const cache = new Map<string, Promise<GLTF>>()

export function loadEmbeddedModel(file: string): Promise<GLTF> {
  let p = cache.get(file)
  if (!p) {
    // Resolve against the document, not this chunk (which lives in /assets).
    const url = new URL(publicUrl(`models/${file}.js`), document.baseURI).href
    p = import(/* @vite-ignore */ url).then(({ default: base64 }: { default: string }) => {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return new GLTFLoader().parseAsync(bytes.buffer, '')
    })
    cache.set(file, p)
  }
  return p
}
