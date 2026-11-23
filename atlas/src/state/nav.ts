import { create } from 'zustand'

export type Tab = 'home' | '3d' | 'practice' | 'progress' | 'you'

/** Pages opened from Home (Lessons and what it leads to), newest last. */
export type Page =
  | { kind: 'lessons' }
  | { kind: 'topics'; area: 'textbook' | 'exam' }
  | { kind: 'topic'; area: 'textbook' | 'exam'; topic: string }
  | { kind: 'reader'; section: string; anchor?: string }

/**
 * Which tab is showing, and the stack of pages opened from Home. The app always opens on Home. Each pushed page is
 * also a browser history entry, so the phone's back button (or swipe back) closes it.
 */
export const useNav = create<{
  tab: Tab
  pages: Page[]
  go: (tab: Tab) => void
  push: (p: Page) => void
  /** Close the top page (through history, so back button and in-app back stay in step). */
  back: () => void
  /** Close every page, back to Home. */
  home: () => void
  /** Replace the whole stack (e.g. "Continue reading" from Home). */
  open: (pages: Page[]) => void
}>((set, get) => ({
  tab: 'home',
  pages: [],
  go: (tab) => set({ tab }),
  push: (p) => {
    history.pushState({ atlasDepth: get().pages.length + 1 }, '')
    set((s) => ({ tab: 'home', pages: [...s.pages, p] }))
  },
  back: () => {
    if (!get().pages.length) return
    if (history.state?.atlasDepth) history.back()
    else set((s) => ({ pages: s.pages.slice(0, -1) }))
  },
  home: () => {
    const n = get().pages.length
    if (!n) return
    if (history.state?.atlasDepth) history.go(-n)
    else set({ pages: [] })
  },
  open: (pages) => {
    for (let k = get().pages.length; k < pages.length; k++) history.pushState({ atlasDepth: k + 1 }, '')
    set({ tab: 'home', pages })
  },
}))

// Back button / swipe back: the history entry's depth says how many pages stay open.
if (typeof window !== 'undefined')
  window.addEventListener('popstate', (e) => {
    const depth = (e.state as { atlasDepth?: number } | null)?.atlasDepth ?? 0
    const s = useNav.getState()
    if (depth < s.pages.length) useNav.setState({ pages: s.pages.slice(0, depth) })
  })
