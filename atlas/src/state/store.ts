import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { appStorage } from '../lib/storage'
import type { ReviewStatus, Sex } from '../data/types'
import { regionBones, type RegionSide } from '../data/bones'

export type LabelDensity = 'all' | 'main' | 'none'

export type ViewName = 'anterior' | 'posterior' | 'left' | 'right' | 'superior' | 'inferior'
export type Theme = 'dark' | 'light' | 'system'

/** One-shot camera requests from the UI to the 3D view. `n` makes repeated requests distinct. */
export type CameraCommand =
  | { kind: 'focus'; id: string; n: number; tight?: boolean }
  | { kind: 'view'; view: ViewName; n: number }
  | { kind: 'reset'; n: number }
  | { kind: 'frame'; id: string; n: number; region?: boolean; close?: boolean }
  /** Frame every bone on show (the region view), from the front. */
  | { kind: 'fit'; n: number }
  /** Fly to a soft part (muscle or organ). */
  | { kind: 'part'; id: string; n: number }

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

/**
 * Layers of the male model, from the inside out: each step adds one. 0 = the skeleton only (the bone view every study
 * mode uses), 1 + organs, 2 + deep muscles, 3 + superficial muscles, 4 + skin. Muscles and organs exist for the male
 * model only; the female model is the skeleton.
 */
export const LAYERS = ['Skeleton', 'Organs', 'Deep muscles', 'Superficial muscles', 'Skin'] as const
export type LayerLevel = 0 | 1 | 2 | 3 | 4

interface ViewerState {
  sex: Sex
  selectedId: string | null
  /** Soft-tissue layers on show (see LAYERS). */
  layer: LayerLevel
  setLayer: (l: LayerLevel) => void
  /** The layer control is open (it and the exploded view's controls are never open together). */
  layersOpen: boolean
  setLayersOpen: (on: boolean) => void
  /** The selected muscle, organ or other soft part (content/parts/male.json id); a bone and a part are never both selected. */
  partId: string | null
  selectPart: (id: string | null, opts?: { focus?: boolean }) => void
  /** Soft parts hidden by hand ("Show all" brings them back). */
  hiddenParts: string[]
  hidePart: (id: string) => void
  hidden: string[]
  isolated: string[] | null
  /** 3D region view: a regions.json group ('all' = whole skeleton), the side for limbs, and the bones it shows. */
  region: string
  regionSide: RegionSide
  regionIds: string[] | null
  showRegion: (region: string, side?: RegionSide) => void
  ghost: boolean
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
  /** frame: fly to the bone with its neighbours (true), close on the bone itself ('close'), or not at all. */
  setHighlight: (h: { target: string[]; wrong?: string[] } | null, frame?: boolean | 'close') => void
  /** Spelling Quiz: the bone shown in the two rotating side views (null = no side views). */
  thumbs: string | null
  setThumbs: (id: string | null) => void
  setOnTap: (fn: ((id: string | null) => void) | null) => void
  /** Frame the region around a bone without pointing at it ("tap the bone" questions). */
  frameRegion: (id: string) => void
  /** Fly to a bone's cluster (e.g. the hand's phalanges), framing them all. */
  frameCluster: (id: string) => void
  select: (id: string | null, opts?: { focus?: boolean }) => void
  focus: (id: string) => void
  setView: (view: ViewName) => void
  resetView: () => void
  hide: (id: string) => void
  isolate: (id: string) => void
  showAll: () => void
  setGhost: (on: boolean) => void
  setSex: (sex: Sex) => void
  setPanelExpanded: (on: boolean) => void
  setLoaded: (on: boolean) => void
}

let n = 0

