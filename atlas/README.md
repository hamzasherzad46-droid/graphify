# Atlas — 3D skeletal anatomy (Phase 1)

Mobile-first 3D anatomy app for university students. Phase 1 covers the human skeleton only: 206 bones,
each a separate, selectable mesh. Built as a PWA (Vite + React + three.js / React Three Fiber), ready to wrap with Capacitor.

```bash
npm install
npm run dev            # http://localhost:5173  (add -- --host to open it on a phone on the same Wi-Fi)
npm test               # content + search tests
npm run lint
npm run build && npm run preview   # production build with service worker (offline after first visit)
npm run build:preview              # dist-artifact/: shareable preview for sandboxed hosts (no service worker,
                                   # plain-JS Draco decoder, model as base64 text)
```

## Build status

| Step | What | Status |
| --- | --- | --- |
| 1 | Male skeleton: rotate / zoom / pan / select, info panel | **Done**, awaiting phone test |
| 2 | Female skeleton and toggle | **Done**, awaiting phone test |
| 3 | Exploded view, drag, reassemble | **Done**, awaiting phone test |
| 4 | Typing Test | **Done**, awaiting phone test |
| 5 | Flashcards (FSRS), Quiz, Weak Bones | **Done**, awaiting phone test |
| 6 | Progress tracking and polish | **Done**, awaiting phone test |

### Step 1 includes

- All 206 bones, left and right separate: every vertebra, rib, carpal, tarsal, phalanx, skull bone, the
  hyoid and the six auditory ossicles.
- One-finger rotate, pinch zoom, two-finger pan, tap to select (soft glow and an x-ray silhouette when the bone is
  behind others), double-tap to fly to a bone.
- Preset views: anterior, posterior, left, right, superior, inferior. A reset button returns to the whole skeleton.
- Isolate, hide (with "Show all") and ghost mode.
- Labels with leader lines in two edge columns that never overlap. They fade out while the camera moves.
- Typo-tolerant search ("femer", "calcaneous", "left humorus", "c7", "kneecap"). The camera flies to the result.
- Info panel: English and Latin name, region, side, type, key features, articulations (tap one to jump to it),
  clinical relevance, review badge, "Report an error".
- Safety: first-launch disclaimer, a permanent "Beta — under academic review" label, a per-bone review status,
  and a reviewer mode to mark bones reviewed.
- Dark medical-HUD theme and a light theme (Settings → Appearance), Inter only, credits screen.

## Content: one JSON file per bone

`content/bones/<id>.json`, for example `femur_left.json`:

```json
{
  "id": "femur_left", "name": "Femur", "latin": "Femur", "taCode": "",
  "region": "Lower limb", "subregion": "Thigh", "side": "left", "type": "long",
  "features": ["Head with the fovea", "…"], "articulations": ["hip_bone_left", "tibia_left", "patella_left"],
  "clinical": "One line.", "acceptedSpellings": ["femur", "thigh bone", "thighbone"],
  "reviewStatus": "draft", "reviewer": "", "lastUpdated": "2026-11-22"
}
```

- Edit a file and rebuild: no code changes. The fields match the Phase 1 spec, plus two optional ones:
  `subregion`, and `modelNote` for bones whose 3D shape is approximate.
- `articulations` are bone ids, and must be mutual. `npm test` checks this, along with: 206 bones, valid
  types, sides and regions, and a mesh in the model for every bone.
- `acceptedSpellings` holds correct alternatives only (synonyms, British/American forms, Latin), never typos.
  The search adds typo tolerance on top.
- `scripts/bones_src.py` (`npm run content`) wrote the first draft consistently across left/right pairs and serial
  bones. It **never overwrites a file whose `reviewStatus` is `reviewed`**, so reviewed files are safe.
- **All content is a draft until academically reviewed.** `taCode` is empty everywhere, for reviewers to fill in.
- `content/regions.json` lists the regions and the explode groups for step 3. `content/app.json` holds
  `reportEmail`: when set, "Report an error" also opens an email.

**Admin / review flag**: set `"reviewStatus": "reviewed"` and `"reviewer"` in the bone's file. In the app,
Settings → Reviewer mode adds a "Mark as academically reviewed" switch to each bone. Those changes stay on that
device until exported (Settings → Export review changes). Error reports are stored on the device the same way.

## 3D model

`public/models/skeleton-male.glb` (0.98 MB, Draco, ~260k triangles): 206 bone meshes named by bone id, plus
non-selectable context meshes (costal cartilages, intervertebral discs, teeth), each merged per host bone so they
move with it. Each bone is centred on its own origin, so the exploded view moves bones by changing their position only.

