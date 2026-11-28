import type { LayerLevel } from '../state/store'

/**
 * The soft parts of the male model (muscles, tendons, fasciae, bursae, organs …), by Atlas id, from
 * content/parts/male.json (generated from the Z-Anatomy models by scripts/model/part_names.py). Loaded with the 3D
 * layers, not at start: the list is large.
 */
export type PartKind =
  | 'muscle' | 'tendon' | 'aponeurosis' | 'fascia' | 'sheath' | 'bursa' | 'ligament' | 'eye' | 'cartilage'
  | 'heart' | 'artery' | 'vein' | 'lung' | 'airway' | 'liver' | 'bile' | 'gut' | 'mouth' | 'gland' | 'kidney' | 'urinary'
  | 'spleen' | 'brain' | 'cord' | 'genital' | 'membrane'

export type PartLayer = 'deep' | 'superficial' | 'connective' | 'organs'
export type PartSystem = 'digestive' | 'respiratory' | 'cardiovascular' | 'urinary' | 'endocrine' | 'lymphoid' | 'nervous' | 'genital'

export interface Part {
  id: string
  name: string
  kind: PartKind
  layer: PartLayer
  side: 'left' | 'right' | 'midline'
  system?: PartSystem
  /** Hidden while modesty is on (the genital organs and the urethra). */
  modesty?: boolean
  /** Not shown in the 3D view (thin membranes that would veil the organs). */
  hidden?: boolean
}

let parts: Promise<Map<string, Part>> | null = null

export function loadParts(): Promise<Map<string, Part>> {
  parts ??= import('../../content/parts/male.json').then((m) => {
    const all = (m.default as { parts: Record<string, Omit<Part, 'id'>> }).parts
    return new Map(Object.entries(all).map(([id, p]) => [id, { id, ...p } as Part]))
  })
  return parts
}

/** What a part is, in a word or two (shown under its name). */
export const KIND_LABEL: Record<PartKind, string> = {
  muscle: 'Muscle', tendon: 'Tendon', aponeurosis: 'Aponeurosis', fascia: 'Fascia', sheath: 'Tendon sheath', bursa: 'Bursa',
  ligament: 'Ligament or retinaculum', eye: 'Eye', cartilage: 'Cartilage', heart: 'Heart', artery: 'Artery', vein: 'Vein',
  lung: 'Lung', airway: 'Airway', liver: 'Liver', bile: 'Biliary system', gut: 'Digestive tract', mouth: 'Mouth and pharynx',
  gland: 'Gland', kidney: 'Kidney', urinary: 'Urinary tract', spleen: 'Spleen', brain: 'Brain', cord: 'Spinal cord',
  genital: 'Reproductive organ', membrane: 'Membrane',
}

export const SYSTEM_LABEL: Record<PartSystem, string> = {
  digestive: 'Digestive system', respiratory: 'Respiratory system', cardiovascular: 'Cardiovascular system',
  urinary: 'Urinary system', endocrine: 'Endocrine system', lymphoid: 'Lymphatic system', nervous: 'Nervous system',
  genital: 'Reproductive system',
}

/** The body system a part belongs to (muscles and their connective tissue: the muscular system). */
export const systemOf = (p: Part): string =>
  p.system ? SYSTEM_LABEL[p.system] : p.kind === 'eye' ? 'Special senses' : p.kind === 'cartilage' ? 'Respiratory system' : 'Muscular system'

/** The layer a part belongs to, as the layer control names it. */
export const LAYER_LABEL: Record<PartLayer, string> = {
  deep: 'Deep muscles', superficial: 'Superficial muscles', connective: 'Connective tissue', organs: 'Organs',
}

/** The layer level at which a part first shows (see LAYERS in the store). */
export const layerFor = (p: Part): 1 | 2 | 3 => (p.layer === 'organs' ? 1 : p.layer === 'deep' ? 2 : 3)

/** The textbook topic that teaches a part (content/topics.json), or null. */
export function topicFor(p: Part): string | null {
  const n = p.name.toLowerCase()
  switch (p.kind) {
    case 'heart':
      return 'heart'
    case 'artery':
    case 'vein':
      return /coronary|cardiac|interventricular|circumflex|ventricle/.test(n) ? 'heart' : 'vessels'
    case 'lung':
    case 'airway':
    case 'cartilage':
      return 'respiratory'
    case 'gut':
    case 'liver':
    case 'bile':
    case 'mouth':
      return 'digestive'
    case 'gland':
      return p.system === 'endocrine' ? 'endocrine' : p.system === 'lymphoid' ? 'lymphatic' : 'digestive'
    case 'kidney':
    case 'urinary':
      return 'urinary'
    case 'spleen':
      return 'lymphatic'
    case 'brain':
    case 'cord':
    case 'eye':
      return 'nervous'
    case 'genital':
      return null
    case 'membrane':
      return p.system === 'respiratory' ? 'respiratory' : 'digestive'
    default:
      return 'muscles'
  }
}

/** Fasciae, tendon sheaths and bursae would veil the muscles: they are never drawn. */
const VEILS = new Set(['fascia', 'sheath', 'bursa'])

/** Is a part on show at this layer level? */
export function partShown(p: Part, level: LayerLevel, modesty: boolean): boolean {
  if (p.hidden || (modesty && p.modesty) || VEILS.has(p.kind)) return false
  if (p.layer === 'organs') return level >= 1
  if (p.layer === 'deep') return level >= 2
  return level >= 3 // superficial muscles, tendons and retinacula, eyes, nasal cartilage
}

