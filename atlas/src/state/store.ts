import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'
import type { ReviewStatus, Sex } from '../data/types'

export type ViewName = 'anterior' | 'posterior' | 'left' | 'right' | 'superior' | 'inferior'
export type Theme = 'dark' | 'light' | 'system'

/** One-shot camera requests from the UI to the 3D view. `n` makes repeated requests distinct. */
export type CameraCommand =
  | { kind: 'focus'; id: string; n: number; tight?: boolean }
  | { kind: 'view'; view: ViewName; n: number }
  | { kind: 'reset'; n: number }

export interface ErrorReport {
  boneId: string
  category: string
  message: string
  createdAt: string
}

export interface ReviewOverride {
  status: ReviewStatus
  reviewer: string
  date: string
}

interface ViewerState {
  sex: Sex
  selectedId: string | null
  hidden: string[]
  isolated: string[] | null
  ghost: boolean
  labels: boolean
  camera: CameraCommand | null
  panelExpanded: boolean
  loaded: boolean
  select: (id: string | null, opts?: { focus?: boolean }) => void
  focus: (id: string) => void
  setView: (view: ViewName) => void
  resetView: () => void
  hide: (id: string) => void
  isolate: (id: string) => void
  showAll: () => void
  setGhost: (on: boolean) => void
  setLabels: (on: boolean) => void
  setSex: (sex: Sex) => void
  setPanelExpanded: (on: boolean) => void
  setLoaded: (on: boolean) => void
}

let n = 0

export const useViewer = create<ViewerState>((set, get) => ({
  sex: 'male',
  selectedId: null,
  hidden: [],
  isolated: null,
  ghost: false,
  labels: false,
  camera: null,
  panelExpanded: false,
  loaded: false,
  select: (id, opts) =>
    set((s) => ({
      selectedId: id,
      panelExpanded: id ? s.panelExpanded : false,
      // Selecting a hidden bone (e.g. from search) shows it again.
      hidden: id ? s.hidden.filter((h) => h !== id) : s.hidden,
      isolated: id && s.isolated && !s.isolated.includes(id) ? null : s.isolated,
      camera: id && opts?.focus ? { kind: 'focus', id, n: ++n } : s.camera,
    })),
  focus: (id) => set({ camera: { kind: 'focus', id, n: ++n } }),
  setView: (view) => set({ camera: { kind: 'view', view, n: ++n } }),
  resetView: () => set({ camera: { kind: 'reset', n: ++n } }),
  hide: (id) => set((s) => ({ hidden: [...new Set([...s.hidden, id])], selectedId: s.selectedId === id ? null : s.selectedId })),
  isolate: (id) => set({ isolated: [id], selectedId: id, hidden: get().hidden.filter((h) => h !== id), camera: { kind: 'focus', id, n: ++n, tight: true } }),
  showAll: () => set({ hidden: [], isolated: null }),
  setGhost: (ghost) => set({ ghost }),
  setLabels: (labels) => set({ labels }),
  setSex: (sex) => set((s) => (s.sex === sex ? {} : { sex, loaded: false })),
  setPanelExpanded: (panelExpanded) => set({ panelExpanded }),
  setLoaded: (loaded) => set({ loaded }),
}))

interface PrefsState {
  theme: Theme
  disclaimerAccepted: boolean
  reviewerMode: boolean
  reviewerName: string
  reviewOverrides: Record<string, ReviewOverride>
  reports: ErrorReport[]
  setTheme: (t: Theme) => void
  acceptDisclaimer: () => void
  setReviewerMode: (on: boolean) => void
  setReviewerName: (name: string) => void
  setReview: (id: string, status: ReviewStatus) => void
  addReport: (r: ErrorReport) => void
  clearReports: () => void
}

/** Settings and local data that survive reloads. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      disclaimerAccepted: false,
      reviewerMode: false,
      reviewerName: '',
      reviewOverrides: {},
      reports: [],
      setTheme: (theme) => set({ theme }),
      acceptDisclaimer: () => set({ disclaimerAccepted: true }),
      setReviewerMode: (reviewerMode) => set({ reviewerMode }),
      setReviewerName: (reviewerName) => set({ reviewerName }),
      setReview: (id, status) =>
        set({
          reviewOverrides: {
            ...get().reviewOverrides,
            [id]: { status, reviewer: get().reviewerName, date: new Date().toISOString().slice(0, 10) },
          },
        }),
      addReport: (r) => set({ reports: [...get().reports, r] }),
      clearReports: () => set({ reports: [] }),
    }),
    { name: 'atlas.prefs.v1', storage: createJSONStorage(() => appStorage) },
  ),
)
