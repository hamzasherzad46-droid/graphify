import { useCallback } from 'react'
import { useSettings, type Lang } from '../state/settings'
import { en, type MessageKey } from './en'
import { translations } from './translations'

export type { MessageKey }
export type Vars = Record<string, string | number>

export const RTL_LANGS = new Set<Lang>(['ar'])

/** Native names for the language picker. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  ar: 'العربية',
  ru: 'Русский',
  zh: '中文',
  ko: '한국어',
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const text: string = translations[lang]?.[key] ?? en[key] ?? key
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k]
    return v === undefined ? `{${k}}` : typeof v === 'number' ? new Intl.NumberFormat(lang).format(v) : v
  })
}

/** Keys built at runtime (e.g. `system.${id}`) fall back to `fallback` if there is no translation. */
export function translateDynamic(lang: Lang, key: string, fallback: string): string {
  return (translations[lang] as Record<string, string> | undefined)?.[key] ?? (en as Record<string, string>)[key] ?? fallback
}

export function useT() {
  const lang = useSettings((s) => s.lang)
  const t = useCallback((key: MessageKey, vars?: Vars) => translate(lang, key, vars), [lang])
  const td = useCallback((key: string, fallback: string) => translateDynamic(lang, key, fallback), [lang])
  return Object.assign(t, { lang, td })
}

/** Apply lang and text direction to <html>. */
export function applyLang(lang: Lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
}
