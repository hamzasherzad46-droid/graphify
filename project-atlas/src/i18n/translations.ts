import type { Lang } from '../state/settings'
import { ar } from './ar'
import { de } from './de'
import { fr } from './fr'
import { ko } from './ko'
import { ru } from './ru'
import type { Messages } from './types'
import { zh } from './zh'

/** UI translations. Missing keys fall back to English. Reviewed by: nobody yet — needs native-speaker review. */
export const translations: Partial<Record<Lang, Messages>> = { fr, de, ar, ru, zh, ko }
