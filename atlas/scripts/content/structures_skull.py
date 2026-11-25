# Structure lessons, Skull: the bones of the brain case (frontal, parietal, temporal, occipital, ethmoid) and the
# auditory ossicles (one group lesson, as OpenStax A&P 2e 14.1 describes them together). The sphenoid and mandible are
# in structures_v1.py. Statements OpenStax does not confirm carry `check` and show a †. Nothing is marked reviewed.
#   python3 scripts/content/structures_skull.py
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, NOT_IN, lesson, write

CRANIUM = 's7-2#fs-id1640586'
BRAINCASE = 's7-2#fs-id1351960'
CALVARIA = 's7-2#fs-id1256378'
PARIETAL = 's7-2#fs-id1975652'
TEMPORAL = 's7-2#fs-id1471081'
TEMP_PARTS = 's7-2#fs-id2010718'
TEMP_LAND = 's7-2#fs-id1882965'
FRONTAL = 's7-2#fs-id1283984'
OCCIPITAL = 's7-2#fs-id1478275'
ETHMOID = 's7-2#fs-id1971405'
ETH_NASAL = 's7-2#fs-id2228601'
ETH_FOSSA = 's7-2#fs-id1977415'
ETH_LAT = 's7-2#fs-id1897403'
SUTURE_DEF = 's7-2#fs-id1195048'
SUTURES = 's7-2#fs-id1248497'
SKULL_FX = 's7-2#fs-id1972896'
FACIAL = 's7-2#fs-id1861377'
ZYG_ARCH = 's7-2#fs-id1285208'
ORBIT_SHAPE = 's7-2#fs-id1883481'
ORBIT_WALLS = 's7-2#fs-id1887927'
SEPTUM = 's7-2#fs-id2125356'
CONCHAE = 's7-2#fs-id1475747'
ANT_FOSSA = 's7-2#fs-id2045358'
MID_FOSSA = 's7-2#fs-id1838522'
FORAMINA = 's7-2#fs-id2026215'
POST_FOSSA = 's7-2#fs-id1489044'
MEATUS = 's7-2#fs-id1724550'
JUGULAR = 's7-2#fs-id1391977'
SINUS_ROLE = 's7-2#fs-id1977054'
SINUSES = 's7-2#fs-id1882870'
ATLAS = 's7-3#fs-id2228247'
DEV_INTRA = 's7-5#fs-id1547037'
DEV_ENDO = 's7-5#fs-id2251103'
FACE_DEV = 's7-5#fs-id1241553'
CRANIOSYN = 's7-5#fs-id2339105'
SCAPHO = 's7-5#fs-id1031698'
SUTURE_JOINT = 's9-2#fs-id2663393'
FONTANELLES = 's9-2#fs-id2293668'
TMJ = 's9-6#fs-id1380884'
TMJ_MOVE = 's9-6#fs-id2608267'
CRANIAL_NERVES = 's13-4#fs-id1271098'
BRAINSTEM = 's13-2#fs-id1523364'
EAR = 's14-1#fs-id2744243'
INNER = 's14-1#fs-id2479589'
WAVES = 's14-1#fs-id2480192'
OLF_AXON = 's14-1#fs-id2351449'
ANOSMIA = 's14-1#fs-id2817840'
BLAND = 's14-1#fs-id2441552'
HYPOGLOSSAL = 's16-3#fs-id1865012'
VERTEBRAL = 's20-5#fs-id2009844'
BRAIN_SUPPLY = 's20-5#fs-id2643816'
CAROTID = 's20-5#fs-id1278587'
SAGITTAL_SINUS = 's20-5#fs-id977085'

