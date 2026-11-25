# Structure lessons, Skull: the facial bones (maxilla, zygomatic, nasal, lacrimal, palatine, vomer, inferior nasal
# concha) and the hyoid bone. The mandible is in structures_v1.py. OpenStax A&P 2e disagrees with itself on how the
# facial bones form (6.4: the flat bones of the face form from membrane; 7.5: the facial bones form from cartilage),
# so each development statement carries a † that says so. Nothing is marked reviewed.
#   python3 scripts/content/structures_face.py
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, NOT_IN, lesson, write

SKULL_22 = 's7-2#fs-id1899464'
NASAL_CAV = 's7-2#fs-id1211287'
ZYG_ARCH = 's7-2#fs-id1285208'
JAW_FOSSAE = 's7-2#fs-id1399296'
TEMP_PARTS = 's7-2#fs-id2010718'
TEMP_LAND = 's7-2#fs-id1882965'
SUTURES = 's7-2#fs-id1248497'
PTERION_CLIN = 's7-2#fs-id1364278'
FACIAL = 's7-2#fs-id1861377'
MAXILLA = 's7-2#fs-id2307253'
PALATINE = 's7-2#fs-id1965938'
CLEFT_DEV = 's7-2#fs-id1845434'
CLEFT_LIP = 's7-2#fs-id1363721'
CLEFT_PALATE = 's7-2#fs-id1547568'
ZYGOMATIC = 's7-2#fs-id2159036'
NASAL = 's7-2#fs-id1899580'
LACRIMAL = 's7-2#fs-id886176'
CONCHA_INF = 's7-2#fs-id1698818'
VOMER = 's7-2#fs-id1254996'
ORBIT_SHAPE = 's7-2#fs-id1883481'
ORBIT_WALLS = 's7-2#fs-id1887927'
SEPTUM = 's7-2#fs-id2125356'
CONCHAE = 's7-2#fs-id1475747'
ETH_LAT = 's7-2#fs-id1897403'
SINUS_ROLE = 's7-2#fs-id1977054'
SINUSES = 's7-2#fs-id1882870'
HYOID = 's7-2#fs-id1399933'
DEV_ENDO = 's7-5#fs-id2251103'
FACE_DEV = 's7-5#fs-id1241553'
INTRA6 = 's6-4#fs-id1804592'
INTRA6_LATE = 's6-4#fs-id1639567'
SUTURE_JOINT = 's9-2#fs-id2663393'
GOMPHOSIS = 's9-2#fs-id1747622'


def membrane(bone):
    return F('Like the other flat bones of the face, it forms directly from membrane (intramembranous ossification).', INTRA6,
             check=f'OpenStax 6.4 says the flat bones of the face form from membrane, but 7.5 says the facial bones form from cartilage; which applies to the {bone} needs an approved source.')


LATE = F('The flat bones of the face are the last to ossify from membrane. They reach adult size at the end of the adolescent growth spurt.', INTRA6_LATE)

