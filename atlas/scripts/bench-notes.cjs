// Notes to Exam benchmark: drives the real app in a headless browser, through a real lecture, and times each stage.
//
//   1. Start the question service with a real key:   cd server && ANTHROPIC_API_KEY=… npm start
//   2. Build and serve the app:                      npm run build && npx vite preview --port 4173
//   3. Run:                                          node scripts/bench-notes.cjs "Lecture 5.pptx" [more files]
//
// Options: --url http://localhost:4173   --mode quick|mock|flashcards   --count 10   --runs 1   --json results.json
//
// It measures what a student waits for: opening the files (on the device), finding topics (one call to the service),
// the first 5 questions on screen, and the whole set. Then it reloads the page with the network off and checks the set
// is still there (offline cache). Targets: first 5 questions within 15 s; 100+ slides. Needs Playwright
// (npm i -D playwright, then npx playwright install chromium) if it is not already installed.
const { chromium } = require('playwright')
const { writeFileSync } = require('node:fs')
const { basename, resolve } = require('node:path')

const args = process.argv.slice(2)
const opt = (name, def) => {
  const k = args.indexOf(`--${name}`)
  return k >= 0 ? args.splice(k, 2)[1] : def
}
const url = opt('url', 'http://localhost:4173')
const mode = opt('mode', 'quick')
const count = opt('count', mode === 'mock' ? '20' : '10')
const runs = Number(opt('runs', '1'))
const json = opt('json', '')
const files = args.map((f) => resolve(f))
if (!files.length) {
  console.error('Give one or more lecture files: node scripts/bench-notes.cjs "Lecture 5.pptx"')
  process.exit(1)
}
const MODE_LABEL = { quick: 'Quick quiz', mock: 'Mock exam', flashcards: 'Flashcards' }
const FIRST = 5
const TARGET_FIRST_MS = 15000

async function run(n) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await context.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(String(e)))
  const r = { run: n, files: files.map((f) => basename(f)), mode, count: Number(count) }
  const openNotes = async () => {
    if (await p.getByRole('button', { name: 'I understand' }).count()) await p.getByRole('button', { name: 'I understand' }).click()
    await p.getByRole('button', { name: /Notes to Exam/ }).first().click()
  }
  try {
    await p.goto(url)
    await openNotes()

    // 1. Open the files (all on the device; scanned pages are read by the service).
    let t = Date.now()
    await p.locator('input[type=file][multiple]:not([capture])').setInputFiles(files)
    await p.waitForSelector('.doc-row', { timeout: 30000 })
    await p.waitForFunction(() => [...document.querySelectorAll('.doc-row')].every((row) => !/Opening|Reading/.test(row.textContent ?? '')), null, { timeout: 600000 })
    r.openMs = Date.now() - t
    r.parts = await p.evaluate(() => [...document.querySelectorAll('.doc-row')].map((row) => row.textContent?.trim()))

    // 2. Find topics.
    t = Date.now()
    await p.getByRole('button', { name: 'Find topics' }).click()
    await p.waitForSelector('.topic-checks', { timeout: 300000 })
    r.topicsMs = Date.now() - t
    r.topics = await p.locator('.topic-check').count()

    // 3. Write the set.
    await p.getByRole('radio', { name: new RegExp(MODE_LABEL[mode]) }).click()
    await p.getByRole('radio', { name: count, exact: true }).click()
    if (await p.locator('.notes-send').isDisabled()) throw new Error(`the app will not send this: ${(await p.locator('.field-error').allInnerTexts()).join(' ') || 'send is turned off'}`)
    t = Date.now()
    await p.locator('.notes-send').click()
    if (await p.getByRole('button', { name: 'Send my notes' }).count()) await p.getByRole('button', { name: 'Send my notes' }).click()
    const items = mode === 'flashcards' ? '.card-list li' : '.q-list > li'
    // The set's page opens at once, while it is written.
    await p.waitForSelector('.set-meta', { timeout: 30000 })
    await p.waitForFunction(([sel, k]) => document.querySelectorAll(sel).length >= k || !document.querySelector('.writing-bar'), [items, FIRST], { timeout: 600000 })
    r.firstMs = Date.now() - t
    r.firstCount = await p.locator(items).count()
    await p.waitForSelector('.writing-bar', { state: 'detached', timeout: 1800000 })
    r.totalMs = Date.now() - t
    r.items = await p.locator(items).count()
    r.review = await p.locator('.set-review').innerText().catch(() => '')
    r.failedTopics = await p.locator('.set-errors li').allInnerTexts()
    const setUrl = p.url()

    // 4. Offline: reload with the network off; the set must still open from the device.
    await context.setOffline(true)
    try {
      await p.goto(setUrl, { timeout: 15000 })
      await openNotes()
      await p.locator('.saved-sets .topic-row').first().click()
      await p.waitForSelector(items, { timeout: 10000 })
      r.offline = (await p.locator(items).count()) === r.items ? 'kept' : `only ${await p.locator(items).count()} of ${r.items}`
    } catch {
      r.offline = 'could not reload offline (use the built app: npm run build && npx vite preview)'
    }
    await context.setOffline(false)
  } catch (e) {
    r.error = String(e).split('\n')[0]
  }
  r.errors = errors
  await browser.close()
  return r
}

;(async () => {
  const results = []
  for (let n = 1; n <= runs; n++) results.push(await run(n))
  const s = (ms) => (ms === undefined ? '–' : `${(ms / 1000).toFixed(1)} s`)
  console.log(`\nNotes to Exam benchmark: ${files.map((f) => basename(f)).join(', ')}; ${MODE_LABEL[mode]}, ${count}; ${url}\n`)
  console.log('| Run | Open files | Find topics | Topics | First 5 | Whole set | Items | Offline | Target (first 5 ≤ 15 s) |')
  console.log('|---|---|---|---|---|---|---|---|---|')
  for (const r of results)
    console.log(`| ${r.run} | ${s(r.openMs)} | ${s(r.topicsMs)} | ${r.topics ?? '–'} | ${s(r.firstMs)} | ${s(r.totalMs)} | ${r.items ?? '–'} | ${r.offline ?? '–'} | ${r.firstMs === undefined ? '–' : r.firstMs <= TARGET_FIRST_MS ? 'met' : 'missed'} |`)
  for (const r of results) {
    if (r.error) console.log(`\nRun ${r.run} stopped: ${r.error}`)
    if (r.failedTopics?.length) console.log(`\nRun ${r.run}, topics not written: ${r.failedTopics.join('; ')}`)
    if (r.errors.length) console.log(`\nRun ${r.run}, page errors: ${r.errors.join('; ')}`)
  }
  if (json) writeFileSync(json, JSON.stringify(results, null, 1))
})()