frontal = lesson(
    id='frontal', bone='frontal_bone', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 7.5; 9.2; 14.1',
    oneLine={
        'main': F('The single bone of the forehead, which also forms the roof of each orbit (frontal bone).', FRONTAL),
        'simpler': F('The frontal bone is your forehead bone.', FRONTAL),
        'deeper': F('Inside the skull, it forms most of the floor of the anterior cranial fossa.', FRONTAL, ANT_FOSSA),
    },
    where={
        'facts': [
            F('It forms the forehead, at the front of the brain case.', FRONTAL, BRAINCASE),
            F('Behind, it meets the two parietal bones at the coronal suture.', SUTURES),
            F('Below, it forms the upper margin and the roof of each orbit.', FRONTAL, ORBIT_WALLS),
        ],
        'simpler': F('It forms your forehead and the top of your eye sockets.', FRONTAL),
        'deeper': F('It is one of the eight brain case bones, and one of four that meet at the pterion.', BRAINCASE, SUTURES),
    },
    features={
        'items': [
            FEAT('Glabella', 'A slight hollow between the eyebrows, at the front midline.', FRONTAL),
            FEAT('Supraorbital margin', 'The upper rim of each orbit.', FRONTAL),
            FEAT('Supraorbital foramen', 'An opening near the middle of each margin, for a sensory nerve to the forehead.', FRONTAL),
            FEAT('Brow ridges', 'Rounded thickenings just above each margin, behind the eyebrows.', FRONTAL),
            FEAT('Orbital part', 'A flat region that forms the roof of the orbits and the floor of the anterior cranial fossa.', FRONTAL),
            FEAT('Frontal sinus', 'An air-filled space just above the eyebrows: the most anterior paranasal sinus.', SINUSES),
        ],
        'simpler': F('It has a curved front, rims over the eyes and a flat part extending back inside the skull.', FRONTAL),
        'deeper': F('The frontal sinus may be one space, or divided at the midline into left and right.', SINUSES),
    },
    formFunction={
        'facts': [
            F('Its curved front encloses the frontal lobes of the brain, which lie in the anterior cranial fossa.', ANT_FOSSA, CALVARIA),
            F('The thickened rims of the orbits help protect the eyes.', ORBIT_SHAPE, FRONTAL),
            F('Its sinus lightens the skull and adds resonance to the voice.', SINUS_ROLE, SINUSES),
        ],
        'simpler': F('It shields the front of the brain and the tops of the eyes.', ANT_FOSSA, ORBIT_SHAPE),
    },
    relations={
        'items': [
            REL('suture', 'Coronal suture', 'Joins it to the right and left parietal bones, across the top of the skull.', SUTURES),
            REL('landmark', 'Pterion', 'Where the frontal, parietal, temporal and sphenoid bones meet: the weakest part of the skull.', SUTURES),
            REL('brain', 'Frontal lobes', 'Lie in the anterior cranial fossa, which the frontal bone mostly floors.', ANT_FOSSA),
            REL('bone', 'Ethmoid bone', 'Its crista galli and cribriform plates lie in the midline of the same floor.', ANT_FOSSA),
            REL('nerve', 'Sensory nerve to the forehead', 'Passes through the supraorbital foramen.', FRONTAL),
            REL('space', 'Orbit', 'The frontal bone forms its roof.', ORBIT_WALLS),
        ],
        'simpler': F('It joins the parietal bones behind and roofs the eye sockets below.', SUTURES, ORBIT_WALLS),
    },
    development={
        'facts': [
            F('Like the other bones of the top and sides of the brain case, it forms directly from membrane (intramembranous ossification).', DEV_INTRA),
            F('At birth, it is in two halves, which fuse in early childhood.', FACE_DEV),
            F('The anterior fontanelle, the soft spot at the front of a baby’s head, lies where it meets the parietal bones.', check=NOT_IN),
        ],
    },
    variations={
        'facts': [
            F('The brow ridges vary in size and are generally larger in males.', FRONTAL),
            F('The frontal sinus may be a single space or two.', SINUSES),
        ],
    },
    clinical={
        'items': [
            CLIN('A cold or sinus congestion.', 'The lining of the frontal sinus swells and blocks its narrow passage to the nasal cavity.',
                 'Be free of pressure and pain above the eyebrows.', 'The blocked sinus fills with fluid, and the pressure causes pain.', SINUS_ROLE, SINUSES),
            CLIN('A strong blow to the forehead.', 'The bone breaks; in a depressed fracture, it is pushed inwards.',
                 'Escape the risk of bleeding inside the skull, which can injure the brain.', 'The frontal lobes lie directly behind the bone.', SKULL_FX, ANT_FOSSA),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the frontal bone takes part in both the orbit and the cranial cavity.',
                ['Its front forms the forehead and the supraorbital margins.', 'Inside the skull it extends backwards as a flat region.',
                 'This region forms the roof of the orbits below.', 'And it forms most of the floor of the anterior cranial fossa above.'], FRONTAL, ORBIT_WALLS, ANT_FOSSA),
            TUT('compare', 'Compare the frontal bone with the parietal bones.',
                ['The frontal bone is single and forms the forehead.', 'The parietal bones are paired and form most of the upper sides of the skull.',
                 'They meet at the coronal suture.', 'All of them form directly from membrane.'], FRONTAL, PARIETAL, SUTURES, DEV_INTRA),
            TUT('predict', 'Predict where a patient with a blocked frontal sinus feels pain, and explain why.',
                ['Just above the eyebrows, where the frontal sinus lies.', 'Swollen lining blocks the narrow passage to the nasal cavity.',
                 'The sinus fills with fluid.', 'The rising pressure causes pain.'], SINUSES, SINUS_ROLE),
        ],
    },
    check=[
        MCQ('Which suture joins the frontal bone to the parietal bones?', ['Sagittal', 'Coronal', 'Lambdoid', 'Squamous'], 1, 'The coronal suture runs across the skull between them.', SUTURES),
        MCQ('What is the glabella?', ['The hollow between the eyebrows', 'The opening for the nerve to the forehead', 'The brow ridge', 'The roof of the orbit'], 0,
            'The glabella is the slight depression at the front midline, between the eyebrows.', FRONTAL),
        MCQ('Which part of the brain lies behind the frontal bone, in the anterior cranial fossa?', ['Cerebellum', 'Temporal lobes', 'Brainstem', 'Frontal lobes'], 3,
            'The anterior cranial fossa contains the frontal lobes.', ANT_FOSSA),
    ],
)

