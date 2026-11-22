import { usePrefs } from '../state/store'

/** Soft synthesized sounds (no audio files): a keyboard click and two answer tones. */
let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (!usePrefs.getState().study.sound) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function click() {
  const a = audio()
  if (!a) return
  // 12 ms of filtered noise: a quiet, soft key tick.
  const len = Math.floor(a.sampleRate * 0.012)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = 2400
  f.Q.value = 0.8
  const g = a.createGain()
  g.gain.value = 0.09
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

function tone(freqs: number[], dur = 0.11, vol = 0.05) {
  const a = audio()
  if (!a) return
  freqs.forEach((f, i) => {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = 'sine'
    o.frequency.value = f
    const t = a.currentTime + i * dur * 0.8
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(a.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  })
}

export const correctTone = () => tone([660, 990])
export const wrongTone = () => tone([220, 196], 0.14, 0.045)
