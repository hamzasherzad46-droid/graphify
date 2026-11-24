#!/usr/bin/env python3
"""
Source for content/bones/*.json — one JSON file per bone (206).

Run:  npm run content   (python3 scripts/bones_src.py)

The JSON files are the source of truth the app reads, and they can be edited by hand. This script
exists to write the first draft consistently (left/right pairs, serial bones). After a reviewer has
edited a file, re-running the script keeps that file's reviewed fields: an existing file whose
reviewStatus is "reviewed" is never overwritten.

All content is DRAFT until academically reviewed. Articulations list bone ids.
"""
import json
import os
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "content", "bones")
TODAY = datetime.date.today().isoformat()

BONES = []

ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"]
ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
SIDES = ["left", "right"]


# Typical female–male differences, shown in the panel for bones where they are taught. Keyed by bone id
# without the side suffix. Population tendencies, not rules: individuals overlap.
SEX_DIFF = {
    "hip_bone": "Female pelvis: wider and shallower, with a round or oval inlet, a subpubic angle of about 80–90° "
                "(about 50–60° in males), a wider greater sciatic notch, everted ischial tuberosities and a more "
                "triangular obturator foramen. These adapt it for childbirth.",
    "sacrum": "Female sacrum: shorter, wider and less curved, with a less prominent promontory, which widens the pelvic inlet.",
    "coccyx": "Female coccyx: usually more mobile and set more posteriorly, enlarging the pelvic outlet.",
    "femur": "Females: the wider pelvis gives a larger Q-angle (more oblique femoral shaft); the femoral head is on average smaller.",
    "frontal_bone": "Female: a more vertical forehead with frontal bossing, smaller superciliary arches and glabella, and "
                    "sharper supraorbital margins. Male: a sloping forehead and prominent brow ridges.",
    "temporal_bone": "Female mastoid processes are usually smaller; males tend to have larger, more projecting mastoids.",
    "occipital_bone": "Female: a smaller external occipital protuberance and fainter nuchal lines than in males.",
    "mandible": "Female: a smaller mandible with a pointed chin and less flared gonial angles. "
                "Male: a squarer chin and more everted angles.",
    "sternum": "Male: the body of the sternum is usually more than twice the length of the manubrium; in females it is often shorter.",
}


def bone(id, name, latin, region, side, type, features, articulations, clinical, spellings=(), subregion="", note=""):
    spellings = [s.lower() for s in ([name] + list(spellings))]
    seen = []
    for s in spellings:
        if s not in seen:
            seen.append(s)
    b = {
        "id": id,
        "name": name,
        "latin": latin,
        "taCode": "",
        "region": region,
        "subregion": subregion,
        "side": side,
        "type": type,
        "features": features,
        "articulations": articulations,
        "clinical": clinical,
        "acceptedSpellings": seen,
        "reviewStatus": "draft",
        "reviewer": "",
        "lastUpdated": TODAY,
    }
    if not subregion:
        del b["subregion"]
    if note:
        b["modelNote"] = note
    base = id.removesuffix("_left").removesuffix("_right")
    if base in SEX_DIFF:
        b["sexDifferences"] = SEX_DIFF[base]
    BONES.append(b)


def paired(base, name, latin, region, type, features, arts, clinical, spellings=(), subregion="", note=""):
    """arts: list of ids; '{s}' is replaced by the same side, '{o}' by the opposite side."""
    for s in SIDES:
        o = "right" if s == "left" else "left"
        bone(f"{base}_{s}", name, latin, region, s, type, features,
             [a.replace("{s}", s).replace("{o}", o) for a in arts], clinical, spellings, subregion, note)


# =============================================================== SKULL — cranial

bone("frontal_bone", "Frontal bone", "Os frontale", "Skull", "midline", "flat",
     ["Squamous part (forehead)", "Supraorbital margins and supraorbital notch/foramen",
      "Orbital parts forming the roofs of the orbits", "Frontal sinuses", "Glabella and superciliary arches"],
     ["parietal_bone_left", "parietal_bone_right", "sphenoid_bone", "ethmoid_bone", "nasal_bone_left", "nasal_bone_right",
      "maxilla_left", "maxilla_right", "lacrimal_bone_left", "lacrimal_bone_right", "zygomatic_bone_left", "zygomatic_bone_right"],
     "Frontal sinus fractures from forehead impact can involve the frontonasal duct and the anterior cranial fossa.",
     subregion="Cranial bones")

paired("parietal_bone", "Parietal bone", "Os parietale", "Skull", "flat",
       ["Parietal eminence (tuber)", "Superior and inferior temporal lines", "Groove for the superior sagittal sinus",
        "Grooves for the middle meningeal vessels on the inner surface", "Parietal foramen"],
       ["parietal_bone_{o}", "frontal_bone", "occipital_bone", "temporal_bone_{s}", "sphenoid_bone"],
       "Fracture over the pterion region can tear the middle meningeal artery, causing an extradural haematoma.",
       subregion="Cranial bones")

bone("occipital_bone", "Occipital bone", "Os occipitale", "Skull", "midline", "flat",
     ["Foramen magnum", "Occipital condyles", "External occipital protuberance (inion)",
      "Superior and inferior nuchal lines", "Hypoglossal canals", "Basilar part (clivus)"],
     ["parietal_bone_left", "parietal_bone_right", "temporal_bone_left", "temporal_bone_right", "sphenoid_bone", "vertebra_c1"],
     "Herniation of the cerebellar tonsils through the foramen magnum (coning) compresses the brainstem.",
     subregion="Cranial bones")

