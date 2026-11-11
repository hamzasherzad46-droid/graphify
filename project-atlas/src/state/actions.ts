import { allModules } from '../content/loader'
import { loadModuleAssets } from '../content/useModule'
import { isMissed } from '../lib/srs'
import { ASSESSMENT_LENGTH, ASSESSMENT_TIME_MS, PRACTICE_LENGTH, useNav } from './nav'
import { useProgress } from './progress'
import { useSettings, type QuizMode } from './settings'

export const defaultModuleId = allModules.find((m) => m.status === 'available')?.id ?? 'skeleton'

export function startPractice(moduleId: string, region: string | null, mode: QuizMode) {
  useSettings.getState().setLastSession({ moduleId, region, mode })
  useNav.getState().startSession({ kind: 'practice', moduleId, region, mode, length: PRACTICE_LENGTH })
}

export function startAssessment(moduleId: string) {
  useNav.getState().startSession({
    kind: 'assessment',
    moduleId,
    region: null,
    mode: 'hard',
    length: ASSESSMENT_LENGTH,
    timeLimitMs: ASSESSMENT_TIME_MS,
  })
}

/** Ids in this module that were answered imperfectly last time. */
export async function missedIds(moduleId: string): Promise<string[]> {
  const { content } = await loadModuleAssets(moduleId)
  const records = useProgress.getState().records
  return content.structures.filter((s) => isMissed(records[s.id])).map((s) => s.id)
}

export async function startReview(moduleId: string) {
  const ids = await missedIds(moduleId)
  if (!ids.length) return false
  useNav.getState().startSession({ kind: 'review', moduleId, region: null, mode: 'learn', ids, length: ids.length })
  return true
}
