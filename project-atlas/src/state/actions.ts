import { allModules } from '../content/loader'
import { loadModuleAssets } from '../content/useModule'
import { isMissed } from '../lib/srs'
import { ASSESSMENT_ANSWER_TIMER, ASSESSMENT_LENGTH, ASSESSMENT_TIME_MS, PRACTICE_LENGTH, useNav } from './nav'
import { useProgress } from './progress'
import { useSettings, type QuizMode } from './settings'

export const availableModules = allModules.filter((m) => m.status === 'available')
export const defaultModuleId = availableModules[0]?.id ?? 'skeleton'

export function startPractice(moduleId: string, region: string | null, mode: QuizMode, answerTimer = useSettings.getState().answerTimer) {
  useSettings.getState().set({ lastSession: { moduleId, region, mode } })
  useNav.getState().startSession({ kind: 'practice', moduleId, region, mode, length: PRACTICE_LENGTH, answerTimer })
}

export function startAssessment(moduleId: string) {
  useNav.getState().startSession({
    kind: 'assessment',
    moduleId,
    region: null,
    mode: 'hard',
    length: ASSESSMENT_LENGTH,
    timeLimitMs: ASSESSMENT_TIME_MS,
    answerTimer: ASSESSMENT_ANSWER_TIMER,
  })
}

/** Ids in this module that still need review (answered wrongly and not yet re-learned). */
export async function missedIds(moduleId: string): Promise<string[]> {
  const { content } = await loadModuleAssets(moduleId)
  const records = useProgress.getState().records
  return content.structures.filter((s) => isMissed(records[s.id])).map((s) => s.id)
}

export async function startReview(moduleId: string) {
  const ids = await missedIds(moduleId)
  if (!ids.length) return false
  useNav.getState().startSession({ kind: 'review', moduleId, region: null, mode: 'learn', ids, length: ids.length, answerTimer: 0 })
  return true
}

export function startCards(moduleId: string, region: string | null = null) {
  useNav.getState().startCards({ moduleId, region })
}