paired("temporal_bone", "Temporal bone", "Os temporale", "Skull", "irregular",
       ["Squamous, petrous, tympanic and mastoid parts", "External acoustic meatus", "Zygomatic process",
        "Mandibular fossa and articular tubercle", "Styloid and mastoid processes", "Houses the middle and inner ear"],
       ["mandible", "parietal_bone_{s}", "occipital_bone", "sphenoid_bone", "zygomatic_bone_{s}"],
       "Mastoiditis can spread from middle ear infection into the mastoid air cells.",
       subregion="Cranial bones")

bone("sphenoid_bone", "Sphenoid bone", "Os sphenoidale", "Skull", "midline", "irregular",
     ["Body with sella turcica (pituitary fossa)", "Greater and lesser wings", "Pterygoid processes",
      "Optic canals and superior orbital fissures", "Foramina rotundum, ovale and spinosum", "Sphenoidal sinuses"],
     ["frontal_bone", "occipital_bone", "ethmoid_bone", "vomer", "parietal_bone_left", "parietal_bone_right",
      "temporal_bone_left", "temporal_bone_right", "zygomatic_bone_left", "zygomatic_bone_right",
      "palatine_bone_left", "palatine_bone_right"],
     "Pituitary tumours are approached through the sphenoidal sinus (transsphenoidal surgery).",
     subregion="Cranial bones")

bone("ethmoid_bone", "Ethmoid bone", "Os ethmoidale", "Skull", "midline", "irregular",
     ["Cribriform plate with olfactory foramina", "Crista galli", "Perpendicular plate (nasal septum)",
      "Ethmoidal labyrinths with air cells", "Superior and middle nasal conchae", "Orbital plates"],
     ["frontal_bone", "sphenoid_bone", "vomer", "nasal_bone_left", "nasal_bone_right", "maxilla_left", "maxilla_right",
      "lacrimal_bone_left", "lacrimal_bone_right", "palatine_bone_left", "palatine_bone_right",
      "inferior_nasal_concha_left", "inferior_nasal_concha_right"],
     "Cribriform plate fracture can cause CSF rhinorrhoea and loss of smell (anosmia).",
     subregion="Cranial bones")

# =============================================================== SKULL — facial

paired("nasal_bone", "Nasal bone", "Os nasale", "Skull", "flat",
       ["Forms the bridge of the nose", "Midline internasal suture", "Small vascular foramen"],
       ["nasal_bone_{o}", "frontal_bone", "ethmoid_bone", "maxilla_{s}"],
       "The most commonly fractured facial bone.",
       subregion="Facial bones")

paired("lacrimal_bone", "Lacrimal bone", "Os lacrimale", "Skull", "flat",
       ["Smallest facial bone, in the medial orbital wall", "Posterior lacrimal crest",
        "Lacrimal groove forming the fossa for the lacrimal sac", "Lacrimal hamulus"],
       ["frontal_bone", "ethmoid_bone", "maxilla_{s}", "inferior_nasal_concha_{s}"],
       "Dacryocystorhinostomy creates an opening through the lacrimal bone to drain a blocked tear duct.",
       subregion="Facial bones")

paired("zygomatic_bone", "Zygomatic bone", "Os zygomaticum", "Skull", "irregular",
       ["Forms the prominence of the cheek", "Frontal and temporal processes", "Lateral orbital wall and rim",
        "Zygomaticofacial foramen"],
       ["frontal_bone", "sphenoid_bone", "temporal_bone_{s}", "maxilla_{s}"],
       "Zygomaticomaxillary complex fractures can cause cheek flattening, diplopia and cheek numbness.",
       spellings=["cheekbone", "cheek bone", "malar bone"], subregion="Facial bones")

paired("maxilla", "Maxilla", "Maxilla", "Skull", "irregular",
       ["Body containing the maxillary sinus", "Alveolar process with upper teeth",
        "Palatine process (anterior hard palate)", "Frontal and zygomatic processes", "Infraorbital foramen"],
       ["maxilla_{o}", "frontal_bone", "ethmoid_bone", "nasal_bone_{s}", "lacrimal_bone_{s}", "zygomatic_bone_{s}",
        "palatine_bone_{s}", "vomer", "inferior_nasal_concha_{s}"],
       "Le Fort fractures classify midface fractures by the level at which the maxilla separates.",
       spellings=["upper jaw", "upper jaw bone"], subregion="Facial bones")

paired("palatine_bone", "Palatine bone", "Os palatinum", "Skull", "irregular",
       ["L-shaped: horizontal and perpendicular plates", "Horizontal plate forms the posterior hard palate",
        "Pyramidal process", "Greater and lesser palatine foramina", "Orbital process"],
       ["palatine_bone_{o}", "maxilla_{s}", "sphenoid_bone", "ethmoid_bone", "vomer", "inferior_nasal_concha_{s}"],
       "Incomplete fusion of the palatine processes and horizontal plates causes cleft palate.",
       subregion="Facial bones")

paired("inferior_nasal_concha", "Inferior nasal concha", "Concha nasalis inferior", "Skull", "irregular",
       ["Scroll-like bone on the lateral nasal wall", "Largest concha; a separate bone",
        "Covers the opening of the nasolacrimal duct (inferior meatus)"],
       ["maxilla_{s}", "lacrimal_bone_{s}", "ethmoid_bone", "palatine_bone_{s}"],
       "Hypertrophy of the inferior turbinate is a common cause of nasal obstruction.",
       spellings=["inferior turbinate", "inferior nasal turbinate", "inferior concha"], subregion="Facial bones")

