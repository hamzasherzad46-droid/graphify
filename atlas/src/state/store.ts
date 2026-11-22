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
  | { kind: 'frame'; id: string; n: number; region?: boolean }

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
  /** Exploded view: whether its controls are open, which group explodes ('all' or a regions.json group id), 0–1. */
  explodeOpen: boolean
  explodeGroup: string
  explodeAmount: number
  /** Bones pulled out by hand: offset from where the explode puts them, in metres. */
  dragged: Record<string, [number, number, number]>
  setExplodeOpen: (on: boolean) => void
  setExplodeGroup: (g: string) => void
  setExplodeAmount: (a: number) => void
  setDragged: (id: string, offset: [number, number, number]) => void
  reassemble: () => void
  /** Study session running: explore controls are hidden and taps go to `onTap`. */
  studying: boolean
  /** Study highlight: target bones lit on a dimmed skeleton; wrong = a mistaken tap, shown in red. */
  highlight: { target: string[]; wrong: string[] } | null
  onTap: ((id: string | null) => void) | null
  startStudy: () => void
  endStudy: () => void
  setHighlight: (h: { target: string[]; wrong?: string[] } | null, frame?: boolean) => void
  setOnTap: (fn: ((id: string | null) => void) | null) => void
  /** Frame the region around a bone without pointing at it ("tap the bone" questions). */
  frameRegion: (id: string) => void
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
  explodeOpen: false,
  explodeGroup: 'all',
  explodeAmount: 0,
  dragged: {},
  setExplodeOpen: (explodeOpen) => set({ explodeOpen }),
  setExplodeGroup: (explodeGroup) => set({ explodeGroup }),
  setExplodeAmount: (explodeAmount) => set({ explodeAmount }),
  setDragged: (id, offset) => set((s) => ({ dragged: { ...s.dragged, [id]: offset } })),
  reassemble: () => set({ explodeAmount: 0, dragged: {} }),
  studying: false,
  highlight: null,
  onTap: null,
  startStudy: () =>
    set({
      studying: true,
      selectedId: null,
      hidden: [],
      isolated: null,
      ghost: false,
      labels: false,
      explodeOpen: false,
      explodeAmount: 0,
      dragged: {},
      panelExpanded: false,
    }),
  endStudy: () => set({ studying: false, highlight: null, onTap: null, camera: { kind: 'reset', n: ++n } }),
  setHighlight: (h, frame = true) =>
    set({
      highlight: h ? { target: h.target, wrong: h.wrong ?? [] } : null,
      ...(h && frame && h.target[0] ? { camera: { kind: 'frame' as const, id: h.target[0], n: ++n } } : {}),
    }),
  setOnTap: (onTap) => set({ onTap }),
  frameRegion: (id) => set({ highlight: null, camera: { kind: 'frame', id, n: ++n, region: true } }),
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

export interface StudySettings {
  area: string // 'all' or a regions.json group id
  sex: Sex
  count: number // questions per session, 0 = all
  timeLimit: number // typing test: seconds for the whole test, 0 = none
  perQuestion: number // quiz: seconds per question, 0 = none
  newPerDay: number // flashcards: new cards per day
  sound: boolean // soft keyboard click and answer tones
}

export const DEFAULT_STUDY: StudySettings = { area: 'all', sex: 'male', count: 20, timeLimit: 0, perQuestion: 20, newPerDay: 15, sound: true }

interface PrefsState {
  study: StudySettings
  setStudy: (s: Partial<StudySettings>) => void
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
      study: DEFAULT_STUDY,
      setStudy: (s) => set({ study: { ...get().study, ...s } }),
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