maxilla = lesson(
    id='maxilla', bone='maxilla_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 6.4; 7.5; 9.2',
    oneLine={
        'main': F('One of two bones forming the upper jaw, most of the hard palate and part of the orbit floor (maxilla).', MAXILLA),
        'simpler': F('The maxilla is your upper jaw bone.', MAXILLA),
        'deeper': F('It contains the largest paranasal sinus, the maxillary sinus, just below the orbit.', SINUSES),
    },
    where={
        'facts': [
            F('The two maxillae meet in the midline to form the upper jaw.', MAXILLA, CLEFT_DEV),
            F('Each forms the inner (medial) floor of the orbit and the side of the base of the nose.', MAXILLA, ORBIT_WALLS),
            F('Its lower edge holds the upper teeth.', MAXILLA),
        ],
        'simpler': F('It forms your upper jaw, just below the eye.', MAXILLA),
        'deeper': F('With the palatine bones, it forms the hard palate between the mouth and the nose.', MAXILLA, PALATINE),
    },
    features={
        'items': [
            FEAT('Alveolar process', 'The curved lower edge that holds the upper teeth.', MAXILLA),
            FEAT('Infraorbital foramen', 'An opening just below the orbit, for a sensory nerve to the nose, upper lip and front of the cheek.', MAXILLA),
            FEAT('Palatine process', 'A shelf that meets its partner to form the front three-quarters of the hard palate.', MAXILLA),
            FEAT('Orbital surface', 'Forms most of the inner floor of the orbit.', ORBIT_WALLS),
            FEAT('Maxillary sinus', 'The largest paranasal sinus, below the orbit.', SINUSES),
        ],
        'simpler': F('It has a ridge holding the upper teeth, a shelf forming the roof of the mouth and a large sinus.', MAXILLA, SINUSES),
        'deeper': F('Each tooth sits in a deep socket called an alveolus.', MAXILLA),
    },
    formFunction={
        'facts': [
            F('Its alveolar process anchors the upper teeth in deep sockets.', MAXILLA),
            F('Its palatine processes meet in the midline, separating the mouth from the nasal cavity.', MAXILLA),
            F('The large maxillary sinus lightens the skull, but its opening is high on the inner wall, so it drains poorly.', SINUS_ROLE, SINUSES),
        ],
        'simpler': F('It holds your upper teeth and forms most of the roof of your mouth.', MAXILLA),
    },
    relations={
        'items': [
            REL('joints', 'Upper teeth', 'Each tooth root is held in its socket by a fibrous joint (gomphosis).', GOMPHOSIS, MAXILLA),
            REL('bones', 'Palatine bones', 'Their horizontal plates complete the back quarter of the hard palate.', PALATINE),
            REL('nerve', 'Sensory nerve to the face', 'Leaves through the infraorbital foramen to supply the nose, upper lip and front of the cheek.', MAXILLA),
            REL('space', 'Orbit', 'The maxilla forms most of its inner floor, with a small part from the palatine bone.', ORBIT_WALLS),
            REL('space', 'Nasal cavity', 'The hard palate forms its floor, and the maxilla the side of the base of the nose.', MAXILLA),
        ],
        'simpler': F('It holds the upper teeth and joins the palatine bones, the orbit and the nose.', MAXILLA, PALATINE),
    },
    development={
        'facts': [
            F('The right and left maxillae come together in the midline during embryonic development.', CLEFT_DEV),
            membrane('maxilla'),
            F('In childhood the jaws grow as the teeth appear, and the sinuses enlarge.', FACE_DEV),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A sinus infection, often after a cold.', 'The maxillary sinus, the sinus most often infected.',
                 'Clear the sinus easily: pressure and pain build below the eye.', 'The sinus opens into the nasal cavity high on its inner wall, so it drains poorly.', SINUSES, SINUS_ROLE),
            CLIN('A blow to the eye from in front, as from a ball.', 'The thin floor of the orbit breaks into the maxillary sinus below (blow-out fracture).',
                 'Look upwards without double vision.', 'An eye muscle and orbital fat can be trapped in the break.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the maxillary sinus is the one most often infected.',
                ['It is the largest paranasal sinus.', 'Its connection to the nasal cavity is high on its inner wall.',
                 'So it is difficult to drain.', 'Trapped fluid and mucus allow infection and cause pressure and pain.'], SINUSES, SINUS_ROLE),
            TUT('compare', 'Compare the parts the maxillae and the palatine bones play in the hard palate.',
                ['The palatine processes of the maxillae form the front three-quarters.', 'The horizontal plates of the palatine bones form the back quarter.',
                 'All four meet in the midline.', 'Together they separate the mouth from the nasal cavity.'], MAXILLA, PALATINE),
            TUT('predict', 'A sensory nerve leaves the skull through the infraorbital foramen. Predict where a patient is numb if it is injured.',
                ['The side of the nose.', 'The upper lip.', 'The front of the cheek.', 'On the same side as the injured nerve.'], MAXILLA),
        ],
    },
    check=[
        MCQ('Which is the largest paranasal sinus?', ['Frontal sinus', 'Maxillary sinus', 'Sphenoid sinus', 'Ethmoid air cells'], 1, 'The maxillary sinus is the largest.', SINUSES),
        MCQ('Which part of the hard palate do the maxillae form?', ['The front three-quarters', 'The back quarter', 'The whole palate', 'None of it'], 0,
            'Their palatine processes form the anterior three-quarters of the hard palate.', MAXILLA),
        MCQ('What does the alveolar process of the maxilla hold?', ['The eyeball', 'The tongue', 'The nasal septum', 'The upper teeth'], 3, 'It contains the sockets of the upper teeth.', MAXILLA),
    ],
)

