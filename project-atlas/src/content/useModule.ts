import { useEffect, useState } from 'react'
import { getModuleInfo, loadModuleContent, loadPlaceholder, modelAvailable } from './loader'
import type { ModuleContent, ModuleInfo, PlaceholderModel } from './types'

export interface ModuleAssets {
  info: ModuleInfo
  content: ModuleContent
  placeholder: PlaceholderModel
  /** Real GLB present in /public/models; otherwise primitives are rendered. */
  hasModel: boolean
}

const cache = new Map<string, ModuleAssets>()

export async function loadModuleAssets(id: string): Promise<ModuleAssets> {
  const hit = cache.get(id)
  if (hit) return hit
  const info = getModuleInfo(id)
  if (!info) throw new Error(`Unknown module ${id}`)
  const [content, placeholder, hasModel] = await Promise.all([
    loadModuleContent(info),
    loadPlaceholder(info),
    info.model ? modelAvailable(info.model.file) : Promise.resolve(false),
  ])
  const assets = { info, content, placeholder, hasModel }
  cache.set(id, assets)
  return assets
}

/** Lazily loads a module's content, placeholder spec and model availability. */
export function useModule(id: string | null): { assets: ModuleAssets | null; error: string | null } {
  const [state, setState] = useState<{ id: string | null; assets: ModuleAssets | null; error: string | null }>(() => ({
    id,
    assets: id ? (cache.get(id) ?? null) : null,
    error: null,
  }))

  useEffect(() => {
    if (!id || cache.has(id)) return
    let alive = true
    loadModuleAssets(id).then(
      (assets) => alive && setState({ id, assets, error: null }),
      (e: unknown) => alive && setState({ id, assets: null, error: String(e) }),
    )
    return () => {
      alive = false
    }
  }, [id])

  if (!id) return { assets: null, error: null }
  if (cache.has(id)) return { assets: cache.get(id)!, error: null }
  return state.id === id ? { assets: state.assets, error: state.error } : { assets: null, error: null }
}