export const useViewer = create<ViewerState>((set, get) => ({
  sex: 'male',
  selectedId: null,
  layer: 0,
  // Muscles and organs sit on the bones where they are: showing them puts any pulled-out bones back.
  setLayer: (layer) => set((s) => ({ layer, partId: layer === 0 ? null : s.partId, ...(layer > 0 ? { explodeAmount: 0, dragged: {} } : {}) })),
  layersOpen: false,
  setLayersOpen: (layersOpen) => set(layersOpen ? { layersOpen, explodeOpen: false } : { layersOpen }),
  partId: null,
  hiddenParts: [],
  hidePart: (id) => set((s) => ({ hiddenParts: [...new Set([...s.hiddenParts, id])], partId: s.partId === id ? null : s.partId })),
  selectPart: (id, opts) =>
    set((s) => ({
      partId: id,
      selectedId: id ? null : s.selectedId,
      hiddenParts: id ? s.hiddenParts.filter((h) => h !== id) : s.hiddenParts,
      panelExpanded: id ? s.panelExpanded : false,
      camera: id && opts?.focus ? { kind: 'part', id, n: ++n } : s.camera,
    })),
  hidden: [],
  isolated: null,
  region: 'all',
  // Limbs one at a time by default: both hands (or arms) side by side are each too small to study.
  regionSide: 'right',
  regionIds: null,
  showRegion: (region, side) => {
    const regionSide = side ?? get().regionSide
    const ids = region === 'all' ? null : regionBones(region, regionSide).map((b) => b.id)
    set({
      region,
      regionSide,
      regionIds: ids,
      isolated: null,
      hidden: [],
      selectedId: null,
      panelExpanded: false,
      // The exploded view takes the region on show; start it assembled.
      explodeGroup: region,
      explodeAmount: 0,
      dragged: {},
      camera: { kind: 'fit', n: ++n },
    })
  },
  ghost: false,
  camera: null,
  panelExpanded: false,
  loaded: false,
  explodeOpen: false,
  explodeGroup: 'all',
  explodeAmount: 0,
  dragged: {},
  // The exploded view is of the bones: opening it shows the skeleton alone.
  setExplodeOpen: (explodeOpen) => set(explodeOpen ? { explodeOpen, layersOpen: false, layer: 0, partId: null } : { explodeOpen }),
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
      partId: null,
      layer: 0,
      hidden: [],
      isolated: null,
      regionIds: null,
      ghost: false,
      explodeOpen: false,
      explodeAmount: 0,
      dragged: {},
      panelExpanded: false,
    }),
  endStudy: () =>
    set((s) => ({
      studying: false,
      highlight: null,
      thumbs: null,
      onTap: null,
      // Back to the region view the student left.
      regionIds: s.region === 'all' ? null : regionBones(s.region, s.regionSide).map((b) => b.id),
      camera: { kind: 'reset', n: ++n },
    })),
  setHighlight: (h, frame = true) =>
    set({
      highlight: h ? { target: h.target, wrong: h.wrong ?? [] } : null,
      ...(h && frame && h.target[0] ? { camera: { kind: 'frame' as const, id: h.target[0], n: ++n, close: frame === 'close' } } : {}),
    }),
  thumbs: null,
  setThumbs: (thumbs) => set({ thumbs }),
  setOnTap: (onTap) => set({ onTap }),
  frameCluster: (id) => set({ camera: { kind: 'frame', id, n: ++n } }),
  frameRegion: (id) => set({ highlight: null, camera: { kind: 'frame', id, n: ++n, region: true } }),
  select: (id, opts) =>
    set((s) => ({
      selectedId: id,
      partId: id ? null : s.partId,
      panelExpanded: id ? s.panelExpanded : false,
      // Selecting a hidden bone (e.g. from search) shows it again.
      hidden: id ? s.hidden.filter((h) => h !== id) : s.hidden,
      isolated: id && s.isolated && !s.isolated.includes(id) ? null : s.isolated,
      // A bone outside the region on show (e.g. from search) brings back the whole skeleton.
      ...(id && s.regionIds && !s.regionIds.includes(id) ? { region: 'all', regionIds: null, explodeGroup: 'all' } : {}),
      camera: id && opts?.focus ? { kind: 'focus', id, n: ++n } : s.camera,
    })),
  focus: (id) => set({ camera: { kind: 'focus', id, n: ++n } }),
  setView: (view) => set({ camera: { kind: 'view', view, n: ++n } }),
  resetView: () => set({ camera: { kind: 'reset', n: ++n } }),
  hide: (id) => set((s) => ({ hidden: [...new Set([...s.hidden, id])], selectedId: s.selectedId === id ? null : s.selectedId })),
  isolate: (id) => set({ isolated: [id], selectedId: id, hidden: get().hidden.filter((h) => h !== id), camera: { kind: 'focus', id, n: ++n, tight: true } }),
  showAll: () => set({ hidden: [], isolated: null, hiddenParts: [] }),
  setGhost: (ghost) => set({ ghost }),
  setSex: (sex) => set((s) => (s.sex === sex ? {} : { sex, loaded: false, partId: null })),
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
  spellSet?: string // Spelling Quiz: the last set (content/sets.json id)
  spellMode?: 'learn' | 'hard' // Learn shows ghost letters and a description; Hard shows blanks only
}

export const DEFAULT_STUDY: StudySettings = { area: 'all', sex: 'male', count: 20, timeLimit: 0, perQuestion: 20, newPerDay: 15, sound: true }

export const COURSES = ['Nursing', 'Medicine', 'Physiotherapy', 'Dentistry', 'Sports science'] as const
export type Course = (typeof COURSES)[number]

interface PrefsState {
  /** The student's first name (greeting), course and daily goal (answers a day). */
  name: string
  course: Course | ''
  dailyGoal: number
  /** Light vibration feedback on taps and answers (phones that support it). */
  haptics: boolean
  setProfile: (p: Partial<{ name: string; course: Course | ''; dailyGoal: number; haptics: boolean }>) => void
  /** Modesty: the genital organs and the urethra stay hidden in the 3D view (on by default). */
  modesty: boolean
  setModesty: (on: boolean) => void
  /** Frame rate readout in the 3D view (for checking performance on a device). */
  showFps: boolean
  setShowFps: (on: boolean) => void
  /** Bone labels in the 3D view: every bone, the main bones (content/labels.json), or none. */
  labelDensity: LabelDensity
  setLabelDensity: (d: LabelDensity) => void
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
      name: '',
      course: '',
      dailyGoal: 20,
      haptics: true,
      setProfile: (p) => set(p),
      modesty: true,
      setModesty: (modesty) => set({ modesty }),
      showFps: false,
      setShowFps: (showFps) => set({ showFps }),
      labelDensity: 'main',
      setLabelDensity: (labelDensity) => set({ labelDensity }),
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
