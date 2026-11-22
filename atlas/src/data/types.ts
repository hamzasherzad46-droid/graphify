export type Side = 'left' | 'right' | 'midline'
export type BoneType = 'long' | 'short' | 'flat' | 'irregular' | 'sesamoid'
export type ReviewStatus = 'draft' | 'reviewed'

/** One bone, as stored in content/bones/<id>.json. */
export interface Bone {
  id: string
  name: string
  latin: string
  taCode: string
  region: string
  subregion?: string
  side: Side
  type: BoneType
  features: string[]
  articulations: string[]
  clinical: string
  acceptedSpellings: string[]
  reviewStatus: ReviewStatus
  reviewer: string
  lastUpdated: string
  /** Shown when the 3D shape is approximate (not from the source dataset) in the current model. */
  modelNote?: string
  /** How the bone typically differs between females and males (only where it does). */
  sexDifferences?: string
}

export type Sex = 'male' | 'female'
