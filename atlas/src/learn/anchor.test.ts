// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { locate, offsetIn, rangeFor, segmentFor, textOf } from './anchor'

const TEXT = 'The upper portion of the nasal septum is formed by the perpendicular plate of the ethmoid bone and the lower portion is the vomer bone.'

describe('anchoring highlights to text', () => {
  it('finds an unchanged quote at its old place', () => {
    const s = TEXT.indexOf('perpendicular plate')
    const seg = segmentFor('p1', TEXT, s, s + 'perpendicular plate'.length)
    expect(locate(TEXT, seg)).toEqual({ start: s, end: s + 19 })
  })
  it('follows the quote when text is inserted before it', () => {
    const s = TEXT.indexOf('vomer bone')
    const seg = segmentFor('p1', TEXT, s, s + 10)
    const edited = 'In adults, ' + TEXT
    const at = locate(edited, seg)!
    expect(edited.slice(at.start, at.end)).toBe('vomer bone')
  })
  it('picks the right one of repeated words by the text around it', () => {
    // "portion" occurs twice; highlight the second.
    const s = TEXT.lastIndexOf('portion')
    const seg = segmentFor('p1', TEXT, s, s + 7)
    const edited = TEXT.replace('The upper', 'The whole upper')
    const at = locate(edited, seg)!
    expect(at.start).toBe(edited.lastIndexOf('portion'))
  })
  it('survives changed spacing', () => {
    const s = TEXT.indexOf('ethmoid bone')
    const seg = segmentFor('p1', TEXT, s, s + 12)
    const edited = TEXT.replace('ethmoid bone', 'ethmoid  bone')
    const at = locate(edited, seg)!
    expect(edited.slice(at.start, at.end)).toBe('ethmoid  bone')
  })
  it('reports a quote that is gone', () => {
    const s = TEXT.indexOf('vomer')
    expect(locate(TEXT.replace('vomer', 'ploughshare'), segmentFor('p1', TEXT, s, s + 5))).toBeNull()
  })
  it('maps offsets to DOM ranges across inline elements', () => {
    document.body.innerHTML = '<p id="p">The <button>vomer bone</button> forms the <b>lower</b> septum.</p>'
    const p = document.getElementById('p')!
    expect(textOf(p)).toBe('The vomer bone forms the lower septum.')
    const r = rangeFor(p, 4, 30)!
    expect(r.toString()).toBe('vomer bone forms the lower')
    expect(offsetIn(p, r.startContainer, r.startOffset)).toBe(4)
    expect(offsetIn(p, r.endContainer, r.endOffset)).toBe(30)
  })
})
