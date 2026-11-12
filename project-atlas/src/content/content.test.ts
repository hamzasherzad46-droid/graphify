import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { acceptedAnswers, normalizeAnswer } from '../lib/typing'
import { meshKeys, meshMatchesAny } from '../lib/meshMatch'
import { TRACKS, type Catalog, type ModuleContent, type PlaceholderModel } from './types'

const dir = fileURLToPath(new URL('../../content', import.meta.url))
const modelsDir = fileURLToPath(new URL('../../public/models', import.meta.url))

/** Node names from a GLB's JSON chunk (no decoding of geometry needed). */
function glbNodeNames(file: string): string[] {
  const b = readFileSync(join(modelsDir, file))
  const len = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + len).toString('utf8')) as { nodes?: { name?: string }[] }
  return (json.nodes ?? []).map((n) => n.name ?? '')
}
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T

const catalog = read<Catalog>('catalog.json')
const modules = catalog.systems.flatMap((c) => c.modules).filter((m) => m.status === 'available')

describe('content catalog', () => {
  it('module ids are unique across systems', () => {
    const ids = catalog.systems.flatMap((c) => c.modules.map((m) => m.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every available module has its content file', () => {
    const present = new Set(readdirSync(dir))
    for (const m of modules) {
      expect(present.has(`${m.contentFile}.json`), m.id).toBe(true)
      if (m.placeholderFile) expect(present.has(`${m.placeholderFile}.json`), m.id).toBe(true)
    }
  })
})

for (const m of modules) {
  describe(`module ${m.id}`, () => {
    const content = read<ModuleContent>(`${m.contentFile}.json`)
    const placeholder = m.placeholderFile ? read<PlaceholderModel>(`${m.placeholderFile}.json`) : { parts: [] }
    const regionIds = new Set(content.regions.map((r) => r.id))

    it('has unique ids', () => {
      const ids = content.structures.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it.each(content.structures.map((s) => [s.id, s] as const))('%s is complete and typeable', (_id, s) => {
      for (const field of ['name', 'latinName', 'definition', 'function', 'why', 'modelFile'] as const) {
        expect(s[field], field).toBeTruthy()
      }
      const notes = Object.entries(s.notes ?? {})
      expect(notes.length, 'at least one track note').toBeGreaterThan(0)
      for (const [track, note] of notes) {
        expect(TRACKS, track).toContain(track)
        expect(note).toBeTruthy()
      }
      // Flashcard fronts show the model, backs the answer; function/why must not leak it on the front either.
      for (const text of [s.function, s.why]) {
        const t = normalizeAnswer(text)
        for (const a of acceptedAnswers(s.name, s.synonyms)) expect(t.includes(a), `function/why reveals "${a}"`).toBe(false)
      }
      expect(regionIds.has(s.region)).toBe(true)
      expect([1, 2, 3]).toContain(s.difficulty)
      expect(s.camera.position).toHaveLength(3)
      expect(s.camera.target).toHaveLength(3)
      // Answers must be typeable on the letters-and-space keyboard.
      for (const a of [s.name, ...s.synonyms]) expect(/^[a-z ]+$/.test(a), a).toBe(true)
      // The definition is shown as a clue, so it must not give the answer away.
      const def = normalizeAnswer(s.definition)
      for (const a of acceptedAnswers(s.name, s.synonyms)) expect(def.includes(a), `definition reveals "${a}"`).toBe(false)
    })

    it('every meshName matches a mesh in the model (or the placeholder if there is no model yet)', () => {
      const hasModel = !!m.model && existsSync(join(modelsDir, m.model.file))
      const names = hasModel ? glbNodeNames(m.model!.file) : placeholder.parts.map((p) => p.name)
      if (!names.length) return
      for (const s of content.structures) {
        for (const key of meshKeys(s.meshName)) {
          expect(names.some((n) => meshMatchesAny(n, [key])), `${s.id}: "${key}"`).toBe(true)
        }
      }
    })

    it('accepted answers are unambiguous across structures', () => {
      const seen = new Map<string, string>()
      for (const s of content.structures) {
        for (const a of acceptedAnswers(s.name, s.synonyms)) {
          expect(seen.get(a), `"${a}" used by ${seen.get(a)} and ${s.id}`).toBeUndefined()
          seen.set(a, s.id)
        }
      }
    })
  })
}
