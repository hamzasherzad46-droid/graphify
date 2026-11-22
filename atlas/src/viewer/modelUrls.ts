import { use } from 'react'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Sex } from '../data/types'

export const MODEL_URL: Record<Sex, string> = {
  male: 'models/skeleton-male.glb',
  female: 'models/skeleton-male.glb', // step 2 replaces this with the female model
}

// The shareable preview build (`npm run build:preview`) runs on a sandboxed host that may block
// WebAssembly and cannot serve .glb files: there the decoder is plain JS and each model ships as
// base64 text (<model>.b64.txt). Everywhere else: WASM decoder, binary GLB.
const PREVIEW = import.meta.env.MODE === 'artifact'
const draco = new DRACOLoader().setDecoderPath('draco/')
if (PREVIEW) draco.setDecoderConfig({ type: 'js' })

const cache = new Map<string, Promise<GLTF>>()

function load(url: string): Promise<GLTF> {
  const loader = new GLTFLoader().setDRACOLoader(draco)
  if (!PREVIEW) return loader.loadAsync(url)
  return fetch(`${url}.b64.txt`)
    .then((r) => {
      if (!r.ok) throw new Error(`model ${url}: HTTP ${r.status}`)
      return r.text()
    })
    .then((b64) => {
      const bin = atob(b64.trim())
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return loader.parseAsync(bytes.buffer, '')
    })
}

/** Starts loading a model (once); safe to call early. */
export function preloadModel(url: string): Promise<GLTF> {
  let p = cache.get(url)
  if (!p) {
    p = load(url)
    cache.set(url, p)
  }
  return p
}

/** Suspends until the model is loaded. */
export function useModel(url: string): GLTF {
  return use(preloadModel(url))
}