Source: **Z-Anatomy** (CC BY-SA 4.0), which is built on BodyParts3D 4.0 (© DBCLS, CC BY 4.0). Every bone,
including the coccyx and the six auditory ossicles, is a real mesh. **The model files are therefore CC BY-SA 4.0**:
anyone redistributing them must credit the sources (Settings → Credits and attribution) and share alike. App code is
unaffected.

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --no-checkout -b PC-Version https://github.com/LluisV/z-anatomy /tmp/za
git -C /tmp/za checkout HEAD -- Resources/Models/FBX/SkeletalSystem100.fbx Resources/Models/FBX/Joints100.fbx
npm run model -- /tmp/za/Resources/Models/FBX male
npm test
```

`scripts/lib/mesh.mjs` reads the FBX (three's FBXLoader in Node), welds, simplifies with meshoptimizer (≤0.15 %
relative error, ≤5k triangles per bone), recomputes normals and writes the GLB.

## Exploded view (step 3)

Dock → explode button. Choose the whole skeleton or one region (skull, spine, thorax, upper limb, hand, pelvis,
lower limb, foot) and drag the slider. Each bone moves away from its cluster's centre (e.g. the left carpals), each
cluster from its region's centre, and in a whole-skeleton explode each region from the body's centre; limbs explode
per side, the vertebrae spread gently along the column, and a spine-only explode moves the column back so it clears
the skull (`src/viewer/explode.ts`, tested in `explode.test.ts`).

**Hold a bone (0.3 s), then drag** to pull it out; a quick drag still rotates. **Reassemble** eases everything home.
Bones ease towards their targets each frame, and frames are only rendered while something moves.

## Home and tabs

The app opens on **Home**; tabs: **Home · 3D · Practice · Progress · You** (`src/state/nav.ts`, `src/ui/TabBar.tsx`).
The 3D Atlas stays mounted under the other tabs, so the model loads once and switching is instant.

- **Home** (`src/ui/home/`): ATLAS wordmark, beta label and profile button; greeting with the student's name and
  today's date; today's goal (answers today / daily goal) as a thin line. Full-width **3D Body** hero card with the
  skeleton turning slowly under a teal rim light (`viewer/HeroSkeleton.tsx`: a clone of the loaded model in its own
  small canvas; renders only while Home is visible; still under reduced motion). 2×2 tiles with live stats:
  Lessons (coming next), Flashcards (due / new today, deck picker by region), Spelling Quiz (best accuracy), Notes to
  Exam (coming later). Then *Continue where you left off* (last session) and the study streak. Tiles and cards press
  to 0.97 with a soft click and a light haptic.
- **Practice**: study modes and settings. **Progress**: the progress screen. **You**: name, course, daily goal,
  appearance (dark / light / match device), labels, sounds, haptics, reviewer tools, reset progress, credits,
  disclaimer. The first-launch screen asks for a first name (optional).
- Haptics: Capacitor Haptics when native, else `navigator.vibrate` (Android browsers; iOS Safari has none).
  Audio is unlocked on the first touch so the first click plays at once.
- Finished sessions are saved (`useProgress.sessions`) for the Best score and *Continue*.

## Labels (upgrade step 1)

Labels never disappear. Dock → labels button: **All / Main bones / None** (default Main bones, `content/labels.json`);
the selected bone is always labelled.

- Laid out **every rendered frame** (`src/viewer/LabelLayout.tsx`, written straight to the DOM), so they follow their
  bones while rotating, zooming and panning. Boxes glide to their slots; a label that changes column cross-fades.
- Two columns at the screen edges (`labelLayout.ts`, tested): labels keep their anchors' vertical order and slide apart;
  spacing is enforced on the animated positions both ways, so they never overlap or leave the screen, even mid-glide.
  An overfull column hands labels nearest the centre to the other column.
- Leader lines end exactly on a point of the bone. If another bone is in front (BVH raycasts, a few labels a frame), the
  line turns faded and dashed; nothing is hidden.
- **All**: 206 legible labels can't fit a phone screen at whole-body zoom, so when a column is full, whole clusters
  share one group label ("Phalanges of the hand (14)"), then regions ("Hand, left (27)"); bones off the screen are
  summarised by region. Every bone is always covered. Tap a group label to fly there; its bones get their own labels.
  Long names use standard short forms on the model ("C7", "Prox. phalanx, little finger"); the panel shows the full name.
- Tapping a label selects and focuses its bone. Labels don't take touches themselves (taps are matched to them), so a
  drag that starts on a label still turns the model.
- Press-and-hold to pull a bone out is now decided from the input events' timestamps, so on a busy device a quick drag
  is never mistaken for a hold.

Verified in a 278-sample run (full 360° turn in 5° steps, pole to pole and back, drags, zoom, pan, a selected bone,
All with grouping): 0 overlaps, 0 labels off screen, 0 detached leader lines, Main bones always 32 labels, All always
covering 206 bones. Label engine cost: about 1.3 ms a frame (Main) and 2.5 ms (All), median, measured in development.

## Study modes (steps 4–5)

**Study** (top bar) opens the modes and their settings: region (whole skeleton or a group), male or female
model, bones per session (10/20/50/all), Spelling Quiz timer, quiz time per question, new flashcards a day, sounds.
During a session the target bone lights up on a dimmed, see-through skeleton, framed with its neighbours from the
side it is best seen (`frame` camera command); explore controls are hidden and taps on the model answer questions.

- **Spelling Quiz** (replaces the Typing Test; see below).
- **Flashcards**: two cards per bone name, *Name it* (lit bone → name) and *Find it* (name → tap it, either side).
  Scheduled with **FSRS** (`ts-fsrs`, MIT, default parameters); Again / Hard / Good / Easy show when the card comes
  back. Due cards first, then new ones up to the daily limit (each bone's *Name it* card before its *Find it* card);
  Again repeats the card later in the session.
- **Quiz**: alternating timed multiple choice (three plausible distractors from the same subregion, then region)
  and "tap the bone" (camera frames the region, not the bone).
- **Weak Bones**: the bones missed most (smoothed error rate across all modes), with question types interleaved.

Every answer is recorded per bone in `useProgress` (on this device, through `appStorage`), which also keeps the
study days and flashcard states, for step 6.

## Spelling Quiz (home upgrade step 2)

Home → Spelling Quiz (or Practice) opens the set picker: **small focused sets** (`content/sets.json`, 12 sets such as
*The 8 cranial bones*, *The 8 carpal bones*, *The 7 tarsal bones*), grouped by region with each set's best score,
plus **Learn / Hard** mode and a timer (none, 1, 3, 5 min). *Continue where you left off* on Home restarts the last set.

- **Screen**: top bar (×, `SPELLING QUIZ · 3/8`, countdown or elapsed time, thin progress line). The top part is the
  3D view: the camera flies close to each bone (fitted to its outline as seen, so long thin bones fill the view too),
  lit teal on a dimmed skeleton. Two **side views** (lateral, from the bone's own side; posterior) turn slowly back
  and forth (`viewer/ThumbnailRenderer.tsx`: scissored viewports on the same canvas, no second WebGL context; each
  view's near plane sits just in front of the bone, so deep bones such as the sphenoid or the ossicles are never
  hidden). Below: *NAME THE HIGHLIGHTED STRUCTURE*, the name building letter by letter in large light type (Learn:
  faint ghost letters to trace and a one-line description; Hard: blanks only), and the in-app keyboard.
- **Checking letter by letter** (`src/learn/spelling.ts`, tested): a key is accepted if it continues any accepted
  answer (the name and its anatomical alternatives from `acceptedSpellings`: synonyms, Latin, British/American
  forms); not case-sensitive; a letter typed where a space goes gets the space added.
- **Only correct anatomical spellings count.** Everyday names (collarbone, kneecap, shin bone, anvil, …; the
  `EVERYDAY` list) never complete a word: typing one shows "“Collarbone” is the everyday name. Spell the anatomical
  name." in amber, with no error counted, and the everyday name is shown after the answer. Tests check that every
  bone keeps its own name as an answer and that no everyday name slips through.
- **Slipped letters**: every letter a wrong key or a hint fell on is underlined in amber in the finished word, and
  again on the end screen (*Watch these letters* for known bones with a slip, and in the missed list).
- **Content spelling audit**: every word in the names, accepted spellings, Latin, clinical notes, features and app
  text was spell-checked; the flagged words are all valid anatomical or Latin terms. The text is British English
  throughout (haematoma, oesophagus, tumour, centre; *practise* as a verb, *practice* as a noun). A wrong key is refused: the key flashes red and shakes, the refused letter
  shows in red at the cursor and the word shakes; errors +1. **Hint** reveals the next letter (counts as an error),
  **Skip** shows the name and adds the bone to Weak Bones.
- **Keyboard** (`ui/study/Keyboard.tsx`): QWERTY, Hint, ⌫, Skip, space; keys act on touch-down, light teal for
  120 ms; a physical keyboard works too (Enter = Next).
- **Done**: the word turns green, scales up with a soft glow, `✓ CORRECT · ERRORS: n`; then the Latin name in italics
  and the clinical note in a bordered box, and **Next** (timed mode moves on by itself after 1.5 s).
- **Grading**: a bone is *known* when spelled with no hints and at most one wrong key. Its *Name it* flashcard is
  graded on FSRS (clean = Good, one slip = Hard, help or skip = Again), without same-day learning steps, so a clean
  spelling is scheduled days ahead and a miss comes back tomorrow (and is in Weak Bones at once).
- **End screen**: a one-line statement (the set's achievement line, e.g. "You can now name the 8 cranial bones from
  the front, the side and behind", only when every bone was known; otherwise an honest count), accuracy, time,
  errors, *Review again in 2 days* (from FSRS), missed bones with **Show me in 3D**, and **Practise missed** /
  **Next set**.
- **Sounds** (Web Audio, synthesized, one master gain at 40%, `latencyHint: 'interactive'`, noise buffer made once):
  key = a soft deep thock (5 ms noise burst through a 2.5 kHz lowpass over a ~200 Hz sine body decaying in ~40 ms,
  pitch ±4% and volume ±10% per press; backspace lower); wrong letter = a low muted "tuk"; correct word = a rising
  E5→B5 bell chime (~350 ms), a third note (E6) on every 5-word streak; session end = a soft warm E-major chord.
  All follow the Sounds setting.
- **Haptics** (follow the Haptics setting): light on every key, stronger on a wrong letter, a success pattern on a
  correct word.

## Lessons (lessons upgrade)

Home → **Lessons** offers **Exam-style questions** and **Textbook**, both organised by topic (`content/topics.json`):
Skull, Spine, Thorax, Upper limb, Lower limb, Pelvis; the textbook adds Bone tissue, The skeleton and Joints. Pages
opened from Home form a stack backed by browser history, so the phone's back button closes them.

### Textbook (step 2)

- **Source**: OpenStax *Anatomy and Physiology 2e*, chapters 6–9 (the skeleton: 28 sections), 12–16 (the nervous system) and 20
  (blood vessels and circulation), 61 sections and 253 figures in all, imported by
  `scripts/import-openstax.mjs` from the book's source repository into `content/textbook/*.json` and
  `public/textbook/*.webp`.
- **Licence**: the repository moved the book to **CC BY-NC-SA 4.0** on 2026-03-19 (commit `fdfa6e2`). Atlas uses the
  last version released under **CC BY 4.0** (commit `b0058a7`, 2026-03-11); a CC licence cannot be withdrawn from
  material already released under it. Every section ends with "Adapted from *Anatomy and Physiology 2e* by OpenStax,
  CC BY 4.0, openstax.org.", the source commit and the list of changes. No OpenStax logo, cover or branding is used.
- **Structure kept**: headings, paragraphs (with their stable source ids, for highlights), key terms, figures with
  titles, captions and alt text, tables, feature boxes, learning objectives, glossary and review questions.
- **Bone links** (`scripts/lib/bonelink.mjs`, `content/landmarks.json`): every bone name, plural and anatomical
  synonym, vertebra codes (C1–L5), and 148 landmarks on a single bone (mastoid process → temporal bone, greater
  trochanter → femur, …) open the bone in 3D, with a *Back to 7.2 The Skull* pill on the 3D view. "Axis" links to
  C2 only in a sentence about the neck vertebrae. Structures formed by several bones (fossae, sutures) are not linked.
- **Reader**: about 65 characters a line, 17.5 px text (five sizes), line height 1.7, dark / light / auto; key points
  (the first sentence of each chapter-review paragraph, full summary one tap away), learning objectives, the full
  text, figures that open full screen (pinch or double-tap to zoom), key terms, a 3-question quick check from the
  section's review questions, and the attribution. Reading position (the paragraph at the top of the screen) is saved
  as you read; *Continue reading* on Home returns to it, even after the app is closed.
- **Classic reference (Gray's Anatomy, 1918)**: under each region section, collapsed and loaded only when opened, one
  entry per bone (48 chapters of Osteology, 718 paragraphs, 210 of Carter's figures), with a note that some
  terminology is historical. Imported by `scripts/import-grays.mjs` from the 1918 text as transcribed for
  Bartleby.com, read from the copy at theodora.com (Bartleby closed in 2025; Wikisource has only Embryology).
  Public domain. Two figures are damaged on the source site and are left out. Run with `NODE_USE_ENV_PROXY=1` behind
  a proxy.
- Tests (`src/learn/textbook.test.ts`): all sections present and in a topic, CC BY 4.0 source and changes, bone links
  valid, the "axis" rule, every figure file present with label and alt text, unique paragraph ids, quick checks valid.

### Highlighter (step 3)

- Select text (long-press or drag) in the textbook, the key points or the classic reference: a toolbar offers
  **yellow, teal, pink, blue** and **Copy**. Tap a highlight to recolour, copy or delete it. Selections snap to whole
  words and can span paragraphs. Tapping a bone name inside a highlight still opens it in 3D.
- **Saved the instant it is made**, on the device (`src/lib/idb.ts`, IndexedDB), with a synchronous localStorage
  journal until IndexedDB confirms; the journal is replayed on the next launch, so a highlight survives the app being
  closed straight away. Deletes keep a tombstone for the future cloud sync. `navigator.storage.persist()` is requested.
- **Anchoring** (`src/learn/anchor.ts`, tested): the paragraph's stable source id, the quoted text, 32 characters
  either side and the offsets. If the text changes slightly, the quote is found again by its surrounding text (and
  despite spacing changes); if it is gone, the highlight is kept but not drawn.
- **Drawing** (`src/ui/lessons/Annotatable.tsx`): coloured bands behind the text, computed from DOM ranges and redrawn
  when the layout changes (text size, images, rotation); the text itself is never modified. Works in every browser.
- Bone names are spans with button semantics (not `<button>`s), and stop being focusable while pressed, so a drag that
  starts on a bone name selects text.

### Notes (step 4)

- **Note** in the selection toolbar (a note on those words) and in a highlight's toolbar (a note on the highlight).
  While writing, *Attach to the whole paragraph* moves the note to the paragraph.
- A note is never a block in the text: a small **pin** sits in the right margin beside the first line it is attached to
  (pins on one line stack), and noted words get a subtle **dotted underline** (paragraph notes: pin only). Tap the pin,
  or the underlined words, to open a small popover right there with the note, **Edit** and **Delete**; tap outside to
  close.
- **Saved on every keystroke** through the same store as highlights (IndexedDB plus the synchronous journal): closing
  the app mid-sentence keeps every letter typed. A note left empty is not kept; deleting a highlight that has a note
  keeps the note, and deleting a note keeps its highlight.
- Tests (`src/learn/annotations.test.ts`): the journal wins over an older stored copy (no lost keystrokes), empty notes
  are dropped only after the journal is replayed, deletes keep tombstones, every change is journalled synchronously.

### Exam-style questions (step 5)

Lessons → **Exam-style questions** → a topic. All six region topics are ready, 106 questions in all
(`content/questions/*.json`): Skull 20, Spine 17, Thorax 15, Upper limb 24, Lower limb 16, Pelvis 14. Never presented as real exam papers: the section is
labelled "Exam-style questions", and every Atlas question's source says it is not from a real exam paper.

- **Sources**: every OpenStax review and critical thinking question of sections 7.2, 7.3, 7.4, 8.1, 8.2, 8.3 and 8.4
  (wording unchanged, CC BY 4.0, cited with section and question number), plus Atlas-written questions on high-yield
  topics: foramen magnum, pterion and the middle meningeal artery, TMJ, hard palate, the orbit, V1–V3 exits, the hyoid;
  the atlas and axis, the vertebra prominens, lumbar puncture level, scoliosis; the sternal angle, chest drains, CPR,
  floating ribs, rib joints; nerve injuries in humeral fractures, Colles and Smith fractures, the thumb's saddle joint,
  the snuffbox; the ASIS, the acetabulum, the sciatic nerve, the pubic symphysis, the pelvic inlet; neck of femur
  fractures, the common fibular nerve, the patella, the malleoli, the tarsal bones, the tibial tuberosity.
- **Label the 3D model** can set the viewing angle per question (`labelElevation`): the atlas is shown from above so
  its ring shape is visible.
- Answer letters are balanced across A–D in every topic; Atlas questions are rebalanced by swapping options together
  with their "why not" lines, so the two can never get out of step. OpenStax questions keep the book's order.
- **Each question**: single best answer, short answer, or **label the 3D model** (the bone lit on a small model of its
  own, turning slowly and draggable, with its neighbours dimmed; `src/viewer/BoneSnapshot.tsx`, mounted only near
  the screen). Choosing an answer (or *Show answer*) reveals: the answer, **Why this is the answer** (2–4 sentences),
  **Why the others are wrong** (one line per option), an **Exam tip** (the trap), **See it in 3D**, the source and
  the review status (all *Draft, awaiting academic review*). Tags: Core / Common / Advanced and Foundation /
  Undergraduate / Medical, with filters for both.
- Answers are saved on the device (`useExam`): progress per topic (answered, % correct), *Start again*. Short answers
  are self-marked (*I knew it* / *I missed parts*).
- Explanations can be highlighted (the same highlighter, document `eq:<id>`), and each card has a **note pin** for a
  note on the whole question.
- Tests (`src/learn/questions.test.ts`): unique ids, real topics and bones, tags and review status, OpenStax sources
  cite CC BY 4.0, 2–4 sentence explanations, four options with one line on each wrong option, label answers name the
  lit bone, answers spread across A–D. All question text was spell-checked (British English, as the rest of the app).

### My Highlights, My Notes and My cards (step 6)

Lessons → **My Highlights** / **My Notes** (with counts).

- **My Highlights**: every highlight, grouped by chapter in book order (then exam-style questions by topic), in the
  order they appear in the text; filter by colour (with counts). **My Notes**: every note, with the text it is attached
  to ("On this paragraph", "On this question").
- **Tap to jump back**: the reader opens at that paragraph (opening the Classic reference and the right bone's entry
  for a Gray's paragraph), or the exam topic opens at that question; the highlight or card glows for two seconds.
- **Turn into flashcard** (on every highlight and note): a suggested card to check and edit before saving. A highlight
  becomes a fill-in-the-blank card (its sentence, from the full paragraph, with the highlighted words blanked); a
  note becomes text-on-the-front, note-on-the-back. Cards join **My cards** (`src/learn/mycards.ts`), scheduled with
  FSRS like every other card (state under `mine:<id>`), studied from My Highlights / My Notes or Practice → My cards.
- Sheets and dialogs render in a portal above the tab bar (`src/ui/Portal.tsx`). Before this, a sheet opened inside a
  page (the flashcard deck picker on Home, Credits, the new card editor) sat under the tab bar, which could cover its
  buttons.
- Tests (`src/learn/mycards.test.ts`): the sentence around a phrase, fill-in-the-blank cards from the full paragraph
  and from the saved context alone, whole-sentence highlights, note cards.

## Spelling, consistency and grammar (content upgrade, step 1)

One standard everywhere: **British English with -ise spellings**, checked over every piece of text the app shows
(content, textbook, Gray's, interface, the Notes to Exam server's prompts and messages).

- **Dictionary** (`data/dictionary.json`, built by `npm run dictionary`): an en-GB base (dictionary-en-gb, via nspell)
  plus every word of Terminologia Anatomica (TA98 and TA2: English converted to British spelling, Latin as
  published; from Wikidata, CC0, saved in `data/sources/terminologia.json` by `scripts/fetch-terminologia.mjs`).
  Hand-kept sections: `approved` (by a person), `proposed` (added by Claude, awaiting approval; they pass meanwhile),
  `historical` (accepted only in Gray's 1918 text), `decisions` (fetus, grey, disc, -ise), `keep` (British medical
  spellings that differ from general British: specialty, sulfur), `forms` (one form per word: brainstem,
  anteroposterior, rib cage), `names` (proper names kept as their owners spell them) and `corrections` (typing errors
  in the imported books).
- **Check** (`npm run check:text`, run before every build and inside `npm test`): fails on any word in no dictionary,
  any American spelling (VarCon's verified pairs and safe medical rules: hem- → haem- but never hemi-, -emia → -aemia,
  -ize → -ise), a broken decision, a form the dictionary rules out, or a bone or landmark name written in another
  case. Writes `docs/text-report.md`, with everything awaiting approval.
- **Grammar**: fast rules in every check; `npm run check:grammar` adds LanguageTool (en-GB, LGPL), run offline from
  jars that `tools/languagetool/pom.xml` fetches into `.cache/languagetool`.
- **Imports**: both importers apply the same standard (`scripts/lib/textnorm.mjs`) and list it among their changes.
  OpenStax: British spelling, one form per word, typing errors corrected, and spaces kept at the edges of italics.
  Gray's: æ and œ written ae and oe, Windows-1252 characters decoded (dashes, quotes, œ), transcription errors
  corrected, and a 1918 table ranking human populations by skull indices (discredited race typology, with terms now
  recognised as offensive) replaced by a note.
- The Spelling Quiz accepts the alternative spellings listed for each bone and always shows the official name.

## Notes to Exam

Home → **Notes to Exam**. The student photographs their own anatomy notes (or uploads photos or a PDF, or types
them); Claude reads them and sets exam-style questions on exactly what they wrote; a second, independent pass
checks every question before the student sees it.

**In the app** (`src/ui/notes/`, `src/learn/notesExam.ts`, `src/lib/image.ts`)

- **Camera**: a full-screen viewfinder in the app (`getUserMedia`, rear camera, up to 4K requested), with a page
  guide, shutter, a light toggle where the phone has one, and the last page and page count beside the shutter.
  Up to 12 pages a set. If the camera cannot be opened (permission refused, no camera), it says why and offers the
  phone's own camera instead (`<input capture="environment">`).
- Each page is scaled to at most 2000 px on its longest side and re-encoded as JPEG on the device. That is sharp
  enough for handwriting, quick to send, and strips the photo's metadata (location, camera).
- Settings: 5, 10 or 15 questions; Foundation, Undergraduate or Medical level; mixed (about one short answer in four)
  or single best answer only.
- Before the first set, a sheet says what is sent, to whom (Claude, by Anthropic), what is kept, not to include
  patient or personal details, and that the questions are AI-written. While the set is written, the screen shows the
  stages as the server reports them ("Reading your notes", "Examiner checking") and can be cancelled.
- **A saved set**: the review in a sentence ("2 kept as written and 1 corrected"), **Check these in your notes**
  (lines the examiners think are wrong, with the correct fact; no questions are set on them), then the questions on
  the same card as the built-in bank (answer, why, why not, exam tip, See it in 3D, highlights and notes), each with
  **From your notes**, the words it tests. **What Atlas read from your notes** shows the transcript to compare
  against the pages. Each question is labelled "AI-written, AI-checked", with a source line saying it was not
  reviewed by an academic.
- Sets are saved on the device only (IndexedDB `atlas` v2, store `noteSets`): the transcript, corrections and
  questions. Photos are never stored. Deleting a set also removes its answers, highlights and notes. Highlights and
  notes on these questions appear in My Highlights / My Notes and jump back to the set.

**The server** (`server/`, Node 22.18+, no build step): the Claude API key must never be in the app, so the app
calls a small server that holds it.

- `POST /api/notes-to-exam` takes the notes and settings as JSON and answers with server-sent events (`stage`, then
  `result` or `error`). Limits: 12 images of up to 5 MB, a 30 MB PDF, 40,000 characters of text. Each device gets one
  set at a time and 12 an hour (`RATE_PER_HOUR`); failed sets are not counted. CORS is limited to the app's origins
  (`ALLOWED_ORIGINS`).
- **Two passes**, both with Claude Opus 5.5 at high effort, streamed, with structured outputs (a JSON schema the API
  enforces):
  1. *First examiner*: transcribes the notes faithfully (`[illegible]` where it cannot read), decides whether they are
     readable anatomy notes, lists factual errors as corrections, and writes the questions.
  2. *Second examiner*: checks each draft against anatomical fact and the question standards, then keeps, fixes or
     drops it, giving a reason. It also checks the corrections.
- **One job only**: both system prompts (`server/src/prompts.ts`) confine the model to turning anatomy notes into exam
  questions. Text in the notes is treated as material, never as instructions. Notes that are not anatomy, or that
  cannot be read, get a one-sentence explanation and no questions.
- **The standard asked for**: single best answer questions answerable from the stem, four parallel options from one
  category with one defensible answer, no "all/none of the above"; short answers with a marking scheme; understanding
  and application (clinical vignettes at undergraduate and medical level); every question tied to the words of the
  notes; Terminologia Anatomica terms, correct whatever the notes say; British English.
- Everything that comes back is checked again in code (`server/src/schema.ts`): exactly four distinct options, the
  answer in range, a "why not" line for every wrong option and none for the answer, explanations of a sensible
  length, a model answer for short answers, a bone id that exists in Atlas. Anything that fails is dropped, never
  shown.
- The system prompts are cached (`cache_control`), so repeat requests read them from the prompt cache. A refusal,
  an over-long output, rate limits and API errors each give the student a plain message.

Run it:

```
cd server && npm install
ANTHROPIC_API_KEY=… npm start          # :8787
# app, development: npm run dev (Vite proxies /api to :8787)
# app, production: VITE_NOTES_API_URL=https://your-server npm run build
```

Without `VITE_NOTES_API_URL`, a production build shows Notes to Exam with the camera working and sending switched
off ("Not connected in this preview").

Tests: `server/src/server.test.ts` (validation, request limits, the rate limiter, both passes with a scripted
stand-in for Claude, the HTTP stream, CORS, 429) and `src/learn/notesExam.test.ts` (conversion into Atlas questions,
reading the event stream however it is split, error messages).

## Layered flashcards (flashcards upgrade, step 1: preview)

Home → Flashcards → **Layered flashcards**, or Practice → Layered flashcards. One question on the front (with the
structure in 3D where that does not give the answer away). The back shows the answer, then three layers, all
collapsed until tapped: **Why?** (with **Explain simpler**), **Go deeper** (at most five one-line points) and
**Clinical**. Below them: memory hook (only where accurate), exam trap, See in 3D, and the source. The card flips with a
soft sound; swiping up on the back opens the next layer. Highlights and note pins work on every card, as in the
textbook. Rated Again / Hard / Good / Easy with FSRS (state under `lc:<id>`). The session ends with a summary: cards
learnt, levels reached, weakest topics.

- Content: `content/cards/<topic>.json`, loaded by `src/learn/layered.ts`; the session is
  `src/ui/study/LayeredSession.tsx`. Levels: Core, Higher, Distinction. Types: identify, feature, relation, supply,
  function, clinical, compare, reverse.
- **Sources on every statement**: each records its OpenStax A&P 2e paragraph (`s8-2#fs-id2637051`) and/or `check`,
  saying exactly what still needs an approved source. Unchecked statements carry a † in the app. A card with any
  `check` cannot be marked reviewed.
- Tests (`src/learn/layered.test.ts`): required fields; no duplicates by id, front or objective; one question per
  front; short answers; layer sizes (Why 2–3 sentences, 3–5 one-line depth points); every cited OpenStax paragraph
  exists; nothing reviewed while a check remains; the 3D front never shows the answer; British English.
- Now: 10 example cards for review (`docs/flashcards-review.md`). Next: the level system with unlocking, converting
  the existing name/find cards, then the full Skull and Upper limb decks.

## Progress (step 6)

Top bar → progress icon. All computed from data saved on the device (`useProgress`, via `appStorage`):

- **Bones mastered** (of 206), **accuracy** (all answers), **bones seen**, **days in a row** (and the longest run;
  a streak survives until the end of the day after the last study day). No badges.
- **Mastered** = answered at least 3 times, the last 3 right, and ≥ 80 % right overall. Answers are pooled by bone
  name (left and right femur count together); counts are over all 206 bone ids (`src/learn/mastery.ts`, tested).
- **Mastery by region** (meter list: mastered and seen), **study days** heat map (15 weeks, one teal ramp, tap a
  day for its count), **weakest bones** with *Practise weak bones*, and an **accuracy-per-bone** table.
- Each bone's info panel shows *Your answers* (right / total, Mastered tag).
- Reset progress (with confirmation). Cloud sync later only needs a new `appStorage` backend.

Polish in this step: study and progress screens load on first use (main bundle 120 → 88 KB gzipped); the beta label
wraps instead of being cut off on narrow phones.

## Female skeleton (step 2)

`public/models/skeleton-female.glb` (1.07 MB, 206 bones, 161 cm). No free, complete female skeleton with separate bones
exists, so it combines:

- **Real female bones (36)** from the Visible Human Female, via the HuBMAP Human Reference Atlas *3D Reference Organ
  Set for Female v1.5* (CC BY 4.0, doi:10.48539/HBM352.BTSQ.586): C1–L5, sacrum, coccyx, hip bones, femur, patella,
  tibia, fibula. These carry the main sex differences (pelvis shape, subpubic angle, sacrum).
  The donor has six lumbar vertebrae; Atlas shows the standard five (the top one is left out and the spine above lowered
  by 34 mm).
- **Derived bones (170)**: skull, ossicles, hyoid, thorax, upper limbs, hands and feet from the Z-Anatomy male, scaled
  by the measured female/male long-bone ratio (0.944; head 0.967), placed by a best fit to the female thoracic vertebrae
  (or, for the feet, the female ankle), with typical female skull adjustments (brow ridge, mastoids, occipital
  protuberance, gonial angles; 2–3 mm).

Each bone's panel says which it is ("3D model"), and bones with typical sex differences have a "Female and male"
section (`sexDifferences` in the bone's JSON).

```bash
curl -o /tmp/hra-f.glb https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/assets/3d-vh-f-united.glb  # 212 MB
npm run model -- /tmp/za/Resources/Models/FBX female /tmp/hra-f.glb   # scripts/female.mjs does the fitting
```

## Performance (measured in headless Chromium, 390×844)

- First view (UI + whole skeleton on screen): **2.6 s** on simulated Fast 4G (9 Mbps, 85 ms) with 4× CPU
  slowdown, and 2.1 s on Wi-Fi with 4× CPU. 1.4 MB transferred. The UI paints in about 0.7 s, and three.js
  loads as a separate chunk.
- Rendering: one matcap material (a single texture lookup per pixel) and 207 draw calls. Frames render only
  when something changes, and the pixel ratio is capped at 2.
- **Not yet measured on a real phone**, so 60 fps is unverified. Headless Chromium renders on the CPU, which
  makes its frame rates meaningless.

## Code map

```
content/          bones/*.json (206), regions.json, app.json
scripts/          build-skeleton.mjs (model), bones_src.py (first-draft content)
src/data/         types, bone loading, search (+ tests), model manifest
src/state/        Zustand stores: viewer state, persisted prefs (via src/lib/storage.ts), HUD
src/viewer/       lazy 3D chunk: Skeleton, CameraRig, Picking, LabelLayout, materials, HudFloor
src/ui/           TopBar, SearchBar, Dock, InfoPanel, LabelsOverlay, Menu, Credits, Disclaimer, ReportSheet
src/ui/notes/     Notes to Exam: camera, compose, saved sets
server/           Notes to Exam server (holds the Claude API key)
```

New body systems later: add `content/<system>/…` JSON and a model built the same way, then load it as another
layer in `Viewer`. Picking, panel, search, labels and camera work on whatever is in `registry`.

## Native apps (Capacitor)

`capacitor.config.ts` is set up (`webDir: dist`). On a Mac with Xcode, or with Android Studio:

```bash
npx cap add ios        # or: npx cap add android   (once)
npm run cap:sync       # after every web build
npx cap open ios
```

The native projects aren't committed yet. They need Xcode or Android Studio, which this build environment doesn't have.

## Licences

3D models: CC BY-SA 4.0, adapted from Z-Anatomy (CC BY-SA 4.0), BodyParts3D 4.0 (© DBCLS, CC BY 4.0) and the
HuBMAP Visible Human Female reference set (CC BY 4.0). The credits screen in the app carries the full attribution.
App code dependencies are MIT, Apache 2.0, or OFL (Inter font).
