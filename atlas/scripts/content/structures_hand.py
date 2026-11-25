# Structure lessons, Upper limb: the metacarpal bones and the phalanges of the hand, each as one group lesson (the five
# metacarpals, and the fourteen phalanges, are described together by OpenStax A&P 2e 8.2). Statements OpenStax does
# not confirm carry `check` and show a †. Nothing is marked reviewed.
#   python3 scripts/content/structures_hand.py
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, NOT_IN, lesson, write

META = 's8-2#fs-id1242304'
META_MOB = 's8-2#fs-id1436751'
DIGITS = 's8-2#fs-id2002490'
ENDO_LIMB = 's8-5#fs-id1397163'
SMALL_BONES = 's8-5#fs-id1972676'
HINGE = 's9-4#fs-id2523908'
CONDYLOID = 's9-4#fs-id1434553'
SADDLE = 's9-4#fs-id1837120'
ABDUCTION = 's9-5#fs-id1751608'
OPPOSITION = 's9-5#fs-id1354267'
ARM_ARTERIES = 's20-5#fs-id1595346'
HAND_VEINS = 's20-5#fs-id3239091'
G = lambda term: f'glossary:{term}'
GRAY_META = 'Not in OpenStax A&P 2e (chapters 6–9, 12–16, 20). Gray’s 1918 (8.2) gives two centres for each metacarpal (supporting only).'

metacarpals = lesson(
    id='metacarpals', title='Metacarpal bones', bone='metacarpal_3_left', bones=[f'metacarpal_{n}_left' for n in range(1, 6)], topic='upper-limb',
    source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4; 9.5; 20.5',
    oneLine={
        'main': F('The five long bones of the palm, between the wrist and the fingers (metacarpal bones).', META, G('metacarpal bone')),
        'simpler': F('The metacarpals are the five bones of your palm.', META),
        'deeper': F('They are numbered 1 to 5, starting at the thumb.', META),
    },
    where={
        'facts': [
            F('They lie between the carpal bones of the wrist and the bones of the fingers and thumb.', META),
            F('Each base meets a carpal bone of the second row.', META),
            F('Their lower ends form the knuckles, at the base of the fingers.', META),
        ],
        'simpler': F('They make up your palm, from your wrist to your knuckles.', META),
        'deeper': F('The first metacarpal, at the base of the thumb, is separate from the others.', META_MOB),
    },
    features={
        'items': [
            FEAT('Base', 'The upper end, which meets a carpal bone at a carpometacarpal joint.', META, G('carpometacarpal joint')),
            FEAT('Shaft', 'The long middle part of each bone.', G('metacarpal bone')),
            FEAT('Head', 'The expanded lower end, which forms a knuckle.', META),
            FEAT('First metacarpal', 'Separate from the others, at the base of the thumb; its base forms a saddle joint with the trapezium.', META_MOB, SADDLE),
            FEAT('Second and third metacarpals', 'Firmly anchored, so they do not move.', META_MOB),
            FEAT('Fourth and fifth metacarpals', 'Can move a little forwards and backwards; the fifth moves most.', META_MOB),
        ],
        'simpler': F('Each has a base at the wrist end, a shaft and a head that forms a knuckle.', META, G('metacarpal bone')),
        'deeper': F('Each head meets the base of a proximal phalanx at a metacarpophalangeal joint.', META, G('metacarpophalangeal joint')),
    },
    formFunction={
        'facts': [
            F('The first metacarpal is separate, so the thumb can move freely on its own.', META_MOB),
            F('The second and third are fixed, giving the palm a firm middle.', META_MOB),
            F('The fourth and fifth move forwards in a power grip, pressing the inner hand against the object.', META_MOB),
        ],
        'simpler': F('A free thumb bone, a firm middle and movable outer bones help you grip.', META_MOB),
    },
    relations={
        'items': [
            REL('joints', 'Carpometacarpal joints', 'Between the second row of carpal bones and the bases of the metacarpals.', G('carpometacarpal joint')),
            REL('joint', 'First carpometacarpal joint', 'A saddle joint between the trapezium and the first metacarpal.', SADDLE),
            REL('joints', 'Metacarpophalangeal (knuckle) joints', 'Condyloid joints between the metacarpal heads and the proximal phalanges.', CONDYLOID),
            REL('bones', 'Carpal bones', 'The trapezium carries the first and second, and the trapezoid the second. The capitate carries mainly the third, and the hamate the fourth and fifth.',
                G('trapezium'), G('trapezoid'), G('capitate'), G('hamate')),
            REL('arteries', 'Palmar arches', 'The radial and ulnar arteries join at the wrist to form the palmar arches that supply the hand.', ARM_ARTERIES),
            REL('veins', 'Palmar venous arches', 'The digital veins join in the hand to form the palmar venous arches.', HAND_VEINS),
        ],
        'simpler': F('They join the wrist bones above and the finger bones below.', META),
    },
    development={
        'facts': [
            F('They form by replacing a cartilage model with bone (endochondral ossification).', ENDO_LIMB),
            F('Each has two ossification centres: one for the shaft, and one for the head (in the first, for the base).', check=GRAY_META),
        ],
    },
    variations={
        'facts': [
            F('The first metacarpal ossifies like a phalanx, so some anatomists count the thumb as having three phalanges.', check=GRAY_META),
        ],
    },
    clinical={
        'items': [
            CLIN('A punch that lands on a hard object.', 'The neck of the fifth metacarpal breaks (“boxer’s fracture”).',
                 'Make a fist with a normal knuckle: the little-finger knuckle sinks.', 'The fifth metacarpal is the most mobile of the palm bones and takes the force of a badly aimed punch.', META_MOB,
                 check='The fracture is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the mobility of the fifth metacarpal is.'),
            CLIN('A blow along the bent thumb, as in a punch.', 'The base of the first metacarpal breaks into the saddle joint (Bennett fracture).',
                 'Pinch or touch the thumb to the fingertips without pain.', 'The break enters the saddle joint on which opposition depends.', SADDLE, OPPOSITION,
                 check='The fracture is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20); the saddle joint and opposition are.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the thumb’s metacarpal moves so much more than the others.',
                ['The first metacarpal is separate from the other four.', 'Its base forms a saddle joint with the trapezium, which is biaxial.',
                 'So it moves within the plane of the palm and out in front of it.', 'Flexion with abduction here produces opposition.'], META_MOB, SADDLE, OPPOSITION),
            TUT('compare', 'Compare the movement of the second and third metacarpals with that of the fourth and fifth.',
                ['The second and third are firmly anchored and immobile.', 'The fourth and fifth move a little forwards and backwards.',
                 'The fifth moves most.', 'Their forward movement strengthens the grip of the inner hand.'], META_MOB),
            TUT('predict', 'A man punches a wall and the knuckle of his little finger sinks. Predict the injury and explain it.',
                ['A fracture of the neck of the fifth metacarpal (boxer’s fracture).', 'The head tips towards the palm.',
                 'So the knuckle sinks when he makes a fist.', 'The fifth metacarpal is the most mobile and least protected.'], META_MOB, check=NOT_IN),
        ],
    },
    check=[
        MCQ('Which metacarpal is at the base of the thumb?', ['First', 'Second', 'Third', 'Fifth'], 0, 'The metacarpals are numbered from the thumb: the first is at its base.', META),
        MCQ('Which metacarpals are firmly anchored and do not move?', ['First and second', 'Fourth and fifth', 'Second and third', 'Third and fourth'], 2, 'The second and third are firmly anchored.', META_MOB),
        MCQ('What forms the knuckles?', ['The bases of the metacarpals', 'The second row of carpal bones', 'The proximal phalanges', 'The heads (lower ends) of the metacarpals'], 3,
            'The expanded distal end of each metacarpal forms a knuckle.', META),
    ],
)