zygomatic = lesson(
    id='zygomatic', bone='zygomatic_bone_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 6.4',
    oneLine={
        'main': F('The cheekbone, which forms much of the outer wall of the orbit (zygomatic bone).', ZYGOMATIC),
        'simpler': F('The zygomatic bone is your cheekbone.', ZYGOMATIC),
        'deeper': F('Its temporal process forms the front of the zygomatic arch.', ZYGOMATIC, ZYG_ARCH),
    },
    where={
        'facts': [
            F('It forms the cheek, at the outer and lower rim of the orbit.', ZYGOMATIC),
            F('It forms much of the outer (lateral) wall and outer floor of the orbit.', ZYGOMATIC, ORBIT_WALLS),
            F('Behind, its temporal process joins the zygomatic process of the temporal bone.', ZYG_ARCH),
        ],
        'simpler': F('It is the bone you feel at the top of your cheek, below and beside your eye.', ZYGOMATIC),
        'deeper': F('The pterion lies a thumb’s width behind its upward part, about two finger widths above the arch.', SUTURES),
    },
    features={
        'items': [
            FEAT('Orbital part', 'Forms much of the lateral wall and the lateral floor of the orbit.', ZYGOMATIC, ORBIT_WALLS),
            FEAT('Orbital margin', 'The outer and lower rim of the front opening of the orbit.', ZYGOMATIC),
            FEAT('Temporal process', 'A short projection backwards, forming the front of the zygomatic arch.', ZYGOMATIC),
            FEAT('Upward part', 'Rises at the outer edge of the orbit; a landmark for finding the pterion.', SUTURES),
        ],
        'simpler': F('It has a part that walls in the eye socket and a part that reaches back into the arch.', ZYGOMATIC),
        'deeper': F('The arch works like a drawbridge: two processes, one from each bone, meet in the middle.', ZYG_ARCH),
    },
    formFunction={
        'facts': [
            F('The lateral wall of each orbit angles 45 degrees away from the midline, widening side (peripheral) vision.', ORBIT_SHAPE),
            F('The thickened margins of the orbit help protect the eye.', ORBIT_SHAPE),
            F('The arch it helps form is a bridge of bone from which a major chewing muscle arises.', ZYG_ARCH),
        ],
        'simpler': F('It shapes your cheek, guards the side of your eye and anchors a chewing muscle.', ZYGOMATIC, ORBIT_SHAPE, ZYG_ARCH),
    },
    relations={
        'items': [
            REL('bone', 'Temporal bone', 'Its zygomatic process joins the temporal process to complete the arch.', ZYG_ARCH),
            REL('space', 'Orbit', 'Forms its lateral wall and lateral floor; the maxilla forms the inner floor.', ORBIT_WALLS),
            REL('muscle', 'Chewing muscle', 'A major muscle that pulls the mandible up in biting and chewing arises from the arch.', ZYG_ARCH),
            REL('spaces', 'Temporal and infratemporal fossae', 'The spaces above and below the arch, filled by chewing muscles.', JAW_FOSSAE),
        ],
        'simpler': F('It joins the temporal bone in the arch and forms the outer wall of the eye socket.', ZYG_ARCH, ORBIT_WALLS),
    },
    development={'facts': [membrane('zygomatic bone'), LATE]},
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A blow to the side of the head, just behind the upward part of the zygomatic bone.', 'The pterion, with a major artery to the brain’s coverings just inside it.',
                 'Be left without close watching: a haematoma can build up over hours.', 'The pterion is the weakest part of the skull, and bleeding there presses on the brain.', SUTURES, PTERION_CLIN),
            CLIN('A punch or blow to the cheek.', 'The zygomatic bone or arch breaks and may be pushed inwards.',
                 'Open the mouth fully, if the broken arch presses on the jaw beneath.', 'Part of the mandible and chewing muscles lie just deep to the arch.', JAW_FOSSAE,
                 check='The fracture and its effect on opening the mouth are not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the zygomatic arch is built.',
                ['It spans from the cheek to just above the ear canal.', 'At the front is the short temporal process of the zygomatic bone.',
                 'Behind is the longer zygomatic process of the temporal bone.', 'The two join like the ends of a drawbridge.'], ZYG_ARCH),
            TUT('compare', 'Compare the parts the zygomatic bone and the maxilla play in the orbit.',
                ['The zygomatic bone forms the lateral wall and lateral floor.', 'The maxilla forms most of the medial floor.',
                 'The zygomatic bone also forms the outer, lower rim.', 'The lateral wall angles outwards, widening side vision.'], ORBIT_WALLS, ZYGOMATIC, ORBIT_SHAPE),
            TUT('predict', 'Predict how to find the pterion on a living head, using the zygomatic bone.',
                ['Find the upward part of the zygomatic bone, at the outer edge of the eye.', 'Move a thumb’s width behind it.',
                 'Then about two finger widths above the zygomatic arch.', 'This is the pterion, the weakest part of the skull.'], SUTURES),
        ],
    },
    check=[
        MCQ('Which bone forms the front of the zygomatic arch?', ['Temporal bone', 'Zygomatic bone', 'Maxilla', 'Sphenoid bone'], 1, 'The temporal process of the zygomatic bone forms the front of the arch.', ZYG_ARCH),
        MCQ('Which part of the orbit does the zygomatic bone mainly form?', ['Lateral wall', 'Roof', 'Medial wall', 'Back'], 0, 'It forms the lateral wall and lateral floor.', ORBIT_WALLS),
        MCQ('What arises from the zygomatic arch?', ['A muscle of facial expression', 'The optic nerve', 'The facial nerve', 'A muscle that pulls the jaw up in chewing'], 3,
            'One of the major muscles that raises the mandible arises from the arch.', ZYG_ARCH),
    ],
)

nasal = lesson(
    id='nasal', bone='nasal_bone_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 6.4',
    oneLine={
        'main': F('One of two small bones that form the bridge of the nose (nasal bone).', NASAL),
        'simpler': F('The nasal bones form the hard top of your nose.', NASAL),
        'deeper': F('They also support the cartilages that form the sides of the nose.', NASAL),
    },
    where={
        'facts': [
            F('The two nasal bones meet in the midline at the bridge of the nose.', NASAL),
            F('They form the bony base of the nose, above its cartilages.', NASAL),
            F('They are paired facial bones.', FACIAL),
        ],
        'simpler': F('Feel the hard top of your nose: those are the nasal bones.', NASAL),
        'deeper': F('Below them, the nose is shaped by cartilage, which is not seen in a dry skull.', NASAL, SEPTUM),
    },
    features={
        'items': [
            FEAT('Midline joint', 'The two bones meet each other in the midline.', NASAL),
            FEAT('Bridge of the nose', 'Together they form its bony base.', NASAL),
            FEAT('Lower edges', 'Support the cartilages of the side walls of the nose.', NASAL),
            FEAT('Upper and side edges', 'Meet the frontal bone above and the maxillae at the sides.', check=NOT_IN),
        ],
        'simpler': F('They are two small bones side by side at the top of the nose.', NASAL),
        'deeper': F('As facial bones, they are joined to their neighbours by sutures.', SUTURE_JOINT),
    },
    formFunction={
        'facts': [
            F('Together they form a firm bridge that holds the shape of the upper nose.', NASAL),
            F('They support the softer cartilages of the side walls of the nose.', NASAL),
        ],
        'simpler': F('They give your nose a firm top and hold up its softer parts.', NASAL),
    },
    relations={
        'items': [
            REL('bone', 'Other nasal bone', 'Its partner, meeting it in the midline.', NASAL),
            REL('cartilage', 'Cartilages of the nose', 'The side-wall cartilages rest on them.', NASAL),
            REL('cartilage', 'Septal cartilage', 'Forms the front of the nasal septum and separates the nostrils.', SEPTUM),
            REL('bones', 'Frontal bone and maxillae', 'Meet them above and at the sides.', check=NOT_IN),
        ],
        'simpler': F('They meet each other in the midline and hold up the cartilages of the nose.', NASAL),
    },
    development={'facts': [membrane('nasal bone'), LATE]},
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A blow to the nose.', 'The nasal bones break: these are the bones damaged when the nose is broken.',
                 'Keep the nose straight: the bridge may be pushed to one side.', 'The thin bones form the bony bridge, so a blow drives them sideways or inwards.', NASAL,
                 check='OpenStax says these bones break in a broken nose; displacement of the bridge is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
            CLIN('A broken nose with a swollen, blocked nostril.', 'Blood collects under the lining of the septal cartilage (septal haematoma).',
                 'Breathe through that side of the nose.', 'The cartilage depends on that lining for nourishment, so trapped blood threatens it.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why a broken nose is usually a break of the nasal bones.',
                ['The nasal bones form the bony bridge of the nose.', 'They are small and project at the front of the face.',
                 'The rest of the nose is cartilage, which bends rather than breaks.', 'So a blow breaks the nasal bones.'], NASAL, SEPTUM,
                check='That cartilage bends rather than breaks is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
            TUT('compare', 'Compare the bony and the cartilage parts of the nose.',
                ['Bone: the nasal bones form the bridge.', 'Cartilage: plates form the side walls and the front of the septum.',
                 'The bones support the side-wall cartilages.', 'Cartilage is not seen in a dry skull.'], NASAL, SEPTUM),
            TUT('predict', 'Predict why a skull in a museum seems to have no nose.',
                ['Only the nasal bones, at the bridge, are bone.', 'The rest of the nose is cartilage.',
                 'Cartilage is not found in the dry skull.', 'So a large opening is left below the nasal bones.'], NASAL, SEPTUM),
        ],
    },
    check=[
        MCQ('How many nasal bones are there?', ['One', 'Two', 'Three', 'Four'], 1, 'Two small nasal bones join to form the bridge of the nose.', NASAL),
        MCQ('What do the nasal bones support?', ['The cartilages of the side walls of the nose', 'The upper teeth', 'The eyeball', 'The tongue'], 0,
            'They support the cartilages that form the lateral walls of the nose.', NASAL),
        MCQ('Which bones are damaged when the nose is broken?', ['Vomer', 'Ethmoid bone', 'Lacrimal bones', 'Nasal bones'], 3, 'The nasal bones are damaged when the nose is broken.', NASAL),
    ],
)

