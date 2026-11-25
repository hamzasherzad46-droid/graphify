import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { readDocx, readPptx, type XmlParser } from './extract'
import { fullRef, notesForQuestions, partsFromSections, partsFromSlides, readingState, refsText, topicsByFile, topicsFromServer, NOT_FOR_QUESTIONS, type NoteDoc } from './notesDocs'

const xml = new DOMParser() as unknown as XmlParser
const fixture = (f: string) => new Uint8Array(readFileSync(join(__dirname, 'fixtures', f)))
const doc = (over: Partial<NoteDoc>): NoteDoc => ({ id: 'd1', name: 'Lecture 3.pptx', kind: 'pptx', addedAt: '', stage: 'done', parts: [], skippedPictures: 0, ...over })

describe('parts from a lecture', () => {
  const { parts, toRead } = partsFromSlides('d1', readPptx(fixture('lecture.pptx'), xml))

  it('makes one part per slide, with speaker notes, and queues picture-only slides to be read', () => {
    expect(parts.map((p) => [p.ref, p.origin, p.state])).toEqual([
      ['slide 1', 'file', 'ready'],
      ['slide 2', 'file', 'ready'],
      ['slide 3', 'file', 'ready'],
      ['slide 4', 'read', 'waiting'],
    ])
    expect(parts[1].notes).toContain('does not touch the ribs')
    expect(toRead.map((r) => r.partId)).toEqual(['d1:4'])
  })

  it('cites where each part is', () => {
    const d = doc({ parts })
    expect(fullRef(d, parts[1])).toBe('Lecture 3, slide 2')
    expect(fullRef(doc({ kind: 'text', name: 'Typed notes' }), { ref: 'typed notes' })).toBe('typed notes')
  })

  it('sends the chosen topics only, each part under its reference, with speaker notes', () => {
    const d = doc({ parts })
    const text = notesForQuestions(
      [d],
      [
        { id: 't1', title: 'Scapula', summary: '', parts: ['d1:2'], chosen: true },
        { id: 't2', title: NOT_FOR_QUESTIONS, summary: '', parts: ['d1:1'], chosen: false },
      ],
    )
    expect(text).toBe(
      '[From: Lecture 3, slide 2]\nThe scapula\n- Flat, triangular bone\n  - Glenoid cavity: socket for the humeral head\n- Acromion meets the clavicle\nSpeaker notes: Remember: the scapula does not touch the ribs.\nMuscles lie on both sides.',
    )
  })
})

describe('parts from a Word file', () => {
  it('makes one part per section, named by its heading', () => {
    const parts = partsFromSections('d2', readDocx(fixture('notes.docx'), xml))
    expect(parts.map((p) => p.ref)).toEqual(['section 1 (The scapula)', 'section 2 (The carpal bones)'])
  })
})

describe('topics', () => {
  const parts = partsFromSlides('d1', readPptx(fixture('lecture.pptx'), xml)).parts
  const docs = [doc({ parts })]

  it('maps the server’s references back to parts; "Not for questions" starts unchosen', () => {
    const t = topicsFromServer(docs, [
      { title: NOT_FOR_QUESTIONS, summary: 'Title slide.', refs: ['Lecture 3, slide 1'] },
      { title: 'Scapula and carpal bones', summary: 'Landmarks.', refs: ['Lecture 3, slide 2', 'Lecture 3, slide 3', 'Lecture 9, slide 1'] },
      { title: 'Empty', summary: '', refs: ['nowhere'] },
    ])
    expect(t.map((x) => [x.title, x.parts, x.chosen])).toEqual([
      [NOT_FOR_QUESTIONS, ['d1:1'], false],
      ['Scapula and carpal bones', ['d1:2', 'd1:3'], true],
    ])
  })

  it('can fall back to one topic per file', () => {
    expect(topicsByFile(docs).map((x) => [x.title, x.parts.length])).toEqual([['Lecture 3', 3]])
  })

  it.each([
    [['slide 3', 'slide 4', 'slide 5', 'slide 9'], 'slides 3–5 and 9'],
    [['slide 3', 'slide 4'], 'slides 3 and 4'],
    [['page 1', 'page 4', 'page 6'], 'pages 1, 4 and 6'],
    [['slide 12'], 'slide 12'],
    [['slide 1', 'page 2'], '2 parts'],
  ])('describes %j as “%s”', (refs, text) => expect(refsText(refs.map((ref) => ({ ref })))).toBe(text))
})

describe('reading state', () => {
  it('counts what is still to read and what needs checking', () => {
    const s = readingState([
      doc({
        parts: [
          { id: 'a', ref: 'page 1', title: '', text: 'x', notes: '', origin: 'read', state: 'ready', legibility: 'partly' },
          { id: 'b', ref: 'page 2', title: '', text: '', notes: '', origin: 'read', state: 'waiting' },
          { id: 'c', ref: 'page 3', title: '', text: '', notes: '', origin: 'read', state: 'illegible' },
        ],
      }),
    ])
    expect(s).toMatchObject({ opening: false, waiting: 1, read: 1, toRead: 3, illegible: 1, partly: 1, withText: 1 })
  })
})