bone("vomer", "Vomer", "Vomer", "Skull", "midline", "flat",
     ["Thin plate forming the posteroinferior nasal septum", "Alae articulating with the sphenoid",
      "Free posterior border separating the choanae"],
     ["sphenoid_bone", "ethmoid_bone", "maxilla_left", "maxilla_right", "palatine_bone_left", "palatine_bone_right"],
     "Deviation of the nasal septum often involves the vomer and can obstruct airflow.",
     subregion="Facial bones")

bone("mandible", "Mandible", "Mandibula", "Skull", "midline", "irregular",
     ["Body and two rami", "Condylar and coronoid processes", "Angle of the mandible",
      "Mental foramen and mental protuberance", "Mandibular foramen and canal", "Alveolar part with lower teeth"],
     ["temporal_bone_left", "temporal_bone_right"],
     "Inferior alveolar nerve block is given near the mandibular foramen for lower dental anaesthesia.",
     spellings=["lower jaw", "jaw bone", "jawbone", "lower jaw bone"], subregion="Facial bones")

# =============================================================== Auditory ossicles

paired("malleus", "Malleus", "Malleus", "Skull", "irregular",
       ["Head (in the epitympanic recess)", "Neck", "Handle (manubrium) attached to the tympanic membrane",
        "Lateral and anterior processes"],
       ["incus_{s}"],
       "Fixation of the ossicular chain causes conductive hearing loss.",
       spellings=["hammer"], subregion="Auditory ossicles")
paired("incus", "Incus", "Incus", "Skull", "irregular",
       ["Body (articulates with the malleus head)", "Short process", "Long process",
        "Lenticular process (articulates with the stapes)"],
       ["malleus_{s}", "stapes_{s}"],
       "Erosion of the long process of the incus is common in chronic otitis media.",
       spellings=["anvil"], subregion="Auditory ossicles")
paired("stapes", "Stapes", "Stapes", "Skull", "irregular",
       ["Smallest bone in the body", "Head and neck", "Anterior and posterior crura",
        "Base (footplate) in the oval window"],
       ["incus_{s}"],
       "Otosclerosis fixes the stapes footplate in the oval window; treated by stapedectomy.",
       spellings=["stirrup"], subregion="Auditory ossicles")

# =============================================================== Neck

bone("hyoid_bone", "Hyoid bone", "Os hyoideum", "Neck", "midline", "irregular",
     ["U-shaped bone at the level of C3", "Body", "Greater horns (cornua)", "Lesser horns (cornua)",
      "Does not articulate with any other bone"],
     [],
     "A fractured hyoid at autopsy suggests manual strangulation.",
     spellings=["hyoid", "os hyoideum"])

# =============================================================== Vertebral column

for n in range(1, 8):
    vid = f"vertebra_c{n}"
    up = "occipital_bone" if n == 1 else f"vertebra_c{n - 1}"
    down = "vertebra_t1" if n == 7 else f"vertebra_c{n + 1}"
    common = ["Transverse foramina (vertebral artery)", "Bifid spinous process" if n in (3, 4, 5, 6) else None,
              "Uncinate processes on the body" if n in (3, 4, 5, 6) else None]
    if n == 1:
        name, latin, sp = "Atlas", "Atlas", ["atlas", "c1", "first cervical vertebra", "c 1"]
        feat = ["No body and no spinous process", "Anterior and posterior arches", "Lateral masses",
                "Superior articular facets for the occipital condyles", "Facet for the dens (anterior arch)",
                "Transverse foramina"]
        clin = "Jefferson fracture is a burst fracture of the atlas ring from axial loading."
    elif n == 2:
        name, latin, sp = "Axis", "Axis", ["axis", "c2", "second cervical vertebra", "c 2"]
        feat = ["Dens (odontoid process)", "Large bifid spinous process", "Superior articular facets for the atlas",
                "Transverse foramina"]
        clin = "Odontoid (dens) fractures and hangman's fracture (pars of C2) are classic C2 injuries."
    elif n == 7:
        name, latin, sp = "Seventh cervical vertebra", "Vertebra cervicalis VII", ["c7", "vertebra prominens", "c 7"]
        feat = ["Vertebra prominens: long, non-bifid spinous process", "Small transverse foramina (usually no vertebral artery)",
                "Transitional to the thoracic vertebrae"]
        clin = "Its spinous process is the first easily palpable landmark when counting vertebrae."
    else:
        name, latin = f"{ORD[n - 1].capitalize()} cervical vertebra", f"Vertebra cervicalis {ROMAN[n - 1]}"
        sp = [f"c{n}", f"c {n}"]
        feat = [f for f in ["Small, wide vertebral body", "Large triangular vertebral foramen"] + common if f]
        clin = {
            3: "C3 lies at the level of the hyoid bone.",
            4: "C4 is level with the upper border of the thyroid cartilage and the carotid bifurcation.",
            5: "C5–C6 is the most common level for cervical disc degeneration.",
            6: "C6 has the carotid (Chassaignac's) tubercle and is level with the cricoid cartilage.",
        }[n]
    arts = [up, down]
    if n == 1:
        arts = ["occipital_bone", "vertebra_c2"]
    bone(vid, name, latin, "Vertebral column", "midline", "irregular", feat, arts, clin, sp, subregion="Cervical vertebrae")

