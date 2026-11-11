import { useSyncExternalStore } from 'react'

/** The theme actually applied to <html data-theme>, after resolving "system". */
export function useResolvedTheme(): 'dark' | 'light' {
  return useSyncExternalStore(
    (cb) => {
      const obs = new MutationObserver(cb)
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      return () => obs.disconnect()
    },
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'),
  )
}
