import { create } from 'zustand'

export type Tab = 'home' | '3d' | 'practice' | 'progress' | 'you'

/** Which tab is showing. The app always opens on Home. */
export const useNav = create<{ tab: Tab; go: (tab: Tab) => void }>((set) => ({
  tab: 'home',
  go: (tab) => set({ tab }),
}))
