# Structure lessons, Upper limb: the seven carpal bones not in the review set (the scaphoid is in structures_v1.py).
# OpenStax A&P 2e describes each carpal briefly (8.2), and its glossary gives each one's joints; everything else carries
# `check` and shows a †. Ossification ages are not in OpenStax: Gray's 1918 (8.2) is quoted as supporting evidence
# only. Nothing is marked reviewed.
#   python3 scripts/content/structures_carpals.py
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, NOT_IN, REVIEWER, lesson, write

CARPALS = 's8-2#fs-id1977414'
MNEMONIC = 's8-2#fs-id2328943'
RADIOCARPAL = 's8-2#fs-id1882937'
MIDCARPAL = 's8-2#fs-id932152'
RETINACULUM = 's8-2#fs-id2329218'
META = 's8-2#fs-id1242304'
META_MOB = 's8-2#fs-id1436751'
DIGITS = 's8-2#fs-id2002490'
SCAPH_FX = 's8-2#fs-id2637051'
ENDO_LIMB = 's8-5#fs-id1397163'
DISC = 's9-4#fs-id1061087'
CONDYLOID = 's9-4#fs-id1434553'
SADDLE = 's9-4#fs-id1837120'
PLANE = 's9-4#fs-id1482998'
THUMB_MOVES = 's9-5#fs-id2227353'
THUMB_ABD = 's9-5#fs-id1751608'
OPPOSITION = 's9-5#fs-id1354267'
G = lambda bone: f'glossary:{bone}'


def ossifies(when, gray):
    return F(f'Its single ossification centre appears {when}.',
             check=f'Not in OpenStax A&P 2e (chapters 6–9, 12–16, 20). Gray’s 1918 (8.2) gives {gray} (supporting only).')


ENDO = F('It forms by replacing a cartilage model with bone (endochondral ossification), like all limb bones except the clavicle.', ENDO_LIMB)
TUNNEL = CLIN('Overuse of the tendons or a wrist injury makes the contents of the carpal tunnel swell.', 'The nerve in the tunnel, whose walls and floor the carpal bones form.',
              'Use the hand without pain, numbness or weakness (carpal tunnel syndrome).',
              'The bony walls and floor and the tough roof cannot stretch, so swelling presses on the nerve.', RETINACULUM)