for n in range(1, 13):
    vid = f"vertebra_t{n}"
    up = "vertebra_c7" if n == 1 else f"vertebra_t{n - 1}"
    down = "vertebra_l1" if n == 12 else f"vertebra_t{n + 1}"
    feat = ["Heart-shaped body", "Costal facets on the body for rib heads", "Long spinous process angled downwards",
            "Small circular vertebral foramen"]
    if n <= 10:
        feat.insert(2, "Costal facets on the transverse processes")
    if n == 1:
        feat[1] = "Full costal facet for rib 1 and a demifacet for rib 2"
    if n in (11, 12):
        feat[1] = f"Single full costal facet for rib {n}; no transverse costal facet"
    if n == 12:
        feat.append("Transitional: lower articular processes face laterally like lumbar ones")
    ribs = []
    if n == 1:
        ribs = ["rib_1", "rib_2"]
    elif n <= 9:
        ribs = [f"rib_{n}", f"rib_{n + 1}"]
    else:
        ribs = [f"rib_{n}"]
    arts = [up, down] + [f"{r}_{s}" for r in ribs for s in SIDES]
    clin = {
        1: "T1 nerve root compression (e.g. Pancoast tumour) affects the intrinsic hand muscles.",
        2: "The jugular (suprasternal) notch of the sternum lies at about the level of T2.",
        4: "The sternal angle (T4/T5) marks the bifurcation of the trachea and the arch of the aorta.",
        8: "The inferior vena cava passes through the diaphragm at T8.",
        10: "The oesophagus passes through the diaphragm at T10.",
        12: "The aorta passes behind the diaphragm (aortic hiatus) at T12.",
    }.get(n, "Osteoporotic wedge compression fractures are common in the thoracic spine and cause kyphosis.")
    bone(vid, f"{ORD[n - 1].capitalize()} thoracic vertebra", f"Vertebra thoracica {ROMAN[n - 1]}", "Vertebral column",
         "midline", "irregular", feat, arts, clin, [f"t{n}", f"t {n}", f"th{n}"], subregion="Thoracic vertebrae")

for n in range(1, 6):
    vid = f"vertebra_l{n}"
    up = "vertebra_t12" if n == 1 else f"vertebra_l{n - 1}"
    down = "sacrum" if n == 5 else f"vertebra_l{n + 1}"
    feat = ["Large kidney-shaped body", "Short, thick, quadrangular spinous process", "Mammillary and accessory processes",
            "Articular facets oriented sagittally (resist rotation)", "Triangular vertebral foramen"]
    if n == 5:
        feat[0] = "Largest vertebral body, wedge-shaped (taller anteriorly)"
        feat.append("Thick transverse processes attached to the iliolumbar ligaments")
    clin = {
        1: "In adults the spinal cord usually ends at the L1–L2 level (conus medullaris).",
        3: "Lumbar puncture is done at L3/L4 or L4/L5, below the end of the spinal cord.",
        4: "A line between the iliac crest tops (supracristal plane) passes through L4.",
        5: "Spondylolisthesis most often affects L5 slipping forward on the sacrum.",
    }.get(n, "L4/L5 and L5/S1 are the commonest levels for lumbar disc herniation.")
    bone(vid, f"{ORD[n - 1].capitalize()} lumbar vertebra", f"Vertebra lumbalis {ROMAN[n - 1]}", "Vertebral column",
         "midline", "irregular", feat, [up, down], clin, [f"l{n}", f"l {n}"], subregion="Lumbar vertebrae")

bone("sacrum", "Sacrum", "Os sacrum", "Vertebral column", "midline", "irregular",
     ["Five fused sacral vertebrae", "Sacral promontory", "Anterior and posterior sacral foramina",
      "Auricular surfaces (sacroiliac joints)", "Median sacral crest", "Sacral hiatus and sacral canal"],
     ["vertebra_l5", "coccyx", "hip_bone_left", "hip_bone_right"],
     "Caudal epidural anaesthesia is given through the sacral hiatus.",
     ["os sacrum"], subregion="Sacrum and coccyx")

bone("coccyx", "Coccyx", "Os coccygis", "Vertebral column", "midline", "irregular",
     ["Three to five fused rudimentary vertebrae", "Coccygeal cornua", "Attachment for the anococcygeal ligament and gluteus maximus"],
     ["sacrum"],
     "Coccydynia (tailbone pain) often follows a fall onto the buttocks.",
     ["tailbone", "tail bone", "os coccygis"], subregion="Sacrum and coccyx")

# =============================================================== Thorax

bone("sternum", "Sternum", "Sternum", "Thorax", "midline", "flat",
     ["Manubrium with the jugular (suprasternal) notch", "Body of the sternum", "Xiphoid process",
      "Sternal angle (of Louis) at the manubriosternal joint", "Clavicular and costal notches"],
     ["clavicle_left", "clavicle_right"] + [f"rib_{n}_{s}" for n in range(1, 8) for s in SIDES],
     "The sternal angle marks rib 2 and is the start point for counting ribs; sternal marrow can be biopsied.",
     ["breastbone", "breast bone"])

for n in range(1, 13):
    kind = "true rib (vertebrosternal)" if n <= 7 else ("false rib (vertebrochondral)" if n <= 10 else "floating rib (vertebral)")
    feat = ["Head, neck, tubercle, angle and shaft", f"Classified as a {kind}"]
    if n == 1:
        feat = ["Shortest, broadest and most curved rib", "Single facet on the head (T1 only)",
                "Scalene tubercle for scalenus anterior", "Grooves for the subclavian vein and artery", "True rib"]
    elif n == 2:
        feat.append("Tuberosity for serratus anterior")
    elif n in (11, 12):
        feat = ["Short rib with a single facet on the head", "No neck or tubercle", "Free anterior end (floating rib)"]
    else:
        feat.append("Costal groove on the inner lower border (intercostal vessels and nerve)")
        feat.append("Head with two facets (crest between them)")
    tv = [f"vertebra_t{n}"] + ([f"vertebra_t{n - 1}"] if 2 <= n <= 10 else [])
    front = ["sternum"] if n <= 7 else []
    clin = {
        1: "A cervical rib or a tight first rib can compress the brachial plexus (thoracic outlet syndrome).",
        2: "The second costal cartilage meets the sternum at the sternal angle.",
        11: "Floating ribs overlie the kidneys and can be injured with them in flank trauma.",
        12: "The twelfth rib is a landmark for the kidney and pleura in posterior approaches.",
    }.get(n, "Rib fractures most often occur near the angle; several adjacent fractures can cause flail chest.")
    paired(f"rib_{n}", f"{ORD[n - 1].capitalize()} rib", f"Costa {ROMAN[n - 1]}", "Thorax", "flat", feat, tv + front, clin,
           [f"rib {n}", f"rib{n}", f"{ORD[n - 1]} rib"], subregion="Ribs")

