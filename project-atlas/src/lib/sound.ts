import { useSettings } from '../state/settings'

/**
 * Small synthesised sounds (no audio files): a soft typewriter tick, a low thud
 * for a wrong key, a two-note chime for a correct answer that climbs with the
 * combo, and a short arpeggio for finishing or levelling up.
 */
type Sound = 'key' | 'wrong' | 'complete' | 'combo' | 'fail' | 'flip' | 'finish' | 'level'

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ctx.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Major pentatonic steps so rising combos always sound consonant. */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
const note = (base: number, step: number) => base * Math.pow(2, PENTA[Math.min(step, PENTA.length - 1)] / 12)

export function playSound(sound: Sound, combo = 0) {
  if (!useSettings.getState().sound || typeof window === 'undefined') return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    switch (sound) {
      case 'key':
        tone(1800, 0, 0.025, 0.025, 'triangle')
        tone(900, 0, 0.02, 0.015, 'square')
        break
      case 'wrong':
        tone(140, 0, 0.14, 0.07, 'triangle')
        break
      case 'complete':
        tone(587, 0, 0.16, 0.05)
        tone(880, 0.07, 0.26, 0.05)
        break
      case 'combo': {
        const step = Math.min(combo, 9)
        tone(note(523, step), 0, 0.14, 0.05)
        tone(note(523, step + 2), 0.06, 0.18, 0.05)
        tone(note(523, step + 4), 0.12, 0.3, 0.045)
        break
      }
      case 'fail':
        tone(330, 0, 0.18, 0.045)
        tone(247, 0.1, 0.28, 0.045)
        break
      case 'flip':
        tone(1200, 0, 0.04, 0.02, 'triangle')
        break
      case 'finish':
        ;[0, 2, 4, 5].forEach((s, i) => tone(note(392, s), i * 0.08, 0.35, 0.045))
        break
      case 'level':
        ;[0, 2, 4, 5, 7].forEach((s, i) => tone(note(523, s), i * 0.09, 0.5, 0.05))
        break
    }
  } catch {
    /* audio unavailable */
  }
}
