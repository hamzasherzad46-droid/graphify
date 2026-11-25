# Structure lessons, Upper limb (after the review of 25 November 2026): clavicle, radius, ulna.
# Same standard as the reviewed samples (structures_v1.py). Every statement carries its sources; anything OpenStax
# A&P 2e does not confirm carries `check` and shows a †. Nothing is marked reviewed.
#   python3 scripts/content/structures_upper_limb.py
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, NOT_IN, lesson, write

# OpenStax paragraphs
GIRDLE = 's8-1#fs-id1371880'
GIRDLE_FREE = 's8-1#fs-id1841505'
CLAV = 's8-1#fs-id1192235'
CLAV_REGIONS = 's8-1#fs-id2241809'
CLAV_FX = 's8-1#fs-id1866400'
SCAP_PROJ = 's8-1#fs-id1475196'
AC_INJ = 's8-1#fs-id1200622'
REGIONS = 's8-2#fs-id1415448'
HUM_ART = 's8-2#fs-id2444175'
ULNA = 's8-2#fs-id2080518'
ULNA_SHAFT = 's8-2#fs-id1266017'
CARRYING = 's8-2#fs-id1483561'
RADIUS = 's8-2#fs-id1411842'
RADIOCARPAL = 's8-2#fs-id1882937'
FOOSH = 's8-2#fs-id1989621'
COLLES = 's8-2#fs-id2142217'
DIGITS = 's8-2#fs-id2002490'
ENDO_LIMB = 's8-5#fs-id1397163'
CLAV_DEV = 's8-5#fs-id1375181'
DISC = 's9-4#fs-id1061087'
PIVOT = 's9-4#fs-id1636208'
HINGE = 's9-4#fs-id2523908'
CONDYLOID = 's9-4#fs-id1434553'
SADDLE = 's9-4#fs-id1837120'
PLANE = 's9-4#fs-id1482998'
PRONATED = 's9-5#fs-id1547390'
PRONATION = 's9-5#fs-id1837207'
ROTATION = 's9-5#fs-id1401596'
ELBOW = 's9-6#fs-id1355969'
UCL = 's9-6#fs-id2430675'
ANNULAR = 's9-6#fs-id2602265'
SUBCLAVIAN = 's20-5#fs-id2381708'
RENAMED = 's20-5#fs-id1351620'
ARM_ARTERIES = 's20-5#fs-id1595346'
SUBCLAVIAN_VEIN = 's20-5#fs-id2931123'