PHALANGES = [f'hand_proximal_phalanx_{n}_left' for n in range(1, 6)] + [f'hand_middle_phalanx_{n}_left' for n in range(2, 6)] + [f'hand_distal_phalanx_{n}_left' for n in range(1, 6)]

phalanges = lesson(
    id='hand-phalanges', title='Phalanges of the hand', bone='hand_proximal_phalanx_3_left', bones=PHALANGES, topic='upper-limb',
    source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4; 9.5; 20.5',
    oneLine={
        'main': F('The 14 bones of the fingers and thumb (phalanges).', DIGITS, G('phalanx bone of the hand')),
        'simpler': F('The phalanges are the bones of your fingers and thumb.', DIGITS),
        'deeper': F('The name comes from the Greek “phalanx”, a rectangular block of soldiers.', DIGITS),
    },
    where={
        'facts': [
            F('The thumb (digit 1) has two: a proximal and a distal phalanx.', DIGITS),
            F('Each finger, digits 2 to 5, has three: proximal, middle and distal.', DIGITS),
            F('The proximal phalanges meet the heads of the metacarpals at the knuckles.', META),
        ],
        'simpler': F('There are two in your thumb and three in each finger.', DIGITS),
        'deeper': F('The anatomical name for the thumb is the pollex.', DIGITS, G('pollex')),
    },
    features={
        'items': [
            FEAT('Proximal phalanges', 'The nearest to the palm; each meets a metacarpal head at a knuckle joint.', DIGITS, META),
            FEAT('Middle phalanges', 'Only in the fingers, between the proximal and distal phalanges.', DIGITS),
            FEAT('Distal phalanges', 'The tips of the fingers and thumb.', DIGITS),
            FEAT('Interphalangeal joints', 'The joints between neighbouring phalanges.', DIGITS, G('interphalangeal joint')),
            FEAT('Base, shaft and head', 'Each phalanx has a base nearest the palm, a shaft and a head.', check=NOT_IN),
        ],
        'simpler': F('Each finger has a near, a middle and an end bone; the thumb has no middle one.', DIGITS),
        'deeper': F('So the thumb has one interphalangeal joint, and each finger has two.', DIGITS),
    },
    formFunction={
        'facts': [
            F('Interphalangeal joints are hinge joints: they only bend and straighten.', HINGE),
            F('Knuckle (metacarpophalangeal) joints are condyloid, so the fingers can bend and also spread apart.', CONDYLOID),
            F('Spreading the fingers apart is abduction; bringing them together is adduction.', ABDUCTION),
        ],
        'simpler': F('Knuckle joints bend and spread; the joints along the fingers only bend.', CONDYLOID, HINGE),
    },
    relations={
        'items': [
            REL('joints', 'Metacarpophalangeal (knuckle) joints', 'Condyloid joints between the metacarpal heads and the proximal phalanges.', CONDYLOID, G('metacarpophalangeal joint')),
            REL('joints', 'Interphalangeal joints', 'Hinge joints between neighbouring phalanges.', HINGE, G('interphalangeal joint')),
            REL('bones', 'Metacarpals', 'Meet the proximal phalanges at the knuckles.', META),
            REL('arteries', 'Digital arteries', 'Branch from the palmar arches to supply the fingers.', ARM_ARTERIES),
            REL('veins', 'Digital veins', 'Drain the fingers into the palmar venous arches.', HAND_VEINS),
        ],
        'simpler': F('They hinge on each other and join the palm bones at the knuckles.', HINGE, META),
    },
    development={
        'facts': [
            F('They form by replacing a cartilage model with bone (endochondral ossification).', ENDO_LIMB),
            F('Small bones like these develop only one secondary ossification centre, so each has one growth plate.', SMALL_BONES),
            F('A growth plate is cartilage, less dense than bone, so it looks dark on an X-ray.', SMALL_BONES),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A child’s injured finger has an X-ray.', 'Possibly nothing: each phalanx has a normal growth plate.',
                 'Rely on one dark line alone to diagnose a fracture.', 'Cartilage is less dense than bone, so a normal plate looks dark and can be mistaken for a break.', SMALL_BONES),
            CLIN('A ball strikes the tip of a straight finger.', 'The tendon that straightens the fingertip tears from the distal phalanx, sometimes with a fragment of bone (mallet finger).',
                 'Straighten the tip of the finger.', 'Without its tendon, nothing pulls the distal phalanx straight.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the thumb has one interphalangeal joint, but each finger has two.',
                ['The thumb has two phalanges: proximal and distal.', 'Each finger has three: proximal, middle and distal.',
                 'An interphalangeal joint lies between each pair of neighbouring phalanges.', 'So the thumb has one, and each finger has two.'], DIGITS),
            TUT('compare', 'Compare the knuckle (metacarpophalangeal) joints with the interphalangeal joints.',
                ['Knuckle joints are condyloid: biaxial.', 'They allow bending and straightening, and spreading and closing the fingers.',
                 'Interphalangeal joints are hinge joints: uniaxial.', 'They allow only bending and straightening.'], CONDYLOID, HINGE),
            TUT('predict', 'A cricket ball strikes the tip of a straight finger, and the tip now droops. Predict the injury and explain it.',
                ['Mallet finger.', 'The tendon that straightens the fingertip has torn from the distal phalanx.',
                 'A small piece of bone may come away with it.', 'Nothing now pulls the fingertip straight.'], check=NOT_IN),
        ],
    },
    check=[
        MCQ('How many phalanges are in each hand?', ['5', '10', '14', '19'], 2, 'The thumb has two and each finger three: 14 in all.', DIGITS),
        MCQ('What type of joint is an interphalangeal joint?', ['Condyloid', 'Hinge', 'Saddle', 'Plane'], 1, 'Interphalangeal joints are hinge joints.', HINGE),
        MCQ('Which digit has no middle phalanx?', ['Index finger', 'Middle finger', 'Little finger', 'Thumb'], 3, 'The thumb has only proximal and distal phalanges.', DIGITS),
    ],
)

write(metacarpals, phalanges)
