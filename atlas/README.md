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

## 3D model upgrade, step 1: skin (male; part of `public/models/tissue/layers-male.glb` since step 2)

Body surfaces for the coming layered models (skin → fat → muscles → organs → skeleton), not yet shown in the app (the
layer controls come in step 5). Built from **MakeHuman** (CC0): its base mesh and macro body-shape targets, with
MakeHuman's even mix of ethnicities, age 25.

- **Builds**: female slim and lightly toned (muscle 0.55, weight 0.38 on MakeHuman's 0–1 sliders, 0.5 = average);
  male lean and athletic (muscle 0.72, weight 0.38). No body hair; a smooth, simplified genital area.
- **Re-posed to the anatomical position** with MakeHuman's own rig (linear blend skinning): every limb segment is
  turned and stretched onto the matching Atlas bones (shoulder, elbow, wrist, knuckles and finger joints, hip, knee,
  ankle, ball of the foot), the spine and head follow the Atlas spinal curve, and the turn to palms-forward is shared
  along the arm (shoulder 30 %, forearm 65–100 %).
- **Fitted to the skeleton**: the torso is widened and deepened slice by slice where the ribcage or pelvis needs room
  (lean soft-tissue margins: 12 mm at the sides, 8 mm over the sternum, 6 mm over the spine); then every bone point is
  checked exactly (generalised winding number) and the skin moved out, as a smooth local bump, wherever bone is outside
  it or less than 3 mm under it. Result: no bone outside the male skin; one point of the ~130,000 on the female
  pelvis.
- 13,380 vertices, 26,756 triangles, with MakeHuman's UVs (for the skin textures in step 4); 86 kB each, Draco.

```bash
# MakeHuman data (base.obj, default.mhskel, default_weights.mhw, targets/macrodetails/*) from
# github.com/makehumancommunity/makehuman, makehuman/data
node scripts/model/export-bones.mjs public/models/skeleton-male.glb /tmp/fit/male      # and female
python3 scripts/model/build_skin.py <makehuman data> /tmp/fit /tmp/fit                 # numpy, scipy, libigl
```

## 3D model upgrade, step 2: the male layered model (`public/models/tissue/layers-male.glb`, `layers-male-phone.glb`)

**Male only.** The female skeleton is partly derived from the male and no free female muscle set exists, so the
female model shows the skeleton alone ("Female muscles coming soon" when layers ship) until real female anatomy is
available. No adapted or guessed female soft tissue is built.

From **Z-Anatomy** (CC BY-SA 4.0), in the male skeleton's space (offset measured on matched bones every build; the
build stops if any bone disagrees by more than 1.5 mm):

- **683 meshes of the muscular system**, left and right separate: muscles, tendons, aponeuroses, fasciae, retinacula,
  tendon sheaths and bursae, including every intrinsic muscle of the hand and foot. **Lightly smoothed and
  simplified** (`scripts/model/remesh.py`), never reshaped: each mesh is smoothed (Taubin smoothing, which barely shrinks) and
  decimated to a triangle budget proportional to its surface area; a few coarse sheets that smoothing would still shrink
  keep their original triangles. A voxel rebuild (exact inside/outside, marching cubes) is tried for closed meshes but
  kept only if it wears no hole through a thin part; only 15 small meshes keep it, since most muscles are sheets
  thinner than the voxel would allow. Every mesh is checked against the full-resolution original (95th percentile of
  the two-sided surface distance: at most 1.2 mm for the detailed level, 1.5 mm for the phone level; more triangles
  are given until it is; `docs/remesh-check.tsv`). Two levels: about 1.15 million triangles (tablets, desktop) and
  about 478,000 (phones). Where muscles attach they dip into bone, as modelled in the source; that part is inside the
  opaque bone.
- **Eyes** (sclera, cornea, iris; from the nervous system) and **nasal cartilages** (major alar, septal and its lateral
  processes). Z-Anatomy has no external ear, so the model has none.
- **Layers** (`scripts/model/layers.py`, `docs/muscle-layers.md`): *superficial* (seen from the skin, or in the
  textbook surface layer), *deep* (otherwise, or placed deep by standard anatomy), *connective* (tendons, aponeuroses
  including the linea alba, retinacula, ligaments; and fasciae, sheaths and bursae, which include the palmar and
  plantar aponeuroses as thickenings of the deep fascia and are shown only on request).
