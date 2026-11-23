import { describe, expect, it } from 'vitest'
import { segmentFor } from './anchor'
import { sentenceAround, suggestFromHighlight, suggestFromNote } from './mycards'
import type { Annotation } from './annotations'

const PARA = 'In the adult, the skull consists of 22 individual bones, 21 of which are immobile and united into a single unit. The 22nd bone is the mandible (lower jaw), which is the only moveable bone of the skull.'
const ann = (quote: string, extra: Partial<Annotation> = {}): Annotation => {
  const i = PARA.indexOf(quote)
  return { id: 'a', doc: 'tb:s7-2', docLabel: '7.2 The Skull', segs: [segmentFor('p', PARA, i, i + quote.length)], color: 'yellow', note: '', createdAt: '', updatedAt: '', ...extra }
}

describe('turning highlights and notes into flashcards', () => {
  it('finds the sentence around a phrase', () => {
    const i = PARA.indexOf('mandible')
    const s = sentenceAround(PARA, i, i + 8)
    expect(PARA.slice(s.start, s.end)).toBe('The 22nd bone is the mandible (lower jaw), which is the only moveable bone of the skull.')
  })
  it('blanks the highlighted words in their sentence (full paragraph known)', () => {
    expect(suggestFromHighlight(ann('mandible'), PARA)).toEqual({
      front: 'The 22nd bone is the _____ (lower jaw), which is the only moveable bone of the skull.',
      back: 'mandible',
    })
  })
  it('still makes a fair blank from the saved context alone', () => {
    const c = suggestFromHighlight(ann('22 individual bones'))
    expect(c.back).toBe('22 individual bones')
    expect(c.front).toContain('_____')
    expect(c.front).toContain('the skull consists of _____')
  })
  it('splits a whole-sentence highlight into prompt and answer', () => {
    const whole = 'The 22nd bone is the mandible (lower jaw), which is the only moveable bone of the skull.'
    const c = suggestFromHighlight(ann(whole), PARA)
    expect(c.front.endsWith('_____')).toBe(true)
    expect(`${c.front.replace(' _____', '')} ${c.back}`).toBe(whole)
  })
  it('puts a note on the back and its text on the front', () => {
    expect(suggestFromNote(ann('mandible', { color: null, note: ' TMJ is synovial ' }))).toEqual({ front: 'mandible', back: 'TMJ is synovial' })
    expect(suggestFromNote({ ...ann('mandible'), segs: [], note: 'Learn the sutures' }, 'Which suture joins…?').front).toBe('Which suture joins…?')
  })
})