lunate = lesson(
    id='lunate', bone='lunate_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4',
    oneLine={
        'main': F('A moon-shaped wrist bone in the middle of the first row of carpal bones (lunate).', CARPALS, G('lunate')),
        'simpler': F('The lunate is a small wrist bone in the middle of your wrist.', CARPALS),
        'deeper': F('With the scaphoid, it is one of only two carpal bones that meet the radius directly.', RADIOCARPAL),
    },
    where={
        'facts': [
            F('It is the second bone of the first (proximal) row, counting from the thumb side.', G('lunate'), CARPALS),
            F('Above it is the radius. Below it are the capitate and hamate.', G('lunate')),
            F('The scaphoid lies beside it on the thumb side, and the triquetrum on the little-finger side.', G('lunate')),
        ],
        'simpler': F('It sits in the middle of the wrist, just below the end of the radius.', G('lunate')),
        'deeper': F('Only three carpal bones take part in the wrist joint: the scaphoid, lunate and triquetrum.', RADIOCARPAL),
    },
    features={
        'items': [
            FEAT('Moon shape', '“Lunate” means moon-shaped.', CARPALS),
            FEAT('Surface for the radius', 'Its upper surface meets the radius directly at the wrist joint.', RADIOCARPAL),
            FEAT('Surfaces for the second row', 'Its lower surface meets the capitate and hamate at the midcarpal joint.', G('lunate'), MIDCARPAL),
            FEAT('Side surfaces', 'It meets the scaphoid on the thumb side and the triquetrum on the other.', G('lunate')),
        ],
        'simpler': F('It is a small curved bone with joints on four sides.', G('lunate')),
        'deeper': F('Ligaments unite it with the other three bones of its row, so they work as one unit.', RADIOCARPAL),
    },
    formFunction={
        'facts': [
            F('Its upper surface meets the radius, so it shares the wrist joint with the scaphoid.', RADIOCARPAL),
            F('Its lower surface takes part in the midcarpal joint. The two joints together make all wrist movements.', MIDCARPAL),
            F('With the other carpal bones it forms the walls and floor of the carpal tunnel.', RETINACULUM),
        ],
        'simpler': F('It is one of the bones the wrist bends on.', MIDCARPAL),
    },
    relations={
        'items': [
            REL('joint', 'Wrist (radiocarpal) joint', 'A condyloid joint: the lunate and scaphoid meet the radius.', CONDYLOID, RADIOCARPAL),
            REL('joint', 'Midcarpal joint', 'Its lower surface meets the capitate and hamate.', MIDCARPAL, G('lunate')),
            REL('bones', 'Scaphoid and triquetrum', 'Its neighbours in the first row, joined to it by ligaments.', G('lunate'), RADIOCARPAL),
            REL('space', 'Carpal tunnel', 'The carpal bones form its walls and floor.', RETINACULUM),
            REL('nerve', 'Median nerve', 'Runs through the carpal tunnel, in front of the lunate.', check=NOT_IN),
        ],
        'simpler': F('It joins the radius above, the second row below and its two neighbours at the sides.', G('lunate')),
    },
    development={'facts': [ENDO, ossifies('at about the fifth year', 'the fifth year')]},
    variations={'facts': []},
    clinical={
        'items': [
            TUNNEL,
            CLIN('A fall onto the outstretched hand with the wrist bent far back.', 'The lunate dislocates forwards, into the carpal tunnel.',
                 'Feel the thumb, index and middle fingers normally.', 'The dislocated bone takes up space in the tunnel and presses on the median nerve.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain which carpal bones form the wrist joint, and how.',
                ['Three carpal bones take part: the scaphoid, lunate and triquetrum.', 'The scaphoid and lunate meet the radius directly.',
                 'The triquetrum meets the articular disc over the ulna.', 'The ulna itself does not touch the carpal bones.'], RADIOCARPAL, REVIEWER),
            TUT('compare', 'Compare the lunate and the scaphoid.',
                ['Both are in the first row, and both meet the radius directly.', 'The scaphoid is boat-shaped and outermost, on the thumb side.',
                 'The lunate is moon-shaped and second from the thumb side.', 'The scaphoid is the carpal bone broken most often.'], CARPALS, RADIOCARPAL, SCAPH_FX),
            TUT('predict', 'Predict the effect of the lunate dislocating forwards into the carpal tunnel.',
                ['It takes up space in the tunnel.', 'It presses on the median nerve.',
                 'Numbness of the thumb, index and middle fingers.', 'Weakness of the small muscles of the thumb.'], check=NOT_IN),
        ],
    },
    check=[
        MCQ('Which bones meet the lower surface of the lunate?', ['Capitate and hamate', 'The radius', 'Trapezium and trapezoid', 'The pisiform'], 0,
            'Its lower surface meets the capitate and hamate at the midcarpal joint.', G('lunate')),
        MCQ('What does “lunate” mean?', ['Boat-shaped', 'Moon-shaped', 'Pea-shaped', 'Hooked'], 1, '“Lunate” means moon-shaped.', CARPALS),
        MCQ('Which two carpal bones meet the radius directly?', ['Triquetrum and pisiform', 'Capitate and hamate', 'Trapezium and trapezoid', 'Scaphoid and lunate'], 3,
            'The scaphoid and lunate meet the radius; the triquetrum meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
    ],
)

triquetrum = lesson(
    id='triquetrum', bone='triquetrum_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4',
    oneLine={
        'main': F('A three-cornered wrist bone, third in the first row of carpal bones (triquetrum).', CARPALS, G('triquetrum')),
        'simpler': F('The triquetrum is a small wrist bone on the little-finger side.', G('triquetrum')),
        'deeper': F('At the wrist joint it meets the articular disc over the ulna, not bone.', RADIOCARPAL, REVIEWER),
    },
    where={
        'facts': [
            F('It is the third bone of the first row, counting from the thumb side.', G('triquetrum')),
            F('The lunate is beside it on the thumb side. The hamate is below it.', G('triquetrum')),
            F('The pisiform sits on its front surface.', CARPALS),
        ],
        'simpler': F('It sits on the little-finger side of the wrist.', G('triquetrum')),
        'deeper': F('It is one of only three carpal bones that take part in the wrist joint.', RADIOCARPAL),
    },
    features={
        'items': [
            FEAT('Three corners', '“Triquetrum” means three-cornered.', CARPALS),
            FEAT('Facet for the pisiform', 'A small surface on its front, where the pisiform sits.', G('triquetrum'), CARPALS),
            FEAT('Surface for the wrist joint', 'Its upper surface meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
            FEAT('Surface for the hamate', 'Its lower surface meets the hamate at the midcarpal joint.', G('triquetrum'), MIDCARPAL),
        ],
        'simpler': F('It is a small three-cornered bone that carries the pisiform on its front.', CARPALS),
        'deeper': F('Ligaments join it to the other bones of its row, so the row works as a unit.', RADIOCARPAL),
    },
    formFunction={
        'facts': [
            F('It meets the fibrocartilage pad that spans the radius and the ulna’s styloid process.', RADIOCARPAL),
            F('It carries the pisiform, which forms the bump at the base of the hand.', CARPALS),
            F('Its joint with the hamate is part of the midcarpal joint, which helps the wrist move.', MIDCARPAL),
        ],
        'simpler': F('It helps the wrist move and holds the pisiform in place.', MIDCARPAL, CARPALS),
    },
    relations={
        'items': [
            REL('joint', 'Wrist (radiocarpal) joint', 'It meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
            REL('disc', 'Articular disc', 'A pad of fibrocartilage between the lower ends of the radius and ulna.', DISC, RADIOCARPAL),
            REL('joint', 'Midcarpal joint', 'Its lower surface meets the hamate.', MIDCARPAL, G('triquetrum')),
            REL('bone', 'Lunate', 'Its neighbour on the thumb side, joined to it by ligaments.', G('triquetrum'), RADIOCARPAL),
            REL('bone', 'Pisiform', 'Sits on its front surface.', CARPALS, G('pisiform')),
        ],
        'simpler': F('It joins the lunate, the hamate and the pisiform, and the disc over the ulna.', G('triquetrum'), RADIOCARPAL),
    },
    development={'facts': [ENDO, ossifies('at about the third year', 'the third year')]},
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A fall onto the outstretched hand.', 'A small chip of bone breaks off the back of the triquetrum: the second most common carpal fracture.',
                 'Use the wrist without pain on the back of the little-finger side.', 'Ligaments and nearby bones strike or pull on its back surface as the wrist is forced backwards.', check=NOT_IN),
            CLIN('A twisting fall on the hand.', 'The articular disc between the ulna and the triquetrum tears.',
                 'Turn the forearm or grip without pain on the little-finger side.', 'The disc unites the lower ends of the radius and ulna, and the triquetrum presses on it.', DISC,
                 check='OpenStax describes the disc; a tear of the disc in a fall is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the triquetrum takes part in the wrist joint without touching the ulna.',
                ['The wrist joint is formed above by the radius and the fibrocartilage pad.', 'The pad spans the radius and the ulna’s styloid process.',
                 'The triquetrum meets this pad (the articular disc over the ulna).', 'The ulna itself does not touch any carpal bone.'], RADIOCARPAL, G('radiocarpal joint'), REVIEWER),
            TUT('compare', 'Compare the triquetrum and the pisiform.',
                ['Both are in the first row, on the little-finger side.', 'The triquetrum is three-cornered and third from the thumb side.',
                 'The pisiform is pea-shaped and sits on the front of the triquetrum.', 'Only the pisiform anchors the flexor retinaculum.'], CARPALS, RETINACULUM),
            TUT('predict', 'Press the bump at the base of the palm, below the little finger. Predict what you feel, and what lies beneath.',
                ['The bump is the pisiform.', 'It projects forwards from the front of the triquetrum.',
                 'The triquetrum lies behind it.', 'The flexor retinaculum attaches to the pisiform.'], CARPALS, RETINACULUM),
        ],
    },
    check=[
        MCQ('Which bone sits on the front of the triquetrum?', ['Hamate', 'Lunate', 'Pisiform', 'Capitate'], 2, 'The small pisiform sits on the front of the triquetrum.', CARPALS),
        MCQ('What does the triquetrum meet at the wrist joint?', ['The articular disc over the ulna', 'The radius directly', 'The head of the ulna directly', 'The trapezium'], 0,
            'It meets the fibrocartilage pad that spans the radius and the ulna’s styloid process.', RADIOCARPAL, REVIEWER),
        MCQ('Which bone lies below (distal to) the triquetrum?', ['Capitate', 'Trapezoid', 'Scaphoid', 'Hamate'], 3, 'Its lower surface meets the hamate.', G('triquetrum')),
    ],
)

