/**
 * Restricted words (data/dictionary.json, `restricted`): words approved only in a set form. `allow` is the form a
 * word may appear in (".pptx": only after a full stop, as a file type; "os acromiale": only inside the full term);
 * null means never in what students see. `onlyIn` lists the only places a word may appear: a field ("acceptedSpellings",
 * the Spelling Quiz alternatives) or a source ("grays", quoted as published). Texts from the server (the prompts sent
 * to Claude, never shown) are held only to rules about a full term or a place.
 */
export function restrictedHits(texts, rules) {
  const hits = []
  for (const [word, r] of Object.entries(rules ?? {})) {
    const re = new RegExp(`(?<![A-Za-z])${word}(?![A-Za-z])`, 'g')
    const fullTerm = !!r.allow && !r.allow.startsWith('.')
    for (const t of texts) {
      if (r.onlyIn) {
        if (r.onlyIn.includes(t.source) || r.onlyIn.some((f) => t.where.includes(`.${f}`))) continue
        for (const m of t.text.matchAll(re)) hits.push({ word, use: r.use, where: t.where, context: t.text.slice(Math.max(0, m.index - 30), m.index + word.length + 30) })
        continue
      }
      if (t.source === 'server' && !fullTerm) continue
      for (const m of t.text.matchAll(re)) {
        let ok = false
        if (r.allow?.startsWith('.')) ok = t.text[m.index - 1] === '.'
        else if (fullTerm) {
          const at = r.allow.toLowerCase().lastIndexOf(word.toLowerCase())
          ok = t.text.slice(m.index - at, m.index - at + r.allow.length).toLowerCase() === r.allow.toLowerCase()
        }
        if (!ok) hits.push({ word, use: r.use, where: t.where, context: t.text.slice(Math.max(0, m.index - 30), m.index + word.length + 30) })
      }
    }
  }
  return hits
}