clavicle = lesson(
    id='clavicle', bone='clavicle_left', topic='upper-limb',
    source='OpenStax A&P 2e: 8.1 The Pectoral Girdle; 8.5; 9.4; 20.5',
    oneLine={
        'main': F('The S-shaped collarbone at the front of the shoulder, joining the arm to the trunk (clavicle).', GIRDLE),
        'simpler': F('The clavicle is your collarbone.', GIRDLE),
        'deeper': F('It is the only long bone in the body that lies horizontally.', CLAV),
    },
    where={
        'facts': [
            F('It lies at the front of the shoulder, so you can feel its whole length.', GIRDLE),
            F('Its inner (medial) end joins the sternum. Its outer (lateral) end joins the acromion of the scapula.', CLAV_REGIONS),
            F('With the scapula it forms the shoulder (pectoral) girdle.', GIRDLE),
        ],
        'simpler': F('It runs across the top of your chest, from your breastbone out to your shoulder.', GIRDLE, CLAV_REGIONS),
        'deeper': F('Its joint with the sternum is the only bony joint between the upper limb and the axial skeleton.', CLAV_REGIONS),
    },
    features={
        'items': [
            FEAT('Sternal end', 'The triangular inner end. It meets the manubrium of the sternum at the sternoclavicular joint.', CLAV_REGIONS),
            FEAT('Acromial end', 'The outer end. It meets the acromion at the acromioclavicular joint.', CLAV_REGIONS, SCAP_PROJ),
            FEAT('Shaft', 'The curved middle part between the two ends.', CLAV_REGIONS),
            FEAT('Underside of the acromial end', 'The strong coracoclavicular ligament anchors here, tying it to the coracoid process.', AC_INJ),
            FEAT('Near the sternal end', 'The costoclavicular ligament ties it to the first rib below.', CLAV_REGIONS),
        ],
        'simpler': F('It has an inner end, an outer end and a curved shaft between them.', CLAV_REGIONS),
        'deeper': F('The rough areas where muscles attach are more marked in manual workers.', CLAV_REGIONS),
    },
    formFunction={
        'facts': [
            F('Anchored by muscles from above, it acts as a strut that holds the scapula out to the side.', CLAV),
            F('This keeps the shoulder joint away from the trunk, giving the arm the widest range of movement.', CLAV),
            F('It passes forces acting on the upper limb to the sternum and the axial skeleton.', CLAV),
            F('It shields the nerves and blood vessels passing between the trunk and the upper limb.', CLAV),
        ],
        'simpler': F('The clavicle props your shoulder out to the side and passes force from your arm to your chest.', CLAV),
    },
    relations={
        'items': [
            REL('joint', 'Sternoclavicular joint', 'A saddle joint with the manubrium. It lets the clavicle move up, down, forwards and back.', SADDLE, CLAV_REGIONS),
            REL('joint', 'Acromioclavicular joint', 'A plane (gliding) joint with the acromion. Its own ligaments are fairly weak.', PLANE, AC_INJ),
            REL('ligament', 'Coracoclavicular ligament', 'A very strong band to the coracoid process. It is the main support of the acromioclavicular joint.', AC_INJ),
            REL('ligament', 'Costoclavicular ligament', 'Ties the sternal end to the first rib and supports the sternoclavicular joint.', CLAV_REGIONS),
            REL('disc', 'Articular disc', 'A pad of fibrocartilage inside the sternoclavicular joint unites the bones strongly.', DISC),
            REL('artery', 'Subclavian artery', 'Its name means “under the clavicle”. It becomes the axillary artery as it passes into the armpit.', SUBCLAVIAN, RENAMED),
            REL('vein', 'Subclavian vein', 'The axillary vein becomes the subclavian vein as it passes into the thorax.', SUBCLAVIAN_VEIN),
        ],
        'simpler': F('It joins the breastbone and the shoulder blade, and important vessels and nerves pass beneath it.', CLAV_REGIONS, CLAV_FX),
    },
    development={
        'facts': [
            F('It forms directly from membrane (intramembranous ossification), with no cartilage model: the only limb or girdle bone to do so.', CLAV_DEV, ENDO_LIMB),
            F('The clavicle is the first bone in the body to start ossifying, in the fifth week of development.', CLAV_DEV),
            F('Its ossification is not complete until about the age of 25.', CLAV_DEV),
        ],
    },
    variations={
        'facts': [
            F('In females, it tends to be shorter, thinner and less curved.', CLAV_REGIONS),
            F('In males, it is heavier, longer and more curved, with rougher areas where muscles attach.', CLAV_REGIONS),
        ],
    },
    clinical={
        'items': [
            CLIN('A fall onto the outstretched arms, or a strong blow to the side of the shoulder.', 'The clavicle breaks, usually between its middle and outer parts. It is the bone broken most often.',
                 'Hold the arm up: the shoulder drops, and the patient supports the arm with the other hand.',
                 'The strong sternoclavicular joint rarely gives way, so the bone breaks. The weight of the arm then pulls the outer part down.', CLAV_FX),
            CLIN('A complete fracture of the clavicle.', 'The bone only, in most cases. The vessels and nerves beneath it are rarely hurt.',
                 'Move the shoulder without pain, though feeling and blood supply in the arm are usually normal.',
                 'Muscles across the shoulder pull the fragments forwards and inwards, away from the vessels and nerves.', CLAV_FX),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why a fall on the outstretched arm breaks the clavicle rather than dislocating the sternoclavicular joint.',
                ['The sternoclavicular joint is strong and rarely dislocated.', 'Force from the arm passes along the clavicle to the sternum.',
                 'The bone gives way first, usually between its middle and outer parts.', 'This makes the clavicle the bone broken most often.'], CLAV_FX, CLAV),
            TUT('compare', 'Compare how the clavicle and the humerus develop.',
                ['Clavicle: directly from membrane (intramembranous ossification), with no cartilage model.', 'Humerus: a cartilage model replaced by bone (endochondral ossification).',
                 'The clavicle starts in the fifth week. The humerus has a primary centre in its shaft by the twelfth week.', 'The clavicle is not fully ossified until about 25.'], CLAV_DEV, ENDO_LIMB),
            TUT('predict', 'Predict how a patient holds their arm after a complete fracture of the clavicle, and explain why.',
                ['The shoulder and outer fragment drop under the weight of the arm.', 'The patient supports the sagging arm with the other hand.',
                 'Muscles pull the outer fragment forwards and inwards.', 'So the two fragments override each other.'], CLAV_FX),
        ],
    },
    check=[
        MCQ('Which is the only bony joint between the upper limb and the axial skeleton?', ['Acromioclavicular joint', 'Sternoclavicular joint', 'Shoulder (glenohumeral) joint', 'Costoclavicular joint'], 1,
            'The sternoclavicular joint, between the sternal end of the clavicle and the manubrium, is the only one.', CLAV_REGIONS),
        MCQ('How does the clavicle develop?', ['From a cartilage model (endochondral ossification)', 'From two halves that fuse at birth', 'Directly from membrane (intramembranous ossification)', 'From the first rib'], 2,
            'It is the only limb or girdle bone that forms directly from membrane, without a cartilage model.', CLAV_DEV),
        MCQ('Where does the clavicle usually break?', ['Between its middle and outer parts', 'At the sternal end', 'At the acromial end', 'Where the costoclavicular ligament attaches'], 0,
            'Excess force usually breaks it between the middle and lateral parts of the bone.', CLAV_FX),
    ],
)