pisiform = lesson(
    id='pisiform', bone='pisiform_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5',
    oneLine={
        'main': F('A small pea-shaped bone on the front of the triquetrum, at the base of the hand (pisiform).', CARPALS, G('pisiform')),
        'simpler': F('The pisiform is the small round wrist bone at the base of your palm, on the little-finger side.', CARPALS),
        'deeper': F('It sits on the front of the triquetrum, not in line with the other bones of its row.', CARPALS),
    },
    where={
        'facts': [
            F('It is the fourth bone of the first row, counting from the thumb side.', G('pisiform'), CARPALS),
            F('Unlike the rest of its row, it sits on the front (anterior) surface of the triquetrum.', CARPALS),
            F('From there it projects forwards, forming the bump at the inner base of the hand.', CARPALS),
        ],
        'simpler': F('Feel the bump at the base of your palm, below the little finger: that is the pisiform.', CARPALS),
        'deeper': F('Its only joint is with the triquetrum.', G('pisiform')),
    },
    features={
        'items': [
            FEAT('Pea shape', '“Pisiform” means pea-shaped.', CARPALS),
            FEAT('Facet for the triquetrum', 'A flat surface on its back, where it meets the triquetrum.', G('pisiform')),
            FEAT('Front surface', 'Projects forwards, so you can feel it at the base of the hand.', CARPALS),
            FEAT('Attachment of the flexor retinaculum', 'The inner end of the flexor retinaculum anchors to it.', RETINACULUM),
        ],
        'simpler': F('It is a small round bone that you can feel through the skin.', CARPALS),
        'deeper': F('It lies within the tendon of a forearm muscle (flexor carpi ulnaris), like a kneecap within its tendon.', check=NOT_IN),
    },
    formFunction={
        'facts': [
            F('It anchors the inner end of the flexor retinaculum, which holds the carpal bones in their U shape.', RETINACULUM),
            F('It is the only carpal bone out of line with its row: it sits on the triquetrum.', CARPALS),
        ],
        'simpler': F('The pisiform anchors the band that roofs the carpal tunnel.', RETINACULUM),
    },
    relations={
        'items': [
            REL('bone', 'Triquetrum', 'Its only joint: it sits on the triquetrum’s front surface.', G('pisiform'), CARPALS),
            REL('ligament', 'Flexor retinaculum', 'Attached on the little-finger side to the hamate and pisiform.', RETINACULUM),
            REL('space', 'Carpal tunnel', 'The flexor retinaculum it anchors forms the roof of the tunnel.', RETINACULUM),
            REL('muscle', 'Flexor carpi ulnaris', 'Its tendon attaches to the pisiform.', check=NOT_IN),
            REL('nerve and artery', 'Ulnar nerve and artery', 'Pass beside it into the hand, outside the carpal tunnel.', check=NOT_IN),
        ],
        'simpler': F('It sits on the triquetrum and anchors the roof of the carpal tunnel.', CARPALS, RETINACULUM),
    },
    development={'facts': [ENDO, ossifies('last of the carpal bones, at about the twelfth year', 'about the twelfth year')]},
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A fall onto the heel of the hand on the little-finger side.', 'The pisiform breaks.',
                 'Bend the wrist towards the little-finger side without pain.', 'A forearm muscle tendon attaches to it and pulls on the broken bone.', check=NOT_IN),
            CLIN('Long pressure on the base of the palm, as in long-distance cycling.', 'The ulnar nerve beside the pisiform.',
                 'Spread and close the fingers strongly; the little finger may feel numb.', 'The nerve passes beside the pisiform and the hook of the hamate into the hand.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why you can feel the pisiform when you cannot feel most carpal bones.',
                ['It sits on the front of the triquetrum, not in line with its row.', 'It projects forwards.',
                 'So it forms a bump at the inner base of the hand.', 'Most carpal bones lie deeper, in their two rows.'], CARPALS),
            TUT('compare', 'Compare the pisiform and the hook of the hamate.',
                ['Both are on the little-finger side of the hand.', 'The pisiform is a whole bone sitting on the triquetrum.',
                 'The hook is a bony extension on the front of the hamate.', 'The flexor retinaculum attaches on this side to the hamate and pisiform.'], CARPALS, G('hook of the hamate bone'), RETINACULUM),
            TUT('predict', 'After a long ride, a cyclist’s little finger feels numb. Predict the nerve affected and where.',
                ['The ulnar nerve.', 'It is pressed where it passes beside the pisiform into the hand.',
                 'The pressure comes from leaning on the handlebars.', 'The median nerve, in the carpal tunnel, is spared.'], check=NOT_IN),
        ],
    },
    check=[
        MCQ('What does “pisiform” mean?', ['Hook-shaped', 'Moon-shaped', 'Pea-shaped', 'Three-cornered'], 2, '“Pisiform” means pea-shaped.', CARPALS),
        MCQ('Which bone does the pisiform sit on?', ['Triquetrum', 'Hamate', 'Lunate', 'Ulna'], 0, 'It sits on the front surface of the triquetrum.', CARPALS),
        MCQ('What attaches to the pisiform?', ['The annular ligament', 'The interosseous membrane', 'The coracoclavicular ligament', 'The flexor retinaculum'], 3,
            'The flexor retinaculum attaches medially to the hamate and pisiform.', RETINACULUM),
    ],
)