parietal = lesson(
    id='parietal', bone='parietal_bone_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 7.5; 9.2; 20.5',
    oneLine={
        'main': F('One of a pair of curved bones forming most of the upper sides and top of the skull (parietal bone).', PARIETAL),
        'simpler': F('The parietal bones form the top and sides of your head.', PARIETAL),
        'deeper': F('The two parietal bones meet along the top of the skull at the sagittal suture.', SUTURES),
    },
    where={
        'facts': [
            F('It forms most of the upper side of the skull; the right and left meet at the top.', PARIETAL),
            F('The frontal bone is in front, the temporal bone below and the occipital bone behind.', PARIETAL),
            F('It is one of the flat bones that form the top and sides of the brain case.', CALVARIA),
        ],
        'simpler': F('It forms most of the top and side of your head.', PARIETAL),
        'deeper': F('The parietal is one of the four bones that meet at the pterion, the weakest part of the skull.', SUTURES),
    },
    features={
        'items': [
            FEAT('Sagittal border', 'Meets the other parietal bone at the sagittal suture.', SUTURES),
            FEAT('Frontal border', 'Meets the frontal bone at the coronal suture.', SUTURES),
            FEAT('Occipital border', 'Meets the occipital bone at the lambdoid suture.', SUTURES),
            FEAT('Squamous border', 'Meets the squamous part of the temporal bone at the squamous suture.', SUTURES),
            FEAT('Grooves on the inner surface', 'Branches of the artery that supplies the brain’s coverings mark the inner surface of the skull.', FORAMINA,
                 check='OpenStax says the artery’s branches groove the inner surface of the skull; that this includes the parietal bone needs an approved source.'),
        ],
        'simpler': F('It is a curved plate of bone, joined to its neighbours by sutures.', PARIETAL, SUTURES),
        'deeper': F('Its sutures twist tightly, interlocking it with its neighbours to strengthen the skull.', SUTURE_DEF),
    },
    formFunction={
        'facts': [
            F('As a curved flat bone of the brain case, it encloses and protects the brain.', CALVARIA),
            F('Its twisting sutures interlock with the neighbouring bones, adding strength.', SUTURE_DEF),
            F('Sutures are fibrous joints that allow almost no movement.', SUTURE_JOINT),
        ],
        'simpler': F('It is a strong, curved shield over the brain.', CALVARIA),
    },
    relations={
        'items': [
            REL('suture', 'Sagittal suture', 'Unites the right and left parietal bones along the midline.', SUTURES),
            REL('suture', 'Coronal suture', 'Joins it to the frontal bone.', SUTURES),
            REL('suture', 'Lambdoid suture', 'Joins it to the occipital bone.', SUTURES),
            REL('suture', 'Squamous suture', 'Joins it to the temporal bone.', SUTURES),
            REL('vein', 'Superior sagittal sinus', 'A large vein of the brain’s coverings, running in the midline beneath the top of the skull.', SAGITTAL_SINUS),
        ],
        'simpler': F('Sutures join it to the frontal, occipital and temporal bones, and to its partner.', SUTURES),
    },
    development={
        'facts': [
            F('It forms directly from membrane (intramembranous ossification), like the other bones of the top and sides of the brain case.', DEV_INTRA),
            F('In a baby, wide areas of connective tissue (fontanelles) separate it from its neighbours.', FONTANELLES, DEV_INTRA),
            F('The fontanelles narrow greatly during the first year, as the bones enlarge, and become sutures.', FONTANELLES),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('The sagittal suture closes too early (craniosynostosis).', 'The joint between the two parietal bones fuses.',
                 'Grow across the top of the head: the head becomes long and narrow (scaphocephaly).', 'Growth is diverted to the sides of the skull, which grow upwards.', SCAPHO, CRANIOSYN),
            CLIN('A blow to the side of the head.', 'A linear fracture, with lines radiating from the point of impact.',
                 'Escape the risk of bleeding inside the skull, which can injure the brain.', 'A fracture of the brain case can tear the vessels inside it.', SKULL_FX),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why a newborn’s skull can change shape during birth.',
                ['The brain case bones are still separated by wide fontanelles.', 'These are areas of dense connective tissue.',
                 'They let the bones push closer together or overlap slightly.', 'So the head can pass through the birth canal.'], FONTANELLES, DEV_INTRA),
            TUT('compare', 'Compare a suture with a fontanelle.',
                ['Both are fibrous joints between skull bones.', 'A fontanelle is a wide area of connective tissue in a baby’s skull.',
                 'A suture is a narrow, convoluted fibrous joint in the adult skull.', 'Fontanelles narrow into sutures as the bones grow.'], SUTURE_JOINT, FONTANELLES),
            TUT('predict', 'Predict the head shape if the sagittal suture fuses too early, and explain it.',
                ['The skull cannot widen across the top.', 'Growth is diverted to the sides, which grow upwards.',
                 'The head becomes long, narrow and wedge-shaped (scaphocephaly).', 'The brain still has room to grow normally.'], SCAPHO),
        ],
    },
    check=[
        MCQ('Which suture joins the two parietal bones?', ['Coronal', 'Lambdoid', 'Sagittal', 'Squamous'], 2, 'The sagittal suture unites the right and left parietal bones.', SUTURES),
        MCQ('How do the parietal bones develop?', ['Directly from membrane (intramembranous ossification)', 'From a cartilage model', 'From the sphenoid', 'From the notochord'], 0,
            'The bones of the top and sides of the brain case form directly from membrane.', DEV_INTRA),
        MCQ('What is scaphocephaly?', ['A fracture of the parietal bone', 'Bleeding at the pterion', 'An open fontanelle', 'A long, narrow head from early fusion of the sagittal suture'], 3,
            'Early closure of the sagittal suture diverts growth upwards at the sides.', SCAPHO),
    ],
)

