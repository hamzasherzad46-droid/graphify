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
  answer (the name and `acceptedSpellings`: synonyms, British/American forms); not case-sensitive; a letter typed
  where a space goes gets the space added. A wrong key is refused: the key flashes red and shakes, the refused letter
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
