import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders a sheet or dialog at the top of the document. Pages are their own stacking layers (below the tab bar), so a
 * sheet opened inside a page would otherwise sit under the tab bar, however high its z-index.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