temporal = lesson(
    id='temporal', bone='temporal_bone_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 7.5; 9.6; 13.4; 14.1; 20.5',
    oneLine={
        'main': F('The bone of the lower side of the skull, around the ear (temporal bone).', TEMPORAL, TEMP_LAND),
        'simpler': F('The temporal bone is the skull bone around your ear.', TEMPORAL, TEMP_LAND),
        'deeper': F('Its petrous part houses the middle and inner ear.', TEMP_PARTS),
    },
    where={
        'facts': [
            F('It forms the lower side of the skull, below the parietal bone.', TEMPORAL, PARIETAL),
            F('It is paired: one on each side of the brain case.', BRAINCASE),
            F('Its zygomatic process reaches forwards to form the back of the zygomatic arch.', TEMP_PARTS, ZYG_ARCH),
        ],
        'simpler': F('It is at the side of your head, around and behind your ear.', TEMPORAL, TEMP_PARTS),
        'deeper': F('Inside the skull, its petrous ridge separates the middle and posterior cranial fossae.', MID_FOSSA, POST_FOSSA),
    },
    features={
        'items': [
            FEAT('Squamous part', 'The flattened upper part.', TEMP_PARTS),
            FEAT('Zygomatic process', 'Projects forwards to form the back of the zygomatic arch.', TEMP_PARTS),
            FEAT('Mastoid process', 'A large bump behind the earlobe, where muscles attach.', TEMP_PARTS),
            FEAT('Petrous part', 'A dense diagonal ridge inside the skull, holding the middle and inner ear.', TEMP_PARTS),
            FEAT('External and internal acoustic meatuses', 'The ear canal outside; inside, an opening for nerves of hearing, balance and the face.', TEMP_LAND, MEATUS),
            FEAT('Mandibular fossa and articular tubercle', 'A hollow and a ridge in front of the ear canal, for the jaw joint.', TEMP_LAND),
            FEAT('Styloid process', 'A pen-like spike pointing down, for small muscles and a ligament to the hyoid.', TEMP_LAND),
            FEAT('Stylomastoid foramen and carotid canal', 'Openings for the nerve to the face muscles, and a major artery to the brain.', TEMP_LAND),
        ],
        'simpler': F('It has a flat upper part, a bump behind the ear and a dense ridge that holds the ear.', TEMP_PARTS),
        'deeper': F('Its name may come from the temple, where hair often turns grey first, marking the passage of time.', TEMPORAL),
    },
    formFunction={
        'facts': [
            F('Its dense petrous part encloses the small bones and canals of hearing and balance.', TEMP_PARTS, INNER),
            F('In front of the ear canal, the mandibular fossa and articular tubercle make the skull’s half of the jaw joint.', TEMP_LAND, TMJ),
            F('The zygomatic process joins the zygomatic bone, forming the arch from which a chewing muscle arises.', ZYG_ARCH),
        ],
        'simpler': F('It holds your ear, makes the socket for your jaw and anchors a chewing muscle.', TEMP_PARTS, TEMP_LAND, ZYG_ARCH),
    },
    relations={
        'items': [
            REL('joint', 'Temporomandibular joint', 'The condyle of the mandible meets its mandibular fossa and articular tubercle.', TEMP_LAND, TMJ),
            REL('bone', 'Zygomatic bone', 'Its temporal process joins the zygomatic process to form the zygomatic arch.', ZYG_ARCH),
            REL('nerve', 'Facial nerve', 'Controls the muscles of facial expression; it leaves the skull through the stylomastoid foramen.', TEMP_LAND, CRANIAL_NERVES),
            REL('nerve', 'Vestibulocochlear nerve', 'Carries hearing and balance from the inner ear, through the internal acoustic meatus.', MEATUS, INNER),
            REL('artery', 'Internal carotid artery', 'Passes through its carotid canal to reach the brain.', CAROTID, TEMP_LAND),
            REL('bones', 'Auditory ossicles', 'The three tiny bones of the middle ear, inside its petrous part.', EAR, TEMP_PARTS),
        ],
        'simpler': F('It holds the ear and the jaw joint, and important nerves and an artery pass through it.', TEMP_PARTS, TEMP_LAND),
    },
    development={
        'facts': [
            F('Its flat squamous part, on the side of the brain case, forms from membrane; its base parts form from cartilage.', DEV_INTRA, DEV_ENDO, TEMP_PARTS),
            F('The mastoid process enlarges during early childhood.', FACE_DEV),
        ],
    },
    variations={
        'facts': [
            F('The mastoid process is larger in males.', check='Not in OpenStax A&P 2e (chapters 6–9, 12–16, 20). Gray’s 1918 (7.2) says it is larger in the male (supporting only).'),
        ],
    },
    clinical={
        'items': [
            CLIN('A blow that fractures the base of the skull (basilar fracture).', 'The internal carotid artery, in the carotid canal of the temporal bone.',
                 'Rely on a normal blood supply to the brain on that side.', 'The internal carotid is one of the two main arteries supplying the brain.', SKULL_FX, BRAIN_SUPPLY),
            CLIN('Swelling or injury of the facial nerve as it leaves the stylomastoid foramen (as in Bell’s palsy).', 'The facial nerve.',
                 'Close the eye, smile or raise the eyebrow on that side.', 'The facial nerve controls the muscles of facial expression.', CRANIAL_NERVES, TEMP_LAND,
                 check='Bell’s palsy and nerve injury at the foramen are not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the nerve’s course and role are.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the temporal bone takes part in the jaw joint.',
                ['The mandibular fossa is a deep oval hollow in front of the ear canal.', 'The articular tubercle is a smooth ridge just in front of it.',
                 'The condyle of the mandible sits in the fossa when the mouth is closed.', 'As the mouth opens, it glides forwards onto the tubercle.'], TEMP_LAND, TMJ_MOVE),
            TUT('compare', 'Compare the external and internal acoustic meatuses.',
                ['External: the ear canal, a large opening on the side of the skull.', 'Sound travels in it to the eardrum.',
                 'Internal: an opening inside the skull, on the petrous ridge.', 'It carries the nerves of hearing, balance and the face.'], TEMP_LAND, EAR, MEATUS),
            TUT('predict', 'Predict what you can feel just behind your earlobe, and what it is for.',
                ['The mastoid process.', 'A large bump on the mastoid part of the temporal bone.',
                 'Muscles attach to it.', 'It enlarges during early childhood.'], TEMP_PARTS, FACE_DEV),
        ],
    },
    check=[
        MCQ('Which nerve leaves the skull through the stylomastoid foramen?', ['Optic nerve', 'Facial nerve', 'Trigeminal nerve', 'Hypoglossal nerve'], 1,
            'The nerve to the muscles of facial expression, the facial nerve, exits here.', TEMP_LAND, CRANIAL_NERVES),
        MCQ('Which part of the temporal bone houses the middle and inner ear?', ['Petrous part', 'Squamous part', 'Zygomatic process', 'Styloid process'], 0,
            'Small cavities inside the petrous ridge house the middle and inner ears.', TEMP_PARTS),
        MCQ('Which artery passes through the carotid canal?', ['External carotid artery', 'Vertebral artery', 'Middle meningeal artery', 'Internal carotid artery'], 3,
            'The internal carotid artery continues through the carotid canal to the brain.', CAROTID),
    ],
)

