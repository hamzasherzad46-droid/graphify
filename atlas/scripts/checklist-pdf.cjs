// Renders docs/dagger-checklist.md (its simple Markdown: headings, quotes, bullets, bold, italics) to an A4 PDF, with
// the Playwright and Chromium already on the machine (not a project dependency).
//   node scripts/checklist-pdf.cjs docs/dagger-checklist.md docs/dagger-checklist.pdf
const fs = require('fs')
const { chromium } = require('playwright')
const [src, out] = process.argv.slice(2)
const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
const lines = fs.readFileSync(src, 'utf8').split('\n')
let html = '', list = false
for (const l of lines) {
  if (list && !l.startsWith('- ')) { html += '</ul>'; list = false }
  if (l.startsWith('# ')) html += `<h1>${inline(l.slice(2))}</h1>`
  else if (l.startsWith('### ')) html += `<h3>${inline(l.slice(4))}</h3>`
  else if (l.startsWith('## ')) html += `<h2>${inline(l.slice(3))}</h2>`
  else if (l.startsWith('> ')) html += `<blockquote>${inline(l.slice(2))}</blockquote>`
  else if (l.startsWith('- ')) { if (!list) { html += '<ul>'; list = true } html += `<li>${inline(l.slice(2))}</li>` }
  else if (l.trim()) html += `<p>${inline(l)}</p>`
}
const page = `<!doctype html><meta charset="utf-8"><style>
body{font:10.5pt/1.45 Inter,system-ui,sans-serif;color:#111;margin:0}
h1{font-size:18pt;margin:0 0 8pt}h3{font-size:11.5pt;margin:16pt 0 4pt;break-after:avoid}
blockquote{margin:4pt 0;padding:4pt 8pt;border-left:3px solid #0d9488;background:#f3f7f6}
ul{margin:4pt 0 4pt 16pt;padding:0}li{margin:2pt 0}p{margin:4pt 0}
</style>${html}`
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.setContent(page, { waitUntil: 'load' })
  await p.pdf({ path: out, format: 'A4', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' }, printBackground: true })
  await b.close()
})()
