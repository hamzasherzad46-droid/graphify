// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { putAll } from '../lib/idb'
import { useAnnotations, type Annotation } from './annotations'

const base = (over: Partial<Annotation>): Annotation => ({
  id: 'a1',
  doc: 'tb:s7-2',
  docLabel: '7.2 The Skull',
  segs: [{ para: 'p1', quote: 'vomer bone', prefix: 'the ', suffix: '.', start: 4, end: 14 }],
  color: null,
  note: '',
  createdAt: '2026-11-23T10:00:00.000Z',
  updatedAt: '2026-11-23T10:00:00.000Z',
  ...over,
})

describe('saving highlights and notes', () => {
  it('replays the journal when storage missed the last keystrokes, and keeps that note', async () => {
    // Storage has the note as it was when first created (blank); the journal has the typed text.
    await putAll('annotations', [base({})])
    localStorage.setItem('atlas.annotations.journal', JSON.stringify({ a1: base({ note: 'Lower nasal septum', updatedAt: '2026-11-23T10:00:05.000Z' }) }))
    await useAnnotations.getState().load()
    const a = useAnnotations.getState().items.a1
    expect(a.note).toBe('Lower nasal septum')
    expect(a.deletedAt).toBeUndefined()
  })
  it('drops a note-only annotation that was left empty, but never an empty highlight', async () => {
    await putAll('annotations', [base({ id: 'blank', note: '  ' }), base({ id: 'hl', color: 'yellow' })])
    localStorage.removeItem('atlas.annotations.journal')
    await useAnnotations.getState().load()
    expect(useAnnotations.getState().items.blank.deletedAt).toBeTruthy()
    expect(useAnnotations.getState().items.hl.deletedAt).toBeUndefined()
  })
  it('keeps a tombstone when deleting, for a later sync', () => {
    const a = useAnnotations.getState().add({ doc: 'tb:s7-2', docLabel: '7.2', segs: [], color: 'teal', note: '' })
    useAnnotations.getState().remove(a.id)
    expect(useAnnotations.getState().items[a.id].deletedAt).toBeTruthy()
  })
  it('journals every change synchronously, before storage confirms', () => {
    const a = useAnnotations.getState().add({ doc: 'tb:s7-2', docLabel: '7.2', segs: [], color: null, note: '' })
    useAnnotations.getState().update(a.id, { note: 'T' })
    useAnnotations.getState().update(a.id, { note: 'TM' })
    const j = JSON.parse(localStorage.getItem('atlas.annotations.journal') ?? '{}')
    expect(j[a.id].note).toBe('TM')
  })
})
