import { create } from 'zustand'
import type { Structure } from '../content/types'
import { acceptedAnswers, applyKey, emptyTyping, type KeyInput, type TypingState } from '../lib/typing'
import { outcomeFor, prioritise, requeue, type Outcome, type StructureRecord } from '../lib/srs'
import { playSound } from '../lib/sound'
import type { SessionConfig } from './nav'
import { useProgress } from './progress'
import { useSettings, type Track } from './settings'

export type Phase = 'typing' | 'done' | 'finished'

export interface QuestionResult {
  id: string
  outcome: Outcome
  errors: number
}

export interface KeyFlash {
  key: string
  kind: 'ok' | 'wrong'
  /** Increments on every flash so repeated keys re-trigger animations. */
  n: number
}

interface QuizState {
  config: SessionConfig | null
  byId: Record<string, Structure>
  queue: string[]
  index: number
  answers: string[]
  typing: TypingState
  phase: Phase
  qErrors: number
  qStart: number
  lastOutcome: Outcome | null
  keysCorrect: number
  keysWrong: number
  streak: number
  bestStreak: number
  results: QuestionResult[]
  requeued: string[]
  flash: KeyFlash | null
  wrongCount: number
  startedAt: number
  finishedAt: number
  endsAt: number | null
  init(config: SessionConfig, structures: Structure[]): void
  press(input: KeyInput): void
  skip(): void
  next(): void
  finish(): void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildQueue(config: SessionConfig, structures: Structure[], records: Record<string, StructureRecord>): string[] {
  if (config.ids?.length) return shuffle(config.ids).slice(0, config.length)
  const pool = structures.filter((s) => !config.region || s.region === config.region)
  if (config.kind === 'assessment') return shuffle(pool).slice(0, config.length).map((s) => s.id)
  return prioritise(pool, records, Date.now())
    .slice(0, config.length)
    .map((s) => s.id)
}

export function answersFor(s: Structure, track: Track): string[] {
  return acceptedAnswers(s.name, s.synonyms, track === 'medicine' ? [s.latinName] : [])
}

const fresh = {
  queue: [] as string[],
  index: 0,
  answers: [] as string[],
  typing: emptyTyping,
  phase: 'typing' as Phase,
  qErrors: 0,
  qStart: 0,
  lastOutcome: null,
  keysCorrect: 0,
  keysWrong: 0,
  streak: 0,
  bestStreak: 0,
  results: [] as QuestionResult[],
  requeued: [] as string[],
  flash: null,
  wrongCount: 0,
  startedAt: 0,
  finishedAt: 0,
  endsAt: null,
}

export const useQuiz = create<QuizState>()((set, get) => {
  const flashOf = (key: string, kind: KeyFlash['kind']): KeyFlash => ({ key, kind, n: (get().flash?.n ?? 0) + 1 })

  const loadQuestion = (index: number) => {
    const { queue, byId } = get()
    const s = byId[queue[index]]
    set({
      index,
      answers: s ? answersFor(s, useSettings.getState().track) : [],
      typing: emptyTyping,
      phase: 'typing',
      qErrors: 0,
      qStart: Date.now(),
      lastOutcome: null,
    })
  }

  const complete = (skipped: boolean) => {
    const st = get()
    const id = st.queue[st.index]
    const errors = st.qErrors
    const outcome = outcomeFor(errors, skipped)
    useProgress.getState().record(id, outcome, errors, Date.now() - st.qStart)
    const streak = outcome === 'perfect' ? st.streak + 1 : 0
    let queue = st.queue
    let requeued = st.requeued
    // In practice and review, missed items come back later in the same session (once).
    if (outcome !== 'perfect' && st.config?.kind !== 'assessment' && !requeued.includes(id)) {
      queue = requeue(queue, st.index, id)
      requeued = [...requeued, id]
    }
    set({
      phase: 'done',
      lastOutcome: outcome,
      streak,
      bestStreak: Math.max(st.bestStreak, streak),
      results: [...st.results, { id, outcome, errors }],
      queue,
      requeued,
      // On skip, reveal the answer.
      typing: skipped ? { buffer: st.answers[0] ?? '', awaitingEnter: false } : st.typing,
    })
    playSound(outcome === 'failed' ? 'fail' : 'complete')
  }

  return {
    config: null,
    byId: {},
    ...fresh,

    init(config, structures) {
      const byId = Object.fromEntries(structures.map((s) => [s.id, s]))
      const queue = buildQueue(config, structures, useProgress.getState().records)
      const now = Date.now()
      set({ ...fresh, config, byId, queue, startedAt: now, endsAt: config.timeLimitMs ? now + config.timeLimitMs : null })
      loadQuestion(0)
      if (!queue.length) set({ phase: 'finished', finishedAt: now })
    },

    press(input) {
      const st = get()
      if (st.phase === 'done') {
        // Enter or Space skips the remaining pause.
        if (input.type === 'enter' || (input.type === 'char' && input.char === ' ')) get().next()
        return
      }
      if (st.phase !== 'typing') return
      const { state, result } = applyKey(st.typing, input, st.answers)
      const keyLabel = input.type === 'char' ? input.char.toLowerCase() : input.type
      switch (result) {
        case 'wrong':
          set({ qErrors: st.qErrors + 1, keysWrong: st.keysWrong + 1, flash: flashOf(keyLabel, 'wrong'), wrongCount: st.wrongCount + 1 })
          playSound('wrong')
          return
        case 'ignored':
          return
        case 'deleted':
          set({ typing: state, flash: flashOf('backspace', 'ok') })
          return
        case 'correct':
        case 'complete': {
          const isHint = input.type === 'hint'
          set({
            typing: state,
            qErrors: st.qErrors + (isHint ? 1 : 0),
            keysCorrect: st.keysCorrect + (isHint ? 0 : 1),
            keysWrong: st.keysWrong + (isHint ? 1 : 0),
            flash: flashOf(isHint ? 'hint' : keyLabel, 'ok'),
          })
          if (result === 'complete') complete(false)
          else playSound('key')
        }
      }
    },

    skip() {
      if (get().phase === 'typing') complete(true)
    },

    next() {
      const st = get()
      if (st.phase === 'finished') return
      if (st.index + 1 >= st.queue.length) return get().finish()
      loadQuestion(st.index + 1)
    },

    finish() {
      const st = get()
      if (st.phase === 'finished') return
      set({ phase: 'finished', finishedAt: Date.now() })
      if (st.config?.kind === 'assessment') {
        const unique = new Map(st.results.map((r) => [r.id, r]))
        useProgress.getState().addAssessment({
          at: Date.now(),
          moduleId: st.config.moduleId,
          total: st.queue.length,
          // In a typing test a rejected letter can be retried, so only error-free answers score.
          correct: [...unique.values()].filter((r) => r.outcome === 'perfect').length,
          durationMs: Date.now() - st.startedAt,
          missed: st.queue.filter((id) => unique.get(id)?.outcome !== 'perfect'),
        })
      }
    },
  }
})

export function accuracyOf(keysCorrect: number, keysWrong: number): number {
  const total = keysCorrect + keysWrong
  return total ? Math.round((keysCorrect / total) * 100) : 100
}
