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
}>(() => ({ orientation: 'Anterior', azimuth: 0, elevation: 0, labels: [], moving: false }))

/** Screen space the overlays cover (px), so the 3D view frames bones inside the free area. */
export const INSETS = { top: 124, bottom: 92, panel: 236 }