trapezium = lesson(
    id='trapezium', bone='trapezium_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4; 9.5',
    oneLine={
        'main': F('The wrist bone at the base of the thumb, first in the second row of carpal bones (trapezium).', CARPALS, G('trapezium')),
        'simpler': F('The trapezium is the wrist bone at the base of your thumb.', G('trapezium'), SADDLE),
        'deeper': F('Its saddle joint with the first metacarpal gives humans their opposable thumbs.', SADDLE),
    },
    where={
        'facts': [
            F('It is the first bone of the second (distal) row, counting from the thumb side.', G('trapezium')),
            F('The scaphoid is above it. The trapezoid is beside it, towards the little finger.', G('trapezium')),
            F('Below it are the first and second metacarpals.', G('trapezium')),
        ],
        'simpler': F('It sits at the base of your thumb, just above the thumb’s palm bone.', G('trapezium'), SADDLE),
        'deeper': F('It is one of the four carpal bones the flexor retinaculum attaches to.', RETINACULUM),
    },
    features={
        'items': [
            FEAT('Name', '“Trapezium” means table.', CARPALS),
            FEAT('Saddle surface', 'Its surface for the first metacarpal is saddle-shaped: concave one way and convex the other.', SADDLE),
            FEAT('Surface for the second metacarpal', 'A small surface beside it, for the second metacarpal.', G('trapezium')),
            FEAT('Surfaces for the scaphoid and trapezoid', 'It meets the scaphoid above and the trapezoid beside it.', G('trapezium')),
            FEAT('Front surface', 'With the scaphoid, it anchors the outer end of the flexor retinaculum.', RETINACULUM),
        ],
        'simpler': F('It has a saddle-shaped joint surface for the thumb.', SADDLE),
        'deeper': F('The saddle shape lets the thumb move within the plane of the palm and out in front of it.', SADDLE),
    },
    formFunction={
        'facts': [
            F('The saddle joint is biaxial: the thumb can move in two planes.', SADDLE),
            F('Opposition, touching the thumb to a fingertip, combines flexion and abduction at this joint.', OPPOSITION),
            F('Its front anchors the flexor retinaculum, which roofs the carpal tunnel.', RETINACULUM),
        ],
        'simpler': F('Its saddle shape lets your thumb swing across to touch your fingertips.', SADDLE, OPPOSITION),
    },
    relations={
        'items': [
            REL('joint', 'First carpometacarpal joint', 'A saddle joint with the first metacarpal, at the base of the thumb.', SADDLE),
            REL('bone', 'Second metacarpal', 'Meets a small surface beside the saddle.', G('trapezium')),
            REL('bone', 'Scaphoid', 'Meets it above.', G('trapezium')),
            REL('bone', 'Trapezoid', 'Its neighbour in the second row.', G('trapezium')),
            REL('ligament', 'Flexor retinaculum', 'Attached on the thumb side to the trapezium and scaphoid.', RETINACULUM),
        ],
        'simpler': F('It carries the thumb’s palm bone and anchors the roof of the carpal tunnel.', SADDLE, RETINACULUM),
    },
    development={'facts': [ENDO, ossifies('at about the fifth year', 'the fifth year (as the “greater multangular”)')]},
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('An injury to the joint at the base of the thumb.', 'The first carpometacarpal (saddle) joint.',
                 'Touch the tip of the thumb to the tip of a finger (opposition).', 'Opposition is produced at this joint, by flexion and abduction of the thumb.', OPPOSITION, SADDLE),
            CLIN('Years of pinching and gripping.', 'The joint between the trapezium and the first metacarpal wears (osteoarthritis).',
                 'Pinch, open jars or turn keys without pain at the base of the thumb.', 'This saddle joint takes the force of every pinch and grip.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the trapezium makes the thumb opposable.',
                ['It forms a saddle joint with the first metacarpal.', 'A saddle joint is biaxial: the thumb moves in two planes.',
                 'The first metacarpal is separate from the others, so it moves freely.', 'Flexion with abduction at this joint brings the thumb to the fingertips.'], SADDLE, META_MOB, OPPOSITION),
            TUT('compare', 'Compare the trapezium and the trapezoid.',
                ['Both are in the second row, on the thumb side.', 'The trapezium (“table”) is first; the trapezoid (“resembles a table”) is second.',
                 'The trapezium meets the first and second metacarpals; the trapezoid meets only the second.', 'Only the trapezium anchors the flexor retinaculum.'], CARPALS, G('trapezium'), G('trapezoid'), RETINACULUM),
            TUT('predict', 'Predict which thumb movements are lost if the first carpometacarpal joint is fused.',
                ['Opposition: touching the thumb to a fingertip.', 'Flexion and extension of the thumb at this joint.',
                 'Abduction and adduction of the thumb.', 'The joints further along the thumb still bend.'], OPPOSITION, THUMB_MOVES, THUMB_ABD),
        ],
    },
    check=[
        MCQ('What type of joint lies between the trapezium and the first metacarpal?', ['Hinge', 'Pivot', 'Saddle', 'Plane'], 2, 'The first carpometacarpal joint is a saddle joint.', SADDLE),
        MCQ('Which bones does the trapezium meet below?', ['First and second metacarpals', 'Second metacarpal only', 'Third metacarpal', 'Fourth and fifth metacarpals'], 0,
            'It meets the first and second metacarpals.', G('trapezium')),
        MCQ('Which thumb movement combines flexion and abduction at the first carpometacarpal joint?', ['Reposition', 'Extension', 'Adduction', 'Opposition'], 3,
            'Opposition brings the tip of the thumb to the tip of a finger.', OPPOSITION),
    ],
)

