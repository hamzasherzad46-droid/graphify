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

**Sandboxed build** (`npm run build:artifact` → `dist-artifact/`): for hosts like a claude.ai artifact,
which serve only HTML/JS/CSS, block service workers and may block WebAssembly. It uses relative URLs,
inlines the fonts, has no service worker, and ships each model quantized (no Draco) inside a JS module
that is parsed in memory (`src/viewer/embeddedModel.ts`). Offline mode and home-screen install don't
apply there.

## What's in the prototype

- **Eight body systems, 249 structures, all on real BodyParts3D meshes**: skeleton (65, incl. individual
  carpals/tarsals, C1/C2/C7, teeth by type), muscles (52), heart (23), major vessels (32), airways (15),
  brain (31), digestive (17), urinary (7), male reproductive (7). Organ and muscle modules show a faint
  skeleton behind them for orientation.
- **Quiz**: learn mode (ghost letters + definition clue) or hard mode (dashes); level filter (foundation /
  intermediate / advanced); optional per-question timer (30/20/10 s; time-out = miss); exams with a whole-test
  clock and per-answer timer. Combos, XP, stamps and sounds that climb with the combo.
- **Flashcards**: what it does, why it's there, and a note for your track; swipe to grade; own spaced repetition.
- **Today**: level & XP, daily goal dial, streak + week strip, due flashcards and mistakes, daily / weekly /
  monthly assignments (auto-awarded XP), fact of the day, systems index, weak spots, quick exam.
- **Tracks**: nursing, medicine, physiotherapy, dentistry, sports science — notes per structure where relevant.
- **Languages**: English, French, German, Arabic (right-to-left), Russian, Chinese, Korean for the whole UI.
  Anatomy content (names, definitions, notes) is English; answers are typed in English or Latin.
- **Design**: “plate book” — warm paper and ink, vermilion accent, Newsreader + IBM Plex, mono specimen labels;
  “Darkroom” dark mode.

### Known data gaps (BodyParts3D 4.0)

No lung surfaces (lungs are shown by their segmental airway trees), no spinal cord or limb nerves, no
masseter/temporalis/latissimus dorsi/rectus abdominis or facial muscles, no female reproductive organs,
no sigmoid colon or caecum, and no coccyx (an approximate one is added). The liver surface comes from
open-anatomy-3d (CC BY 4.0). Translations and clinical notes need review by native speakers and clinicians.

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

`public/models/skeleton.glb` is the real **BodyParts3D 4.0** skeleton (© DBCLS): 276 named meshes,
~308k triangles, 1.4 MB with Draco compression. Each bone is its own mesh (`frontal`, `parietal.l`,
`rib_3.r`, `scaphoid.l`, `hand_phalanx_23.r`, …), with the original BodyParts3D name and id kept in
each node's `extras`.

Changes from the source data, all made by `scripts/import-bodyparts3d.mjs`:

- Bones only, plus teeth, costal cartilages and intervertebral discs so the skeleton looks complete.
- The **medial and lateral epicondyles** are split off each humerus as their own meshes, so they can
  be highlighted. The split is a sphere around the most medial or lateral point of the distal humerus.
- **The coccyx is approximate.** BodyParts3D has no coccyx mesh, so the script adds a smooth, tapered
  shape at the sacrum's apex. Replace it with a Z-Anatomy coccyx when you can.

### Building the other system models

Each system has a spec (`scripts/modules/<module>.json`: BodyParts3D name patterns) and a content source
(`scripts/content-src/<module>.py`):

```bash
python3 scripts/content-src/build.py muscles
node scripts/import-module.mjs /tmp/bp3d/package/model scripts/modules/muscles.json /tmp/muscles-raw.glb --fit-cameras content/muscles.json
SIMPLIFY_RATIO=0.35 SIMPLIFY_ERROR=0.003 scripts/convert-model.sh /tmp/muscles-raw.glb muscles
```

The digestive module also takes `--extra flat.glb` (open-anatomy-3d's model after `gltf-transform dequantize`
and `flatten`) for the liver surface. `skeleton-context.glb` is the skeleton simplified to ~95k triangles
(`SIMPLIFY_RATIO=0.18 SIMPLIFY_ERROR=0.01`), used as the faint backdrop.

### Rebuilding the skeleton model

The source is the [`@dagno/anatomy-model`](https://www.npmjs.com/package/@dagno/anatomy-model)
npm package (BodyParts3D 4.0, CC BY 4.0), used as data only:

```bash
mkdir -p /tmp/bp3d && (cd /tmp/bp3d && npm pack --ignore-scripts @dagno/anatomy-model && tar xzf *.tgz)
node scripts/import-bodyparts3d.mjs /tmp/bp3d/package/model /tmp/skeleton-raw.glb --fit-cameras content/skeleton.json
scripts/convert-model.sh /tmp/skeleton-raw.glb skeleton
npm test   # checks every meshName exists in the new GLB
```

`--fit-cameras` re-frames every question's camera around the real bone, keeping its viewing angle.

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

After swapping in a different model:

- If it isn't in atlas space, set `model.scale` / `position` / `rotation` (degrees) in
  `catalog.json`.
- Update `meshName` fields to the new mesh names, run `npm test`, and re-tune cameras with
  "Copy camera".

### Placeholders

A module with no GLB yet can list a `placeholderFile` in `catalog.json`: primitive shapes (spheres,
boxes, capsules…) named like real meshes, so the quiz works before models exist. The skeleton no
longer needs one.

### Rendering

Bones use a near-opaque ivory material lit by a procedural studio environment (three's
`RoomEnvironment`, nothing downloaded). The target bone is red with a soft rim glow. Any part of it
hidden behind other bones shows through as a faint red silhouette (a `GreaterDepth` pass), so
internal bones like the sphenoid and ethmoid stay findable.

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
reload, and every structure highlighted and framed correctly on the real BodyParts3D skeleton.

**UNVERIFIED**: real iPhone/Android devices (touch feel, Safari quirks, home-screen install, and
frame rate with the ~308k-triangle skeleton; if a phone struggles, lower the `--ratio` in
`convert-model.sh`), the Blender step of `convert-model.sh` (Blender wasn't available), and Z-Anatomy models.
