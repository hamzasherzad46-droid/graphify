import { usePrefs } from '../state/store'

/** Soft synthesized sounds (no audio files): a keyboard click and two answer tones. */
let ctx: AudioContext | null = null
let bus: GainNode | null = null
let noise: AudioBuffer | null = null
/** Master volume for the quiz sounds: quiet by default (about 40%). */
const MASTER = 0.4
function audio(): AudioContext | null {
  if (!usePrefs.getState().study.sound) return null
  try {
    ctx ??= new AudioContext({ latencyHint: 'interactive' })
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}
/** The quiz sounds go through one master gain, with a shared noise buffer made once (no work per key press). */
function out(a: AudioContext): GainNode {
  if (!bus) {
    bus = a.createGain()
    bus.gain.value = MASTER
    bus.connect(a.destination)
    const len = Math.floor(a.sampleRate * 0.008)
    noise = a.createBuffer(1, len, a.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  }
  return bus
}
const jitter = (x: number, amt: number) => x * (1 + (Math.random() * 2 - 1) * amt)

/**
 * Key press: a soft, deep "thock". A ~5 ms noise burst through a 2.5 kHz lowpass (the contact) over a sine body at
 * ~200 Hz decaying in ~40 ms. Pitch varies ±4% and volume ±10% so repeated keys don't sound mechanical.
 * Backspace is a little lower.
 */
export function keyClick(kind: 'key' | 'back' = 'key') {
  const a = audio()
  if (!a) return
  const o = out(a)
  const t = a.currentTime
  const vol = jitter(1, 0.1)
  const src = a.createBufferSource()
  src.buffer = noise
  const lp = a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = jitter(2500, 0.15)
  const ng = a.createGain()
  ng.gain.setValueAtTime(0.32 * vol, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.006)
  src.connect(lp).connect(ng).connect(o)
  src.start(t)
  const body = a.createOscillator()
  const bg = a.createGain()
  const f = jitter(kind === 'back' ? 165 : 200, 0.04)
  body.type = 'sine'
  body.frequency.setValueAtTime(f * 1.25, t)
  body.frequency.exponentialRampToValueAtTime(f, t + 0.012)
  bg.gain.setValueAtTime(0.0001, t)
  bg.gain.linearRampToValueAtTime(0.5 * vol, t + 0.002)
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.042)
  body.connect(bg).connect(o)
  body.start(t)
  body.stop(t + 0.05)
}

/** Wrong letter: a soft, low, muted "tuk". */
export function wrongLetter() {
  const a = audio()
  if (!a) return
  const o = out(a)
  const t = a.currentTime
  const osc = a.createOscillator()
  const lp = a.createBiquadFilter()
  const g = a.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(95, t + 0.07)
  lp.type = 'lowpass'
  lp.frequency.value = 600
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.55, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  osc.connect(lp).connect(g).connect(o)
  osc.start(t)
  osc.stop(t + 0.1)
}

/** A bell-like note: a sine with a soft inharmonic partial, quick attack and a gentle tail. */
function bell(a: AudioContext, o: AudioNode, f: number, t: number, vol: number, dur: number) {
  for (const [mult, amp] of [[1, 1], [2.76, 0.12], [2, 0.18]] as const) {
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = 'sine'
    osc.frequency.value = f * mult
    const d = mult === 1 ? dur : dur * 0.45
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(vol * amp, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    osc.connect(g).connect(o)
    osc.start(t)
    osc.stop(t + d + 0.02)
  }
}
const E5 = 659.25
const B5 = 987.77
const E6 = 1318.51

/** Correct word: a two-note rising chime, E5 → B5 (~350 ms with a tail). A streak of 5 adds E6 on top. */
export function wordChime(streak = 0) {
  const a = audio()
  if (!a) return
  const o = out(a)
  const t = a.currentTime + 0.005
  bell(a, o, E5, t, 0.32, 0.35)
  bell(a, o, B5, t + 0.09, 0.3, 0.45)
  if (streak > 0 && streak % 5 === 0) bell(a, o, E6, t + 0.18, 0.22, 0.55)
}

/** Session complete: a soft, warm three-note chord (E4, G#4, B4), lightly rolled. */
export function sessionChord() {
  const a = audio()
  if (!a) return
  const o = out(a)
  const t = a.currentTime + 0.01
  ;[329.63, 415.3, 493.88].forEach((f, i) => bell(a, o, f, t + i * 0.06, 0.2, 1.1))
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

/** Soft, short tap for cards and buttons (quieter than the keyboard click). */
export function tap() {
  const a = audio()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(320, a.currentTime)
  o.frequency.exponentialRampToValueAtTime(180, a.currentTime + 0.04)
  g.gain.setValueAtTime(0.0001, a.currentTime)
  g.gain.linearRampToValueAtTime(0.045, a.currentTime + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.06)
  o.connect(g).connect(a.destination)
  o.start()
  o.stop(a.currentTime + 0.07)
}

/** Browsers only allow audio after a user gesture: create and resume the context on the first touch, so the first
 *  real sound plays without delay. */
export function prewarmAudio() {
  const once = () => {
    const a = audio()
    if (a) out(a)
    window.removeEventListener('pointerdown', once, true)
  }
  window.addEventListener('pointerdown', once, true)
}

export const correctTone = () => tone([660, 990])
export const wrongTone = () => tone([220, 196], 0.14, 0.045)
