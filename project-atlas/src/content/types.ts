/** Content schema. All quiz content is data in /content/*.json — never hard-coded. */

export type Vec3 = [number, number, number]

export interface CameraView {
  position: Vec3
  target: Vec3
}

export type Track = 'nursing' | 'medicine' | 'physio' | 'dentistry' | 'sports'
export const TRACKS: Track[] = ['nursing', 'medicine', 'physio', 'dentistry', 'sports']

export interface Structure {
  id: string
  name: string
  synonyms: string[]
  latinName: string
  /** One sentence. Must not contain the answer: it is shown as a clue in learn mode. */
  definition: string
  /** Flashcard: what it does. */
  function: string
  /** Flashcard: why it is there (its purpose / design reason). */
  why: string
  /** Notes per study track; at least one. Tracks without a note fall back to another track's note. */
  notes: Partial<Record<Track, string>>
  region: string
  /** GLB file in /public/models. Usually the module's model. */
  modelFile: string
  /**
   * Mesh name(s) to highlight. Matching ignores case and punctuation and allows
   * side/index suffixes, so "humerus" matches "Humerus.l", "Humerus_R", "humerus2".
   */
  meshName: string | string[]
  camera: CameraView
  difficulty: 1 | 2 | 3
}

export interface Region {
  id: string
  name: string
}

export interface ModuleContent {
  module: string
  regions: Region[]
  structures: Structure[]
}

/** Primitive stand-ins used until real GLB models are added. */
export type PlaceholderShape =
  | { shape: 'sphere'; radius: number; position: Vec3; scale?: Vec3; rotation?: Vec3 }
  | { shape: 'box'; size: Vec3; position: Vec3; rotation?: Vec3 }
  | { shape: 'capsule'; radius: number; from: Vec3; to: Vec3 }
  | { shape: 'cone'; radiusTop: number; radiusBottom: number; height: number; position: Vec3; rotation?: Vec3 }
  /** Bones stacked along Y (vertebrae). */
  | { shape: 'stack'; count: number; radius: number; height: number; position: Vec3 }
  /** Parallel rods hanging along -Y (metacarpals, phalanges). */
  | { shape: 'rods'; count: number; radius: number; length: number; spacing: number; position: Vec3; rotation?: Vec3 }
  /** Half-ring lying in the XZ plane, opening backwards (mandible). */
  | { shape: 'arch'; radius: number; tube: number; position: Vec3 }
  /** Rib cage: elliptical arcs from the spine round to the front. */
  | { shape: 'ribcage'; count: number; top: number; bottom: number; radiusX: [number, number]; radiusZ: [number, number]; tube: number; centerZ: number }

export type PlaceholderPart = PlaceholderShape & { name: string }

export interface PlaceholderModel {
  parts: PlaceholderPart[]
}

export interface ModuleInfo {
  id: string
  status: 'available' | 'coming-soon'
  /** Basename of /content/<contentFile>.json */
  contentFile?: string
  /** Basename of /content/<placeholderFile>.json */
  placeholderFile?: string
  model?: {
    file: string
    /** Transform that brings the GLB into atlas space (metres, Y-up, facing +Z, feet at y=0). */
    scale?: number
    position?: Vec3
    rotation?: Vec3
    /** Faint backdrop model for orientation, e.g. the skeleton behind organs. */
    context?: string
  }
  /** Set by the loader. */
  systemId?: string
}

/** Names and descriptions of systems and modules live in the UI translations (system.<id>, module.<id>). */
export interface BodySystem {
  id: string
  glyph: string
  modules: ModuleInfo[]
}

export interface Catalog {
  systems: BodySystem[]
}