- **Skin** (MakeHuman, step 1) shrink-wrapped onto the outer envelope of everything under it plus a lean fat layer
  (2.5 mm; 1.2 mm on the face, hands and feet). The envelope is built on a voxel grid (3 mm; 1.5 mm for the head and
  feet) with exact inside/outside, so the skin follows the outer surface, not the walls where muscles overlap; each
  skin point only follows tissue over its own body part's bones. **Hidden by default**: shown only from the layer
  control.
- **Per vertex:** baked ambient occlusion (creases between muscles darken; smoothed, never below 0.42) and fibre
  direction (the gradient of a harmonic field from one end of each muscle to the other).

**Materials** (`src/viewer/anatomyMaterials.ts`): muscle deep red-brown with a satin sheen, fibres and fascicles drawn
along the baked direction (faded out below a pixel, so no shimmer), a slightly different tone per muscle; tendons,
aponeuroses and ligaments silvery grey-white and fibrous (aponeuroses a little darker and cooler); eyes glossy with a
clear cornea; cartilage pale blue-white. Lighting: warm key, cool fill, cyan rim, all fixed to the camera so the rim
always sits behind the model.

```bash
node scripts/model/export-za.mjs /tmp/za/Resources/Models/FBX SkeletalSystem100 /tmp/fit/zaskel
node scripts/model/export-za.mjs /tmp/za/Resources/Models/FBX MuscularSystem100 /tmp/fit/muscles-male
node scripts/model/export-za.mjs /tmp/za/Resources/Models/FBX MuscularSystem100 /tmp/fit/muscles-orig 100000000 0
node scripts/model/export-za.mjs /tmp/za/Resources/Models/FBX NervousSystem100 /tmp/fit/nervous
python3 scripts/model/remesh.py /tmp/fit              # writes /tmp/fit/remeshed-male.npz and remesh-check.tsv
python3 scripts/model/build_layers.py /tmp/fit        # /tmp/fit/mhd: the MakeHuman data, for the rig's body parts
python3 scripts/model/write_layers.py /tmp/fit /tmp/fit/layers-male.glb 0        # detailed level (tablets, desktop)
python3 scripts/model/write_layers.py /tmp/fit /tmp/fit/layers-male-lod1.glb 1   # phone level
npx gltf-transform draco /tmp/fit/layers-male.glb public/models/tissue/layers-male.glb
npx gltf-transform draco /tmp/fit/layers-male-lod1.glb public/models/tissue/layers-male-phone.glb
python3 scripts/model/verify_muscles.py /tmp/fit/muscles-male /tmp/fit/muscles-orig docs/muscle-check.tsv
```

## 3D model upgrade, step 3: the male organs (`public/models/tissue/organs-male.glb`, `organs-male-phone.glb`)

**Male only**, for the same reason as the muscles. From **Z-Anatomy** (CC BY-SA 4.0), in the male skeleton's space
(the same measured offset as the muscles): `scripts/model/organs.py`.

- **368 parts:** the heart (chambers, valve leaflets, papillary muscles, coronary arteries and cardiac veins) and the
  great vessels (aorta, pulmonary trunk and arteries, venae cavae, pulmonary veins); the lungs (five lobes), trachea and
  bronchial tree; the oesophagus, stomach, small and large intestine, appendix, liver, gallbladder and bile duct,
  pancreas, tongue, palate, pharynx and salivary glands; the kidneys, renal pelves, ureters, bladder and urethra; the
  thyroid, parathyroid, suprarenal and pituitary glands and the pineal gland; the spleen, thymus and palatine tonsils;
  the male genital organs; the brain (cerebrum with its deep structures, cerebellum, brainstem) and the spinal cord.
  Not included: lymph nodes, nerves, and the vessels beyond the heart's.
- **Per part, extras** `{layer: 'organs', kind, system, side, za}`. The genital organs and the urethra also carry
  `modesty: true` (hidden while modesty is on, the default); the pleura and peritoneal folds (omenta, mesocolon)
  carry `hidden: true` (they wrap the organs and are shown only on request).