radius = lesson(
    id='radius', bone='radius_left', topic='upper-limb',
    source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb; 8.5; 9.4; 9.5; 9.6; 20.5',
    oneLine={
        'main': F('The lateral bone of the forearm, on the thumb side (radius).', RADIUS, REGIONS),
        'simpler': F('The radius is the forearm bone on the thumb side.', RADIUS),
        'deeper': F('It turns around the ulna as the palm turns backwards and forwards (pronation and supination).', PRONATION),
    },
    where={
        'facts': [
            F('It runs from the elbow to the wrist, alongside the ulna.', RADIUS, REGIONS),
            F('In the anatomical position it is lateral, on the thumb side; the ulna is medial.', REGIONS, RADIUS),
            F('Its head meets the humerus and ulna at the elbow. Its lower end meets the carpal bones at the wrist.', RADIUS),
        ],
        'simpler': F('It runs from your elbow to your wrist on the thumb side.', RADIUS),
        'deeper': F('When the palm faces backwards, the radius crosses over the ulna and the two form an X.', PRONATED),
    },
    features={
        'items': [
            FEAT('Head', 'A disc at the top. Its hollow meets the capitulum of the humerus; its rim turns against the ulna.', RADIUS),
            FEAT('Neck', 'The narrow part just below the head.', RADIUS),
            FEAT('Radial tuberosity', 'An oval bump below the neck, on the inner side, where a muscle attaches.', RADIUS),
            FEAT('Interosseous border', 'A ridge on the inner side of the shaft. The interosseous membrane attaches along it.', RADIUS),
            FEAT('Ulnar notch', 'A shallow hollow at the lower end that meets the head of the ulna.', RADIUS),
            FEAT('Styloid process', 'A pointed projection at the lower outer end. Ligaments of the wrist joint attach to it.', RADIUS),
            FEAT('Carpal surface', 'The smooth lower end. It meets the scaphoid and lunate at the wrist joint.', RADIUS, RADIOCARPAL),
        ],
        'simpler': F('It has a round head at the elbow and a wide end at the wrist.', RADIUS),
        'deeper': F('Its styloid process reaches further down than the ulna’s. This limits how far the hand bends to the thumb side.', RADIUS),
    },
    formFunction={
        'facts': [
            F('Its disc-shaped head turns within a ring of ligament at a pivot joint.', PIVOT, ANNULAR),
            F('Its shaft is slightly curved, so as the head turns, its lower end swings across the ulna.', PRONATION),
            F('The broad lower end meets two carpal bones directly, so force from a fall on the hand passes into it.', RADIOCARPAL, FOOSH),
        ],
        'simpler': F('Its round head spins. This lets your forearm twist and your palm turn over.', PIVOT, PRONATION),
    },
    relations={
        'items': [
            REL('joint', 'Elbow joint', 'Its head meets the capitulum (humeroradial joint), inside the same capsule as the elbow hinge.', ELBOW, RADIUS),
            REL('joint', 'Proximal radioulnar joint', 'A pivot joint: the head turns in the radial notch of the ulna.', PIVOT, ROTATION),
            REL('joint', 'Distal radioulnar joint', 'The ulnar notch meets the head of the ulna.', RADIUS),
            REL('joint', 'Wrist (radiocarpal) joint', 'A condyloid joint: the lower end meets the scaphoid and lunate.', CONDYLOID, RADIOCARPAL),
            REL('ligament', 'Annular ligament', 'Encircles the head and holds it against the ulna as it turns.', ANNULAR),
            REL('membrane', 'Interosseous membrane', 'A sheet of dense connective tissue joining the shafts of the radius and ulna.', ULNA_SHAFT, RADIUS),
            REL('artery', 'Radial artery', 'Runs down the forearm alongside the radius to the wrist.', ARM_ARTERIES),
        ],
        'simpler': F('It joins the humerus, the ulna and the wrist bones, and the radial artery runs beside it.', RADIUS, ARM_ARTERIES),
    },
    development={
        'facts': [
            F('It forms by replacing a cartilage model with bone (endochondral ossification).', ENDO_LIMB),
            F('Bone first appears in the shaft by about the twelfth week. Centres in the ends appear later, usually after birth.', ENDO_LIMB),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A fall onto the outstretched hand, often in an older person with osteoporosis.', 'The lower end of the radius breaks across, and the lower fragment is pushed backwards and upwards (Colles fracture).',
                 'Use the wrist normally: the forearm has a “dinner fork” bend just above it.', 'The hand is carried backwards with the displaced fragment.', COLLES),
            CLIN('A young child is lifted or swung by the hand.', 'The head of the radius slips partly out of the annular ligament (“pulled elbow”).',
                 'Turn the palm up, and the child holds the arm still.', 'The annular ligament normally holds the head in place as it turns.', ANNULAR,
                 check='“Pulled elbow” (radial head subluxation) in young children is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the radius and ulna move as the forearm turns from palm forwards to palm backwards.',
                ['This movement is pronation.', 'The head of the radius turns at the proximal radioulnar joint, a pivot joint.',
                 'The shaft is slightly curved, so the lower end of the radius crosses over the ulna.', 'The two bones end in an X shape; supination returns them to parallel.'], PRONATION, PRONATED),
            TUT('compare', 'Compare the styloid processes of the radius and the ulna.',
                ['Radius: a pointed projection at its lower outer end.', 'Ulna: a short projection from the back of its head.',
                 'The radial styloid reaches further down.', 'So the hand bends less far to the thumb side than to the little-finger side.'], RADIUS, ULNA_SHAFT),
            TUT('predict', 'A 70-year-old woman falls on her outstretched hand. Predict the fracture and how the wrist looks.',
                ['A Colles fracture: the lower end of the radius breaks across.', 'The lower fragment is pushed backwards and upwards.',
                 'The forearm has a “dinner fork” bend just above the wrist.', 'It is the most common forearm fracture, especially with osteoporosis.'], COLLES),
        ],
    },
    check=[
        MCQ('Which part of the radius meets the capitulum of the humerus?', ['Ulnar notch', 'Head', 'Styloid process', 'Radial tuberosity'], 1,
            'The small hollow on the top of the head meets the capitulum at the elbow.', RADIUS),
        MCQ('At which joint does the head of the radius turn during pronation?', ['Proximal radioulnar joint', 'Wrist (radiocarpal) joint', 'Midcarpal joint', 'Humeroulnar joint'], 0,
            'The proximal radioulnar joint is a pivot joint: the head turns in the radial notch of the ulna.', PIVOT, PRONATION),
        MCQ('What causes the “dinner fork” shape after a Colles fracture?', ['The ulna dislocates forwards', 'The scaphoid breaks', 'The wrist swells', 'The lower fragment of the radius is pushed backwards'], 3,
            'The distal fragment is driven backwards and upwards, carrying the hand with it.', COLLES),
    ],
)

