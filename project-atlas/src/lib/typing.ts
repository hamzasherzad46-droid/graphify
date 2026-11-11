/**
 * Typing engine for the answer word. Pure functions, no React.
 *
 * Every keystroke is checked against all accepted answers (name + synonyms).
 * A letter is correct if the typed text is still a prefix of at least one
 * accepted answer; otherwise it is rejected (not inserted) and counts as an error.
 */

/** Lower-case, strip accents, keep letters and single spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Accepted answers in priority order, de-duplicated. The first one is the display answer. */
export function acceptedAnswers(name: string, synonyms: string[], extra: string[] = []): string[] {
  const out: string[] = []
  for (const s of [name, ...synonyms, ...extra]) {
    const n = normalizeAnswer(s)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

export type KeyInput = { type: 'char'; char: string } | { type: 'backspace' } | { type: 'enter' } | { type: 'hint' }

export type KeyResult =
  | 'correct' // letter accepted
  | 'wrong' // letter rejected
  | 'deleted'
  | 'complete' // buffer now equals an accepted answer
  | 'ignored'

export interface TypingState {
  buffer: string
  /** True when the buffer is a full answer that is also a prefix of a longer one; Enter confirms. */
  awaitingEnter: boolean
}

export const emptyTyping: TypingState = { buffer: '', awaitingEnter: false }

/** The answer the student is currently heading towards (used for ghost letters / dashes). */
export function activeAnswer(buffer: string, answers: string[]): string {
  return answers.find((a) => a.startsWith(buffer)) ?? answers[0] ?? ''
}

function settle(buffer: string, answers: string[]): { state: TypingState; result: KeyResult } {
  const exact = answers.includes(buffer)
  if (!exact) return { state: { buffer, awaitingEnter: false }, result: 'correct' }
  const longer = answers.some((a) => a !== buffer && a.startsWith(buffer))
  if (longer) return { state: { buffer, awaitingEnter: true }, result: 'correct' }
  return { state: { buffer, awaitingEnter: false }, result: 'complete' }
}

export function applyKey(state: TypingState, input: KeyInput, answers: string[]): { state: TypingState; result: KeyResult } {
  const { buffer } = state
  switch (input.type) {
    case 'backspace': {
      if (!buffer) return { state, result: 'ignored' }
      const next = buffer.slice(0, -1)
      return { state: { buffer: next, awaitingEnter: answers.includes(next) && next.length > 0 }, result: 'deleted' }
    }
    case 'enter':
      return answers.includes(buffer) ? { state: { buffer, awaitingEnter: false }, result: 'complete' } : { state, result: 'ignored' }
    case 'hint': {
      const target = activeAnswer(buffer, answers)
      if (!target.startsWith(buffer) || buffer.length >= target.length) return { state, result: 'ignored' }
      return settle(buffer + target[buffer.length], answers)
    }
    case 'char': {
      const ch = input.char.toLowerCase()
      if (ch === ' ') {
        // Ignore leading/double spaces silently rather than punishing them.
        if (!buffer || buffer.endsWith(' ')) return { state, result: 'ignored' }
      } else if (!/^[a-z]$/.test(ch)) {
        return { state, result: 'ignored' }
      }
      const next = buffer + ch
      if (!answers.some((a) => a.startsWith(next))) return { state, result: 'wrong' }
      return settle(next, answers)
    }
  }
}
