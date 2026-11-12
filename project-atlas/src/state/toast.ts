import { create } from 'zustand'

export interface Toast {
  id: number
  title: string
  detail?: string
  kind: 'xp' | 'level' | 'assignment' | 'info'
}

interface ToastState {
  toasts: Toast[]
  push(t: Omit<Toast, 'id'>): void
  dismiss(id: number): void
}

let next = 1

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = next++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }))
    setTimeout(() => get().dismiss(id), t.kind === 'level' ? 4200 : 2800)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))