occipital = lesson(
    id='occipital', bone='occipital_bone', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 7.3; 7.5; 13.2; 16.3; 20.5',
    oneLine={
        'main': F('The single bone of the back and base of the skull, around the foramen magnum (occipital bone).', OCCIPITAL),
        'simpler': F('The occipital bone is the bone at the back of your head.', OCCIPITAL),
        'deeper': F('Its condyles rest on the first cervical vertebra, so the skull sits on the vertebral column.', OCCIPITAL, ATLAS),
    },
    where={
        'facts': [
            F('It forms the back of the skull and the back of the base of the cranial cavity.', OCCIPITAL),
            F('It meets the two parietal bones and the temporal bones at the lambdoid suture.', SUTURES),
            F('Inside, it forms the floor and back wall of the posterior cranial fossa.', POST_FOSSA),
        ],
        'simpler': F('It is at the back of your head, down to where your skull sits on your neck.', OCCIPITAL),
        'deeper': F('The posterior cranial fossa is the deepest of the three, and holds the cerebellum.', POST_FOSSA),
    },
    features={
        'items': [
            FEAT('External occipital protuberance', 'A small bump at the back midline, where a ligament of the neck attaches.', OCCIPITAL),
            FEAT('Superior nuchal lines', 'Lines either side of the bump: the highest point where neck muscles attach.', OCCIPITAL),
            FEAT('Foramen magnum', 'The large opening (“great aperture”) in the base, for the spinal cord.', OCCIPITAL, POST_FOSSA),
            FEAT('Occipital condyles', 'Oval knobs either side of the foramen magnum, which form joints with the first cervical vertebra.', OCCIPITAL),
            FEAT('Hypoglossal canals', 'Openings at the front edge of the foramen magnum, for a nerve to the tongue.', MEATUS),
            FEAT('Venous grooves', 'Large curved grooves on the inner wall, ending at the jugular foramen.', JUGULAR),
        ],
        'simpler': F('It has a bump at the back, a large hole underneath and two knobs that sit on the spine.', OCCIPITAL),
        'deeper': F('Above the nuchal lines only the scalp covers the skull; below them, neck muscles attach.', OCCIPITAL),
    },
    formFunction={
        'facts': [
            F('Its condyles form joints with the first cervical vertebra, supporting the skull on the spine.', OCCIPITAL, ATLAS),
            F('The foramen magnum lets the spinal cord pass out of the skull.', OCCIPITAL),
            F('Its protuberance and nuchal lines anchor a ligament and the muscles of the back of the neck.', OCCIPITAL),
        ],
        'simpler': F('It holds your head on your neck and lets the spinal cord out.', OCCIPITAL),
    },
    relations={
        'items': [
            REL('bone', 'First cervical vertebra (atlas)', 'Supports the skull: it forms joints with the occipital condyles.', ATLAS, OCCIPITAL),
            REL('nervous system', 'Spinal cord', 'Leaves the skull through the foramen magnum.', OCCIPITAL),
            REL('brain', 'Cerebellum', 'Lies in the posterior cranial fossa.', POST_FOSSA),
            REL('arteries', 'Vertebral arteries', 'Enter the skull through the foramen magnum to supply the brain and spinal cord.', VERTEBRAL),
            REL('nerve', 'Hypoglossal nerve', 'The motor nerve of the tongue; it passes through the hypoglossal canal.', MEATUS, HYPOGLOSSAL),
            REL('suture', 'Lambdoid suture', 'Joins it to the parietal and temporal bones.', SUTURES),
        ],
        'simpler': F('It sits on the first neck vertebra and lets the spinal cord and two arteries through.', ATLAS, OCCIPITAL, VERTEBRAL),
    },
    development={
        'facts': [
            F('Its upper part, behind the brain, forms from membrane; its base forms from a cartilage model.', DEV_INTRA, DEV_ENDO,
              check='OpenStax says the top and sides of the brain case form from membrane, and its floor from cartilage; how this divides the occipital bone needs an approved source.'),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A blow to the front or side of the head.', 'The base of the occipital bone may break on the opposite side (contrecoup), a basilar fracture.',
                 'Rely on the site of the blow to show where the skull broke.', 'In a contrecoup fracture, the bone breaks opposite the point of impact.', SKULL_FX),
            CLIN('Bleeding or swelling raises the pressure inside the skull.', 'The lowest part of the cerebellum is pushed down through the foramen magnum.',
                 'Keep breathing and heart rate regulated: the brainstem is compressed.', 'The pons and medulla, at the foramen magnum, regulate breathing and the heart.', BRAINSTEM,
                 check='Herniation through the foramen magnum is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the brainstem’s role is.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the skull is supported on the vertebral column.',
                ['The occipital bone has an oval condyle on each side of the foramen magnum.', 'The condyles form joints with the first cervical vertebra.',
                 'This vertebra is called the atlas because it supports the skull.', 'So the skull rests on top of the vertebral column.'], OCCIPITAL, ATLAS),
            TUT('compare', 'Compare the foramen magnum and the hypoglossal canal.',
                ['The foramen magnum is the large opening in the base of the occipital bone.', 'It carries the spinal cord and the vertebral arteries.',
                 'The hypoglossal canal is a small opening at its front edge.', 'It carries the hypoglossal nerve, the motor nerve of the tongue.'], OCCIPITAL, VERTEBRAL, MEATUS, HYPOGLOSSAL),
            TUT('predict', 'Predict why a blow to the forehead can break the occipital bone.',
                ['This is a contrecoup (counterblow) fracture.', 'The bone at the point of impact does not break.',
                 'Instead, the skull breaks on the opposite side.', 'At the base of the skull this gives a basilar fracture.'], SKULL_FX),
        ],
    },
    check=[
        MCQ('What passes through the foramen magnum?', ['The optic nerve', 'The spinal cord', 'The facial nerve', 'The internal carotid artery'], 1,
            'The foramen magnum allows passage of the spinal cord as it exits the skull.', OCCIPITAL),
        MCQ('Which bone do the occipital condyles meet?', ['Axis (second cervical vertebra)', 'Sphenoid bone', 'Atlas (first cervical vertebra)', 'Temporal bone'], 2,
            'They form joints with the first cervical vertebra, the atlas.', OCCIPITAL, ATLAS),
        MCQ('Which part of the brain lies in the posterior cranial fossa?', ['Frontal lobes', 'Temporal lobes', 'Pituitary gland', 'Cerebellum'], 3,
            'The posterior cranial fossa contains the cerebellum.', POST_FOSSA),
    ],
)

