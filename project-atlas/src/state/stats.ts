import type { ModuleContent, Structure } from '../content/types'
import { isMastered, type StructureRecord } from '../lib/srs'

export interface RegionStats {
  id: string
  name: string
  total: number
  seen: number
  mastered: number
  attempts: number
  correct: number
  /** 0..100, or null if never attempted. */
  accuracy: number | null
}

export function regionStats(content: ModuleContent, records: Record<string, StructureRecord>): RegionStats[] {
  return content.regions.map((r) => {
    const items = content.structures.filter((s) => s.region === r.id)
    let seen = 0
    let mastered = 0
    let attempts = 0
    let correct = 0
    for (const s of items) {
      const rec = records[s.id]
      if (!rec) continue
      seen++
      if (isMastered(rec)) mastered++
      attempts += rec.attempts
      correct += rec.correct
    }
    return {
      id: r.id,
      name: r.name,
      total: items.length,
      seen,
      mastered,
      attempts,
      correct,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
    }
  })
}

/** Weakest regions first (only regions with some attempts). */
export function weakRegions(stats: RegionStats[], min = 3): RegionStats[] {
  return stats.filter((r) => r.attempts >= min && (r.accuracy ?? 100) < 85).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
}

export interface MissedItem {
  structure: Structure
  record: StructureRecord
  misses: number
}

export function mostMissed(content: ModuleContent, records: Record<string, StructureRecord>, limit = 8): MissedItem[] {
  return content.structures
    .map((s) => ({ structure: s, record: records[s.id], misses: records[s.id] ? records[s.id].attempts - records[s.id].correct : 0 }))
    .filter((x): x is MissedItem => !!x.record && x.misses > 0)
    .sort((a, b) => b.misses - a.misses || b.record.errors - a.record.errors)
    .slice(0, limit)
}