trapezoid = lesson(
    id='trapezoid', bone='trapezoid_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4',
    oneLine={
        'main': F('A small wrist bone at the base of the index finger, second in the second row of carpal bones (trapezoid).', CARPALS, G('trapezoid'), META),
        'simpler': F('The trapezoid is a small wrist bone at the base of your index finger.', G('trapezoid'), META),
        'deeper': F('It meets only one metacarpal, the second, which is firmly anchored and does not move.', G('trapezoid'), META_MOB),
    },
    where={
        'facts': [
            F('It is the second bone of the distal row, counting from the thumb side.', G('trapezoid')),
            F('The trapezium is beside it on the thumb side, and the capitate on the other side.', G('trapezoid')),
            F('The scaphoid is above it, and the second metacarpal below.', G('trapezoid')),
        ],
        'simpler': F('It sits between the base of the thumb and the middle of the wrist.', G('trapezoid')),
        'deeper': F('Ligaments hold it together with the other bones of its row.', MIDCARPAL),
    },
    features={
        'items': [
            FEAT('Name', '“Trapezoid” means “resembles a table”.', CARPALS),
            FEAT('Surface for the second metacarpal', 'Its lower surface, at the carpometacarpal joint.', G('trapezoid'), G('carpometacarpal joint')),
            FEAT('Surface for the scaphoid', 'Its upper surface.', G('trapezoid')),
            FEAT('Side surfaces', 'It meets the trapezium on one side and the capitate on the other.', G('trapezoid')),
        ],
        'simpler': F('It is a small block of bone with joints on four sides.', G('trapezoid')),
        'deeper': F('Its joints with its neighbours are plane (gliding) joints, which allow small sliding movements.', PLANE),
    },
    formFunction={
        'facts': [
            F('It supports the second metacarpal, which is firmly anchored and does not move.', G('trapezoid'), META_MOB),
            F('Its plane joints with the neighbouring carpal bones allow only small sliding movements.', PLANE),
            F('With the other carpal bones it forms the walls and floor of the carpal tunnel.', RETINACULUM),
        ],
        'simpler': F('It gives the index finger’s palm bone a firm base.', G('trapezoid'), META_MOB),
    },
    relations={
        'items': [
            REL('bone', 'Second metacarpal', 'Meets its lower surface at the carpometacarpal joint.', G('trapezoid'), G('carpometacarpal joint')),
            REL('bone', 'Scaphoid', 'Meets it above, at the midcarpal joint.', G('trapezoid'), MIDCARPAL),
            REL('bone', 'Trapezium', 'Its neighbour on the thumb side.', G('trapezoid')),
            REL('bone', 'Capitate', 'Its neighbour on the little-finger side.', G('trapezoid')),
            REL('joints', 'Intercarpal joints', 'Plane joints between neighbouring carpal bones.', PLANE),
        ],
        'simpler': F('It is wedged between the trapezium, the capitate, the scaphoid and the second metacarpal.', G('trapezoid')),
    },
    development={'facts': [ENDO, ossifies('at about the eighth year', 'the eighth year (as the “lesser multangular”)')]},
    variations={'facts': []},
    clinical={
        'items': [
            TUNNEL,
            CLIN('A hard bony lump on the back of the hand, at the base of the index and middle fingers.', 'Extra bone (a carpal boss) where the trapezoid and capitate meet the second and third metacarpals.',
                 'Bend the wrist back fully without pain over the lump.', 'The lump catches the tendons that run over the back of the wrist.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the second metacarpal hardly moves.',
                ['The second and third metacarpals are firmly anchored in place.', 'The second metacarpal meets the trapezoid (and the trapezium).',
                 'The distal carpal bones are held together by ligaments.', 'The fourth and fifth metacarpals, by contrast, move a little.'], META_MOB, G('trapezoid'), G('trapezium'), MIDCARPAL),
            TUT('compare', 'Compare the joints of the trapezoid with those of the trapezium.',
                ['The trapezoid has plane joints with its neighbours, allowing small sliding movements.', 'It meets only the second metacarpal, which is immobile.',
                 'The trapezium forms a saddle joint with the first metacarpal.', 'So the thumb moves widely while the base of the index finger stays fixed.'], PLANE, G('trapezoid'), META_MOB, SADDLE),
            TUT('predict', 'Using the order of the carpal bones, predict where the trapezoid lies.',
                ['The second row runs from the thumb side: trapezium, trapezoid, capitate, hamate.', 'So the trapezoid is second from the thumb side.',
                 'It lies between the trapezium and the capitate.', 'The scaphoid is above it and the second metacarpal below.'], CARPALS, MNEMONIC, G('trapezoid')),
        ],
    },
    check=[
        MCQ('Which metacarpal does the trapezoid meet?', ['First', 'Second', 'Third', 'Fifth'], 1, 'It meets only the second metacarpal.', G('trapezoid')),
        MCQ('What type of joints join the trapezoid to its neighbouring carpal bones?', ['Saddle joints', 'Hinge joints', 'Plane (gliding) joints', 'Pivot joints'], 2,
            'Intercarpal joints are plane joints.', PLANE),
        MCQ('Which bone lies directly above (proximal to) the trapezoid?', ['Lunate', 'Triquetrum', 'Radius', 'Scaphoid'], 3, 'The scaphoid lies above it.', G('trapezoid')),
    ],
)