ulna = lesson(
    id='ulna', bone='ulna_left', topic='upper-limb',
    source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb; 8.5; 9.4; 9.5; 9.6; 20.5',
    oneLine={
        'main': F('The medial bone of the forearm, on the little-finger side (ulna).', ULNA, REGIONS),
        'simpler': F('The ulna is the forearm bone on the little-finger side.', ULNA, DIGITS),
        'deeper': F('Its hooked upper end grips the humerus and forms the hinge of the elbow.', ULNA, ELBOW),
    },
    where={
        'facts': [
            F('It runs from the elbow to the wrist, parallel to the radius, on the medial side.', ULNA),
            F('Its upper end forms the bony point of the elbow.', ULNA),
            F('At the wrist it does not touch the carpal bones directly.', RADIOCARPAL),
        ],
        'simpler': F('It runs from the point of your elbow down to the little-finger side of your wrist.', ULNA),
        'deeper': F('A pad of fibrocartilage between the radius and the ulna’s styloid process meets the triquetrum.', RADIOCARPAL),
    },
    features={
        'items': [
            FEAT('Trochlear notch', 'A large C-shaped hollow, like a crescent spanner. It wraps around the trochlea of the humerus.', ULNA),
            FEAT('Olecranon', 'The bony point of the elbow. It fits into the olecranon fossa of the humerus when the elbow straightens.', ULNA, HUM_ART),
            FEAT('Coronoid process', 'The lip below the notch. It fits into the coronoid fossa when the elbow bends fully.', ULNA, HUM_ART),
            FEAT('Radial notch', 'A small smooth area beside the notch, where the head of the radius turns.', ULNA),
            FEAT('Ulnar tuberosity', 'A rough area on the front, just below the coronoid process.', ULNA),
            FEAT('Interosseous border', 'A ridge on the outer side of the shaft. The interosseous membrane attaches along it.', ULNA_SHAFT),
            FEAT('Head and styloid process', 'The small rounded lower end, with a short projection behind it.', ULNA_SHAFT),
        ],
        'simpler': F('Its big hooked top end wraps around the humerus; its small head is at the wrist.', ULNA, ULNA_SHAFT),
        'deeper': F('The ulna’s head is at its lower end. The radius is the other way round: its head is at the elbow.', ULNA_SHAFT, RADIUS),
    },
    formFunction={
        'facts': [
            F('The C-shaped notch wraps around the pulley-shaped trochlea, so the elbow can only bend and straighten.', ULNA, HINGE),
            F('The olecranon and coronoid process fit into hollows of the humerus. So the elbow can straighten and bend fully.', HUM_ART),
            F('In pronation, it is the radius that turns; its lower end crosses over the ulna.', PRONATION),
        ],
        'simpler': F('Its hook makes a strong hinge, so your elbow bends and straightens like a door.', ULNA, HINGE),
    },
    relations={
        'items': [
            REL('joint', 'Elbow (humeroulnar) joint', 'A uniaxial hinge joint between the trochlea and the trochlear notch.', ELBOW, HINGE),
            REL('joint', 'Proximal radioulnar joint', 'The radial notch meets the head of the radius.', ULNA),
            REL('joint', 'Distal radioulnar joint', 'Its head meets the ulnar notch of the radius.', RADIUS),
            REL('ligament', 'Ulnar collateral ligament', 'A triangular band from the medial epicondyle to the inner side of the upper ulna.', UCL),
            REL('membrane', 'Interosseous membrane', 'Joins the shafts of the ulna and radius.', ULNA_SHAFT),
            REL('artery', 'Ulnar artery', 'Runs down the forearm alongside the ulna to the wrist.', ARM_ARTERIES),
            REL('nerve', 'Ulnar nerve', 'Passes behind the medial epicondyle and enters the forearm beside the ulna.', check=NOT_IN),
        ],
        'simpler': F('It hinges with the humerus and joins the radius at both ends.', ELBOW, ULNA, RADIUS),
    },
    development={
        'facts': [
            F('It forms by replacing a cartilage model with bone (endochondral ossification).', ENDO_LIMB),
            F('Bone first appears in the shaft by about the twelfth week. Centres in the ends appear later, usually after birth.', ENDO_LIMB),
        ],
    },
    variations={
        'facts': [
            F('With the elbow straight, the forearm angles 5–15 degrees outwards from the arm (the carrying angle).', CARRYING),
            F('The carrying angle is larger in females, to clear their wider pelvis.', CARRYING),
        ],
    },
    clinical={
        'items': [
            CLIN('Repeated forceful straightening of the forearm, as in baseball pitching.', 'The ulnar collateral ligament on the inner side of the elbow.',
                 'Throw forcefully; the ligament may need reconstruction (“Tommy John surgery”).',
                 'This ligament stops the elbow moving sideways and over-straightening; its front part resists over-straightening most.', UCL),
            CLIN('A fall onto the point of the elbow.', 'The olecranon breaks.', 'Straighten the elbow against resistance.',
                 'The muscle that straightens the elbow (triceps) pulls on the olecranon, drawing the fragment away.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the elbow can only bend and straighten.',
                ['The humeroulnar joint is a hinge joint.', 'The C-shaped trochlear notch wraps around the pulley-shaped trochlea.',
                 'This allows movement around a single axis.', 'Strong collateral ligaments also prevent side-to-side movement.'], HINGE, ULNA, UCL),
            TUT('compare', 'Compare the upper and lower ends of the ulna and the radius.',
                ['Ulna: a large upper end with the trochlear notch, and a small head below.', 'Radius: a small disc-shaped head above, and a broad lower end.',
                 'The lower end of the radius meets two carpal bones.', 'The lower end of the ulna does not touch the carpal bones directly.'], ULNA, ULNA_SHAFT, RADIUS, RADIOCARPAL),
            TUT('predict', 'A baseball pitcher has pain on the inner side of the elbow when throwing. Predict the injured structure and its normal job.',
                ['The ulnar collateral ligament.', 'It runs from the medial epicondyle to the inner side of the upper ulna.',
                 'It stops sideways movement and over-straightening of the elbow.', 'Forceful repeated throwing strains it; it may need reconstruction.'], UCL),
        ],
    },
    check=[
        MCQ('Which part of the ulna forms the bony point of the elbow?', ['Coronoid process', 'Ulnar tuberosity', 'Olecranon', 'Styloid process'], 2,
            'The olecranon forms the bony tip of the elbow.', ULNA),
        MCQ('Which bone does the trochlear notch of the ulna meet?', ['Humerus', 'Radius', 'Scaphoid', 'Lunate'], 0,
            'It wraps around the trochlea of the humerus at the elbow.', ULNA),
        MCQ('What is the carrying angle?', ['The angle of the radial head', 'The bend of the wrist in a Colles fracture', 'The angle between the hand and the forearm', 'The outward angle of the forearm from the arm'], 3,
            'With the elbow straight, the forearm angles 5–15 degrees outwards from the arm.', CARRYING),
    ],
)

write(clavicle, radius, ulna)