lacrimal = lesson(
    id='lacrimal', bone='lacrimal_bone_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 6.4',
    oneLine={
        'main': F('A small rectangular bone at the front of the inner wall of the orbit (lacrimal bone).', LACRIMAL),
        'simpler': F('The lacrimal bone is a tiny bone at the inner corner of your eye socket.', LACRIMAL),
        'deeper': F('Tears drain from the eye through a canal beside it into the nose.', LACRIMAL),
    },
    where={
        'facts': [
            F('It forms the front part of the medial wall of the orbit.', LACRIMAL),
            F('With the ethmoid bone, it makes up much of the medial wall.', ORBIT_WALLS),
            F('It is paired: one in each orbit.', FACIAL),
        ],
        'simpler': F('It sits at the inner corner of each eye socket.', LACRIMAL),
        'deeper': F('Its canal opens into the nasal cavity, behind the inferior nasal concha.', LACRIMAL),
    },
    features={
        'items': [
            FEAT('Shape', 'A small, rectangular plate of bone.', LACRIMAL),
            FEAT('Lacrimal fossa', 'A shallow hollow in its front part.', LACRIMAL),
            FEAT('Nasolacrimal canal', 'Runs down from the fossa towards the nasal cavity.', LACRIMAL),
            FEAT('Orbital surface', 'Forms the front of the medial wall of the orbit.', LACRIMAL),
        ],
        'simpler': F('It is a tiny plate of bone with a hollow and a canal for tears.', LACRIMAL),
        'deeper': F('Tears drain into the canal at the inner (medial) corner of the eye.', LACRIMAL),
    },
    formFunction={
        'facts': [
            F('Tears keep the surface of the eye moist, then drain at the inner corner into its canal.', LACRIMAL),
            F('The duct carries them down into the nasal cavity.', LACRIMAL),
            F('With a flood of tears, some fluid drains forwards in the nose, causing a runny nose.', LACRIMAL),
        ],
        'simpler': F('It holds the start of the drain that takes tears from your eye into your nose.', LACRIMAL),
    },
    relations={
        'items': [
            REL('bone', 'Ethmoid bone', 'Behind it; together they form much of the medial wall of the orbit.', ORBIT_WALLS),
            REL('duct', 'Nasolacrimal duct', 'Carries tears from the eye down into the nasal cavity.', LACRIMAL),
            REL('bone', 'Inferior nasal concha', 'The duct opens into the nasal cavity behind it.', LACRIMAL),
            REL('space', 'Orbit', 'Forms the front of its medial wall.', LACRIMAL),
        ],
        'simpler': F('It sits beside the ethmoid bone in the eye socket, at the top of the tear drain.', ORBIT_WALLS, LACRIMAL),
    },
    development={'facts': [membrane('lacrimal bone'), LATE]},
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('Crying, or an irritated eye, increases the flow of tears.', 'Nothing is damaged: the tear drain is working, but overloaded.',
                 'Keep the nose dry: tears run forwards out of the nose.', 'Tears normally drain backwards in the nasal cavity; extra fluid also drains forwards.', LACRIMAL),
            CLIN('A baby’s tear duct has not fully opened.', 'The nasolacrimal duct is blocked.',
                 'Drain tears: the eye waters all the time.', 'Tears can leave the eye only through this duct into the nose.', LACRIMAL,
                 check='A blocked tear duct in babies is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the duct’s course is.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why crying gives you a runny nose.',
                ['Tears drain at the inner corner of the eye into the nasolacrimal canal.', 'The duct opens into the nasal cavity, behind the inferior nasal concha.',
                 'Normally the fluid drains backwards.', 'With many tears, some also drains forwards and out of the nose.'], LACRIMAL),
            TUT('compare', 'Compare the lacrimal and ethmoid bones in the medial wall of the orbit.',
                ['Both form much of the medial wall.', 'The lacrimal bone is small and lies in front.',
                 'The ethmoid lies behind it, between the orbit and the nasal cavity.', 'The ethmoid contains air cells; the lacrimal bone holds the tear canal.'], ORBIT_WALLS, LACRIMAL, ETH_LAT),
            TUT('predict', 'Predict where eye drops go after you blink.',
                ['They drain at the inner corner of the eye.', 'They pass into the nasolacrimal canal, beside the lacrimal bone.',
                 'The duct carries them down into the nasal cavity.', 'They drain backwards in the nose.'], LACRIMAL),
        ],
    },
    check=[
        MCQ('Where does the nasolacrimal duct open?', ['Into the mouth', 'Into the nasal cavity', 'Into the orbit', 'Into the maxillary sinus'], 1,
            'It opens into the nasal cavity, behind the inferior nasal concha.', LACRIMAL),
        MCQ('Which part of the orbit does the lacrimal bone form?', ['The front of the medial wall', 'The roof', 'The lateral wall', 'The floor'], 0, 'It forms the anterior, medial wall of the orbit.', LACRIMAL),
        MCQ('Why does crying give you a runny nose?', ['The nasal bones swell', 'The sinuses fill', 'Mucus is made faster', 'Extra tears drain forwards in the nasal cavity'], 3,
            'With increased tears, some fluid drains anteriorly in the nasal cavity.', LACRIMAL),
    ],
)

