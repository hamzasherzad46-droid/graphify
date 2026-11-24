import { useEffect } from 'react'

/** Jump to a question (from My Highlights / My Notes), then let it glow briefly. */
export function useJumpToQuestion(anchor: string | undefined) {
  useEffect(() => {
    if (!anchor) return
    // Jump at once (a smooth scroll can be cut short when content above it loads), then once more after late layout.
    const go = () => document.querySelector<HTMLElement>(`.q-card[data-qid="${CSS.escape(anchor)}"]`)?.scrollIntoView({ block: 'start' })
    const t1 = window.setTimeout(() => {
      go()
      const el = document.querySelector<HTMLElement>(`.q-card[data-qid="${CSS.escape(anchor)}"]`)
      el?.classList.add('flash')
      window.setTimeout(() => el?.classList.remove('flash'), 2200)
    }, 60)
    const t2 = window.setTimeout(go, 500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [anchor])
}
