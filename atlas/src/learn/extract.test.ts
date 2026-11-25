import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { kindOf, mediaTypeOf, readDocx, readPptx, type XmlParser } from './extract'

const xml = new DOMParser() as unknown as XmlParser
const fixture = (f: string) => new Uint8Array(readFileSync(join(__dirname, 'fixtures', f)))

describe('PowerPoint', () => {
  const slides = readPptx(fixture('lecture.pptx'), xml)

  it('reads every slide in order, with its title', () => {
    expect(slides.map((s) => [s.n, s.title])).toEqual([
      [1, 'Lecture 3: the upper limb'],
      [2, 'The scapula'],
      [3, 'Carpal bones'],
      [4, ''],
    ])
  })

  it('keeps bullets and their levels', () => {
    expect(slides[1].text).toBe('- Flat, triangular bone\n  - Glenoid cavity: socket for the humeral head\n- Acromion meets the clavicle')
  })

  it('reads the speaker notes, without the slide number or slide image', () => {
    expect(slides[1].notes).toBe('Remember: the scapula does not touch the ribs.\nMuscles lie on both sides.')
    expect(slides[0].notes).toBe('')
  })

  it('reads tables row by row', () => {
    expect(slides[2].text).toContain('Proximal | Scaphoid, lunate, triquetrum, pisiform')
  })

  it('finds pictures on a picture-only slide, so they can be read', () => {
    expect(slides[3].text).toBe('')
    expect(slides[3].pictures).toHaveLength(1)
    expect(mediaTypeOf(slides[3].pictures[0].path)).toBe('image/png')
    expect(slides[3].pictures[0].bytes.length).toBeGreaterThan(1000)
  })

  it('refuses files that are not presentations', () => {
    expect(() => readPptx(fixture('notes.docx'), xml)).toThrow(/presentation/)
    expect(() => readPptx(new Uint8Array([1, 2, 3]), xml)).toThrow(/zip/)
  })
})

describe('Word', () => {
  const sections = readDocx(fixture('notes.docx'), xml)

  it('splits at headings and keeps list items and tables', () => {
    expect(sections.map((s) => s.heading)).toEqual(['The scapula', 'The carpal bones'])
    expect(sections[0].text).toBe('A flat, triangular bone at the back of the shoulder.\n- Glenoid cavity\n- Acromion')
    expect(sections[1].text).toBe('Proximal | Scaphoid, lunate\nDistal | Trapezium, hamate')
  })
})

describe('file kinds', () => {
  it.each([
    ['Lecture 3.PPTX', '', 'pptx'],
    ['notes.docx', '', 'docx'],
    ['handout.pdf', '', 'pdf'],
    ['scan', 'application/pdf', 'pdf'],
    ['IMG_0001.HEIC', '', 'image'],
    ['photo', 'image/jpeg', 'image'],
    ['old.ppt', '', 'old-office'],
    ['notes.txt', '', 'text'],
    ['song.mp3', 'audio/mpeg', 'other'],
  ])('%s is %s', (name, type, kind) => expect(kindOf(name, type)).toBe(kind))
})