- **True to the source:** each part is lightly smoothed and simplified, and checked against the full-resolution
  original (95th percentile of the two-sided surface distance, `docs/organ-check.tsv`): at most 0.8 mm (phone level
  1.2 mm), a fifth of the part's thickness for thin closed parts, and 0.15 mm for vessels, ducts and airways (open
  tubes in the source, which crumple under any coarser limit). A part whose smoothing would throw any point more
  than 5 mm out keeps its original surface.
- **Repairs, all listed in Credits:** an opening no joining part meets is a hole in the source mesh and is closed
  with a smooth patch that continues the wall's curvature (one about 5 cm across in the stomach's front wall, small
  ones in the small intestine, liver and bronchi); openings where parts meet (stomach to duodenum, chamber to chamber)
  and the cut ends of the great vessels stay open. The brain is coarse in the source (about 6.5 mm between points),
  so it is rounded by subdivision, within 2 mm of the original (2.6 mm on phones).
- **Two levels:** about 633,000 triangles (tablets, desktop; 2.8 MB) and about 351,000 (phones; 1.8 MB),
  Draco-compressed, with baked occlusion between organs.

**Materials** (`organMaterial` in `src/viewer/anatomyMaterials.ts`): natural tissue tones under a soft clear coat,
arteries red and veins blue by textbook convention, valve leaflets pale, drawn from both sides (some source surfaces,
such as the pharynx, are single sheets).

```bash
node scripts/model/export-za.mjs <Z-Anatomy FBX dir> VisceralSystem100 /tmp/fit/visceral-orig 100000000 0
node scripts/model/export-za.mjs <Z-Anatomy FBX dir> CardioVascular41 /tmp/fit/cardio-orig 100000000 0
node scripts/model/export-za.mjs <Z-Anatomy FBX dir> LymphoidOrgans100 /tmp/fit/lymph-orig 100000000 0
python3 scripts/model/organs.py /tmp/fit /tmp/fit/organs-male   # also needs nervous, zaskel and male (step 2)
npx gltf-transform draco /tmp/fit/organs-male.glb public/models/tissue/organs-male.glb
npx gltf-transform draco /tmp/fit/organs-male-lod1.glb public/models/tissue/organs-male-phone.glb
```

## 3D model upgrade, steps 4–6: muscles and organs in the app

- **Layer control** (dock → Layers, `src/ui/LayerBar.tsx`): a slider from the skeleton alone, through the organs and
  the deep and superficial muscles, to the skin (`LAYERS` in `src/state/store.ts`). **Ghost mode** makes the outermost
  layer see-through: with the organs, the bones around them (so the brain shows through the skull); with muscles, the
  outer muscles; with the skin, the skin. **Modesty** (on by default; also in You → Appearance) hides the genital organs
  and the urethra. The female model shows the skeleton, with "Female muscles coming soon". Opening the exploded view
  returns to the skeleton alone; study sessions always use the bones.
- **Tap a muscle or organ** for its sheet (`src/ui/PartPanel.tsx`): its name as Z-Anatomy gives it, what it is, its
  body system, side and layer; Focus, Hide and Ghost; links to its lesson (where there is one) and its textbook topic.
  Names come from `content/parts/male.json` (1,064 parts, written by `scripts/model/part_names.py` from the models;
  abbreviated or misspelt Z-Anatomy names are written out in their Terminologia Anatomica form, for example
  "Bucinator" → "Buccinator", "Lat Fis-ant-Horizont" → "Anterior horizontal ramus of lateral sulcus"). Every name passes
  the text check.
- **Sides:** a trailing l or r marks a side only where it is not part of the word: "Liver", "Gallbladder" and
  "Urinary bladder" are midline (the build had named them `live_right` and so on), and "Iliocostalis colli muscle", the
  only left part without a letter, is left (`side_of` in `scripts/model/layers.py`; `scripts/model/fix_ids.py` applied
  the rule to the built models without rebuilding them).
- **Materials (step 4):** with muscles or organs on show the studio lights are on, and the bones turn lit ivory and the
  cartilage glassy, to match them; the skeleton-only view keeps its HUD look.
