/**
 * Screen slots for the Spelling Quiz side views: the quiz UI registers two transparent boxes here and the 3D view
 * draws the bone from another angle into each box (scissored viewports on the same canvas, so no second WebGL
 * context and no copies of the model).
 */
export type ThumbView = 'lateral' | 'posterior'
export const thumbSlots: Record<ThumbView, HTMLElement | null> = { lateral: null, posterior: null }
