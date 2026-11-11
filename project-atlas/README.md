# Atlas — anatomy trainer (prototype)

A typing-based anatomy trainer for nursing and medical students. A 3D model appears with one
structure highlighted in red; you type its name, letter by letter. Mobile-first PWA: runs in
iPhone and Android browsers and installs to the home screen.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # logic + content validation
npm run lint
npm run build && npm run preview   # production build with service worker
```

To try it on a phone on the same Wi-Fi: `npm run dev -- --host`, then open the printed network URL.
(Service workers need HTTPS or localhost, so offline mode and installation only work on a deployed build.)

## What's in the prototype

- **Quiz** (Practice tab): learn mode (ghost letters + definition clue) and hard mode (dashes only),
  on-screen QWERTY + physical keyboard, wrong keys flash red and shake the word, backspace, hint
  (reveals a letter, counts as an error), skip, synonyms (e.g. *collarbone*), multi-word answers.
  After each answer: green/red confirmation, definition, one clinical note, auto-advance after 1.2 s
  (tap the card to pause; Enter/Space continues). The camera eases to the next structure; previous and
  next questions sit either side as blurred ghost models.
- **3D**: drag to rotate, pinch to zoom, double-tap to reset. Explore tab: tap any bone to identify it.
- **Learning logic**: per-structure attempts / correct / errors / last seen; Leitner-box spaced
  repetition (misses come back 4 questions later in the same session and sooner in future sessions;
  mastered items appear less often); "Review mistakes" quizzes only items not yet re-learned.
- **Tracks**: Nursing shows injection, pulse, cannulation and safety notes; Medicine shows Latin
  names (also accepted as answers) and finer landmarks.
- **Tabs**: Home (today, continue, weak areas), Courses (Skeleton live; Heart, Vessels, Muscles
  "Coming soon"), 3D, Practice, Tests (20 questions / 5 minutes / hard mode, history), Progress
  (per-region accuracy, most missed, every structure), Profile (theme, track, sound, reset, credits).
- **PWA**: manifest, icons, service worker. App shell, fonts, content and the Draco decoder are
  precached; each module's GLB is cached the first time it's opened, so it works offline after one visit.

## Content (data-driven)

All questions live in `/content`. Nothing is hard-coded in components.

| File | Purpose |
| --- | --- |
| `catalog.json` | Courses → modules: title, `status` (`available` / `coming-soon`), content file, model file + transform |
| `skeleton.json` | Regions and structures |
| `skeleton.placeholder.json` | Primitive stand-in shapes used until the GLB exists |

Each structure:

```json
{
  "id": "clavicle", "name": "clavicle", "synonyms": ["collarbone", "collar bone"],
  "latinName": "clavicula",
  "definition": "One sentence. Must not contain the answer — it is shown as a clue in learn mode.",
  "nursingNote": "…", "medicineNote": "…",
  "region": "upper-limb", "modelFile": "skeleton.glb",
  "meshName": "clavicle",
  "camera": { "position": [-0.2, 1.5, 0.6], "target": [-0.08, 1.41, 0.03] },
  "difficulty": 1
}
```

- Answers and synonyms: lower-case letters and spaces only (that's what the keyboard has).
- `meshName` may be a string or an array. Matching ignores case and punctuation and allows side or
  index suffixes, so `"humerus"` matches `Humerus.l`, `Humerus_R`, `humerus2`. (three's GLTFLoader
  strips `.` from node names, so `Humerus.l` arrives as `Humerusl`; the matcher handles that.)
- Coordinates are "atlas space": metres, Y up, the body faces +Z, feet at y = 0. So the body's
  **right** side is −X.
- `npm test` validates every content file: required fields, typeable answers, no answer leaked in
  the definition, no answer shared by two structures, every `meshName` present in the placeholder.

**Adding a module** (e.g. Heart): add `content/heart.json` (+ optional `heart.placeholder.json`), put
`heart.glb` in `public/models`, and set the module to `"available"` in `catalog.json` with its
`contentFile` and `model`. No code changes.

**Tuning cameras**: in dev, the 3D tab has a "Copy camera" button that copies the current view as JSON
for a structure's `camera` field.

## 3D models

Final models come from **Z-Anatomy** (CC BY-SA 4.0, based on BodyParts3D, CC BY-SA 2.1 JP) as GLB
files in `public/models`, one named mesh per bone. Until then the app draws primitive placeholders.

### Converting Z-Anatomy files to compressed GLB

```bash
scripts/convert-model.sh path/to/Z-Anatomy.blend skeleton   # or .fbx / .glb
```

The script:

1. Opens the file in Blender (headless) and exports only visible **meshes** to GLB, so Z-Anatomy's
   text labels, cameras and lights are left out. Object names are kept, and they become mesh names.
2. Runs [gltf-transform](https://gltf-transform.dev) (MIT): `dedup` → `weld` → `simplify` (50%) →
   `draco`. Node names are preserved.
3. Prints the mesh names so you can copy them into `meshName` fields.

Manual equivalent: in Blender, delete or hide everything except the bones you need, then
File → Export → glTF 2.0 (.glb) with *Selected Objects*, *Apply Modifiers* and *+Y Up* checked, then:

```bash
npx @gltf-transform/cli draco skeleton-raw.glb public/models/skeleton.glb
```

After adding a real model:

- If it isn't in atlas space, set `model.scale` / `position` / `rotation` (degrees) in
  `catalog.json`. Z-Anatomy exports may use centimetres or another axis convention: check it.
- Update each structure's `meshName` to the real mesh names, and re-tune `camera` values with
  "Copy camera".
- Landmarks such as the epicondyles may not be separate meshes in Z-Anatomy. Either split them
  out in Blender (recommended) or highlight the parent bone.

The Draco decoder is served from `/draco` (copied from three.js), not from a CDN, so it works offline.

## Architecture

```
src/
  content/   types, lazy loader (one chunk per module), useModule hook, content tests
  lib/       pure logic: typing engine, spaced repetition, mesh matching, storage, sound
  state/     Zustand: settings + progress (persisted via storage interface), nav, quiz session
  viewer/    AnatomyViewer (lazy chunk with three.js), ModelInstance, Highlighter, CameraRig, placeholder builder
  quiz/      QuizScreen, AnswerWord, Keyboard, SessionSummary
  screens/   one per tab + Credits
```

- **Storage**: everything persisted goes through `appStorage` in `src/lib/storage.ts`
  (`getItem` / `setItem` / `removeItem`, sync or async). Swap in a backend implementation there.
- **Performance**: three.js and R3F (~270 KB gzipped) load only when a 3D view opens; first load is
  ~82 KB gzipped JS. Pixel ratio capped at 2; the canvas renders on demand, not every frame. The ghost
  carousel is a second canvas at half resolution that renders only when the question changes.
- **Highlight**: every mesh gets a shared translucent bone material; matched meshes get a red
  emissive material plus a Fresnel "glow shell" (small custom shader).

## Status

Verified in headless Chromium at 390×844: build, lint, tests, the full practice → summary → review
flow, hard mode, timed test, explore tap-to-identify, light mode, localStorage persistence, offline
reload, and loading a Draco-compressed GLB (exported from the placeholder) with Z-Anatomy-style names.

**UNVERIFIED**: real iPhone/Android devices (touch feel, Safari quirks, home-screen install), the
Blender step of `convert-model.sh` (Blender wasn't available), and real Z-Anatomy models.
