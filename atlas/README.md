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
