import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { restrictedHits } from './restricted.mjs'

const rules = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'dictionary.json'), 'utf8')).restricted
const hits = (text, source = 'ui') => restrictedHits([{ text, where: 'x', source }], rules).map((h) => h.word)

describe('restricted words', () => {
  it('allows .pptx and .docx as file types, never bare', () => {
    expect(hits('Save it as .pptx or .docx.')).toEqual([])
    expect(hits('Add a pptx or a docx file.')).toEqual(['pptx', 'docx'])
  })
  it('never shows students “PDFs”', () => {
    expect(hits('Add PDF files.')).toEqual([])
    expect(hits('Add PDFs.')).toEqual(['PDFs'])
    // Prompts sent to Claude are internal.
    expect(hits('Add PDFs.', 'server')).toEqual([])
  })
  it('allows acromiale only in “os acromiale”, anywhere', () => {
    expect(hits('An unfused os acromiale. Os acromiale again.', 'atlas')).toEqual([])
    expect(hits('The acromiale is unfused.', 'atlas')).toEqual(['acromiale'])
    expect(hits('The acromiale is unfused.', 'server')).toEqual(['acromiale'])
  })
  it('keeps pinky, calcaneum and os calcis to Spelling Quiz alternatives (and Gray’s text)', () => {
    const at = (text, where, source = 'atlas') => restrictedHits([{ text, where, source }], rules).map((h) => h.word)
    expect(at('distal phalanx of the pinky', 'content/bones/x.json.acceptedSpellings[6]')).toEqual([])
    expect(at('the os calcis', 'content/classic/s8-4.json.entries[4]', 'grays')).toEqual([])
    expect(at('The pinky and the calcaneum.', 'content/bones/x.json.clinical')).toEqual(['pinky', 'calcaneum'])
  })
})