# =============================================================== Upper limb

paired("clavicle", "Clavicle", "Clavicula", "Upper limb", "long",
       ["S-shaped: medial two-thirds convex forwards", "Sternal and acromial ends", "Conoid tubercle and trapezoid line",
        "Subclavian groove", "Only bony strut joining the upper limb to the trunk"],
       ["sternum", "scapula_{s}"],
       "The most commonly fractured bone in the body, usually at the junction of its middle and lateral thirds.",
       ["collarbone", "collar bone"], subregion="Shoulder girdle")

paired("scapula", "Scapula", "Scapula", "Upper limb", "flat",
       ["Spine and acromion", "Coracoid process", "Glenoid cavity", "Supraspinous, infraspinous and subscapular fossae",
        "Superior, medial and lateral borders", "Suprascapular notch"],
       ["clavicle_{s}", "humerus_{s}"],
       "Damage to the long thoracic nerve paralyses serratus anterior and causes a winged scapula.",
       ["shoulder blade"], subregion="Shoulder girdle")

paired("humerus", "Humerus", "Humerus", "Upper limb", "long",
       ["Head, anatomical and surgical necks", "Greater and lesser tubercles, intertubercular sulcus",
        "Deltoid tuberosity", "Radial (spiral) groove", "Medial and lateral epicondyles",
        "Capitulum and trochlea", "Olecranon, coronoid and radial fossae"],
       ["scapula_{s}", "radius_{s}", "ulna_{s}"],
       "Midshaft fractures can injure the radial nerve in the radial groove, causing wrist drop.",
       subregion="Arm")

paired("radius", "Radius", "Radius", "Upper limb", "long",
       ["Head (disc-shaped)", "Neck and radial tuberosity", "Interosseous border", "Styloid process",
        "Ulnar notch", "Dorsal (Lister's) tubercle", "Carpal articular surface"],
       ["humerus_{s}", "ulna_{s}", "scaphoid_{s}", "lunate_{s}"],
       "Colles' fracture of the distal radius (fall on an outstretched hand) is very common.",
       subregion="Forearm")

paired("ulna", "Ulna", "Ulna", "Upper limb", "long",
       ["Olecranon", "Coronoid process", "Trochlear notch", "Radial notch", "Ulnar tuberosity",
        "Interosseous border", "Head and styloid process"],
       ["humerus_{s}", "radius_{s}"],
       "Monteggia fracture: proximal ulnar shaft fracture with dislocation of the radial head.",
       subregion="Forearm")

# =============================================================== Hand

CARPALS = [
    ("scaphoid", "Scaphoid", "Os scaphoideum", "short",
     ["Boat-shaped; largest bone of the proximal row", "Tubercle palpable at the wrist", "Waist", "Lies in the floor of the anatomical snuffbox"],
     ["radius_{s}", "lunate_{s}", "trapezium_{s}", "trapezoid_{s}", "capitate_{s}"],
     "The most commonly fractured carpal; retrograde blood supply risks avascular necrosis of the proximal pole.",
     ["navicular of the hand", "scaphoid bone", "os scaphoideum"]),
    ("lunate", "Lunate", "Os lunatum", "short",
     ["Crescent (moon) shaped", "Central bone of the proximal row", "Articulates with the radius"],
     ["radius_{s}", "scaphoid_{s}", "triquetrum_{s}", "capitate_{s}", "hamate_{s}"],
     "The most commonly dislocated carpal; anterior dislocation can compress the median nerve.",
     ["lunate bone", "semilunar bone"]),
    ("triquetrum", "Triquetrum", "Os triquetrum", "short",
     ["Pyramidal shape", "Oval facet for the pisiform on its palmar surface", "Separated from the ulna by the articular disc"],
     ["lunate_{s}", "pisiform_{s}", "hamate_{s}"],
     "Dorsal chip fractures of the triquetrum are the second most common carpal fracture.",
     ["triquetral", "triquetral bone", "triangular bone", "cuneiform of the hand"]),
    ("pisiform", "Pisiform", "Os pisiforme", "sesamoid",
     ["Pea-shaped", "Sesamoid bone in the tendon of flexor carpi ulnaris", "Palpable at the base of the hypothenar eminence",
      "Attachment of the flexor retinaculum"],
     ["triquetrum_{s}"],
     "Forms the medial wall of Guyon's canal, where the ulnar nerve can be compressed.",
     ["pisiform bone"]),
    ("trapezium", "Trapezium", "Os trapezium", "short",
     ["Saddle-shaped facet for the first metacarpal", "Tubercle and groove for flexor carpi radialis",
      "Attachment of the flexor retinaculum"],
     ["scaphoid_{s}", "trapezoid_{s}", "metacarpal_1_{s}", "metacarpal_2_{s}"],
     "The thumb carpometacarpal joint is a common site of osteoarthritis.",
     ["trapezium bone", "greater multangular"]),
    ("trapezoid", "Trapezoid", "Os trapezoideum", "short",
     ["Small, wedge-shaped", "Articulates with the base of the second metacarpal"],
     ["scaphoid_{s}", "trapezium_{s}", "capitate_{s}", "metacarpal_2_{s}"],
     "The least commonly fractured carpal bone.",
     ["trapezoid bone", "lesser multangular"]),
    ("capitate", "Capitate", "Os capitatum", "short",
     ["Largest carpal bone", "Rounded head fitting into the lunate and scaphoid", "Central in the distal row",
      "First carpal to ossify"],
     ["scaphoid_{s}", "lunate_{s}", "trapezoid_{s}", "hamate_{s}", "metacarpal_2_{s}", "metacarpal_3_{s}", "metacarpal_4_{s}"],
     "Lies centrally in the wrist; perilunate injuries can fracture it together with the scaphoid.",
     ["capitate bone", "os magnum"]),
    ("hamate", "Hamate", "Os hamatum", "short",
     ["Wedge-shaped", "Hook (hamulus) projecting palmarly", "Hook forms the lateral wall of Guyon's canal"],
     ["lunate_{s}", "triquetrum_{s}", "capitate_{s}", "metacarpal_4_{s}", "metacarpal_5_{s}"],
     "Hook of hamate fractures occur in golf, racquet and baseball players.",
     ["hamate bone", "unciform bone"]),
]
for base, name, latin, typ, feat, arts, clin, sp in CARPALS:
    paired(base, name, latin, "Hand", typ, feat, arts, clin, sp, subregion="Carpal bones")

