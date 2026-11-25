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
})