capitate = lesson(
    id='capitate', bone='capitate_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4',
    oneLine={
        'main': F('The head-shaped bone in the centre of the wrist, third in the second row of carpal bones (capitate).', CARPALS, G('capitate')),
        'simpler': F('The capitate is the wrist bone in the middle of your wrist.', G('capitate')),
        'deeper': F('It mainly meets the third metacarpal, the palm bone of the middle finger.', G('capitate'), META, DIGITS),
    },
    where={
        'facts': [
            F('It is the third bone of the distal row, counting from the thumb side.', G('capitate')),
            F('Above it are the scaphoid and lunate.', G('capitate')),
            F('The trapezoid is on its thumb side and the hamate on the other; below it is mainly the third metacarpal.', G('capitate')),
        ],
        'simpler': F('It sits in the centre of the wrist, in line with your middle finger.', G('capitate'), META),
        'deeper': F('It is the largest of the carpal bones.', check=NOT_IN),
    },
    features={
        'items': [
            FEAT('Name', '“Capitate” means head-shaped.', CARPALS),
            FEAT('Rounded head', 'Its upper end is rounded, fitting a hollow formed by the scaphoid and lunate.', G('capitate'),
                 check='OpenStax gives its name and its joints with the scaphoid and lunate; the rounded head fitting their hollow is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
            FEAT('Surface for the third metacarpal', 'Its lower surface, at the carpometacarpal joint.', G('capitate'), G('carpometacarpal joint')),
            FEAT('Side surfaces', 'It meets the trapezoid on the thumb side and the hamate on the other.', G('capitate')),
        ],
        'simpler': F('It is the central wrist bone, named for its head-like shape.', CARPALS),
        'deeper': F('Two bones meet it above, one on each side, and the metacarpals below, mainly the third.', G('capitate')),
    },
    formFunction={
        'facts': [
            F('Its central position lines it up with the third metacarpal and the middle finger.', G('capitate'), META),
            F('It supports the third metacarpal, which is firmly anchored and does not move.', META_MOB, G('capitate')),
            F('Its upper surface takes part in the midcarpal joint, which helps the wrist move.', MIDCARPAL, G('capitate')),
        ],
        'simpler': F('It sits at the centre of the wrist and gives the middle finger’s palm bone a firm base.', G('capitate'), META_MOB),
    },
    relations={
        'items': [
            REL('joint', 'Midcarpal joint', 'Its upper surface meets the scaphoid and lunate.', MIDCARPAL, G('capitate')),
            REL('bone', 'Third metacarpal', 'Its main joint below, at the carpometacarpal joint.', G('capitate')),
            REL('bone', 'Trapezoid', 'Its neighbour on the thumb side.', G('capitate')),
            REL('bone', 'Hamate', 'Lies beside it on the little-finger side.', G('capitate')),
            REL('space', 'Carpal tunnel', 'The carpal bones form its walls and floor.', RETINACULUM),
        ],
        'simpler': F('It is surrounded by bones: the first row above, its neighbours beside it and the middle finger’s palm bone below.', G('capitate')),
    },
    development={'facts': [ENDO, ossifies('first of the carpal bones, during the first year', 'the first year, before the hamate')]},
    variations={'facts': []},
    clinical={
        'items': [
            TUNNEL,
            CLIN('A violent fall onto the hand with the wrist bent far back.', 'The capitate and the rest of the hand dislocate backwards around the lunate (perilunate dislocation).',
                 'Move the wrist; the fingers may also be numb.', 'The lunate stays attached to the radius while the ligaments around it tear.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the second and third metacarpals give the hand a stable centre.',
                ['They are firmly anchored and immobile.', 'The third meets the central capitate; the second meets the trapezoid.',
                 'The fourth and fifth move a little, for gripping.', 'The first is separate, for free thumb movement.'], META_MOB, G('capitate'), G('trapezoid')),
            TUT('compare', 'Compare the capitate and the hamate.',
                ['Both are in the second row, towards the little-finger side.', 'The capitate is head-shaped and third from the thumb side.',
                 'The hamate is hooked and fourth.', 'The capitate meets mainly the third metacarpal; the hamate meets the fourth and fifth.'], CARPALS, G('capitate'), G('hamate')),
            TUT('predict', 'Predict the effect of a fall that dislocates the capitate backwards around the lunate.',
                ['The lunate stays attached to the radius.', 'The capitate and the hand move backwards behind it.',
                 'The wrist is deformed and cannot be moved.', 'The median nerve may be pressed on.'], check=NOT_IN),
        ],
    },
    check=[
        MCQ('What does “capitate” mean?', ['Hooked', 'Table', 'Head-shaped', 'Pea-shaped'], 2, '“Capitate” means head-shaped.', CARPALS),
        MCQ('Which metacarpal does the capitate mainly meet?', ['Third', 'First', 'Second', 'Fifth'], 0, 'It meets primarily the third metacarpal.', G('capitate')),
        MCQ('Which bones meet the upper surface of the capitate?', ['Radius and ulna', 'Hamate and triquetrum', 'Trapezium and trapezoid', 'Scaphoid and lunate'], 3,
            'Its upper surface meets the scaphoid and lunate.', G('capitate')),
    ],
)

hamate = lesson(
    id='hamate', bone='hamate_left', topic='upper-limb', source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb (and glossary); 8.5; 9.4',
    oneLine={
        'main': F('The hooked wrist bone on the little-finger side, fourth in the second row of carpal bones (hamate).', CARPALS, G('hamate')),
        'simpler': F('The hamate is the wrist bone below your ring and little fingers.', G('hamate'), META),
        'deeper': F('A hook projects from its front, and it anchors the inner end of the flexor retinaculum.', CARPALS, RETINACULUM),
    },
    where={
        'facts': [
            F('It is the fourth bone of the distal row, counting from the thumb side.', G('hamate')),
            F('Above it are the lunate and triquetrum. The capitate is on its thumb side.', G('hamate')),
            F('Below it are the fourth and fifth metacarpals.', G('hamate')),
        ],
        'simpler': F('It sits on the little-finger side of the wrist, below the ring and little fingers.', G('hamate'), META),
        'deeper': F('The metacarpals it carries can move a little forwards and backwards, unlike the second and third.', G('hamate'), META_MOB),
    },
    features={
        'items': [
            FEAT('Name', '“Hamate” means hooked bone.', CARPALS),
            FEAT('Hook of the hamate', 'A prominent bony extension on its front.', CARPALS, G('hook of the hamate bone')),
            FEAT('Surfaces for the fourth and fifth metacarpals', 'Its lower surface, at the carpometacarpal joints.', G('hamate')),
            FEAT('Upper surfaces', 'It meets the lunate and triquetrum above.', G('hamate')),
            FEAT('Side surface', 'It meets the capitate on the thumb side.', G('hamate')),
        ],
        'simpler': F('The hamate is a small bone with a hook on its front.', CARPALS),
        'deeper': F('On the little-finger side, the flexor retinaculum attaches to it and to the pisiform.', RETINACULUM),
    },
    formFunction={
        'facts': [
            F('With the pisiform, it anchors the inner end of the flexor retinaculum.', RETINACULUM),
            F('It carries the fourth and fifth metacarpals, which move a little during a power grip.', G('hamate'), META_MOB),
            F('The forward movement of the fifth metacarpal strengthens the grip of the inner hand.', META_MOB),
        ],
        'simpler': F('It anchors the carpal tunnel’s roof and supports the palm bones of the ring and little fingers.', RETINACULUM, G('hamate')),
    },
    relations={
        'items': [
            REL('joint', 'Midcarpal joint', 'Its upper surfaces meet the lunate and triquetrum.', MIDCARPAL, G('hamate')),
            REL('bones', 'Fourth and fifth metacarpals', 'Meet its lower surface.', G('hamate')),
            REL('bone', 'Capitate', 'Its neighbour on the thumb side.', G('hamate')),
            REL('ligament', 'Flexor retinaculum', 'Attached on the little-finger side to the hamate and pisiform.', RETINACULUM),
            REL('nerve', 'Ulnar nerve', 'Passes beside the hook of the hamate into the hand.', check=NOT_IN),
        ],
        'simpler': F('It joins the first row above, the capitate beside it and the palm bones of the ring and little fingers.', G('hamate')),
    },
    development={'facts': [ENDO, ossifies('during the first year, just after the capitate', 'the first year, after the capitate')]},
    variations={'facts': []},
    clinical={
        'items': [
            TUNNEL,
            CLIN('A golf club, bat or racquet handle strikes the base of the palm.', 'The hook of the hamate breaks.',
                 'Grip firmly without pain at the base of the palm.', 'The handle presses directly on the hook, which projects forwards.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the fourth and fifth metacarpals strengthen a power grip, and the hamate’s part.',
                ['The hamate carries the fourth and fifth metacarpals.', 'These metacarpals can move a little forwards and backwards.',
                 'The fifth moves most.', 'Moving forwards in a grip, they press the inner hand firmly against the object.'], G('hamate'), META_MOB),
            TUT('compare', 'Compare the two ends of the flexor retinaculum.',
                ['On the thumb side it attaches to the trapezium and scaphoid.', 'On the little-finger side it attaches to the hamate and pisiform.',
                 'It spans the top of the U-shaped carpal bones.', 'So it forms the roof of the carpal tunnel.'], RETINACULUM),
            TUT('predict', 'A golfer strikes the ground and has pain at the base of the palm. Predict the fracture and why.',
                ['A fracture of the hook of the hamate.', 'The club handle lies across the base of the palm.',
                 'The hook projects forwards, so the handle presses on it.', 'Gripping is painful.'], check=NOT_IN),
        ],
    },
    check=[
        MCQ('What projects from the front of the hamate?', ['A styloid process', 'A hook', 'A tuberosity', 'A head'], 1, 'The hook of the hamate projects from its front.', CARPALS),
        MCQ('Which metacarpals does the hamate meet?', ['First and second', 'Second and third', 'Fourth and fifth', 'Third only'], 2, 'It meets the fourth and fifth metacarpals.', G('hamate')),
        MCQ('Which carpal bones anchor the inner (medial) end of the flexor retinaculum?', ['Trapezium and scaphoid', 'Lunate and triquetrum', 'Capitate and trapezoid', 'Hamate and pisiform'], 3,
            'Medially, the flexor retinaculum attaches to the hamate and pisiform.', RETINACULUM),
    ],
)

write(lunate, triquetrum, pisiform, trapezium, trapezoid, capitate, hamate)
