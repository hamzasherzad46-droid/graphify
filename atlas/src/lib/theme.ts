import { useEffect, useSyncExternalStore } from 'react'
import { usePrefs } from '../state/store'

const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null

function subscribe(cb: () => void) {
  query?.addEventListener('change', cb)
  return () => query?.removeEventListener('change', cb)
}

/** 'dark' | 'light', following the setting (or the system when set to 'system'). */
export function useResolvedTheme(): 'dark' | 'light' {
  const theme = usePrefs((s) => s.theme)
  const systemLight = useSyncExternalStore(subscribe, () => query?.matches ?? false, () => false)
  const resolved = theme === 'system' ? (systemLight ? 'light' : 'dark') : theme
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#06080a' : '#eef1f2')
  }, [resolved])
  return resolved
}
