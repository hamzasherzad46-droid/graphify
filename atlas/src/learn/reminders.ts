import { Capacitor } from '@capacitor/core'

/**
 * Review reminders. In the phone app: a daily local notification at the chosen time (no server, nothing leaves the
 * device). In a browser, a page cannot be woken when it is closed, so the reminder is the review banner shown when
 * Atlas opens, plus a browser notification if Atlas is open at the chosen time and permission was given.
 */
export interface ReminderSettings {
  on: boolean
  /** "HH:MM", local time. */
  time: string
}

const KEY = 'atlas.notes.reminders'
const ID = 4101
export const DEFAULT_REMINDERS: ReminderSettings = { on: false, time: '18:00' }
export const isNative = () => Capacitor.isNativePlatform()

export function loadReminders(): ReminderSettings {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as ReminderSettings | null
    return r && /^\d\d:\d\d$/.test(r.time) ? r : DEFAULT_REMINDERS
  } catch {
    return DEFAULT_REMINDERS
  }
}

/** Save the settings and (re)schedule. Resolves to a message for the student when something could not be set up. */
export async function applyReminders(r: ReminderSettings): Promise<string | null> {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* private mode: lasts for this visit */
  }
  const [hour, minute] = r.time.split(':').map(Number)
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {})
    if (!r.on) return null
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return 'Notifications are turned off for Atlas. Allow them in your phone’s settings.'
    await LocalNotifications.schedule({
      notifications: [{ id: ID, title: 'Time to review', body: 'Your questions and cards are ready for today’s review.', schedule: { on: { hour, minute }, allowWhileIdle: true } }],
    })
    return null
  }
  if (r.on && typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission().catch(() => {})
  return null
}

let timer: ReturnType<typeof setTimeout> | null = null
/**
 * In a browser: while Atlas is open, show a notification at the chosen time if reviews are due. `due` is asked at that
 * moment. Call once when the app starts.
 */
export function startBrowserReminder(due: () => number) {
  if (isNative() || typeof Notification === 'undefined') return
  if (timer) clearTimeout(timer)
  const r = loadReminders()
  if (!r.on) return
  const [hour, minute] = r.time.split(':').map(Number)
  const now = new Date()
  const at = new Date(now)
  at.setHours(hour, minute, 0, 0)
  if (at <= now) at.setDate(at.getDate() + 1)
  timer = setTimeout(() => {
    const n = due()
    if (n && Notification.permission === 'granted') new Notification('Time to review', { body: `${n} ${n === 1 ? 'item is' : 'items are'} ready for review in Atlas.` })
    startBrowserReminder(due)
  }, at.getTime() - now.getTime())
}
