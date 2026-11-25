import { useState } from 'react'
import { applyReminders, isNative, loadReminders, type ReminderSettings } from '../../learn/reminders'

/** Review reminders: on or off, and the time of day. */
export function Reminders() {
  const [r, setR] = useState<ReminderSettings>(loadReminders)
  const [message, setMessage] = useState('')
  const change = (next: ReminderSettings) => {
    setR(next)
    void applyReminders(next).then((m) => setMessage(m ?? ''))
  }
  return (
    <section className="reminders" aria-label="Review reminders">
      <label className="reminder-row">
        <input type="checkbox" checked={r.on} onChange={(e) => change({ ...r, on: e.target.checked })} />
        <span>Remind me to review</span>
        <input type="time" value={r.time} disabled={!r.on} aria-label="Reminder time" onChange={(e) => e.target.value && change({ ...r, time: e.target.value })} />
      </label>
      <p className="muted small">
        {isNative() ? 'A notification each day at this time.' : 'In the browser, Atlas can remind you only while it is open; the phone app sends a notification each day.'}
      </p>
      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
    </section>
  )
}
