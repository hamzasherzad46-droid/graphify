import { TRACKS, type Structure, type Track } from './types'

/** The note for the student's track, or the closest available one (medicine, then nursing, then any). */
export function noteFor(s: Structure, track: Track): { track: Track; text: string } | null {
  const order: Track[] = [track, 'medicine', 'nursing', ...TRACKS]
  for (const t of order) {
    const text = s.notes[t]
    if (text) return { track: t, text }
  }
  return null
}
