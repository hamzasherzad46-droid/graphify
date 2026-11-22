# Atlas — 3D skeletal anatomy (Phase 1)

Mobile-first 3D anatomy app for university students. Phase 1 covers the human skeleton only: 206 bones,
each a separate, selectable mesh. Built as a PWA (Vite + React + three.js / React Three Fiber), ready to wrap with Capacitor.

```bash
npm install
npm run dev            # http://localhost:5173  (add -- --host to open it on a phone on the same Wi-Fi)
npm test               # content + search tests
npm run lint
npm run build && npm run preview   # production build with service worker (offline after first visit)
```

## Build status

| Step | What | Status |
| --- | --- | --- |
| 1 | Male skeleton: rotate / zoom / pan / select, info panel | **Done**, awaiting phone test |
| 2 | Female skeleton and toggle | Next (toggle is shown, disabled) |
| 3 | Exploded view, drag, reassemble | — |
| 4 | Typing Test | — |
| 5 | Flashcards (FSRS), Quiz, Weak Bones | — |
| 6 | Progress tracking and polish | — |

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

`public/models/skeleton-male.glb` (1.09 MB, Draco): 206 bone meshes named by bone id, plus one merged,
non-selectable context mesh (costal cartilages, intervertebral discs, teeth). 315k triangles. Each bone is
centred on its own origin, so the exploded view can move bones by changing their position only.

Source: **BodyParts3D 4.0** (© DBCLS, CC BY 4.0), the dataset Z-Anatomy's skeleton is built on, read from the
`@dagno/anatomy-model` npm package. Z-Anatomy's own files are hosted on GitHub, which this build environment
couldn't reach.

```bash
mkdir -p /tmp/bp3d && (cd /tmp/bp3d && npm pack --ignore-scripts @dagno/anatomy-model && tar xzf *.tgz)
npm run model -- /tmp/bp3d/package/model male   # writes the GLB and src/data/model-male.json
npm test
```

**Approximate shapes**: BodyParts3D has no coccyx and no ossicles. The build script generates them. The coccyx
is four tapering segments at the sacral apex. The malleus, incus and stapes are simplified shapes at typical
adult sizes, placed in the tympanic cavity. The script finds that cavity by ray-casting each temporal bone for
the external acoustic meatus. Each of these bones says so in its info panel.

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

Bone meshes: BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0 (modified). The credits screen
in the app carries the full attribution. Code dependencies are MIT, Apache 2.0, or OFL (Inter font).