DIGIT_HAND = ["thumb", "index finger", "middle finger", "ring finger", "little finger"]
DIGIT_HAND_LAT = ["pollicis", "digiti II manus", "digiti III manus", "digiti IV manus", "digiti V manus"]
MC_BASE = {1: ["trapezium_{s}"], 2: ["trapezium_{s}", "trapezoid_{s}", "capitate_{s}", "metacarpal_3_{s}"],
           3: ["capitate_{s}", "metacarpal_2_{s}", "metacarpal_4_{s}"], 4: ["capitate_{s}", "hamate_{s}", "metacarpal_3_{s}", "metacarpal_5_{s}"],
           5: ["hamate_{s}", "metacarpal_4_{s}"]}
for n in range(1, 6):
    feat = ["Base, shaft and head", "Head forms the knuckle (metacarpophalangeal joint)"]
    if n == 1:
        feat = ["Shortest and thickest metacarpal", "Saddle-shaped base for the trapezium", "Rotated about 90° relative to the others (allows opposition)"]
    if n == 3:
        feat.append("Styloid process on the base")
    clin = {1: "Bennett's fracture is an intra-articular fracture of the base of the first metacarpal.",
            5: "Boxer's fracture is a fracture of the neck of the fifth metacarpal from punching."}.get(
        n, "Metacarpal shaft fractures can cause rotational deformity; check finger alignment in flexion.")
    paired(f"metacarpal_{n}", f"{ORD[n - 1].capitalize()} metacarpal", f"Os metacarpi {ROMAN[n - 1]}", "Hand", "long",
           feat, MC_BASE[n] + [f"hand_proximal_phalanx_{n}_{{s}}"], clin,
           [f"{ORD[n - 1]} metacarpal bone", f"metacarpal {n}", f"metacarpal {ROMAN[n - 1].lower()}", f"{DIGIT_HAND[n - 1]} metacarpal"],
           subregion="Metacarpals")

for n in range(1, 6):
    segs = ["proximal", "distal"] if n == 1 else ["proximal", "middle", "distal"]
    for i, seg in enumerate(segs):
        prev = f"metacarpal_{n}_{{s}}" if i == 0 else f"hand_{segs[i - 1]}_phalanx_{n}_{{s}}"
        nxt = [f"hand_{segs[i + 1]}_phalanx_{n}_{{s}}"] if i + 1 < len(segs) else []
        if seg == "distal":
            feat = ["Small base and shaft", "Ungual tuberosity under the nail bed"]
            clin = "Mallet finger: avulsion of the extensor tendon from the base of the distal phalanx." if n != 1 else \
                "Tuft fractures of the distal phalanx are common crush injuries."
        elif seg == "proximal":
            feat = ["Longest phalanx of the digit", "Concave base for the metacarpal head", "Bicondylar head (trochlea)"]
            clin = "Skier's (gamekeeper's) thumb: ulnar collateral ligament injury at the base of the thumb's proximal phalanx." if n == 1 else \
                "Proximal phalanx fractures tend to angulate palmarly because of the pull of the interossei."
        else:
            feat = ["Base with two concave facets", "Shaft", "Bicondylar head"]
            clin = "Volar plate avulsion at the base of the middle phalanx follows hyperextension (jammed finger)."
        name = f"{seg.capitalize()} phalanx of the {DIGIT_HAND[n - 1]}"
        latin = f"Phalanx {'proximalis' if seg == 'proximal' else 'media' if seg == 'middle' else 'distalis'} {DIGIT_HAND_LAT[n - 1]}"
        sp = [f"{seg} phalanx of {DIGIT_HAND[n - 1]}", f"{seg} phalanx {DIGIT_HAND[n - 1]}", f"{DIGIT_HAND[n - 1]} {seg} phalanx"]
        if n == 5:
            sp += [f"{seg} phalanx of the fifth finger", f"{seg} phalanx of fifth finger", f"{seg} phalanx of the little finger", f"{seg} phalanx of the pinky"]
        if n == 1:
            sp += [f"{seg} phalanx of the pollex"]
        paired(f"hand_{seg}_phalanx_{n}", name, latin, "Hand", "long", feat, [prev] + nxt, clin, sp, subregion="Phalanges of the hand")

# =============================================================== Pelvis

