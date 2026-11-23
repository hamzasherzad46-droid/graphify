import { useEffect } from 'react'
import { useHud } from '../../state/hud'

/**
 * Keeps the study camera framing clear of the study UI: `top` px of header and prompt, and at the bottom the
 * larger of `bottom` px of controls and the on-screen keyboard (visualViewport).
 */
export function useStudyInsets(top: number, bottom: number, side = 0) {
  useEffect(() => {
    const vv = window.visualViewport
    const update = () => {
      const keyboard = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
      useHud.setState({ studyInsets: { top, bottom: Math.max(bottom, keyboard + 16), side } })
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [top, bottom, side])
}