- **Performance (step 6):** each model loads the first time its layer is shown (`src/viewer/SoftTissue.tsx`); phones
  (screen under 700 px, or under 4 GB of memory) get the lighter models and plainer materials (no sheen, clear coat or
  fibre striations). Nothing that cannot be seen is drawn: the brain and spinal cord only when the skull or spine is
  see-through or hidden, and nothing under the skin when the skin is on. The models are not precached; each is kept
  for offline use once viewed. Measured in headless Chromium at 390 × 844 (draw calls, triangles): skeleton 253,
  260,000; organs 389, 458,000; deep muscles 681, 636,000; all muscles 911, 837,000; skin 10, 34,000 (under the opaque skin neither muscles nor bones are drawn). At 1024 × 1366
  (detailed models): up to 911 and 1.5 million. **Frame rate on phones is not yet measured on a device:** You →
  Appearance → Frame rate shows frames per second in the 3D view for that test.
- **Smoothness:** a change of layer cross-fades (280 ms; at once when the system asks for reduced motion), and the
  bones under the skin go only once it has faded in. Opening the layer control downloads and decodes the organs, then
  the muscles, in the background; a layer still loading pulses its name on the slider. Opening or closing the layer or
  explode controls frames the whole model again inside the space left free (unless zoomed in or something is selected).
- **Skin repairs** (`scripts/model/fix_eyelids.mjs`, on the built models): fitting the skin to the skull had crumpled
  the eyelids and folded them across the eyes. Each opening is now an almond centred on the cornea, with the lids lying
  smoothly on the eyeball. Under the opaque skin the bones are not drawn (they showed through it as specks where it is
  thinnest). The scalp's galea aponeurotica is nearly opaque, so the crown reads as scalp rather than bare skull.

## Exploded view (step 3)

Dock → explode button. Choose the whole skeleton or one region (skull, spine, thorax, upper limb, hand, pelvis,
lower limb, foot) and drag the slider. Each bone moves away from its cluster's centre (e.g. the left carpals), each
cluster from its region's centre, and in a whole-skeleton explode each region from the body's centre; limbs explode
per side, the vertebrae spread gently along the column, and a spine-only explode moves the column back so it clears
the skull (`src/viewer/explode.ts`, tested in `explode.test.ts`).

**Hold a bone (0.3 s), then drag** to pull it out; a quick drag still rotates. **Reassemble** eases everything home.
Bones ease towards their targets each frame, and frames are only rendered while something moves.

## Region views (3D)

3D tab → **View** (top right) opens **Show in 3D**: Whole skeleton, Skull, Spine, Thorax, Upper limb, Hand,
Pelvis, Lower limb or Foot (the groups in `content/regions.json`). Choosing one hides every other bone and flies
the camera in so that part fills the screen (the foot from above, the rest from the front).