paired("hip_bone", "Hip bone", "Os coxae", "Pelvis", "irregular",
       ["Ilium, ischium and pubis fused at the acetabulum", "Iliac crest, ASIS and PSIS", "Acetabulum",
        "Obturator foramen", "Greater and lesser sciatic notches", "Ischial tuberosity and ischial spine", "Pubic symphysis surface"],
       ["sacrum", "hip_bone_{o}", "femur_{s}"],
       "The ASIS is a key landmark for measuring leg length and locating the inguinal ligament.",
       ["os coxae", "coxal bone", "innominate bone", "pelvic bone", "hipbone", "innominate"], subregion="Pelvic girdle")

# =============================================================== Lower limb

paired("femur", "Femur", "Femur", "Lower limb", "long",
       ["Head with the fovea", "Neck (angle ~125° to the shaft)", "Greater and lesser trochanters",
        "Intertrochanteric line and crest", "Linea aspera", "Medial and lateral condyles and epicondyles",
        "Adductor tubercle", "Patellar surface"],
       ["hip_bone_{s}", "tibia_{s}", "patella_{s}"],
       "Intracapsular neck of femur fractures can disrupt the blood supply to the head (avascular necrosis).",
       ["thigh bone", "thighbone"], subregion="Thigh")

paired("patella", "Patella", "Patella", "Lower limb", "sesamoid",
       ["Largest sesamoid bone, in the quadriceps tendon", "Base (superior) and apex (inferior)",
        "Medial and lateral articular facets"],
       ["femur_{s}"],
       "Lateral patellar dislocation is common in young people, especially with a shallow trochlear groove.",
       ["kneecap", "knee cap"], subregion="Knee")

paired("tibia", "Tibia", "Tibia", "Lower limb", "long",
       ["Medial and lateral condyles (tibial plateau)", "Intercondylar eminence", "Tibial tuberosity",
        "Soleal line", "Anterior border (shin)", "Medial malleolus", "Fibular notch"],
       ["femur_{s}", "fibula_{s}", "talus_{s}"],
       "The most commonly fractured long bone; its subcutaneous anterior border makes open fractures frequent.",
       ["shin bone", "shinbone"], subregion="Leg")

paired("fibula", "Fibula", "Fibula", "Lower limb", "long",
       ["Head with its apex (styloid process)", "Neck", "Slender shaft (mainly for muscle attachment)",
        "Lateral malleolus", "Malleolar fossa"],
       ["tibia_{s}", "talus_{s}"],
       "Fracture of the fibular neck can injure the common fibular nerve, causing foot drop.",
       ["calf bone"], subregion="Leg")

# =============================================================== Foot

TARSALS = [
    ("talus", "Talus", "Talus", ["Head, neck and body", "Trochlea (articulates with tibia and fibula)",
                                 "No muscle attachments", "Lateral and posterior processes"],
     ["tibia_{s}", "fibula_{s}", "calcaneus_{s}", "navicular_{s}"],
     "Talar neck fractures risk avascular necrosis because the blood supply enters distally.",
     ["astragalus", "ankle bone", "anklebone"]),
    ("calcaneus", "Calcaneus", "Calcaneus", ["Largest tarsal bone (heel)", "Calcaneal tuberosity (Achilles tendon)",
                                             "Sustentaculum tali", "Fibular (peroneal) trochlea", "Facets for the talus"],
     ["talus_{s}", "cuboid_{s}"],
     "Falls from height cause calcaneal fractures, often with associated lumbar spine fractures.",
     ["calcaneum", "heel bone", "os calcis"]),
    ("navicular", "Navicular", "Os naviculare", ["Boat-shaped, on the medial side of the foot", "Navicular tuberosity (tibialis posterior)",
                                                 "Concave facet for the head of the talus"],
     ["talus_{s}", "medial_cuneiform_{s}", "intermediate_cuneiform_{s}", "lateral_cuneiform_{s}", "cuboid_{s}"],
     "Navicular stress fractures occur in runners and jumpers and are easily missed.",
     ["navicular bone", "navicular of the foot", "scaphoid of the foot"]),
    ("cuboid", "Cuboid", "Os cuboideum", ["Lateral column of the foot", "Groove for the fibularis (peroneus) longus tendon",
                                          "Tuberosity"],
     ["calcaneus_{s}", "navicular_{s}", "lateral_cuneiform_{s}", "metatarsal_4_{s}", "metatarsal_5_{s}"],
     "Cuboid syndrome (subluxation) causes lateral foot pain in athletes and dancers.",
     ["cuboid bone"]),
    ("medial_cuneiform", "Medial cuneiform", "Os cuneiforme mediale", ["Largest cuneiform", "Insertion of tibialis anterior and fibularis longus"],
     ["navicular_{s}", "intermediate_cuneiform_{s}", "metatarsal_1_{s}", "metatarsal_2_{s}"],
     "Part of the tarsometatarsal (Lisfranc) joint complex.",
     ["medial cuneiform bone", "first cuneiform"]),
    ("intermediate_cuneiform", "Intermediate cuneiform", "Os cuneiforme intermedium", ["Smallest cuneiform", "Wedge-shaped; recessed, so the second metatarsal keys in"],
     ["navicular_{s}", "medial_cuneiform_{s}", "lateral_cuneiform_{s}", "metatarsal_2_{s}"],
     "The recessed second metatarsal base acts as the keystone of the Lisfranc joint.",
     ["intermediate cuneiform bone", "middle cuneiform", "second cuneiform"]),
    ("lateral_cuneiform", "Lateral cuneiform", "Os cuneiforme laterale", ["Wedge-shaped, between the intermediate cuneiform and the cuboid"],
     ["navicular_{s}", "intermediate_cuneiform_{s}", "cuboid_{s}", "metatarsal_2_{s}", "metatarsal_3_{s}", "metatarsal_4_{s}"],
     "Injured as part of tarsometatarsal (Lisfranc) fracture-dislocations.",
     ["lateral cuneiform bone", "third cuneiform"]),
]
for base, name, latin, feat, arts, clin, sp in TARSALS:
    paired(base, name, latin, "Foot", "short", feat, arts, clin, sp, subregion="Tarsal bones")