palatine = lesson(
    id='palatine', bone='palatine_bone_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 6.4',
    oneLine={
        'main': F('One of a pair of irregular bones that form the back quarter of the hard palate (palatine bone).', PALATINE),
        'simpler': F('The palatine bones form the back of the bony roof of your mouth.', PALATINE),
        'deeper': F('They also form small parts of the side walls of the nasal cavity and of the orbit.', PALATINE),
    },
    where={
        'facts': [
            F('Its horizontal plate meets its partner in the midline, at the back of the hard palate.', PALATINE),
            F('In front of it are the palatine processes of the maxillae.', MAXILLA, PALATINE),
            F('It is best seen looking at the skull from below.', PALATINE),
        ],
        'simpler': F('It sits at the back of the bony roof of your mouth.', PALATINE),
        'deeper': F('The palatine bone also adds a small part to the floor of the orbit, beside the maxilla.', ORBIT_WALLS),
    },
    features={
        'items': [
            FEAT('Horizontal plate', 'Its largest region; with its partner it forms the back quarter of the hard palate.', PALATINE),
            FEAT('Nasal part', 'Adds small areas to the side walls of the nasal cavity.', PALATINE),
            FEAT('Orbital part', 'A small contribution to the orbit.', PALATINE, ORBIT_WALLS),
            FEAT('Shape', 'An irregular bone, paired with its partner.', PALATINE),
        ],
        'simpler': F('Its main part is a flat plate at the back of the roof of the mouth.', PALATINE),
        'deeper': F('So it reaches from the roof of the mouth up into the nose and the orbit.', PALATINE),
    },
    formFunction={
        'facts': [
            F('With the maxillae, it completes the hard palate, which separates the mouth from the nasal cavity.', PALATINE, MAXILLA),
            F('A complete palate keeps the mouth and nose apart, so an infant can suckle.', CLEFT_PALATE),
        ],
        'simpler': F('It finishes the roof of your mouth, sealing it off from your nose.', PALATINE, MAXILLA),
    },
    relations={
        'items': [
            REL('bones', 'Maxillae', 'Their palatine processes form the front three-quarters of the hard palate.', MAXILLA),
            REL('bone', 'Other palatine bone', 'Its partner, meeting it in the midline.', PALATINE),
            REL('space', 'Nasal cavity', 'The hard palate forms its floor; the palatine bone adds to its side walls.', MAXILLA, PALATINE),
            REL('space', 'Orbit', 'A small part of the floor, beside the maxilla.', ORBIT_WALLS),
        ],
        'simpler': F('It joins the maxillae and its partner to make the roof of the mouth.', PALATINE, MAXILLA),
    },
    development={
        'facts': [
            F('During development, its horizontal plate and the maxillae’s palatine processes fuse in the midline, forming the hard palate.', CLEFT_DEV, CLEFT_PALATE),
            membrane('palatine bone'),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('The two halves of the hard palate fail to fuse during development (cleft palate).', 'The palatine plates and palatine processes leave a gap in the midline.',
                 'Suckle well: the infant is at risk of malnutrition until surgery.', 'The gap connects the mouth and nasal cavity, so no seal forms.', CLEFT_PALATE),
            CLIN('In a severe cleft palate, the gap continues forwards.', 'The alveolar processes of the maxillae, above the front teeth, also fail to join.',
                 'Close the upper lip: a cleft lip is also present.', 'The lip forms over the joining maxillae at the same time as the palate.', CLEFT_PALATE, CLEFT_DEV),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the hard palate forms.',
                ['The right and left maxillae come together in the midline.', 'Their palatine processes join.',
                 'The horizontal plates of the palatine bones join behind them.', 'All four fuse in the midline to form the hard palate.'], CLEFT_DEV, CLEFT_PALATE),
            TUT('compare', 'Compare cleft lip and cleft palate.',
                ['Cleft lip: the two sides of the upper lip fail to fuse.', 'It affects about 1 in 1000 births, mostly males.',
                 'Cleft palate: the two halves of the hard palate fail to fuse; about 1 in 2500 births, more often females.', 'Cleft palate is more severe, as it makes suckling difficult.'], CLEFT_LIP, CLEFT_PALATE),
            TUT('predict', 'Predict why a baby with a cleft palate struggles to feed.',
                ['The gap connects the mouth with the nasal cavity.', 'So the baby cannot seal the mouth.',
                 'Without a seal, it cannot suckle well.', 'Surgical repair is needed to prevent malnutrition.'], CLEFT_PALATE),
        ],
    },
    check=[
        MCQ('Which part of the hard palate do the palatine bones form?', ['The front three-quarters', 'The back quarter', 'The whole palate', 'None of it'], 1,
            'Their horizontal plates form the posterior quarter of the hard palate.', PALATINE),
        MCQ('Which bones join the palatine bones to form the hard palate?', ['The maxillae', 'The vomer', 'The nasal bones', 'The zygomatic bones'], 0,
            'The palatine processes of the maxillae form the rest of the hard palate.', MAXILLA, PALATINE),
        MCQ('Why does a cleft palate make feeding difficult?', ['The tongue is missing', 'The teeth cannot form', 'The jaw cannot open', 'The mouth and nose are connected, so no seal forms'], 3,
            'The gap connects the oral and nasal cavities, so suckling is very difficult.', CLEFT_PALATE),
    ],
)

