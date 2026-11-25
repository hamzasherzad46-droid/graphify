# Authoring script for the first nine-layer structure lessons (review set): humerus, scapula, scaphoid, sphenoid bone,
# mandible. Writes content/structures/<id>.json. Every statement carries its sources: OpenStax A&P 2e paragraphs
# ("<section>#<paragraph id>"), an OpenStax glossary entry ("glossary:<term>"), and/or `check`, saying exactly what
# still needs an approved source. Nothing is marked reviewed.
#   python3 scripts/content/structures_v1.py
import json, os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'content', 'structures')
NOT_IN = 'Not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'
# A fact supplied or corrected by the academic reviewer (review of 25 November 2026).
REVIEWER = 'reviewer:2026-11-25'


def F(t, *src, check=None):
    f = {'t': t, 'src': list(src)}
    if check:
        f['check'] = check
    return f


def FEAT(name, t, *src, check=None):
    return {'name': name, **F(t, *src, check=check)}


def REL(kind, name, t, *src, check=None):
    return {'kind': kind, 'name': name, **F(t, *src, check=check)}


def CLIN(injury, damaged, cannot, why, *src, check=None):
    c = {'injury': injury, 'damaged': damaged, 'cannotDo': cannot, 'why': why, 'src': list(src)}
    if check:
        c['check'] = check
    return c


def TUT(kind, q, model, *src, check=None):
    t = {'kind': kind, 'q': q, 'model': model, 'src': list(src)}
    if check:
        t['check'] = check
    return t


def MCQ(stem, options, answer, why, *src):
    return {'stem': stem, 'options': options, 'answer': answer, 'why': why, 'src': list(src)}


# OpenStax paragraphs
REGIONS = 's8-2#fs-id1415448'
HUM_PROX = 's8-2#fs-id2110691'
HUM_EPI = 's8-2#fs-id1949647'
HUM_ART = 's8-2#fs-id2444175'
HUM_FX = 's8-2#fs-id2030259'
HUM_SUPRA = 's8-2#fs-id2166864'
FOOSH = 's8-2#fs-id1989621'
COLLES = 's8-2#fs-id2142217'
CARPALS = 's8-2#fs-id1977414'
RADIOCARPAL = 's8-2#fs-id1882937'
MIDCARPAL = 's8-2#fs-id932152'
RETINACULUM = 's8-2#fs-id2329218'
SCAPH_FX = 's8-2#fs-id2637051'
GIRDLE = 's8-1#fs-id1371880'
SCAP = 's8-1#fs-id1471081'
SCAP_RIBS = 's8-1#fs-id1968095'
SCAP_LAND = 's8-1#fs-id1725063'
SCAP_PROJ = 's8-1#fs-id1475196'
SCAP_FOSSAE = 's8-1#fs-id1989073'
AC_INJ = 's8-1#fs-id1200622'
CLAV_REGIONS = 's8-1#fs-id2241809'
TMJ = 's9-6#fs-id1380884'
TMJ_MOVE = 's9-6#fs-id2608267'
TMJ_DIS = 's9-6#fs-id1933265'
GH = 's9-6#fs-id2305343'
GH_SHAPE = 's9-6#fs-id1231336'
CUFF = 's9-6#fs-id2429784'
GH_INJ = 's9-6#fs-id1894060'
ENDO_LIMB = 's8-5#fs-id1397163'
INTRA = 's6-4#fs-id1804592'
ENDO = 's6-4#fs-id1966864'
LONG_BONE = 's6-3#fs-id1025647'
FACE_DEV = 's7-5#fs-id1241553'
MAND = 's7-2#fs-id1891273'
MAND_RAMUS = 's7-2#fs-id1370107'
MAND_LAND = 's7-2#fs-id1327677'
ZYG_ARCH = 's7-2#fs-id1285208'
JAW_FOSSAE = 's7-2#fs-id1399296'
TEMPORAL_LIST = 's7-2#fs-id1882965'
HYOID = 's7-2#fs-id1399933'
FACIAL = 's7-2#fs-id1861377'
BRAINCASE = 's7-2#fs-id1351960'
SPH = 's7-2#fs-id1469126'
PTERYGOID = 's7-2#fs-id1355530'
FORAMINA = 's7-2#fs-id2026215'
ORBIT_WALLS = 's7-2#fs-id1887927'
SINUSES = 's7-2#fs-id1882870'
SINUS_ROLE = 's7-2#fs-id1977054'
SUTURES = 's7-2#fs-id1248497'
PTERION_CLIN = 's7-2#fs-id1364278'
CRANIAL_NERVES = 's13-4#fs-id1271098'
CHIASM = 's14-2#fs-id2365874'
ARM_ARTERIES = 's20-5#fs-id1595346'


def lesson(**k):
    base = {'reviewStatus': 'draft'}
    base.update(k)
    return base