ethmoid = lesson(
    id='ethmoid', bone='ethmoid_bone', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 7.5; 14.1',
    oneLine={
        'main': F('A single midline bone between the orbits that forms the roof and upper walls of the nasal cavity (ethmoid bone).', ETHMOID),
        'simpler': F('The ethmoid bone sits behind the top of your nose, between your eyes.', ETHMOID, ETH_LAT),
        'deeper': F('The nerve fibres for smell pass through its cribriform plate into the brain.', ETH_FOSSA, OLF_AXON),
    },
    where={
        'facts': [
            F('It lies in the midline, between the orbit and the upper nasal cavity on each side.', ETHMOID, ETH_LAT),
            F('Inside the skull, it forms a small midline area of the floor of the anterior cranial fossa.', ETH_FOSSA),
            F('It forms the upper nasal septum and part of the medial wall of each orbit.', ETHMOID),
        ],
        'simpler': F('It is deep behind the bridge of your nose, between your eye sockets.', ETHMOID, ETH_LAT),
        'deeper': F('Though counted with the brain case, it also helps form the nasal septum, nasal walls and orbits.', FACIAL),
    },
    features={
        'items': [
            FEAT('Crista galli', 'A small upward projection in the midline (“rooster’s comb”). It anchors one of the coverings of the brain.', ETH_FOSSA),
            FEAT('Cribriform plates', 'Flat plates either side of it (“sieve”), pierced by small olfactory foramina.', ETH_FOSSA),
            FEAT('Perpendicular plate', 'Forms the upper part of the nasal septum.', ETH_NASAL, SEPTUM),
            FEAT('Superior and middle nasal conchae', 'Thin curved plates projecting from each side wall of the nasal cavity.', ETH_NASAL, CONCHAE),
            FEAT('Ethmoid air cells', 'Many small air spaces with very thin walls, between the nasal cavity and the orbit.', ETH_LAT, SINUSES),
            FEAT('Orbital surface', 'Forms much of the medial wall of each orbit, with the lacrimal bone.', ETH_LAT, ORBIT_WALLS),
        ],
        'simpler': F('It has a sieve-like roof, a central plate in the nose and two scroll-like plates on each side.', ETH_FOSSA, ETH_NASAL, CONCHAE),
        'deeper': F('The superior concha is the smallest; it is hidden above and behind the middle concha.', CONCHAE),
    },
    formFunction={
        'facts': [
            F('Its cribriform plates are pierced by olfactory foramina, letting the fibres for smell reach the brain.', ETH_FOSSA, OLF_AXON),
            F('Its curved conchae swirl incoming air, helping to warm and moisten it.', CONCHAE),
            F('Mucus on the conchae traps dust, pollen, bacteria and viruses.', CONCHAE),
            F('Its air cells are part of the paranasal sinuses, which lighten the skull.', ETH_LAT, SINUS_ROLE),
        ],
        'simpler': F('It lets the nerves for smell through, and helps warm and clean the air you breathe.', ETH_FOSSA, CONCHAE),
    },
    relations={
        'items': [
            REL('nerve', 'Olfactory nerve', 'Its fibres pass from the nasal lining through the cribriform plate to the olfactory bulb.', OLF_AXON, ETH_FOSSA),
            REL('brain', 'Frontal lobe', 'The olfactory bulb lies on its underside, just above the cribriform plate.', OLF_AXON),
            REL('bone', 'Vomer', 'With the perpendicular plate and the septal cartilage, forms the nasal septum.', SEPTUM),
            REL('bone', 'Lacrimal bone', 'Together they form much of the medial wall of the orbit.', ORBIT_WALLS),
            REL('bone', 'Frontal bone', 'Forms most of the floor of the anterior cranial fossa, around the ethmoid’s small midline part.', ANT_FOSSA),
            REL('covering', 'Covering of the brain', 'One of the layers covering the brain is anchored to the crista galli.', ETH_FOSSA),
        ],
        'simpler': F('The nerves for smell pass through it to the brain, and it joins the bones of the nose and orbit.', OLF_AXON, SEPTUM, ORBIT_WALLS),
    },
    development={
        'facts': [
            F('Like the bones of the skull base, it forms from a cartilage model (endochondral ossification).', DEV_ENDO),
            F('The paranasal sinuses, including its air cells, enlarge during childhood.', FACE_DEV),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('Blunt force to the face, as in a car accident.', 'The olfactory nerve fibres are sheared where they pass through the cribriform plate.',
                 'Smell (anosmia); food may taste bland.', 'The frontal lobe moves relative to the ethmoid bone, tearing the fine fibres.', ANOSMIA, BLAND),
            CLIN('A fracture through the cribriform plate.', 'The coverings of the brain over the plate tear.',
                 'Keep the nose dry: the clear fluid around the brain (cerebrospinal fluid) leaks from the nose.', 'The thin plate is all that separates the nasal cavity from the cranial cavity.', ETH_FOSSA,
                 check='Leakage of cerebrospinal fluid from the nose is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the plate’s position is.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how a blow to the face can cause loss of smell.',
                ['Olfactory nerve fibres pass through the cribriform plate of the ethmoid bone.', 'They reach the olfactory bulb on the underside of the frontal lobe.',
                 'In a blow, the frontal lobe moves relative to the ethmoid bone.', 'The fibres are sheared, causing anosmia.'], OLF_AXON, ANOSMIA),
            TUT('compare', 'Compare the perpendicular plate of the ethmoid with the vomer.',
                ['Both form part of the bony nasal septum.', 'The perpendicular plate forms its upper part.',
                 'The triangular vomer forms its lower and back parts.', 'Septal cartilage fills the gap between them at the front.'], SEPTUM),
            TUT('predict', 'Predict which nasal conchae you would see looking into the front of a dry skull, and explain why.',
                ['The inferior and middle conchae.', 'The inferior concha is the largest.',
                 'The middle concha, part of the ethmoid, lies just above it.', 'The small superior concha is hidden above and behind the middle one.'], CONCHAE),
        ],
    },
    check=[
        MCQ('What passes through the cribriform plate?', ['The optic nerve', 'Fibres of the olfactory nerve', 'The internal carotid artery', 'The facial nerve'], 1,
            'Olfactory axons pass through the olfactory foramina of the cribriform plate.', OLF_AXON, ETH_FOSSA),
        MCQ('Which nasal conchae are part of the ethmoid bone?', ['Superior and middle', 'Inferior only', 'Middle and inferior', 'All three'], 0,
            'The superior and middle conchae belong to the ethmoid; the inferior concha is a separate bone.', CONCHAE),
        MCQ('What does the crista galli anchor?', ['The nasal septum', 'The olfactory bulb', 'The eyeball', 'One of the coverings of the brain'], 3,
            'It is an anterior attachment point for one of the covering layers of the brain.', ETH_FOSSA),
    ],
)

