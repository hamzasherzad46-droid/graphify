import catalogJson from '../../content/catalog.json'
import { publicUrl } from '../lib/paths'
import type { Catalog, ModuleContent, ModuleInfo, PlaceholderModel } from './types'

export const catalog = catalogJson as Catalog

export const allModules: ModuleInfo[] = catalog.systems.flatMap((sys) => sys.modules.map((m) => ({ ...m, systemId: sys.id })))

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
 * False only when /models/<file> is clearly missing: a 404, or the HTML page that
 * the dev server and service worker return for unknown paths. If the check itself
 * can't run (e.g. a sandboxed host), assume the model is there and let the loader try.
 */
export function modelAvailable(file: string): Promise<boolean> {
  // The artifact build embeds its models as JS modules (see viewer/embeddedModel.ts).
  if (import.meta.env.MODE === 'artifact') return Promise.resolve(true)
  let p = modelCheck.get(file)
  if (!p) {
    p = fetch(publicUrl(`models/${file}`), { method: 'HEAD' })
      .then((r) => r.status !== 404 && !(r.headers.get('content-type') ?? '').includes('text/html'))
      .catch(() => true)
    modelCheck.set(file, p)
  }
  return p
}
