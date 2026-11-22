import { useToast } from './toastStore'

export function Toast() {
  const text = useToast((s) => s.text)
  return (
    <div className={`toast ${text ? 'show' : ''}`} role="status" aria-live="polite">
      {text}
    </div>
  )
}