humerus = lesson(
    id='humerus', bone='humerus_left', topic='upper-limb',
    source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb; 8.5; 9.6; 20.5',
    changes=[
        'Shoulder dislocation: OpenStax 9.6 says most dislocations of the humerus are downward (inferior). On review, Atlas describes the usual '
        'type: forwards and downwards (anterior dislocation, over 95% of cases).',
        'Supracondylar fracture: OpenStax 8.2 describes a fall onto the tip of the elbow. On review, Atlas gives the commonest type, a fall on an '
        'outstretched hand with the elbow straight (†, awaiting a source).',
    ],
    oneLine={
        'main': F('The long bone of the upper arm, running from the shoulder to the elbow (humerus).', HUM_PROX, REGIONS),
        'simpler': F('The humerus is the bone of your upper arm.', HUM_PROX),
        'deeper': F('It is a long bone: a hollow shaft (diaphysis) with a wider end at each end (epiphysis).', LONG_BONE),
    },
    where={
        'facts': [
            F('It sits in the arm, between the shoulder above and the elbow below.', REGIONS),
            F('Its round head faces inwards (medially) and fits the shallow socket of the shoulder blade.', HUM_PROX),
            F('At the elbow it meets the ulna on the inner side and the radius on the outer side.', HUM_ART),
        ],
        'simpler': F('It runs from your shoulder down to your elbow.', REGIONS),
        'deeper': F('It forms the shoulder (glenohumeral) joint above and part of the elbow joint below.', GH, HUM_ART),
    },
    features={
        'items': [
            FEAT('Head', 'The large, smooth, round top. It forms the shoulder joint with the glenoid cavity of the scapula.', HUM_PROX),
            FEAT('Anatomical neck', 'The edge of the smooth head. It marks where the joint surface ends.', HUM_PROX),
            FEAT('Greater and lesser tubercles', 'Two bumps near the top. The rotator cuff muscles attach to them.', HUM_PROX, CUFF),
            FEAT('Intertubercular (bicipital) groove', 'The groove between the tubercles. A tendon of biceps brachii runs in it.', HUM_PROX),
            FEAT('Surgical neck', 'Where the wide top narrows into the shaft. It is a common site of fracture.', HUM_PROX),
            FEAT('Deltoid tuberosity', 'A rough V-shaped area halfway down the outer shaft. The deltoid muscle attaches here.', HUM_PROX),
            FEAT('Medial and lateral epicondyles', 'Bony points either side of the elbow. Forearm muscles start from them.', HUM_EPI),
            FEAT('Trochlea and capitulum', 'The pulley-shaped trochlea meets the ulna. The knob-like capitulum meets the radius.', HUM_ART),
            FEAT('Olecranon fossa', 'A hollow at the back. It takes the tip of the ulna when the elbow straightens.', HUM_ART),
        ],
        'simpler': F('Its top end makes the shoulder joint and its bottom end makes the elbow joint.', HUM_PROX, HUM_ART),
        'deeper': F('The bone usually breaks at the surgical neck, not the anatomical neck.', HUM_PROX, HUM_FX),
    },
    formFunction={
        'facts': [
            F('The big round head sits in a socket about a third of its size. This gives the shoulder its huge range of movement.', GH_SHAPE, GH),
            F('The price is stability: the shoulder relies on muscles, not bone, to hold the head in place.', GH, CUFF),
            F('The medial epicondyle is larger than the lateral one. The strong gripping muscles of the forearm pull on it.', HUM_EPI),
            F('Hollows above the elbow surfaces make room for the forearm bones. So the elbow can bend and straighten fully.', HUM_ART),
        ],
        'simpler': F('Its shape lets the shoulder move freely and the elbow bend and straighten fully.', GH, HUM_ART),
    },
    relations={
        'items': [
            REL('muscle', 'Rotator cuff', 'Supraspinatus, infraspinatus, teres minor and subscapularis attach to the tubercles. They hold the head in its socket.', CUFF),
            REL('muscle', 'Deltoid', 'Attaches to the deltoid tuberosity on the outer shaft.', HUM_PROX),
            REL('muscle', 'Biceps brachii', 'One of its tendons runs in the intertubercular groove.', HUM_PROX),
            REL('artery', 'Humeral circumflex arteries', 'Branches of the axillary artery that supply the area near the head.', ARM_ARTERIES),
            REL('artery', 'Brachial artery', 'Runs down the arm and splits near the elbow into the radial and ulnar arteries.', ARM_ARTERIES),
            REL('nerves', 'Four major nerves', 'Four major nerves of the upper limb lie close to the humerus. Fractures can damage them.', HUM_SUPRA),
            REL('nerve', 'Axillary nerve', 'Winds around the surgical neck.', check=NOT_IN),
            REL('nerve', 'Radial nerve', 'Lies in the radial (spiral) groove on the back of the shaft.', check=NOT_IN),
            REL('nerve', 'Ulnar nerve', 'Passes behind the medial epicondyle.', check=NOT_IN),
        ],
        'simpler': F('Muscles that move the shoulder attach near the top. Important nerves and arteries run close to the bone.', CUFF, HUM_SUPRA),
    },
    development={
        'facts': [
            F('It forms by replacing a cartilage model with bone (endochondral ossification), like all limb bones except the clavicle.', ENDO_LIMB),
            F('Bone first appears in the shaft by about the twelfth week. Centres in the ends appear later, usually after birth.', ENDO_LIMB),
            F('Growth plates between the shaft and ends let the bone lengthen. They close at adult size.', ENDO_LIMB),
        ],
    },
    variations={
        'facts': [
            F('A few people have a small hook of bone above the medial epicondyle (supracondylar process). It can press on the median nerve.', check=NOT_IN),
        ],
    },
    clinical={
        'items': [
            CLIN('A fall onto the hand or elbow breaks the bone across the surgical neck.', 'The surgical neck; the shaft can be driven into the head (impacted fracture).',
                 'Move the shoulder without pain.', 'The narrow neck is where the wide top meets the shaft, so force concentrates there.', HUM_FX, HUM_PROX),
            CLIN('A fracture of the middle of the shaft.', 'The radial nerve in the radial groove.', 'Lift the wrist and fingers (wrist drop).',
                 'The radial nerve supplies the muscles on the back of the forearm that extend the wrist and fingers.', check=NOT_IN),
            CLIN('A child falls on an outstretched hand with the elbow straight (the commonest type). The bone breaks just above the epicondyles (supracondylar fracture).',
                 'The artery to the forearm (brachial artery), squeezed by swelling.',
                 'Keep the forearm muscles healthy: without blood they can quickly be damaged for good.', 'The brachial artery runs down to the elbow right beside the broken bone.', HUM_SUPRA, ARM_ARTERIES, REVIEWER,
                 check='Mechanism: OpenStax 8.2 describes a fall onto the tip of the elbow. The reviewer gives the commonest type, a fall on an outstretched hand with the elbow straight; this needs an approved source.'),
            CLIN('A fall onto the hand or elbow with the arm raised fully out to the side.',
                 'The shoulder joint: the head of the humerus usually dislocates forwards and downwards (anterior dislocation, over 95% of cases).',
                 'Move the shoulder.', 'The underside of the joint has the least support. The head is forced out below it and comes to rest in front.', GH_INJ, REVIEWER),
        ],
    },
    tutorial={
        'items': [
            TUT('predict', 'Predict the deficit if the radial nerve is damaged in the radial (spiral) groove, and explain why.',
                ['Wrist drop: the patient cannot lift (extend) the wrist.', 'The fingers cannot be straightened at the knuckles.',
                 'The radial nerve supplies the extensor muscles on the back of the forearm.', 'Triceps is usually spared: its branches leave the nerve above the groove.',
                 'Numbness over the back of the hand near the thumb.'], check=NOT_IN),
            TUT('explain', 'Explain why the shoulder usually dislocates forwards and downwards (anterior dislocation).',
                ['The glenoid cavity is small and shallow: about a third of the size of the head.', 'The underside of the joint has the least support.',
                 'Force on a fully raised arm drives the head out through the weak underside.', 'It comes to rest forwards and downwards: anterior dislocation, over 95% of cases.'], GH_SHAPE, GH_INJ, REVIEWER),
            TUT('compare', 'Compare the anatomical neck and the surgical neck of the humerus.',
                ['Anatomical neck: the edge of the smooth joint surface of the head.', 'Surgical neck: where the wide top joins the narrow shaft.',
                 'The surgical neck is a common fracture site.', 'Fractures there can be impacted, with the shaft driven into the head.'], HUM_PROX, HUM_FX),
        ],
    },
    check=[
        MCQ('Which part of the humerus meets the radius at the elbow?', ['Capitulum', 'Trochlea', 'Olecranon fossa', 'Medial epicondyle'], 0,
            'The knob-like capitulum meets the radius; the pulley-shaped trochlea meets the ulna.', HUM_ART),
        MCQ('Where does the deltoid muscle attach to the humerus?', ['Greater tubercle', 'Intertubercular groove', 'Deltoid tuberosity', 'Lateral epicondyle'], 2,
            'The deltoid tuberosity is the rough V-shaped area halfway down the outer shaft.', HUM_PROX),
        MCQ('Why is the medial epicondyle larger than the lateral epicondyle?', ['It bears the weight of the forearm', 'The strong gripping muscles of the forearm pull on it', 'It forms the elbow joint with the ulna', 'It protects the brachial artery'], 1,
            'The powerful gripping muscles of the front of the forearm start from it, so it is larger and stronger.', HUM_EPI),
    ],
)

