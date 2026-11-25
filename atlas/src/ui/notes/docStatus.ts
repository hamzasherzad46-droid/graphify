import type { NoteDoc } from '../../learn/notesDocs'

export const KIND_LABEL: Record<NoteDoc['kind'], string> = { pdf: 'PDF', pptx: 'Slides', docx: 'Word', image: 'Photo', camera: 'Photos', text: 'Text' }
const UNIT: Record<NoteDoc['kind'], [string, string]> = {
  pdf: ['page', 'pages'],
  pptx: ['slide', 'slides'],
  docx: ['section', 'sections'],
  image: ['photo', 'photos'],
  camera: ['photo', 'photos'],
  text: ['note', 'notes'],
}
export const count = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`

/** What Atlas has done with a file, in a line. */
export function docStatus(d: NoteDoc): { line: string; progress: number | null; tone: '' | 'bad' | 'warn' } {
  if (d.stage === 'error') return { line: d.error ?? 'This file could not be opened.', progress: null, tone: 'bad' }
  if (d.stage === 'opening')
    return { line: d.progress ? `Opening: ${d.progress.done} of ${d.progress.total} ${UNIT[d.kind][1]}` : 'Opening…', progress: d.progress ? d.progress.done / d.progress.total : 0, tone: '' }
  const toRead = d.parts.filter((p) => p.origin === 'read')
  const left = toRead.filter((p) => p.state === 'waiting' || p.state === 'reading').length
  if (left) return { line: `Reading handwriting and scans: ${toRead.length - left} of ${toRead.length}`, progress: (toRead.length - left) / toRead.length, tone: '' }
  const bits = [count(d.parts.length, UNIT[d.kind])]
  const notes = d.parts.filter((p) => p.notes).length
  if (notes) bits.push(`${notes} with speaker notes`)
  if (toRead.length && d.kind === 'pptx') bits.push(`${toRead.length} read from ${toRead.length === 1 ? 'a picture' : 'pictures'}`)
  const failed = d.parts.filter((p) => p.state === 'failed').length
  const illegible = d.parts.filter((p) => p.state === 'illegible').length
  const partly = d.parts.filter((p) => p.legibility === 'partly' && !p.edited).length
  if (failed) bits.push(`${failed} not read yet`)
  if (illegible) bits.push(`${illegible} could not be read`)
  if (partly) bits.push(`${partly} to check`)
  if (d.skippedPictures) bits.push(`${count(d.skippedPictures, ['picture', 'pictures'])} not read`)
  return { line: bits.join(' · '), progress: null, tone: failed || illegible ? 'bad' : partly ? 'warn' : '' }
}
