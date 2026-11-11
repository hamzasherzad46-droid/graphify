import catalogJson from '../../content/catalog.json'
import type { Catalog, ModuleContent, ModuleInfo, PlaceholderModel } from './types'

export const catalog = catalogJson as Catalog

export const allModules: ModuleInfo[] = catalog.courses.flatMap((c) => c.modules)

export function getModuleInfo(id: string): ModuleInfo | undefined {
  return allModules.find((m) => m.id === id)
}

// Each module's JSON becomes its own lazily loaded chunk.
const files = import.meta.glob<{ default: unknown }>(['../../content/*.json', '!../../content/catalog.json'])

async function loadJson<T>(basename: string): Promise<T> {
  const loader = files[`../../content/${basename}.json`]
  if (!loader) throw new Error(`Missing content file /content/${basename}.json`)
  return (await loader()).default as T
}

const contentCache = new Map<string, Promise<ModuleContent>>()
const placeholderCache = new Map<string, Promise<PlaceholderModel>>()

export function loadModuleContent(info: ModuleInfo): Promise<ModuleContent> {
  if (!info.contentFile) return Promise.reject(new Error(`Module ${info.id} has no content yet`))
  let p = contentCache.get(info.id)
  if (!p) {
    p = loadJson<ModuleContent>(info.contentFile)
    contentCache.set(info.id, p)
  }
  return p
}

export function loadPlaceholder(info: ModuleInfo): Promise<PlaceholderModel> {
  if (!info.placeholderFile) return Promise.resolve({ parts: [] })
  let p = placeholderCache.get(info.id)
  if (!p) {
    p = loadJson<PlaceholderModel>(info.placeholderFile)
    placeholderCache.set(info.id, p)
  }
  return p
}

const modelCheck = new Map<string, Promise<boolean>>()

/**
 * True if /models/<file> exists and is a real binary (the dev server and the
 * service worker answer unknown paths with index.html, so check the type).
 */
export function modelAvailable(file: string): Promise<boolean> {
  let p = modelCheck.get(file)
  if (!p) {
    p = fetch(`/models/${file}`, { method: 'HEAD' })
      .then((r) => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))
      .catch(() => false)
    modelCheck.set(file, p)
  }
  return p
}