scapula = lesson(
    id='scapula', bone='scapula_left', topic='upper-limb',
    source='OpenStax A&P 2e: 8.1 The Pectoral Girdle; 8.5; 9.6',
    oneLine={
        'main': F('The flat, triangular shoulder blade at the back of the shoulder (scapula).', SCAP),
        'simpler': F('The scapula is your shoulder blade.', SCAP),
        'deeper': F('With the clavicle it forms the shoulder (pectoral) girdle, which anchors the arm to the trunk.', GIRDLE, SCAP_RIBS),
    },
    where={
        'facts': [
            F('It lies at the back of the shoulder.', SCAP),
            F('Muscles lie in front of it and behind it, so it does not touch the ribs.', SCAP_RIBS),
            F('Outwards, it meets the humerus at the shoulder joint and the clavicle at the tip of the shoulder.', SCAP, SCAP_PROJ),
        ],
        'simpler': F('It sits on your upper back, behind your shoulder.', SCAP),
        'deeper': F('It has no joint with the ribs. Muscles cover it on both sides.', SCAP_RIBS),
    },
    features={
        'items': [
            FEAT('Glenoid cavity', 'The shallow socket for the head of the humerus.', SCAP_LAND),
            FEAT('Spine', 'The ridge across the back. With the acromion and clavicle it makes a V-shaped line for muscles.', SCAP_PROJ),
            FEAT('Acromion', 'The flat outer end of the spine. It is the bony tip of the shoulder and meets the clavicle.', SCAP_PROJ),
            FEAT('Coracoid process', 'A hook at the front shaped like a crow’s beak. It anchors chest and arm muscles and a strong ligament.', SCAP_PROJ),
            FEAT('Supraspinous, infraspinous and subscapular fossae', 'Broad hollows. They give large areas for muscles that move the arm.', SCAP_FOSSAE),
            FEAT('Inferior angle', 'The lowest corner. Several powerful muscles of the shoulder and arm attach here.', SCAP_LAND),
            FEAT('Supraglenoid and infraglenoid tubercles', 'Small bumps above and below the socket, for arm muscles.', SCAP_LAND),
            FEAT('Suprascapular notch', 'A notch in the top border. The suprascapular nerve passes through it.', SCAP_LAND,
                 check='OpenStax gives the notch’s position; the nerve passing through it is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
        ],
        'simpler': F('It has a shallow socket for the arm bone, a ridge across the back and two hooks at the top.', SCAP_LAND, SCAP_PROJ),
        'deeper': F('The spine, acromion and clavicle form a V-shaped line where neck and back muscles attach.', SCAP_PROJ),
    },
    formFunction={
        'facts': [
            F('Its socket is shallow, so the arm can move very widely. The cost is a less stable joint.', GH, GH_SHAPE),
            F('A small rim of fibrocartilage (glenoid labrum) deepens the socket slightly.', GH_SHAPE),
            F('Its broad hollows and ridges give big areas for the muscles that move and steady the arm.', SCAP_FOSSAE, SCAP_PROJ),
            F('It is not joined to the ribs by bone. It moves with the clavicle as one unit.', SCAP_RIBS, SCAP),
        ],
        'simpler': F('Its shallow socket lets your arm move freely, and its wide surfaces hold strong muscles.', GH, SCAP_FOSSAE),
    },
    relations={
        'items': [
            REL('muscle', 'Rotator cuff', 'Supraspinatus, infraspinatus, teres minor and subscapularis start on the scapula and attach to the humerus.', CUFF),
            REL('joint', 'Shoulder (glenohumeral) joint', 'Ball-and-socket joint between the glenoid cavity and the head of the humerus.', GH),
            REL('joint', 'Acromioclavicular joint', 'Where the acromion meets the clavicle. Its own ligaments are fairly weak.', AC_INJ),
            REL('ligament', 'Coracoclavicular ligament', 'A very strong band from the coracoid to the clavicle. It gives the acromioclavicular joint its main support.', AC_INJ),
            REL('bursa', 'Subacromial bursa', 'A fluid sac that stops the rotator cuff tendons rubbing on the scapula.', CUFF),
            REL('nerve', 'Long thoracic nerve', 'Supplies serratus anterior, which holds the scapula against the chest wall.', check=NOT_IN),
        ],
        'simpler': F('The muscles that hold the shoulder joint together start on the scapula.', CUFF),
    },
    development={
        'facts': [
            F('It forms by replacing a cartilage model with bone (endochondral ossification), like all girdle bones except the clavicle.', ENDO_LIMB),
        ],
    },
    variations={
        'facts': [
            F('In some adults part of the acromion never fuses to the rest (os acromiale). It can be mistaken for a fracture.', check=NOT_IN),
        ],
    },
    clinical={
        'items': [
            CLIN('A strong blow to the outer shoulder, such as a player driven into the boards.', 'The acromioclavicular and coracoclavicular ligaments tear (a “shoulder separation”).',
                 'Hold the shoulder up: it droops.', 'The scapula separates from the clavicle and the weight of the arm pulls it down.', AC_INJ),
            CLIN('Repeated use with the arm raised out to the side, as in throwing, swimming or racquet sports.', 'The rotator cuff tendons, bursae or glenoid labrum.',
                 'Raise and use the arm without pain.', 'These tendons and the bursae become inflamed or torn with repeated use in raising the arm.', GH_INJ),
            CLIN('Injury to the long thoracic nerve.', 'Serratus anterior.', 'Push against a wall without the scapula sticking out (“winging”).',
                 'Serratus anterior holds the scapula flat against the chest wall.', check=NOT_IN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the shape of the scapula trades stability for mobility at the shoulder.',
                ['The glenoid cavity is small and shallow: about a third of the size of the humeral head.', 'The joint capsule is thin and loose.',
                 'The glenoid labrum deepens the socket only slightly.', 'The rotator cuff muscles give the main support, acting as “dynamic ligaments”.'], GH_SHAPE, CUFF),
            TUT('predict', 'A rugby player lands on the point of the shoulder. Predict the injury and what you would see.',
                ['Dislocation of the acromioclavicular joint (shoulder separation).', 'Both the acromioclavicular and coracoclavicular ligaments rupture.',
                 'The acromion is forced under the end of the clavicle.', 'The shoulder droops as the weight of the arm pulls the scapula down.'], AC_INJ),
            TUT('compare', 'Compare the coracoid process and the acromion.',
                ['Coracoid: a hook at the front that curves forwards and outwards.', 'It anchors chest and arm muscles and the coracoclavicular ligament.',
                 'Acromion: the flat outer end of the spine of the scapula.', 'It forms the tip of the shoulder and meets the clavicle.'], SCAP_PROJ, AC_INJ),
        ],
    },
    check=[
        MCQ('Which part of the scapula forms the bony tip of the shoulder?', ['Coracoid process', 'Acromion', 'Glenoid cavity', 'Inferior angle'], 1,
            'The acromion is the flat outer end of the spine of the scapula and forms the tip of the shoulder.', SCAP_PROJ),
        MCQ('Which ligament gives the acromioclavicular joint its main support?', ['Coracohumeral ligament', 'Glenohumeral ligaments', 'Coracoclavicular ligament', 'Costoclavicular ligament'], 2,
            'The very strong coracoclavicular ligament anchors the coracoid process to the underside of the clavicle.', AC_INJ),
        MCQ('Why does the scapula not touch the ribs?', ['It is held away by the clavicle alone', 'A layer of cartilage separates them', 'It sits above the level of the ribs', 'Muscles lie both in front of it and behind it'], 3,
            'Muscles cover it on both sides, so it does not articulate with the ribs of the thoracic cage.', SCAP_RIBS),
    ],
)

scaphoid = lesson(
    id='scaphoid', bone='scaphoid_left', topic='upper-limb',
    source='OpenStax A&P 2e: 8.2 Bones of the Upper Limb; 8.5',
    changes=['Wrist joint: worded on review as “the scaphoid and lunate meet the radius; the triquetrum meets the articular disc over the ulna”, as OpenStax 8.2 describes.'],
    oneLine={
        'main': F('A small boat-shaped wrist bone on the thumb side of the first row of carpal bones (scaphoid).', CARPALS),
        'simpler': F('The scaphoid is a small wrist bone at the base of the thumb.', CARPALS),
        'deeper': F('The scaphoid and lunate meet the radius at the wrist joint; the triquetrum meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
    },
    where={
        'facts': [
            F('It is the outermost bone of the first (proximal) row of carpal bones, on the thumb side.', CARPALS),
            F('Above it is the radius. Beside it, on the inner side, is the lunate.', RADIOCARPAL, CARPALS),
            F('Below it are the trapezium, trapezoid and capitate of the second row.', 'glossary:scaphoid'),
        ],
        'simpler': F('It sits in your wrist, just below the end of the forearm, on the thumb side.', CARPALS, RADIOCARPAL),
        'deeper': F('With the lunate it meets the radius directly. The triquetrum, beside them, meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
    },
    features={
        'items': [
            FEAT('Boat shape', '“Scaphoid” means boat-shaped.', CARPALS),
            FEAT('Surface for the radius', 'It meets the end of the radius directly at the wrist joint.', RADIOCARPAL),
            FEAT('Front (palmar) surface', 'It anchors the flexor retinaculum, the band that roofs the carpal tunnel.', RETINACULUM),
            FEAT('Waist', 'The narrow middle part. Most fractures happen here.', check=NOT_IN),
        ],
        'simpler': F('It is small and boat-shaped, and it sits right against the end of the radius.', CARPALS, RADIOCARPAL),
        'deeper': F('With the other carpal bones it forms the walls and floor of the carpal tunnel.', RETINACULUM),
    },
    formFunction={
        'facts': [
            F('It sits on the thumb side and meets the radius directly. So a fall on the outstretched hand drives force through it.', RADIOCARPAL, FOOSH),
            F('At the wrist (radiocarpal) joint, the scaphoid and lunate meet the radius. The triquetrum meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
            F('With the second row it forms the midcarpal joint. These two joints make all the movements of the wrist.', MIDCARPAL),
        ],
        'simpler': F('It helps the wrist bend and passes force from the hand to the forearm.', MIDCARPAL, FOOSH),
    },
    relations={
        'items': [
            REL('joint', 'Wrist (radiocarpal) joint', 'The scaphoid and lunate meet the radius here; the triquetrum meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
            REL('joint', 'Midcarpal joint', 'The joint between the first and second rows of carpal bones.', MIDCARPAL),
            REL('ligament', 'Flexor retinaculum', 'Attached on the thumb side to the trapezium and scaphoid.', RETINACULUM),
            REL('artery', 'Radial artery', 'Its branches enter mainly at the far (distal) end of the scaphoid.', ARM_ARTERIES,
                check='OpenStax traces the radial artery to the wrist; where its branches enter the scaphoid is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
            REL('space', 'Anatomical snuffbox', 'It lies in the floor of this hollow at the base of the thumb.', check=NOT_IN),
        ],
        'simpler': F('It forms joints with the forearm and the other wrist bones.', RADIOCARPAL, MIDCARPAL),
    },
    development={
        'facts': [
            F('It forms by replacing a cartilage model with bone (endochondral ossification), like all limb bones except the clavicle.', ENDO_LIMB),
            F('Its ossification centre appears in early childhood, at about five years.', check=NOT_IN),
        ],
    },
    variations={'facts': []},
    clinical={
        'items': [
            CLIN('A fall onto the outstretched hand.', 'The scaphoid: the carpal bone fractured most often.',
                 'Use the wrist without deep pain on the thumb side.', 'Force passes from the hand to the radius through the scaphoid.', SCAPH_FX, FOOSH, RADIOCARPAL),
            CLIN('A scaphoid fracture is missed because the first X-ray looks normal.', 'The bone itself, which has a poor blood supply.',
                 'Heal quickly: part of the bone can die (necrosis), leading later to arthritis of the wrist.', 'With little blood reaching it, the broken bone heals slowly.', SCAPH_FX),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why a scaphoid fracture can be missed, and why that matters.',
                ['Deep pain at the outer wrist can be taken for a sprain.', 'The fracture may not show on an X-ray until weeks later, once swelling settles.',
                 'Its blood supply is poor, so it heals slowly.', 'Untreated, part of the bone can die, leading to arthritis of the wrist.'], SCAPH_FX),
            TUT('predict', 'Predict which part of the scaphoid dies after a fracture across its waist, and explain why.',
                ['The near (proximal) part.', 'Blood vessels enter mainly at the far (distal) end.',
                 'A break across the waist cuts the near part off from its supply.', 'Without blood, it dies (avascular necrosis).'], check=NOT_IN),
            TUT('compare', 'Compare a scaphoid fracture with a Colles fracture after a fall on the outstretched hand.',
                ['Both follow a fall onto the outstretched hand.', 'Scaphoid: deep pain at the outer wrist; may not show on the first X-ray.',
                 'Colles: the end of the radius breaks and is pushed backwards and upwards.', 'Colles gives a “dinner fork” bend just above the wrist.'], SCAPH_FX, COLLES),
        ],
    },
    check=[
        MCQ('Which carpal bone is fractured most often?', ['Lunate', 'Scaphoid', 'Hamate', 'Trapezium'], 1, 'The scaphoid is the most commonly fractured carpal bone.', SCAPH_FX),
        MCQ('Which forearm bone does the scaphoid meet at the wrist joint?', ['Radius', 'Ulna', 'Both', 'Neither'], 0,
            'The scaphoid and lunate meet the radius at the wrist joint; the triquetrum meets the articular disc over the ulna.', RADIOCARPAL, REVIEWER),
        MCQ('Why can a scaphoid fracture lead to death of part of the bone?', ['It is crushed by the radius', 'It is pulled apart by tendons', 'It is too small to hold a cast', 'Its blood supply is poor'], 3,
            'With a poor blood supply it heals slowly, and part of it can die (necrosis).', SCAPH_FX),
    ],
)

sphenoid = lesson(
    id='sphenoid', bone='sphenoid_bone', topic='skull',
    source='OpenStax A&P 2e: 7.2 The Skull; 6.4; 14.2',
    changes=['Superior orbital fissure: OpenStax 7.2 places it under the lesser wing. On review, Atlas says it lies between the lesser and greater wings.'],
    oneLine={
        'main': F('A single, complex bone in the centre of the skull base that joins almost every other skull bone (sphenoid bone).', SPH),
        'simpler': F('The sphenoid is a winged bone in the middle of the floor of the skull.', SPH),
        'deeper': F('It is one of the eight bones of the brain case.', BRAINCASE),
    },
    where={
        'facts': [
            F('It forms much of the floor of the middle of the skull base.', SPH),
            F('Its outer parts reach the sides of the skull, just in front of the temporal bone.', SPH),
            F('Behind each eye, it forms the back wall of the eye socket (orbit).', ORBIT_WALLS),
        ],
        'simpler': F('The sphenoid sits deep in the middle of your head, behind your eyes.', SPH, ORBIT_WALLS),
        'deeper': F('Because it joins with almost every other bone of the skull, it is called a “keystone” bone.', SPH),
    },
    features={
        'items': [
            FEAT('Lesser wings', 'Form the ridge between the front and middle hollows (fossae) of the skull floor.', SPH),
            FEAT('Greater wings', 'Form the front of the middle fossa and part of the side of the skull.', SPH),
            FEAT('Sella turcica', 'A saddle-shaped seat in the midline. Its hollow (hypophyseal fossa) holds the pituitary gland.', SPH),
            FEAT('Optic canal', 'Beside the sella turcica. It carries the optic nerve from the eye to the brain.', 'glossary:optic canal', 's7-2#fs-id2026215'),
            FEAT('Superior orbital fissure', 'A slit between the lesser and greater wings of the sphenoid, into the back of the orbit. It carries nerves to the eye muscles and the forehead.', FORAMINA, REVIEWER),
            FEAT('Foramen rotundum, foramen ovale and foramen spinosum', 'Openings in the floor of the middle fossa for nerves to the face and an artery to the brain’s coverings.', FORAMINA,
                 check='OpenStax places these in the floor of the middle cranial fossa; that they lie in the sphenoid’s greater wing is not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'),
            FEAT('Medial and lateral pterygoid plates', 'Thin wing-shaped plates underneath. The lateral plates anchor chewing muscles.', PTERYGOID),
            FEAT('Sphenoid sinus', 'An air-filled space in its body: the most posterior paranasal sinus.', SINUSES),
        ],
        'simpler': F('It has wings, a saddle that holds the pituitary gland and holes for nerves to the eye and face.', SPH, FORAMINA),
        'deeper': F('Its lesser wings mark the border between the front (anterior) and middle cranial fossae.', SPH),
    },
    formFunction={
        'facts': [
            F('Its central position lets it act as a keystone, linking almost every other bone of the skull.', SPH),
            F('Nerves and vessels pass through its openings between the brain and the eye, face and jaws.', FORAMINA),
            F('Its air-filled sinus lightens the skull and adds resonance to the voice.', SINUS_ROLE, SINUSES),
        ],
        'simpler': F('It locks the skull bones together and lets nerves pass through to the face.', SPH, FORAMINA),
    },
    relations={
        'items': [
            REL('gland', 'Pituitary gland', 'Sits in the hypophyseal fossa of the sella turcica.', SPH),
            REL('nerve', 'Optic nerve', 'Passes through the optic canal.', FORAMINA),
            REL('nerves', 'Nerves to the eye muscles', 'Pass through the superior orbital fissure.', FORAMINA),
            REL('nerve', 'Maxillary nerve', 'Leaves through the foramen rotundum to supply the cheek, nose and upper teeth.', FORAMINA,
                check='OpenStax describes the nerve without naming it; “maxillary nerve” needs an approved source.'),
            REL('artery', 'Middle meningeal artery', 'Enters through the foramen spinosum to supply the coverings of the brain.', FORAMINA,
                check='OpenStax describes the artery without naming it; “middle meningeal artery” needs an approved source.'),
            REL('muscles', 'Chewing muscles', 'Attach to the lateral pterygoid plates.', PTERYGOID),
            REL('bones', 'Pterion', 'Its greater wing is one of four bones meeting at the pterion, the thinnest part of the skull.', SUTURES),
        ],
        'simpler': F('The pituitary gland sits on it, and nerves to the eye and face pass through it.', SPH, FORAMINA),
    },
    development={
        'facts': [
            F('Bones of the skull base form by replacing cartilage with bone (endochondral ossification).', ENDO),
        ],
    },
    variations={
        'facts': [
            F('The size of the sphenoid sinus varies a great deal from person to person.', check=NOT_IN),
        ],
    },
    clinical={
        'items': [
            CLIN('A tumour of the pituitary gland grows upwards out of the sella turcica.', 'The optic chiasm, where nerve fibres from the two eyes cross.',
                 'See objects to the right and left: the outer parts of both visual fields are lost.', 'The crossing fibres sit just above the pituitary gland and are pressed on first.', CHIASM, SPH),
            CLIN('A hard blow to the side of the head at the pterion.', 'The artery just inside the skull there; blood collects and presses on the brain.',
                 'Stay well: the patient may seem fine at first, then worsen and can die within hours without treatment.', 'The pterion is the thinnest part of the skull, with a major artery right under it.', 's7-2#fs-id1364278', SUTURES),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the sphenoid is called the keystone of the skull.',
                ['It is a single bone in the centre of the skull base.', 'Almost every other bone of the skull joins with it.',
                 'It forms much of the central skull base and part of the sides.', 'Parts of the cranial fossae and the back of each orbit are sphenoid bone.'], SPH, ORBIT_WALLS),
            TUT('predict', 'A pituitary tumour grows up out of the sella turcica. Predict the visual problem and explain it.',
                ['It presses on the optic chiasm just above.', 'The crossing fibres are affected; fibres to the same side are not.',
                 'The outer part of the visual field is lost on both sides.', 'The patient cannot see objects to their left and right.'], CHIASM, SPH),
            TUT('compare', 'Compare the optic canal and the superior orbital fissure.',
                ['Optic canal: at the front outer corner of the sella turcica.', 'It carries the optic nerve.',
                 'Superior orbital fissure: beside the optic canal, between the lesser and greater wings of the sphenoid.', 'It carries nerves to the eye muscles and sensory nerves to the forehead.'], FORAMINA, REVIEWER),
        ],
    },
    check=[
        MCQ('What sits in the sella turcica?', ['The optic chiasm', 'The pituitary gland', 'The sphenoid sinus', 'The brainstem'], 1,
            'The hypophyseal fossa of the sella turcica holds the pituitary gland.', SPH),
        MCQ('Which opening carries the optic nerve?', ['Foramen ovale', 'Superior orbital fissure', 'Optic canal', 'Foramen rotundum'], 2,
            'The optic canal, beside the sella turcica, carries the optic nerve.', FORAMINA),
        MCQ('What attaches to the lateral pterygoid plates?', ['Chewing muscles', 'The pituitary gland', 'The optic nerve', 'Muscles of facial expression'], 0,
            'The lateral pterygoid plates anchor chewing muscles that act on the mandible.', PTERYGOID),
    ],
)

mandible = lesson(
    id='mandible', bone='mandible', topic='skull',
    source='OpenStax A&P 2e: 7.2 The Skull; 7.5; 9.6; 13.4',
    oneLine={
        'main': F('The lower jaw: the only skull bone that moves (mandible).', MAND),
        'simpler': F('The mandible is your lower jaw bone.', MAND),
        'deeper': F('It is one of two unpaired facial bones; the other is the vomer.', FACIAL),
    },
    where={
        'facts': [
            F('It forms the lower jaw, below the upper jaw bones (maxillae).', FACIAL, MAND),
            F('At the back, each side rises to meet the temporal bone just in front of the ear canal.', MAND_RAMUS, TEMPORAL_LIST),
            F('The hyoid bone lies just below it, in the upper neck.', HYOID),
        ],
        'simpler': F('It forms your chin and lower jaw, and hinges just in front of your ears.', MAND, TEMPORAL_LIST),
        'deeper': F('Each condyle sits in the mandibular fossa of the temporal bone, with a disc between them.', TMJ),
    },
    features={
        'items': [
            FEAT('Body', 'The horizontal, U-shaped part that holds the lower teeth.', MAND),
            FEAT('Ramus', 'The upright part at the back of each side (“ramus” means branch).', MAND),
            FEAT('Angle', 'The corner where the body and ramus meet.', MAND),
            FEAT('Condylar process', 'The back projection, topped by the condyle. It forms the jaw joint with the temporal bone.', MAND_RAMUS),
            FEAT('Coronoid process', 'The flat front projection. A biting muscle attaches to it.', MAND_RAMUS),
            FEAT('Mandibular foramen', 'An opening on the inner ramus. The nerve and vessels to the lower teeth enter here.', MAND_LAND),
            FEAT('Mental foramen', 'An opening at the front. A sensory nerve to the chin comes out here.', MAND_LAND),
            FEAT('Alveolar process', 'The top edge of the body, which anchors the lower teeth.', MAND_LAND),
            FEAT('Mylohyoid line', 'A ridge inside the body. The muscle forming the floor of the mouth attaches here.', MAND_LAND),
        ],
        'simpler': F('It has a curved body for the teeth and two upright parts that reach up to the skull.', MAND),
        'deeper': F('The condylar process forms the jaw joint; the coronoid process anchors a biting muscle.', MAND_RAMUS),
    },
    formFunction={
        'facts': [
            F('As the mouth opens, the jaw hinges down and the condyle glides forwards onto a bony bump (articular tubercle). This lets the mouth open wide.', TMJ_MOVE),
            F('A flexible disc between the condyle and the temporal bone smooths the movement.', TMJ),
            F('Its processes and ridges give attachment to the strong chewing muscles.', MAND_RAMUS, JAW_FOSSAE),
        ],
        'simpler': F('It hinges and slides at the jaw joint, so you can open wide and chew.', TMJ_MOVE),
    },
    relations={
        'items': [
            REL('joint', 'Temporomandibular joint', 'The condyle meets the mandibular fossa and articular tubercle of the temporal bone.', TMJ),
            REL('muscles', 'Chewing muscles', 'Arise from the zygomatic arch and fill the temporal and infratemporal fossae. They move the mandible.', ZYG_ARCH, JAW_FOSSAE),
            REL('nerve', 'Trigeminal nerve', 'Controls the chewing muscles and gives feeling to the face.', CRANIAL_NERVES),
            REL('nerve', 'Inferior alveolar nerve', 'The nerve to the lower teeth: enters the mandibular foramen.', MAND_LAND,
                check='OpenStax describes the nerve without naming it; “inferior alveolar nerve” needs an approved source.'),
            REL('ligament', 'Ligament to the lingula', 'From the base of the skull to the lingula. It steadies the jaw as the mouth opens and closes.', MAND_LAND, TMJ_MOVE),
            REL('muscle', 'Floor of the mouth', 'The muscle forming the floor of the mouth attaches to the mylohyoid lines.', MAND_LAND),
        ],
        'simpler': F('Chewing muscles move it, and nerves to the lower teeth and chin run through it.', JAW_FOSSAE, MAND_LAND),
    },
    development={
        'facts': [
            F('At birth, it is in two halves. They fuse during the first year into one U-shaped bone.', MAND),
            F('In childhood the jaws grow as the teeth come in. This enlarges the face.', FACE_DEV),
            F('Like other flat bones of the face, most of it forms directly from membrane (intramembranous ossification).', INTRA,
              check='OpenStax says the flat bones of the face develop this way; that this includes most of the mandible needs an approved source.'),
        ],
    },
    variations={
        'facts': [
            F('In males the angle of the mandible tends to be squarer and more flared.', check=NOT_IN),
        ],
    },
    clinical={
        'items': [
            CLIN('Opening the mouth too wide, as in a large bite, or a blow to the jaw.', 'The jaw joint dislocates: the condyle moves in front of the articular tubercle.',
                 'Close the mouth.', 'The condyle is stuck in front of the tubercle and cannot slide back.', TMJ_DIS),
            CLIN('A dental injection near the mandibular foramen.', 'The sensory nerve to the lower teeth.',
                 'Feel the lower teeth on that side.', 'The nerve is reached before it enters the foramen and runs through the bone to the teeth.', MAND_LAND),
            CLIN('Arthritis, grinding of the teeth or damage to the disc (temporomandibular joint disorder).', 'The jaw joint and its disc.',
                 'Chew comfortably; sometimes move the jaw at all (“lock jaw”).', 'The worn or damaged joint surfaces no longer glide smoothly.', TMJ_DIS),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the temporomandibular joint lets the mouth open wide.',
                ['The mandible hinges downwards.', 'At the same time the condyle and disc glide forwards onto the articular tubercle.',
                 'The net movement of the condyle is forwards and downwards.', 'The disc smooths the movement between the bones.'], TMJ, TMJ_MOVE),
            TUT('predict', 'A patient yawns widely and cannot close their mouth. Predict where the condyle is.',
                ['The jaw joint has dislocated.', 'The condyle has moved forwards, in front of the articular tubercle.',
                 'It cannot slide back into the mandibular fossa.', 'So the mouth stays open.'], TMJ_DIS, TMJ_MOVE),
            TUT('compare', 'Compare the mandibular foramen and the mental foramen.',
                ['Mandibular foramen: on the inner side of the ramus.', 'The nerve and vessels to the lower teeth enter it.',
                 'Mental foramen: at the front of the body, on each side.', 'A sensory nerve to the chin comes out through it.'], MAND_LAND),
        ],
    },
    check=[
        MCQ('Which bone of the skull can move?', ['Maxilla', 'Mandible', 'Zygomatic bone', 'Temporal bone'], 1, 'The mandible is the only skull bone that moves.', MAND),
        MCQ('Which part of the mandible forms the temporomandibular joint?', ['Coronoid process', 'Angle', 'Mental protuberance', 'Condyle'], 3,
            'The condyle meets the mandibular fossa and articular tubercle of the temporal bone.', MAND_RAMUS),
        MCQ('To numb the lower teeth, where must a dentist inject?', ['Where the nerve enters the mandibular foramen', 'At the mental foramen', 'Into the jaw joint', 'Below the hyoid bone'], 0,
            'The nerve to the lower teeth must be reached before it enters the mandibular foramen.', MAND_LAND),
    ],
)

os.makedirs(OUT, exist_ok=True)
for s in (humerus, scapula, scaphoid, sphenoid, mandible):
    with open(os.path.join(OUT, f"{s['id']}.json"), 'w') as f:
        json.dump(s, f, ensure_ascii=False, indent=1)
        f.write('\n')
print('written 5')