vomer = lesson(
    id='vomer', bone='vomer', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 6.4',
    oneLine={
        'main': F('A single, triangular bone that forms the lower and back part of the nasal septum (vomer).', VOMER),
        'simpler': F('The vomer is a bone in the middle of your nose, at the lower back.', VOMER),
        'deeper': F('Seen from behind, it forms the whole height of the nasal septum.', VOMER),
    },
    where={
        'facts': [
            F('It lies in the midline, in the lower and back part of the nasal septum.', VOMER),
            F('Above it is the perpendicular plate of the ethmoid; in front is the septal cartilage.', SEPTUM),
            F('It is one of only two unpaired facial bones; the other is the mandible.', FACIAL),
        ],
        'simpler': F('It is in the middle of your nose, at the back and bottom.', VOMER),
        'deeper': F('Looking into the front of the nose, you see only a small part of it.', VOMER),
    },
    features={
        'items': [
            FEAT('Triangular shape', 'A flat, triangular plate in the midline.', VOMER),
            FEAT('Upper edge', 'Lies below the perpendicular plate of the ethmoid.', SEPTUM),
            FEAT('Front edge', 'The septal cartilage fills the gap between it and the perpendicular plate.', SEPTUM),
            FEAT('Back edge', 'Divides the two back openings of the nasal cavity.', VOMER),
        ],
        'simpler': F('It is a flat triangle of bone standing upright in the middle of the nose.', VOMER),
        'deeper': F('In the dry skull, the septal cartilage is missing, leaving a gap in front of it.', SEPTUM),
    },
    formFunction={
        'facts': [
            F('With the ethmoid and the septal cartilage, it divides the nasal cavity into right and left halves.', NASAL_CAV, SEPTUM),
            F('The septal cartilage at its front edge extends into the nose and separates the nostrils.', SEPTUM),
        ],
        'simpler': F('It helps split your nose into two separate airways.', NASAL_CAV, SEPTUM),
    },
    relations={
        'items': [
            REL('bone', 'Ethmoid bone', 'Its perpendicular plate forms the upper part of the septum.', SEPTUM),
            REL('cartilage', 'Septal cartilage', 'Forms the front of the septum, between the vomer and the perpendicular plate.', SEPTUM),
            REL('space', 'Nasal cavity', 'The septum divides it into two halves.', NASAL_CAV),
            REL('bone', 'Sphenoid bone', 'Its upper border meets the body of the sphenoid.', check=NOT_IN),
        ],
        'simpler': F('It forms the nasal septum with part of the ethmoid and a plate of cartilage.', SEPTUM),
    },
    development={
        'facts': [
            membrane('vomer'),
            F('It forms from two thin plates, which are almost completely united by puberty.', check='Not in OpenStax A&P 2e (chapters 6–9, 12–16, 20). Gray’s 1918 (7.2) says so (supporting only).'),
        ],
    },
    variations={
        'facts': [
            F('The nasal septum is often bent to one side (a deviated septum).', check=NOT_IN),
        ],
    },
    clinical={
        'items': [
            CLIN('A septum bent to one side, from development or an injury.', 'The bony and cartilage parts of the septum, including the vomer.',
                 'Breathe freely through the narrower side.', 'The septum divides the nasal cavity, so bending it narrows one side.', NASAL_CAV,
                 check='A deviated septum is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the septum’s role is.'),
            CLIN('A blow to the nose that breaks the septum.', 'The septal cartilage and the vomer.',
                 'Breathe evenly through both sides of the nose.', 'The broken septum shifts into one side of the nasal cavity.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the vomer looks so different from the front and from behind.',
                ['From the front, the perpendicular plate forms the upper septum.', 'Only a small part of the vomer shows below it.',
                 'From behind, looking into the back openings of the nose, the vomer is seen in full.', 'There it forms the whole height of the septum.'], VOMER, SEPTUM),
            TUT('compare', 'Compare the three parts of the nasal septum.',
                ['Perpendicular plate of the ethmoid: the upper part.', 'Vomer: the lower and back parts.',
                 'Septal cartilage: the front, between the two bones.', 'The cartilage also separates the nostrils, and is absent in the dry skull.'], SEPTUM),
            TUT('predict', 'Predict what the nasal septum of a dry skull looks like from the front, and explain why.',
                ['The perpendicular plate is seen as the upper septum.', 'A small part of the vomer shows below.',
                 'There is a gap at the front between them.', 'The septal cartilage that fills it in life is not found in the dry skull.'], SEPTUM),
        ],
    },
    check=[
        MCQ('Which part of the nasal septum does the vomer form?', ['The upper part', 'The lower and back part', 'The front part', 'None of it'], 1,
            'It forms the posterior-inferior part of the nasal septum.', VOMER),
        MCQ('What fills the gap between the vomer and the perpendicular plate at the front?', ['Septal cartilage', 'The inferior nasal concha', 'The palatine bone', 'Air'], 0,
            'The septal cartilage fills the gap.', SEPTUM),
        MCQ('Which are the two unpaired facial bones?', ['Nasal and lacrimal', 'Maxilla and palatine', 'Zygomatic and vomer', 'Vomer and mandible'], 3,
            'The unpaired facial bones are the vomer and the mandible.', FACIAL),
    ],
)

