import { create } from 'zustand'

export interface LabelItem {
  id: string
  text: string
  ax: number // anchor (on the bone), screen px
  ay: number
  x: number // label box: left edge for the left column, right edge for the right column
  y: number // label centre line
  side: 'left' | 'right'
  width: number
  selected: boolean
}

/** Fast-changing view state for the HUD overlays, kept apart from the main store. */
export const useHud = create<{
  orientation: string
  azimuth: number
  elevation: number
  labels: LabelItem[]
  moving: boolean
  /** Bumped when bones finish moving (explode, drag), so labels are laid out again. */
  bonesVersion: number
  /** Screen space covered by study UI (header, prompt, on-screen keyboard), px. */
  studyInsets: { top: number; bottom: number }
}>(() => ({ orientation: 'Anterior', azimuth: 0, elevation: 0, labels: [], moving: false, bonesVersion: 0, studyInsets: { top: 190, bottom: 120 } }))

/** Screen space the overlays cover (px), so the 3D view frames bones inside the free area. */
export const INSETS = { top: 124, bottom: 92, panel: 236, explodeBar: 96 }

/** Top inset in px, including the explode controls when they are open. */
export const topInset = (explodeOpen: boolean) => INSETS.top + (explodeOpen ? INSETS.explodeBar : 0)
