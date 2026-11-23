import { usePrefs } from '../state/store'

/**
 * Tap feedback: a soft click and a light haptic, respecting the Sounds and Haptics settings.
 * Haptics use Capacitor's Haptics plugin when the app runs natively, otherwise navigator.vibrate (Android
 * browsers; iOS Safari has no web vibration, so taps are silent there unless the app is installed natively).
 */
type CapHaptics = { impact: (o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>; notification: (o: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void> }
const cap = () => (globalThis as unknown as { Capacitor?: { Plugins?: { Haptics?: CapHaptics } } }).Capacitor?.Plugins?.Haptics

export type HapticKind = 'light' | 'medium' | 'success' | 'error'

export function haptic(kind: HapticKind = 'light') {
  if (!usePrefs.getState().haptics) return
  const h = cap()
  try {
    if (h) {
      if (kind === 'success') void h.notification({ type: 'SUCCESS' })
      else if (kind === 'error') void h.notification({ type: 'ERROR' })
      else void h.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' })
      return
    }
    navigator.vibrate?.(kind === 'light' ? 8 : kind === 'medium' ? 14 : kind === 'success' ? [10, 40, 18] : [20, 30, 20])
  } catch {
    /* not supported */
  }
}