concha = lesson(
    id='inferior-nasal-concha', bone='inferior_nasal_concha_left', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull; 7.5',
    oneLine={
        'main': F('A curved plate of bone projecting into the nasal cavity from its lower side wall (inferior nasal concha).', CONCHA_INF),
        'simpler': F('The inferior nasal concha is a curved shelf of bone inside your nose.', CONCHA_INF),
        'deeper': F('Unlike the other two conchae, it is a separate bone, not part of the ethmoid.', CONCHAE),
    },
    where={
        'facts': [
            F('It projects from the lower part of each side wall of the nasal cavity.', CONCHA_INF),
            F('The middle concha, part of the ethmoid, lies just above it.', NASAL_CAV),
            F('It is paired: one on each side.', CONCHA_INF, FACIAL),
        ],
        'simpler': F('It sticks out from the side wall, low down inside your nose.', CONCHA_INF),
        'deeper': F('The tear drain (nasolacrimal duct) opens into the nasal cavity behind it.', LACRIMAL),
    },
    features={
        'items': [
            FEAT('Curved plate', 'Curves downwards as it projects into the nasal cavity.', CONCHA_INF, CONCHAE),
            FEAT('Size', 'The largest of the three nasal conchae.', CONCHA_INF),
            FEAT('Attached edge', 'Fixed to the lower part of the side wall of the nasal cavity.', CONCHA_INF),
            FEAT('Visible from the front', 'It can easily be seen looking into the front opening of the nasal cavity.', CONCHA_INF),
        ],
        'simpler': F('It is a curved shelf, the biggest of three on each side of the nose.', CONCHA_INF, CONCHAE),
        'deeper': F('The conchae are named for their positions: superior, middle and inferior.', CONCHAE),
    },
    formFunction={
        'facts': [
            F('Its downward curve swirls incoming air, helping to warm and moisten it before it reaches the lungs.', CONCHAE),
            F('Mucus on its lining traps dust, pollen, bacteria and viruses.', CONCHAE),
        ],
        'simpler': F('It stirs the air you breathe, so the air is warmed, moistened and cleaned.', CONCHAE),
    },
    relations={
        'items': [
            REL('bone', 'Middle nasal concha', 'Part of the ethmoid bone, just above it.', NASAL_CAV, CONCHAE),
            REL('bone', 'Ethmoid bone', 'Forms the superior and middle conchae.', CONCHAE),
            REL('duct', 'Nasolacrimal duct', 'Opens into the nasal cavity behind it.', LACRIMAL),
            REL('space', 'Nasal cavity', 'It projects into the lower part of each side.', CONCHA_INF),
        ],
        'simpler': F('It sits below the ethmoid’s conchae, with the tear drain opening behind it.', CONCHAE, LACRIMAL),
    },
    development={
        'facts': [
            F('The inferior concha forms from a cartilage model (endochondral ossification).', DEV_ENDO,
              check='OpenStax 7.5 says the facial bones form from cartilage; that this applies to the inferior nasal concha needs an approved source.'),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('Heavy crying.', 'Nothing is damaged: the tear drain behind the inferior concha is overloaded.',
                 'Keep the nose dry.', 'Extra tears entering the nasal cavity behind the concha also drain forwards.', LACRIMAL),
            CLIN('A cold or an allergy.', 'The lining over the conchae swells.',
                 'Breathe easily through the nose.', 'The swollen lining narrows the air passages around the conchae.', CONCHAE,
                 check='Swelling of the lining narrowing the nasal passages is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the nasal conchae prepare the air you breathe.',
                ['They are curved plates projecting into the nasal cavity.', 'They swirl the incoming air.',
                 'This helps warm and moisten it.', 'Mucus on them traps dust, pollen, bacteria and viruses.'], CONCHAE),
            TUT('compare', 'Compare the inferior nasal concha with the middle and superior conchae.',
                ['The inferior concha is a separate bone; the other two are part of the ethmoid.', 'It is the largest; the superior is the smallest.',
                 'The inferior and middle conchae can be seen from the front.', 'The superior concha is hidden above and behind the middle one.'], CONCHAE),
            TUT('predict', 'Predict what happens to dust you breathe in through your nose.',
                ['The conchae swirl the incoming air.', 'Dust meets the mucus on their lining.',
                 'It is trapped there.', 'So cleaner, warmer, moister air moves on towards the lungs.'], CONCHAE),
        ],
    },
    check=[
        MCQ('Which nasal concha is a separate bone?', ['Superior', 'Middle', 'Inferior', 'None of them'], 2, 'The inferior nasal concha is an independent bone of the skull.', CONCHAE),
        MCQ('Which is the largest nasal concha?', ['Inferior', 'Middle', 'Superior', 'They are the same size'], 0, 'The inferior concha is the largest.', CONCHA_INF),
        MCQ('What do the nasal conchae do to incoming air?', ['Cool and dry it', 'Remove oxygen from it', 'Speed it up', 'Swirl it, so it is warmed and moistened'], 3,
            'They swirl the air, which helps warm and moisturise it.', CONCHAE),
    ],
)

