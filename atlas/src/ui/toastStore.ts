import { create } from 'zustand'

export const useToast = create<{ text: string | null; n: number; show: (t: string) => void }>((set, get) => ({
  text: null,
  n: 0,
  show: (text) => {
    const n = get().n + 1
    set({ text, n })
    setTimeout(() => get().n === n && set({ text: null }), 2600)
  },
}))

