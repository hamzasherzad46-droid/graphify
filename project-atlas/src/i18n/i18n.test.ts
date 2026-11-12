import { describe, expect, it } from 'vitest'
import { en, type MessageKey } from './en'
import { translate } from './index'
import { translations } from './translations'

/** Keys that are intentionally the same in every language (brand, units, dev-only tools). */
const UNTRANSLATED: MessageKey[] = ['app.name', 'common.xp', 'explore.copy', 'explore.copied']
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translations', () => {
  for (const [lang, dict] of Object.entries(translations)) {
    it(`${lang} covers every key with the same placeholders`, () => {
      const missing = (Object.keys(en) as MessageKey[]).filter((k) => !UNTRANSLATED.includes(k) && !dict?.[k])
      expect(missing).toEqual([])
      for (const [k, v] of Object.entries(dict ?? {})) {
        expect(placeholders(v), `${lang} ${k}`).toEqual(placeholders(en[k as MessageKey]))
      }
    })
  }

  it('fills placeholders with localised numbers and falls back to English', () => {
    expect(translate('de', 'level.label', { n: 3 })).toBe('Stufe 3')
    expect(translate('ar', 'level.label', { n: 3 })).toMatch(/^المستوى [3٣]$/)
    expect(translate('fr', 'app.name')).toBe('Atlas')
  })
})