hyoid = lesson(
    id='hyoid', bone='hyoid_bone', topic='skull', source='OpenStax A&P 2e: 7.2 The Skull',
    oneLine={
        'main': F('A small U-shaped bone in the upper neck that touches no other bone (hyoid bone).', HYOID),
        'simpler': F('The hyoid is a small U-shaped bone in your neck, below your jaw.', HYOID),
        'deeper': F('It is the base of the tongue, and it moves when you swallow and speak.', HYOID),
    },
    where={
        'facts': [
            F('It lies in the upper neck, near the level of the lower edge of the mandible.', HYOID),
            F('The tips of the U point backwards.', HYOID),
            F('It is not part of the skull: it does not touch any other bone.', HYOID),
        ],
        'simpler': F('It sits at the top of your neck, just under your jaw.', HYOID),
        'deeper': F('A ligament from the styloid process of the temporal bone helps support it.', TEMP_LAND),
    },
    features={
        'items': [
            FEAT('U shape', 'A small curved bone, open at the back.', HYOID),
            FEAT('Body', 'The front of the U.', check=NOT_IN),
            FEAT('Tips', 'The two ends of the U, pointing backwards.', HYOID),
            FEAT('Muscle attachments', 'Small muscles attach to it from above and from below.', HYOID),
            FEAT('Ligament attachment', 'A ligament from the styloid process of the temporal bone supports it.', TEMP_LAND),
        ],
        'simpler': F('It is a small U of bone, held in place by muscles.', HYOID),
        'deeper': F('It is one of the very few bones that join no other bone.', HYOID),
    },
    formFunction={
        'facts': [
            F('Held only by muscles and a ligament, it can move up, down, forwards and back.', HYOID, TEMP_LAND),
            F('It forms a base for the tongue above and is attached to the larynx below.', HYOID),
            F('Its movements are coordinated with the tongue, larynx and pharynx in swallowing and speaking.', HYOID),
        ],
        'simpler': F('It hangs in the neck on muscles and helps you swallow and talk.', HYOID),
    },
    relations={
        'items': [
            REL('organ', 'Tongue', 'The hyoid is its base.', HYOID),
            REL('organ', 'Larynx', 'Attached below it.', HYOID),
            REL('organ', 'Pharynx', 'Attached behind it.', HYOID),
            REL('bone', 'Styloid process of the temporal bone', 'Gives off a ligament that supports the hyoid.', TEMP_LAND),
            REL('muscles', 'Small muscles of the neck', 'Attach from above and below, moving it up, down, forwards and back.', HYOID),
        ],
        'simpler': F('The tongue sits on it, and the larynx and pharynx are attached to it.', HYOID),
    },
    development={
        'facts': [
            F('It forms from cartilage of the second and third pharyngeal arches.', check=NOT_IN),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('Strong pressure on the front of the neck, as in strangulation.', 'The hyoid bone may break.',
                 'Swallow or speak without pain.', 'The hyoid moves with the tongue, larynx and pharynx in swallowing and speaking.', HYOID,
                 check='A fracture of the hyoid is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); its role in swallowing and speech is.'),
            CLIN('Weakness of the small muscles attached to the hyoid, for example after a stroke.', 'The muscles that move the hyoid.',
                 'Swallow safely: food may enter the airway.', 'Swallowing needs the hyoid to move in step with the larynx and pharynx.', HYOID,
                 check='Swallowing problems after a stroke are not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the hyoid’s role is.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the hyoid can move, although it touches no other bone.',
                ['It is held in position by small muscles that attach from above and below.', 'A ligament from the styloid process also supports it.',
                 'With no joint to another bone, it is free to move.', 'The muscles move it up, down, forwards and back.'], HYOID, TEMP_LAND),
            TUT('compare', 'Compare the hyoid bone with the bones of the skull.',
                ['The 22 skull bones are joined; 21 are united by sutures, and the mandible moves at its joint.', 'The hyoid touches no other bone.',
                 'So it is not part of the skull.', 'It is held in place by muscles and a ligament instead.'], SKULL_22, SUTURE_JOINT, HYOID),
            TUT('predict', 'Place your fingers under your jaw and swallow. Predict what you feel, and explain why.',
                ['The hyoid moves.', 'Muscles attached to it pull it during swallowing.',
                 'It moves in step with the tongue, larynx and pharynx.', 'The larynx, attached below it, moves too.'], HYOID),
        ],
    },
    check=[
        MCQ('Which bone does the hyoid touch?', ['The mandible', 'None', 'The temporal bone', 'The first cervical vertebra'], 1, 'It is an independent bone that does not contact any other bone.', HYOID),
        MCQ('What shape is the hyoid bone?', ['U-shaped', 'S-shaped', 'Triangular', 'Ring-shaped'], 0, 'It is a small U-shaped bone.', HYOID),
        MCQ('What does the hyoid form a base for?', ['The larynx', 'The pharynx', 'The thyroid gland', 'The tongue'], 3,
            'It serves as the base for the tongue above; the larynx and pharynx are attached to it.', HYOID),
    ],
)

write(maxilla, zygomatic, nasal, lacrimal, palatine, vomer, concha, hyoid)
