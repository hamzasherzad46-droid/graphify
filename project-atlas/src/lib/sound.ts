import { useSettings } from '../state/settings'

/** Tiny synthesised UI sounds (no audio files). Respects the Sound setting. */
type Sound = 'key' | 'wrong' | 'complete' | 'fail'

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ctx.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export function playSound(sound: Sound) {
  if (!useSettings.getState().sound || typeof window === 'undefined') return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    switch (sound) {
      case 'key':
        tone(1400, 0, 0.03, 0.03, 'triangle')
        break
      case 'wrong':
        tone(160, 0, 0.12, 0.06, 'square')
        break
      case 'complete':
        tone(660, 0, 0.14, 0.05)
        tone(990, 0.08, 0.22, 0.05)
        break
      case 'fail':
        tone(330, 0, 0.18, 0.05)
        tone(247, 0.1, 0.25, 0.05)
        break
    }
  } catch {
    /* audio unavailable */
  }
}