ossicles = lesson(
    id='ossicles', title='Auditory ossicles', bone='malleus_left', bones=['malleus_left', 'incus_left', 'stapes_left'], topic='skull',
    source='OpenStax A&P 2e: 14.1 Sensory Perception; 7.2 The Skull',
    oneLine={
        'main': F('The three tiny bones of the middle ear: the malleus, incus and stapes (auditory ossicles).', EAR),
        'simpler': F('The ossicles are three tiny bones in your ear that pass sound inwards.', EAR, WAVES),
        'deeper': F('Their Latin names roughly mean hammer, anvil and stirrup.', EAR),
    },
    where={
        'facts': [
            F('They span the space of the middle ear, inside the petrous part of the temporal bone.', EAR, TEMP_PARTS),
            F('The malleus is attached to the eardrum (tympanic membrane).', EAR),
            F('The stapes is attached to the inner ear, at the oval window of the cochlea.', EAR, INNER),
        ],
        'simpler': F('They sit deep in your ear, between the eardrum and the inner ear.', EAR),
        'deeper': F('The ear canal leading to the eardrum enters the skull through the external acoustic meatus.', EAR),
    },
    features={
        'items': [
            FEAT('Malleus', '“Hammer”: attached to the eardrum, and joined to the incus.', EAR),
            FEAT('Incus', '“Anvil”: between the other two, joined to both.', EAR),
            FEAT('Stapes', '“Stirrup”: joined to the incus, and attached to the inner ear at the oval window.', EAR, INNER),
            FEAT('A chain of joints', 'The three are joined end to end, from the eardrum to the inner ear.', EAR),
            FEAT('Footplate of the stapes', 'Its flat base fills the oval window.', check=NOT_IN),
        ],
        'simpler': F('They are a chain of three tiny bones: hammer, anvil and stirrup.', EAR),
        'deeper': F('The stapes is the smallest bone in the body.', check=NOT_IN),
    },
    formFunction={
        'facts': [
            F('Sound makes the eardrum vibrate; the ossicles pass the vibrations along to the inner ear.', EAR, WAVES),
            F('Vibrations passing through the oval window set the fluid of the cochlea moving in waves.', WAVES),
            F('The fluid waves match the frequencies of the sound.', WAVES),
        ],
        'simpler': F('They pass the eardrum’s vibrations along to the fluid of the inner ear.', EAR, WAVES),
    },
    relations={
        'items': [
            REL('membrane', 'Tympanic membrane (eardrum)', 'Vibrates when sound strikes it; the malleus is attached to it.', EAR),
            REL('organ', 'Cochlea', 'The inner ear organ of hearing, attached to the stapes through the oval window.', INNER),
            REL('opening', 'Round window', 'A membrane-covered opening that bulges as the fluid in the cochlea moves.', WAVES),
            REL('bone', 'Temporal bone', 'Its petrous part contains the middle and inner ear.', TEMP_PARTS),
            REL('nerve', 'Vestibulocochlear nerve', 'Carries the signals of hearing from the cochlea to the brainstem.', INNER),
        ],
        'simpler': F('They link the eardrum to the cochlea, deep in the temporal bone.', EAR, INNER, TEMP_PARTS),
    },
    development={
        'facts': [
            F('They form from cartilage of the embryonic pharyngeal arches.', check=NOT_IN),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('Abnormal bone growth fixes the stapes in the oval window (otosclerosis).', 'The stapes.',
                 'Hear well: sound is no longer passed into the inner ear.', 'The stapes must move to send vibrations through the oval window.', WAVES,
                 check='Otosclerosis is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the role of the oval window is.'),
            CLIN('A blast, or something pushed into the ear canal.', 'The eardrum tears.',
                 'Hear normally on that side.', 'The malleus is attached to the eardrum, which must vibrate to move the ossicles.', EAR,
                 check='A torn eardrum is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the eardrum’s role is.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how sound reaches the inner ear.',
                ['Sound waves travel down the ear canal and strike the eardrum, which vibrates.', 'The malleus, attached to the eardrum, passes the vibration to the incus.',
                 'The incus passes it to the stapes.', 'The stapes moves the oval window, sending waves through the fluid of the cochlea.'], EAR, WAVES),
            TUT('compare', 'Compare the attachments of the malleus and the stapes.',
                ['The malleus is attached to the eardrum, at the outer end of the chain.', 'The stapes is attached to the inner ear, at the oval window.',
                 'The incus links them.', 'So vibration passes from the outer to the inner ear.'], EAR, INNER),
            TUT('predict', 'Predict the effect on hearing if the stapes cannot move, and explain it.',
                ['Hearing is reduced.', 'The stapes cannot move the oval window.',
                 'So little vibration reaches the fluid of the cochlea.', 'The sound-sensing cells are hardly stimulated.'], WAVES,
                check='Hearing loss from a fixed stapes is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the role of the oval window is.'),
        ],
    },
    check=[
        MCQ('Which ossicle is attached to the eardrum?', ['Incus', 'Stapes', 'Malleus', 'Cochlea'], 2, 'The malleus is attached to the tympanic membrane.', EAR),
        MCQ('Which ossicle is attached to the oval window?', ['Stapes', 'Malleus', 'Incus', 'All three'], 0, 'The cochlea is attached to the stapes through the oval window.', INNER),
        MCQ('Which bone houses the middle ear?', ['Sphenoid bone', 'Occipital bone', 'Parietal bone', 'Temporal bone'], 3, 'Cavities inside the petrous part of the temporal bone house the middle and inner ears.', TEMP_PARTS),
    ],
)

write(frontal, parietal, temporal, occipital, ethmoid, ossicles)