- The limbs, hand and foot are shown one side at a time (the body's right at first), with a **Left / Both /
  Right** switch on the 3D view; the skull and trunk are always shown whole.
- Cartilage, discs and teeth show with their own bones only.
- Labels: "Main bones" labels every bone in a region view (the hand and spine have no "main" bones); "None" still
  hides them.
- Isolate a bone inside a region, then **Show all**, and you are back in the region. Searching for a bone outside
  it brings back the whole skeleton. Study sessions use the whole skeleton and return to the region afterwards.
  The exploded view explodes the region on show. Switching male and female keeps it.
- Code: `regionBones()` in `src/data/bones.ts`, `showRegion()` in `src/state/store.ts`, `src/ui/RegionPicker.tsx`;
  tests in `src/state/region.test.ts`.

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
Skull, Spine, Thorax, Upper limb, Lower limb, Pelvis; the textbook adds Bone tissue, The skeleton, Joints, Muscle tissue,
Muscles, Nervous system, Endocrine system, Heart, Blood vessels and circulation, Lymphatic and immune system, Respiratory
system, Digestive system and Urinary system. Pages
opened from Home form a stack backed by browser history, so the phone's back button closes them.

### Textbook (step 2)

- **Source**: OpenStax *Anatomy and Physiology 2e*, chapters 6–9 (the skeleton: 28 sections), 10–11 (muscle tissue and the
  muscular system), 12–16 (the nervous system), 17 (endocrine), 19–20 (the heart, blood vessels and circulation), 21
  (lymphatic and immune), 22 (respiratory), 23 (digestive) and 25 (urinary), 131 sections and 484 figures in all, imported by
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
  Vertebra codes are linked only after "vertebra" in the nervous system chapters (spinal nerves) and chapter 21
  (complement proteins C1–C9), never after "ganglia"; "dens" is not linked where it is the singular of dentes (teeth).
- **New chapters (10–11, 17, 19, 21–23, 25)**: typing errors in the source are corrected on import (each listed in
  `data/dictionary.json`, for example "quatratus femoris" → "quadratus femoris", "external automated defibrillators (EADs)"
  → "automated external defibrillators (AEDs)"), chemical formulas are set with subscripts (H₂CO₃, HCO₃⁻), and Figure 22.12,
  whose source file lacks its JPEG end marker, is read as it is (the picture is complete). New words in these chapters
  are listed as *proposed* in the dictionary, awaiting review.
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
- **Approved by source**: a word is approved automatically when Terminologia Anatomica, the OpenStax A&P 2e glossary
  (all chapters), MeSH 2026 (NLM; in British spelling) or the NHS A–Z (conditions and medicines) has it, or it is
  formed regularly from such a word. The sources are saved in `data/sources/` (`scripts/fetch-sources.mjs`); only words
  no source has are listed for a person, in `docs/words-to-review.md`.
- **Abbreviations** are written out in full the first time they appear in each lesson (a textbook section, an exam
  question, a flashcard, a bone's information), checked by the text check and applied to the OpenStax text on import.
  Full forms: `data/abbreviations.json`, harvested from OpenStax's own definitions (`scripts/build-abbreviations.mjs`).
- **Sentence case** for structure names in Atlas-written text ("the first thoracic vertebra"); Gray's keeps its own.
- **Style guide**: `docs/style-guide.md` (British -ise spelling, fetus, specialty, sulfur, grey, disc, one form per
  word, abbreviations, sentence case, quoted sources).
- The importer now renders the five OpenStax formulas (section 20.2) as text, including the four block equations it
  used to drop (Poiseuille's equation and its rearrangements).

## Notes to Exam

Home → **Notes to Exam**. The student adds their own material: lecture slides, handouts, Word notes, photos of
handwritten pages or typed notes. Atlas reads it, sorts it into topics, and Claude sets exam-style questions on
exactly what it says; a second, independent pass checks every question before the student sees it.

**Adding and reading material** (content upgrade, step 3: `src/learn/extract.ts`, `src/learn/notesDocs.ts`,
`src/ui/notes/NotesScreen.tsx`, `src/ui/notes/NotesDocScreen.tsx`)

- **Files**: PDF, PowerPoint `.pptx` (slide titles, bullets with their levels, tables, **speaker notes**), Word
  `.docx` (split into sections at headings; lists and tables kept), photos and text files. Several at once, up to
  100 MB each. Older `.ppt` and `.doc` files get a message asking for `.pptx` or `.docx`.
- **Read on the device**: PDF text (pdf.js, in a worker), slides and Word files never leave the phone at this stage.
  Only pages with no text of their own are sent to be read: photos, scanned PDF pages (drawn at up to 2000 px) and
  slides that are only a picture (their largest picture). The server transcribes them faithfully, with `[illegible]`
  where it cannot read and the labels of diagrams; the student is told which pages need checking.
- **Progress** for each file: "Opening: 12 of 40 pages", then "Reading handwriting and scans: 3 of 8", then a summary
  ("40 slides · 12 with speaker notes · 2 read from pictures · 1 to check"). Pages are sent 6 to a request, 3
  requests at a time; a failed batch can be retried.
- **Check the text**: every page, slide and section can be opened and corrected; questions are written on that text.
- **Topics**: Atlas sorts every part into the lecture's topics (titles, one-line summary, where they are: "Lecture 3:
  slides 3–9"). Title slides, contents and references go in "Not for questions", unticked. The student ticks the topics
  to be examined on; "Use whole files instead" makes one topic per file without the service.
- Each part is sent for questions under its reference (`[From: Lecture 3, slide 12]`), ready for questions that cite
  where they come from (step 4).
- **Kept on the device** (IndexedDB `atlas` v3, store `noteDrafts`): every file's text, edits and topics, so a lecture
  read once is there next time, offline too. Page images are held in memory only until read, never stored.
- Measured in headless Chromium (production build): a 120-slide PowerPoint with speaker notes opens in 0.43 s; a
  100-page PDF in 0.41 s; a 30-page scanned PDF is drawn in 1.5 s and handed to the reader.
- While another tab is showing, the 3D view no longer draws frames (`frameloop` paused), so reading files and lessons
  get the whole device.

**In the app** (`src/ui/notes/`, `src/learn/notesExam.ts`, `src/lib/image.ts`)

- **Camera**: a full-screen viewfinder in the app (`getUserMedia`, rear camera, up to 4K requested), with a page
  guide, shutter, a light toggle where the phone has one, and the last page and page count beside the shutter.
  Up to 12 pages a set. If the camera cannot be opened (permission refused, no camera), it says why and offers the
  phone's own camera instead (`<input capture="environment">`).
- Each page is scaled to at most 2000 px on its longest side and re-encoded as JPEG on the device. That is sharp
  enough for handwriting, quick to send, and strips the photo's metadata (location, camera).
- Material arrives as before (photos, files, typed notes); photos are still read on the server, everything else on
  the device.
- Sets are saved on the device only (IndexedDB `atlas`, store `noteSets`): the parts sent (refs, not the text), the
  findings, questions and cards. Photos are never stored. Deleting a set also removes its answers, highlights and
  notes. Each question is labelled "AI-written, AI-checked", with a source line saying it was not reviewed by an
  academic.

**Writing a set** (content upgrade, step 4: `src/learn/notesExam.ts`, `server/src/generate.ts`, `server/src/prompts.ts`)

- **What to make**: *Quick quiz* (5 or 10 questions), *Mock exam* (20, 30 or 40, timed, answers held until
  **Finish exam**, then a score of all questions), *Flashcards* (10, 20 or 30, added to My cards for spaced review)
  and *Weak spots* (5 or 10 new questions on what the student got wrong). Level: Foundation, Undergraduate or
  Medical. Question types, any mix: single best answer, true or false, fill in the blank, short answer.
- **Modules**: a set can be filed under a module (course or unit); saved sets are grouped by module.
- **In the background**: the set opens at once and fills in as each topic is checked ("6 questions ready, checked by
  a second examiner. Topics: 2 of 5."), with **Stop**. The student can answer while it is written. A set left
  writing when Atlas closes is marked "stopped" next time, keeping what was written.
- **Every question cites its part** of the material (`Lecture 3, slide 12`): **From your notes** shows the words it
  tests, and **Open** jumps to that slide or page, highlighted.
- **Two examiners per topic** (Claude Opus 5.5, structured outputs): the first writes the questions (or cards) and
  notes errors in the material and places where two parts disagree; the second checks each draft against anatomical
  fact and the material it cites, and keeps, fixes or drops it. A saved set shows **Your material disagrees with
  itself** (both quotes, both places) and **Check these in your notes** (the line, the problem, the correct fact).
  A finding reported twice (a topic split over two batches) is shown once.
- **Checked again in code** (`server/src/schema.ts`): a cited part that was really sent; for single best answer, four
  distinct options with a "why not" for each wrong one; true or false as a statement with options True, False; fill
  in the blank with exactly one blank and an answer of one to four words; short answers with a model answer and two
  to six marking points; a bone id that exists. Anything that fails is dropped, never shown.

**Answering and marking** (step 5: `src/ui/lessons/ExamQuestions.tsx`, `src/learn/questions.ts`,
`server/src/marking.ts`)

- **Fill in the blank**: typed answers are compared after folding case, punctuation, a leading "the/a/an" and British
  and American spellings; the answer and any accepted alternatives count, and one slip in a word of five letters or
  more counts as right, with a spelling note.
- **Short answer**: the student writes an answer and taps **Mark my answer**. The marking service checks it against
  each marking point in turn: a tick or cross per point, the student's own words that earned it (or what was
  missing), a score (points hit, never a number the model chooses) and one tip. 60% of the points counts as right.
  The answer is treated as material to mark, never as instructions. **Show the answer instead** lets the student mark
  themselves, as before.

**Coverage, gaps, review and reminders** (step 6: `src/learn/notesExam.ts`, `src/learn/notesReview.ts`,
`src/learn/reminders.ts`)

- **Coverage**: once questions are answered, a table by topic: parts tested out of parts sent, and the share right
  (below 60% shown in red). **Gaps** lists parts with no questions yet.
- **Practise my weak spots** writes a new set on the parts behind the missed questions, told which points were
  missed, so the new questions test the same facts from another angle.
- **Spaced review (FSRS)**: every answered generated question is scheduled with the same scheduler as the
  flashcards (right → Good, wrong → Again; once a day at most). **Review** on the Notes to Exam page and the Home
  tile show how many are due; the review page brings them back unanswered.
- **Reminders**: an optional daily reminder at a chosen time. In the phone app it is a local notification
  (`@capacitor/local-notifications`, nothing sent anywhere); in a browser, Atlas can remind only while it is open,
  and says so.

**Speed** (step 7: `scripts/bench-notes.cjs`)

- The material is cut into chunks by topic (up to 12,000 characters each), with the questions shared out by size.
  The **first 5 questions** come from a small first chunk written at low effort, so they arrive first; the other
  chunks are written 3 at a time at medium effort (mock exams at high effort, for the full standard).
- `node scripts/bench-notes.cjs "Lecture 5.pptx" --mode quick --count 10 --runs 3` drives the built app in a
  headless browser through a real lecture: opening the files, finding topics, the first 5 questions on screen, the
  whole set, then a reload with the network off to check the set is still there. It prints a table with the 15 s
  target for the first 5 questions. Run it against the real server (with the API key) and a build made with
  `VITE_NOTES_API_URL` (see the top of the script).
- Measured here with a scripted stand-in for Claude that takes 1.2 s per call (so this is Atlas's own overhead, not
  Claude's speed): 120-slide PowerPoint, opened in 0.5 s, topics in 1.3 s, first 5 questions in 2.5 s (two calls:
  writer and checker), 10 questions in 5.3 s, a 40-question mock exam in 5.3 s, offline reload kept every question.
  The time with the real model depends on Claude's response time for two calls and has not been measured here (no API
  key in this environment).

**The server** (`server/`, Node 22.18+, no build step): the Claude API key must never be in the app, so the app
calls a small server that holds it.

- `POST /api/notes/read` takes up to 6 page images (each with its ref) and returns their transcripts and legibility;
  `POST /api/notes/topics` takes the text of up to 400 parts and returns the topics, covering every part exactly once
  in order (`server/src/reading.ts`; both at medium effort; 120 requests an hour, 3 at a time, `READS_PER_HOUR`).
- `POST /api/notes-to-exam` takes the chosen parts (each with its ref and topic; up to 400 parts and 200,000
  characters) and the settings, and answers with server-sent events: `progress`, a `batch` as each chunk is checked,
  `chunkError` for a chunk that failed (the rest carry on), then `done` or `error`. Each device gets one set at a time
  and 12 an hour (`RATE_PER_HOUR`); failed sets are not counted. CORS is limited to the app's origins
  (`ALLOWED_ORIGINS`).
- `POST /api/notes/mark` marks one short answer (up to 6 points, 3,000 characters), counted with the reading
  requests.
- **One job only**: the system prompts (`server/src/prompts.ts`, `server/src/marking.ts`) confine the model to its
  task. Text in the material, or in a student's answer, is treated as material, never as instructions.
- The system prompts are cached (`cache_control`), so repeat requests read them from the prompt cache. A refusal,
  an over-long output, rate limits and API errors each give the student a plain message.

Run it:

```
cd server && npm install
ANTHROPIC_API_KEY=… npm start          # :8787
# app, development: npm run dev (Vite proxies /api to :8787)
# app, production: VITE_NOTES_API_URL=https://your-server npm run build
```

Without `VITE_NOTES_API_URL`, a production build still opens files and shows their text; reading photos, topics and
questions are switched off ("Not connected in this preview").

Tests: `server/src/reading.test.ts` (page reading, topics always covering every part, request checks, the endpoints,
parallel limits), `src/learn/extract.test.ts` and `src/learn/notesDocs.test.ts` (PowerPoint, Word and PDF test files
in `src/learn/fixtures`, made by `scripts/content/notes_fixtures.py`: slides, levels, tables, speaker notes,
picture-only slides, sections, references, topics), `server/src/server.test.ts` (chunk planning, both passes for questions and flashcards with a scripted stand-in for Claude, validation of every question type, marking, request limits, the rate limiter, the HTTP stream, CORS, 429) and `src/learn/notesExam.test.ts` (conversion into Atlas questions with their parts, fill-in and short-answer marking, coverage, gaps, missed points, due reviews, reading the event stream however it is split, error messages).

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

## Structure lessons (content upgrade, step 2: samples)

Home → Lessons → Textbook → Skull or Upper limb → **Structure by structure**. Each structure in nine layers. Shown
first: **1 In one line**, **2 Where it is**, **3 Key features**. Under **Go deeper**: **4 Form → function**,
**5 Relations**, **6 Development**, **7 Variations**, **8 Clinical reasoning** (injury → structure damaged → what the
patient can’t do → why) and **9 Tutorial questions** (explain, compare, predict; the model answer stays hidden until
asked for). The lesson ends with three check questions answered on the page.

- **Explain simpler** on layers 1–5 and **Explain deeper** on layers 1–3. Plain English first, then the term
  (“faces inwards (medially)”).
- **Tap a term** (dotted underline, first use in each section) for its OpenStax glossary definition and **Say it**
  (the device’s en-GB voice). The glossary (`data/glossary.json`, 3,027 terms) loads only when a lesson opens.
- **Links**: See in 3D, the layered flashcards on the same bone, and its exam-style questions. Highlights and notes
  work as in the textbook (`st:<id>`), and appear in My Highlights and My Notes.
- Content: `content/structures/<id>.json`, loaded by `src/learn/structures.ts`; the page is
  `src/ui/lessons/StructureScreen.tsx`. Authored by `scripts/content/structures_v1.py`.
- **Sources on every statement**: an OpenStax A&P 2e paragraph (`s8-2#fs-id2110691`), a glossary entry
  (`glossary:optic canal`) and/or `check`, saying what still needs an approved source. Unchecked statements carry a †.
- Tests (`src/learn/structures.test.ts`): every layer present; clinical reasoning in four parts; one tutorial question
  of each kind; three check questions with four options and answers in different places; every source exists; drafts
  only while a check remains; at most 20 words a sentence and 3 sentences a paragraph. The text check treats each lesson
  as one lesson for abbreviations.
- All 31 Skull and Upper limb structures (16 Skull, 15 Upper limb; the auditory ossicles, the metacarpals and the
  phalanges of the hand as group lessons). Authored by `scripts/content/structures_*.py` (shared helpers in
  `structures_lib.py`); the full text is in `docs/structures-review.md` (`npm run structures:review`).
- **Muscles and organs (male model):** 16 more lessons in the same nine layers. Muscles (`structures_muscles.py`):
  deltoid, rotator cuff, biceps brachii, diaphragm, sternocleidomastoid, quadriceps femoris, hamstrings, and the calf
  muscles. Organs (`structures_organs.py`): heart, lungs, stomach, small intestine, liver, pancreas, kidneys, thyroid
  gland. Sourced from the new textbook chapters (10–11, 17, 19, 21–23, 25), including the origins listed in the
  descriptions of OpenStax's muscle tables; attachments, nerves and clinical points the book does not give carry a †
  with what is missing. Each lesson names its part in the male model (`part`, `parts`): **See in 3D** opens the male
  model at that part's layer and flies to it, and tapping the part in 3D links back to its lesson.
- **† checklist**: `docs/dagger-checklist.md` (and PDF), every statement awaiting a source check, with where it appears
  and a proposed source (Gray’s 1918 quoted as support only, Terminologia Anatomica entries, a current textbook), for
  sign-off (`npm run review:checklist`; PDF: `npm run review:checklist:pdf`). Now 198 statements, 51 of them from
  the muscle and organ lessons and cards.
- **Flashcards**: one card per structure in the approved layered format (`scripts/content/cards_v2.py`), built from the
  lesson’s own statements so every source and † carries over; the ten reviewed samples are kept unchanged. The muscle
  and organ lessons have one card each (`scripts/content/cards_soft.py`, decks `content/cards/muscles.json`, `heart`,
  `respiratory`, `digestive`, `urinary`, `endocrine`): a question on the front without a 3D view (the card's small 3D
  view shows bones), and See in 3D on the back.

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