MT_BASE = {1: ["medial_cuneiform_{s}"], 2: ["medial_cuneiform_{s}", "intermediate_cuneiform_{s}", "lateral_cuneiform_{s}", "metatarsal_3_{s}"],
           3: ["lateral_cuneiform_{s}", "metatarsal_2_{s}", "metatarsal_4_{s}"], 4: ["lateral_cuneiform_{s}", "cuboid_{s}", "metatarsal_3_{s}", "metatarsal_5_{s}"],
           5: ["cuboid_{s}", "metatarsal_4_{s}"]}
TOE = ["big toe", "second toe", "third toe", "fourth toe", "little toe"]
TOE_LAT = ["hallucis", "digiti II pedis", "digiti III pedis", "digiti IV pedis", "digiti V pedis"]
for n in range(1, 6):
    feat = ["Base, shaft and head", "Head bears weight at the ball of the foot"]
    if n == 1:
        feat = ["Shortest and thickest metatarsal", "Two sesamoid bones under its head", "Tuberosity for fibularis longus"]
    if n == 5:
        feat.append("Tuberosity on the base for fibularis brevis")
    clin = {1: "Hallux valgus (bunion) involves medial deviation of the first metatarsal.",
            2: "The second metatarsal is the commonest site of a march (stress) fracture.",
            5: "Jones fracture at the base of the fifth metatarsal heals poorly due to a watershed blood supply."}.get(
        n, "Metatarsal stress fractures occur with repetitive loading such as marching or running.")
    paired(f"metatarsal_{n}", f"{ORD[n - 1].capitalize()} metatarsal", f"Os metatarsi {ROMAN[n - 1]}", "Foot", "long",
           feat, MT_BASE[n] + [f"foot_proximal_phalanx_{n}_{{s}}"], clin,
           [f"{ORD[n - 1]} metatarsal bone", f"metatarsal {n}", f"metatarsal {ROMAN[n - 1].lower()}"], subregion="Metatarsals")

for n in range(1, 6):
    segs = ["proximal", "distal"] if n == 1 else ["proximal", "middle", "distal"]
    for i, seg in enumerate(segs):
        prev = f"metatarsal_{n}_{{s}}" if i == 0 else f"foot_{segs[i - 1]}_phalanx_{n}_{{s}}"
        nxt = [f"foot_{segs[i + 1]}_phalanx_{n}_{{s}}"] if i + 1 < len(segs) else []
        if seg == "proximal":
            feat = ["Longest phalanx of the toe", "Concave base for the metatarsal head"]
            clin = "Turf toe is a sprain of the plantar plate at the base of the big toe's proximal phalanx." if n == 1 else \
                "Toe phalanx fractures usually follow stubbing or a dropped weight and are managed by buddy strapping."
        elif seg == "middle":
            feat = ["Short and broad", "Often fused with the distal phalanx in the little toe"]
            clin = "Hammer toe deformity flexes the proximal interphalangeal joint above the middle phalanx."
        else:
            feat = ["Small, with a tuberosity under the nail bed"]
            clin = "Subungual haematoma over a distal phalanx may hide an underlying fracture."
        name = f"{seg.capitalize()} phalanx of the {TOE[n - 1]}"
        latin = f"Phalanx {'proximalis' if seg == 'proximal' else 'media' if seg == 'middle' else 'distalis'} {TOE_LAT[n - 1]}"
        sp = [f"{seg} phalanx of {TOE[n - 1]}", f"{seg} phalanx {TOE[n - 1]}", f"{TOE[n - 1]} {seg} phalanx"]
        if n == 1:
            sp += [f"{seg} phalanx of the hallux", f"{seg} phalanx of hallux", f"{seg} phalanx of the great toe", f"{seg} phalanx of the first toe"]
        if n == 5:
            sp += [f"{seg} phalanx of the fifth toe", f"{seg} phalanx of fifth toe"]
        paired(f"foot_{seg}_phalanx_{n}", name, latin, "Foot", "long", feat, [prev] + nxt, clin, sp, subregion="Phalanges of the foot")


def main():
    os.makedirs(OUT, exist_ok=True)
    ids = [b["id"] for b in BONES]
    assert len(ids) == len(set(ids)), "duplicate ids"
    assert len(BONES) == 206, f"{len(BONES)} bones, expected 206"
    known = set(ids)
    for b in BONES:
        for a in b["articulations"]:
            assert a in known, f"{b['id']}: unknown articulation {a}"
    written = kept = 0
    for b in BONES:
        path = os.path.join(OUT, f"{b['id']}.json")
        if os.path.exists(path):
            with open(path) as f:
                old = json.load(f)
            if old.get("reviewStatus") == "reviewed":
                kept += 1
                continue
            # Keep the date when nothing but the date would change.
            if {**old, "lastUpdated": ""} == {**b, "lastUpdated": ""}:
                b["lastUpdated"] = old.get("lastUpdated", b["lastUpdated"])
        with open(path, "w") as f:
            json.dump(b, f, indent=2, ensure_ascii=False)
            f.write("\n")
        written += 1
    print(f"{written} bone files written, {kept} reviewed files kept, in content/bones/")


if __name__ == "__main__":
    main()
