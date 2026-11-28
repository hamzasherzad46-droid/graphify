# Structure lessons, Muscles (male layered model): deltoid, rotator cuff, biceps brachii, diaphragm,
# sternocleidomastoid, quadriceps femoris, hamstrings, calf muscles. Same standard as the bone lessons: every statement
# carries its sources (OpenStax A&P 2e paragraphs, figure tables or glossary entries); anything OpenStax does not
# confirm carries `check` and shows a †. Nothing is marked reviewed.
#   python3 scripts/content/structures_muscles.py
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, lesson, write

NOT_IN = 'Not in OpenStax A&P 2e (chapters 6–17, 19–23 and 25).'

# OpenStax paragraphs (and the figure tables whose descriptions list origins)
SHOULDER = 's11-5#fs-id2501482'
CUFF = 's11-5#fs-id2421860'
HUMERUS_TABLE = 's11-5#fig-ch11_05_03'
FOREARM = 's11-5#fs-id2271811'
FLEXORS = 's11-5#fs-id2831016'
FOREARM_TABLE = 's11-5#fig-ch11_05_05'
CUFF_JOINT = 's9-6#fs-id2429784'
GLENOHUMERAL = 's9-6#fs-id2305343'
GLENOID = 's9-6#fs-id1231336'
NUMBER_NAMES = 's11-2#fs-id2762982'
SHOULDER_INJ = 's9-6#fs-id1894060'
HUMERUS = 's8-2#fs-id2110691'
HUMERUS_FX = 's8-2#fs-id2030259'
PLEXUS = 's13-4#fs-id1472046'
PRIME = 's11-1#fs-id2684650'
ANTAGONIST = 's11-1#fs-id2260527'
PAIRS = 's11-1#tbl-ch11_01'
BELLY = 's11-1#fs-id2292670'
REFLEXES = 's16-4#fs-id1956663'
WITHDRAW = 's14-3#fs-id2133457'
STEP = 's14-3#fs-id2349137'
UNITS = 's14-3#fs-id2763982'
SOMITES = 's10-9#fs-id1959103'
SATELLITE = 's10-9#fs-id2329008'
ATROPHY = 's10-9#fs-id1645648'
DISUSE = 's10-9#fs-id2269378'
HYPERTROPHY = 's10-6#fs-id1584189'
TENDON = 's10-2#fs-id2052461'
QUADS = 's11-6#fs-id2591754'
HAMS = 's11-6#fs-id2012638'
CALF = 's11-6#fs-id2421915'
THIGH_TABLE = 's11-6#fig-ch11_06_03'
LEG_TABLE = 's11-6#fig-ch11_06_05'
DIA = 's11-4#fs-id2974297'
DIA_ATTACH = 's11-4#fs-id2304478'
DIA_OPENINGS = 's11-4#fs-id2143601'
VALSALVA = 's11-4#fs-id2072110'
BREATH_TABLE = 's11-4#tbl-ch11_07'
LUNGS_PASSIVE = 's22-3#fs-id1545698'
INSPIRATION = 's22-3#fs-id1882180'
EXPIRATION = 's22-3#fs-id2453488'
QUIET = 's22-3#fs-id2327717'
DEEP_BREATH = 's22-3#fs-id2276812'
FORCED = 's22-3#fs-id2146002'
RHYTHM = 's22-3#fs-id2096099'
APNOEA = 's22-3#fs-id2582598'
OESOPHAGUS = 's23-3#fs-id1984077'
NECK = 's11-3#fs-id2455581'
NECK_TABLE = 's11-3#tbl-ch11_05'
NAMES = 's11-2#fs-id2279191'
CRANIAL_TABLE = 's13-4#tbl-ch13_03'
MUSCLE_PUMP = 's20-2#fs-id1429887'

SIDES = lambda *names: [f'{n}_{s}' for n in names for s in ('left', 'right')]

deltoid = lesson(
    id='deltoid', title='Deltoid', part='acromial_part_of_deltoid_muscle_left',
    parts=SIDES('clavicular_part_of_deltoid_muscle', 'acromial_part_of_deltoid_muscle', 'scapular_spinal_part_of_deltoid_muscle'),
    topic='muscles', source='OpenStax A&P 2e: 11.5 Muscles of the Pectoral Girdle and Upper Limbs; 9.6; 8.2; 13.4',
    oneLine={
        'main': F('The thick muscle that makes the rounded shape of the shoulder, and the main muscle that lifts the arm sideways.', SHOULDER),
        'simpler': F('The deltoid is your shoulder muscle. It lifts your arm out to the side.', SHOULDER),
        'deeper': F('It is the major abductor of the arm, and it also helps to flex, extend and rotate it.', SHOULDER, 'glossary:deltoid'),
    },
    where={
        'facts': [
            F('The deltoid caps the shoulder joint, covering it from the front, the side and the back.', SHOULDER),
            F('Its fibres arise from the clavicle, the acromion and the spine of the scapula.', HUMERUS_TABLE),
            F('It inserts on the deltoid tuberosity, a roughened area halfway down the outer side of the humerus.', HUMERUS),
        ],
        'simpler': F('It wraps over the top of your shoulder, from your collarbone and shoulder blade to your upper arm bone.', HUMERUS_TABLE),
        'deeper': F('Its origin follows the insertion of the trapezius on the clavicle, acromion and scapular spine.', HUMERUS_TABLE, 's11-5#tbl-ch11_08'),
    },
    features={
        'items': [
            FEAT('Clavicular (front) part', 'Arises from the clavicle. It helps flex and medially rotate the arm.', HUMERUS_TABLE, SHOULDER, check=f'{NOT_IN} Which parts of the deltoid flex and which extend the arm (OpenStax names the actions, not the parts).'),
            FEAT('Acromial (middle) part', 'Arises from the acromion. It is the part that abducts the arm.', HUMERUS_TABLE, SHOULDER,
                 check=f'{NOT_IN} That the middle (acromial) fibres are the ones that abduct.'),
            FEAT('Spinal (back) part', 'Arises from the spine of the scapula. It helps extend and laterally rotate the arm.', HUMERUS_TABLE, SHOULDER, check=f'{NOT_IN} Which parts of the deltoid flex and which extend the arm (OpenStax names the actions, not the parts).'),
            FEAT('Shape', 'Thick and triangular, like the Greek letter delta, which gives it its name.', SHOULDER,
                 check=f'{NOT_IN} The origin of the name (the Greek letter delta).'),
        ],
        'simpler': F('It has a front, a middle and a back part, all meeting on the upper arm.', HUMERUS_TABLE),
        'deeper': F('Its front and back parts work against each other, so the deltoid can both flex and extend the arm.', SHOULDER, ANTAGONIST, check=f'{NOT_IN} Which parts of the deltoid flex and which extend the arm (OpenStax names the actions, not the parts).'),
    },
    formFunction={
        'facts': [
            F('Its fibres arch over the shoulder, so pulling on the humerus lifts the arm away from the body.', SHOULDER),
            F('The front fibres flex and medially rotate the arm. The back fibres extend and laterally rotate it.', SHOULDER, check=f'{NOT_IN} Which parts of the deltoid flex and which extend the arm (OpenStax names the actions, not the parts).'),
            F('Its thickness gives the shoulder its rounded outline.', SHOULDER),
        ],
        'simpler': F('Because it sits over the top of the shoulder, it lifts the arm out to the side.', SHOULDER),
    },
    relations={
        'items': [
            REL('muscle', 'Supraspinatus', 'A rotator cuff muscle deep to the deltoid. It also abducts the arm.', SHOULDER, CUFF),
            REL('joint', 'Glenohumeral (shoulder) joint', 'The deltoid covers this joint, formed by the humeral head and the glenoid cavity.', HUMERUS, SHOULDER),
            REL('muscle', 'Trapezius', 'Attaches to the same line of clavicle, acromion and scapular spine, from above.', 's11-5#tbl-ch11_08', HUMERUS_TABLE),
            REL('muscle', 'Pectoralis major', 'The axial muscle in front. It shares the job of bringing the arm forwards.', 's11-5#fs-id2008704', 'glossary:pectoralis major'),
            REL('nerve', 'Axillary nerve', 'A nerve of the brachial plexus that goes to the armpit region. It supplies the deltoid.', PLEXUS,
                check=f'{NOT_IN} That the axillary nerve supplies the deltoid.'),
        ],
        'simpler': F('It covers the shoulder joint, with the rotator cuff underneath and the trapezius above.', SHOULDER, CUFF_JOINT),
    },
    development={
        'facts': [
            F('Like other limb muscles, it develops from general mesoderm rather than from somites.', SOMITES),
            F('Its fibres form when many myoblasts fuse, which is why each fibre has many nuclei.', SOMITES),
        ],
    },
    variations={
        'facts': [
            F('Training adds structural proteins to its fibres, so the muscle grows thicker without adding fibres.', HYPERTROPHY),
        ],
    },
    clinical={
        'items': [
            CLIN('A fracture of the surgical neck of the humerus after a fall.', 'The axillary nerve, which winds round the surgical neck to reach the deltoid.',
                 'Lift the arm out to the side with normal strength.', 'Without its nerve, the deltoid cannot contract, so abduction is weak.', HUMERUS_FX,
                 check=f'{NOT_IN} The course of the axillary nerve round the surgical neck, and the weakness that follows its injury.'),
            CLIN('A shoulder kept still for weeks after an injury.', 'The deltoid itself, through disuse.',
                 'Lift the arm with the strength they had before.', 'Unused muscle loses structural proteins and shrinks (disuse atrophy).', DISUSE, ATROPHY),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how one muscle, the deltoid, can both flex and extend the arm.',
                ['The deltoid has front, middle and back parts.', 'The front part lies in front of the joint and flexes the arm.',
                 'The back part lies behind the joint and extends it.', 'So its parts can act as antagonists to each other.'], SHOULDER, ANTAGONIST, check=f'{NOT_IN} Which parts of the deltoid flex and which extend the arm (OpenStax names the actions, not the parts).'),
            TUT('compare', 'Compare the deltoid and the supraspinatus in abducting the arm.',
                ['Both abduct the arm.', 'The deltoid is the major abductor and lies superficially, capping the shoulder.',
                 'The supraspinatus lies deep, above the spine of the scapula.', 'Its tendon is part of the rotator cuff, which steadies the joint.'], SHOULDER, CUFF, CUFF_JOINT),
            TUT('predict', 'Predict what a patient cannot do after a fracture of the surgical neck that injures the axillary nerve.',
                ['The axillary nerve supplies the deltoid.', 'The deltoid cannot contract without it.',
                 'Abduction of the arm becomes weak.', 'Over time the unused muscle wastes, flattening the shoulder’s outline.'], HUMERUS_FX, ATROPHY,
                check=f'{NOT_IN} The axillary nerve’s supply to the deltoid and the signs of its injury.'),
        ],
    },
    check=[
        MCQ('Which movement is the deltoid’s main action?', ['Adduction of the arm', 'Abduction of the arm', 'Supination of the forearm', 'Elevation of the scapula'], 1,
            'The deltoid is the major abductor of the arm.', SHOULDER),
        MCQ('Which of these is not an origin of the deltoid?', ['Clavicle', 'Acromion', 'Spine of the scapula', 'Coracoid process'], 3,
            'The deltoid arises from the clavicle, acromion and spine of the scapula. The coracoid process gives origin to the coracobrachialis.', HUMERUS_TABLE),
        MCQ('What gives the shoulder its rounded outline?', ['The deltoid', 'The head of the humerus alone', 'The trapezius', 'The subscapularis'], 0,
            'The thick deltoid creates the rounded lines of the shoulder.', SHOULDER),
    ],
)

rotator_cuff = lesson(
    id='rotator-cuff', title='Rotator cuff', part='supraspinatus_muscle_left',
    parts=SIDES('supraspinatus_muscle', 'infraspinatus_muscle', 'teres_minor_muscle', 'subscapularis_muscle'),
    topic='muscles', source='OpenStax A&P 2e: 11.5 Muscles of the Pectoral Girdle and Upper Limbs; 9.6 Anatomy of Selected Synovial Joints',
    oneLine={
        'main': F('Four muscles from the scapula whose tendons ring the shoulder joint and hold the humeral head in its socket.', CUFF, CUFF_JOINT),
        'simpler': F('The rotator cuff is a ring of four muscles that keeps your shoulder joint together.', CUFF_JOINT),
        'deeper': F('They act as “dynamic ligaments”, adjusting their pull to give the shoulder joint its main support.', CUFF_JOINT),
    },
    where={
        'facts': [
            F('All four arise from the scapula and attach to the greater or lesser tubercle of the humerus.', CUFF_JOINT),
            F('Their tendons encircle the head of the humerus and fuse with the joint capsule in front, above and behind.', CUFF_JOINT),
        ],
        'simpler': F('They run from your shoulder blade to the top of your arm bone, wrapping round the joint.', CUFF_JOINT),
        'deeper': F('The fused tendons thicken the capsule. That thickening is what is called the rotator cuff.', CUFF_JOINT),
    },
    features={
        'items': [
            FEAT('Supraspinatus', 'Above the spine of the scapula, from the supraspinous fossa. It abducts the arm.', SHOULDER, HUMERUS_TABLE),
            FEAT('Infraspinatus', 'Below the spine of the scapula, from the infraspinous fossa. It laterally rotates the arm.', SHOULDER, HUMERUS_TABLE),
            FEAT('Teres minor', 'From the lateral border of the scapula. It laterally rotates and extends the arm.', SHOULDER, HUMERUS_TABLE),
            FEAT('Subscapularis', 'From the front of the scapula (subscapular fossa). It medially rotates the arm.', SHOULDER, HUMERUS_TABLE),
        ],
        'simpler': F('Three are on the back of the shoulder blade and one is on its front.', SHOULDER, HUMERUS_TABLE),
        'deeper': F('A memory aid for the four is SITS: supraspinatus, infraspinatus, teres minor, subscapularis.', CUFF,
                    check=f'{NOT_IN} The memory aid SITS.'),
    },
    formFunction={
        'facts': [
            F('The shoulder has the largest range of motion of any joint, at the cost of stability. Muscles give its main support.', GLENOHUMERAL, CUFF_JOINT),
            F('Constant small adjustments in their pull keep the humeral head centred in the glenoid cavity.', CUFF_JOINT),
            F('Two bursae, subacromial and subscapular, stop the tendons rubbing on the scapula.', CUFF_JOINT),
        ],
        'simpler': F('They are like living ligaments: they tighten as needed to keep the joint steady.', CUFF_JOINT),
    },
    relations={
        'items': [
            REL('muscle', 'Deltoid', 'Lies over the cuff, capping the shoulder. It is the main abductor of the arm.', SHOULDER),
            REL('bursa', 'Subacromial bursa', 'Sits between the cuff tendons and the acromion, reducing friction.', CUFF_JOINT),
            REL('bone', 'Greater and lesser tubercles', 'Bony attachment sites on the humerus for muscles acting across the shoulder.', HUMERUS, CUFF_JOINT),
            REL('muscle', 'Teres major', 'Lies below the teres minor but is not part of the cuff. It extends and medially rotates the arm.', SHOULDER),
            REL('joint', 'Glenohumeral joint', 'The joint the cuff supports. Its glenoid cavity is about a third the size of the humeral head.', GLENOHUMERAL, GLENOID),
        ],
        'simpler': F('The cuff lies under the deltoid and is protected from the acromion by a bursa.', SHOULDER, CUFF_JOINT),
    },
    development={
        'facts': [
            F('Limb muscles, including these, develop from general mesoderm. Many myoblasts fuse to make each fibre.', SOMITES),
        ],
    },
    variations={
        'facts': [
            F('Repeated use of the arm in abduction, as in throwing, swimming or racquet sports, can wear and tear the cuff.', SHOULDER_INJ),
        ],
    },
    clinical={
        'items': [
            CLIN('Years of throwing fast pitches overhead.', 'The rotator cuff tendons, which become pinched and inflamed and may tear from the bone.',
                 'Raise the arm overhead without pain, or with full strength.', 'Repeated overhead movement pinches the tendons, so they become inflamed.', CUFF, SHOULDER_INJ),
            CLIN('A fall onto the hand with the arm fully abducted.', 'The shoulder joint, which dislocates downwards (inferiorly).',
                 'Move the arm at the shoulder.', 'The cuff and ligaments support the joint in front, above and behind, but not below.', SHOULDER_INJ),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why most shoulder dislocations are inferior.',
                ['The humeral head is supported in front, above and behind.', 'This support comes from the rotator cuff and ligaments.',
                 'Below, the joint has little support.', 'So a force on the fully abducted arm drives the head downwards.'], SHOULDER_INJ, CUFF_JOINT),
            TUT('compare', 'Compare the actions of the infraspinatus and the subscapularis.',
                ['Both are rotator cuff muscles from the scapula.', 'The infraspinatus lies behind and laterally rotates the arm.',
                 'The subscapularis lies in front and medially rotates it.', 'So they are antagonists for rotation, while both steady the joint.'], SHOULDER, ANTAGONIST, CUFF_JOINT),
            TUT('predict', 'Predict which movements hurt in a baseball pitcher with an inflamed rotator cuff.',
                ['Bringing the arm overhead to throw.', 'The tendons are pinched in this position.',
                 'Repeated movement inflames them further.', 'A tendon may eventually tear away from the bone.'], CUFF, SHOULDER_INJ),
        ],
    },
    check=[
        MCQ('Which muscle is not part of the rotator cuff?', ['Supraspinatus', 'Teres minor', 'Teres major', 'Subscapularis'], 2,
            'The cuff is the supraspinatus, infraspinatus, teres minor and subscapularis. The teres major is not part of it.', CUFF),
        MCQ('Which rotator cuff muscle medially rotates the arm?', ['Infraspinatus', 'Subscapularis', 'Teres minor', 'Supraspinatus'], 1,
            'The subscapularis, on the front of the scapula, medially rotates the arm.', SHOULDER),
        MCQ('What gives the shoulder joint its main support?', ['Its deep bony socket', 'The joint capsule alone', 'The rotator cuff muscles', 'The biceps brachii'], 2,
            'The rotator cuff muscles act as dynamic ligaments and give the main support.', CUFF_JOINT),
    ],
)

biceps = lesson(
    id='biceps-brachii', title='Biceps brachii', part='long_head_of_biceps_brachii_left',
    parts=SIDES('long_head_of_biceps_brachii', 'short_head_of_biceps_brachii'),
    topic='muscles', source='OpenStax A&P 2e: 11.1 Interactions of Skeletal Muscles; 11.5 Muscles of the Pectoral Girdle and Upper Limbs; 8.2; 14.3; 16.4',
    oneLine={
        'main': F('The two-headed muscle at the front of the arm that bends the elbow and turns the palm up.', FLEXORS, 'glossary:biceps brachii'),
        'simpler': F('The biceps is the muscle at the front of your upper arm that bends your elbow.', FLEXORS),
        'deeper': F('It crosses both the shoulder and the elbow, so it also helps flex the arm at the shoulder.', FLEXORS),
    },
    where={
        'facts': [
            F('It lies in the anterior compartment of the arm, with the brachialis deep to it.', FLEXORS, PAIRS),
            F('Its two heads arise from the scapula: the coracoid process and the tubercle above the glenoid cavity.', FOREARM_TABLE),
            F('Its tendon inserts on the radial tuberosity of the radius.', check=f'{NOT_IN} The insertion of the biceps brachii (radial tuberosity).'),
        ],
        'simpler': F('It runs down the front of your upper arm, from your shoulder blade to your forearm.', FOREARM_TABLE, FLEXORS),
        'deeper': F('One of its tendons runs in the intertubercular (bicipital) groove of the humerus.', HUMERUS),
    },
    features={
        'items': [
            FEAT('Long head', 'Arises from the tubercle above the glenoid cavity. Its tendon passes through the bicipital groove.', FOREARM_TABLE, HUMERUS,
                 check=f'{NOT_IN} Which head of the biceps arises where (OpenStax lists both origins, not which head each belongs to).'),
            FEAT('Short head', 'Arises from the coracoid process of the scapula.', FOREARM_TABLE,
                 check=f'{NOT_IN} Which head of the biceps arises where (OpenStax lists both origins, not which head each belongs to).'),
            FEAT('Belly', 'The plump middle of the muscle. It bulges more as the muscle shortens.', BELLY),
            FEAT('Fusiform shape', 'A spindle-shaped belly that tapers towards each end.', BELLY,
                 check=f'{NOT_IN} That the biceps brachii itself is fusiform (11.1 uses it as the example of a belly).'),
        ],
        'simpler': F('It has two heads at the top that join into one belly.', FOREARM_TABLE, BELLY),
        'deeper': F('“Bi” in its name means it has two origins; “tri” in triceps means three.', NUMBER_NAMES),
    },
    formFunction={
        'facts': [
            F('It flexes the forearm at the elbow, and supinates it at the radioulnar joints.', FLEXORS),
            F('It is the prime mover in lifting a cup. The brachialis assists as a synergist.', PRIME),
            F('The triceps brachii, at the back of the arm, is its antagonist.', PAIRS),
        ],
        'simpler': F('It bends your elbow and turns your palm to face up.', FLEXORS, FOREARM),
    },
    relations={
        'items': [
            REL('muscle', 'Brachialis', 'Lies deep to the biceps and adds power to elbow flexion.', FLEXORS),
            REL('muscle', 'Triceps brachii', 'In the posterior compartment. It extends the forearm, opposing the biceps.', PAIRS, FOREARM),
            REL('muscle', 'Brachioradialis', 'The third elbow flexor. It can flex the forearm quickly or help lift a load slowly.', FLEXORS),
            REL('bone', 'Humerus', 'A biceps tendon runs in its intertubercular (bicipital) groove.', HUMERUS),
            REL('nerve', 'Musculocutaneous nerve', 'The nerve of the anterior compartment of the arm.',
                check=f'{NOT_IN} The musculocutaneous nerve and its supply to the biceps.'),
        ],
        'simpler': F('It works with the brachialis and against the triceps.', PRIME, PAIRS),
    },
    development={
        'facts': [
            F('Like other limb muscles, it develops from general mesoderm. Its nerve supply then triggers the formation of its neuromuscular junctions.', SOMITES, 's10-9#fs-id1605365'),
        ],
    },
    variations={
        'facts': [
            F('Resistance training thickens its fibres by adding myofibrils (hypertrophy). No new fibres form.', HYPERTROPHY, 's10-6#fs-id2264056'),
        ],
    },
    clinical={
        'items': [
            CLIN('Damage to the lower motor neurons that supply the biceps.', 'The motor side of the biceps stretch reflex.',
                 'Show a normal biceps reflex when the tendon is tapped.', 'The reflex needs the spindle’s sensory fibre, the spinal synapse and the motor neuron intact.', REFLEXES),
            CLIN('A heavy lift that ruptures the tendon of the long head.', 'The long-head tendon, where it runs in the bicipital groove.',
                 'Flex and supinate the forearm with full strength.', 'The torn head cannot pull, so its belly bunches up towards the elbow.', HUMERUS,
                 check=f'{NOT_IN} Rupture of the long head of the biceps and its signs.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the biceps and brachialis share the work of lifting a cup.',
                ['The biceps is the prime mover for the movement.', 'The brachialis, deep to it, assists as a synergist.',
                 'Both flex the forearm at the elbow.', 'The triceps relaxes as their antagonist.'], PRIME, FLEXORS, PAIRS),
            TUT('compare', 'Compare the biceps brachii and the brachialis.',
                ['Both flex the forearm.', 'The biceps crosses the shoulder and elbow; the brachialis arises from the distal humerus.',
                 'Only the biceps supinates the forearm.', 'The brachialis lies deep to the biceps.'], FLEXORS, FOREARM_TABLE),
            TUT('predict', 'Predict what happens to the triceps when the biceps contracts in a withdrawal reflex.',
                ['The sensory neuron excites an interneuron in the spinal cord.', 'The interneuron inhibits the triceps’ motor neuron.',
                 'The triceps relaxes instead of resisting.', 'So the elbow flexes quickly.'], WITHDRAW),
        ],
    },
    check=[
        MCQ('Which muscle is the antagonist of the biceps brachii at the elbow?', ['Brachialis', 'Brachioradialis', 'Triceps brachii', 'Deltoid'], 2,
            'The triceps brachii extends the forearm, opposing the biceps.', PAIRS),
        MCQ('Besides flexing the elbow, what else does the biceps brachii do?', ['Pronates the forearm', 'Supinates the forearm', 'Extends the wrist', 'Abducts the arm'], 1,
            'It also supinates the forearm at the radioulnar joints.', FLEXORS),
        MCQ('Which muscle lies deep to the biceps brachii and adds power to elbow flexion?', ['Brachialis', 'Brachioradialis', 'Coracobrachialis', 'Anconeus'], 0,
            'Deep to the biceps brachii, the brachialis provides additional power in flexing the forearm.', FLEXORS),
    ],
)

diaphragm = lesson(
    id='diaphragm', title='Diaphragm', part='diaphragm', parts=['diaphragm'],
    topic='muscles', source='OpenStax A&P 2e: 11.4 Axial Muscles of the Abdominal Wall and Thorax; 22.3 The Process of Breathing; 13.4; 23.3',
    oneLine={
        'main': F('The dome-shaped sheet of muscle between the chest and the abdomen: the main muscle of breathing.', DIA, INSPIRATION),
        'simpler': F('The diaphragm is a dome of muscle under your lungs. It pulls air in when it tightens.', DIA, INSPIRATION),
        'deeper': F('Its contraction flattens the dome, enlarging the thoracic cavity and lowering the pressure in the lungs.', INSPIRATION),
    },
    where={
        'facts': [
            F('It separates the thoracic and abdominal cavities. Its upper surface is the floor of the chest.', DIA),
            F('Its muscle arises from the xiphoid process, the lower six ribs and cartilages, and the lumbar vertebrae.', DIA_ATTACH),
        ],
        'simpler': F('It sits across the bottom of your rib cage, under your heart and lungs.', DIA, DIA_ATTACH),
        'deeper': F('The pericardial sac and the parietal pleura fuse onto its central tendon.', DIA_ATTACH),
    },
    features={
        'items': [
            FEAT('Central tendon', 'The tendon in the middle of the dome, into which all the muscle fibres insert.', DIA_ATTACH, BREATH_TABLE),
            FEAT('Caval opening', 'Lets the inferior vena cava pass from the abdomen to the thorax.', DIA_OPENINGS),
            FEAT('Oesophageal hiatus', 'Lets the oesophagus and its nerves pass into the abdomen.', DIA_OPENINGS, OESOPHAGUS),
            FEAT('Aortic hiatus', 'At the back: the aorta, thoracic duct and azygos vein pass through it.', DIA_OPENINGS),
        ],
        'simpler': F('It has a tendon in the middle and three openings for big tubes to pass through.', DIA_ATTACH, DIA_OPENINGS),
        'deeper': F('The three openings lie at about the levels of T8 (caval), T10 (oesophageal) and T12 (aortic).', DIA_OPENINGS,
                    check=f'{NOT_IN} The vertebral levels of the diaphragm’s openings.'),
    },
    formFunction={
        'facts': [
            F('Contracting, it moves down towards the abdomen and makes the thoracic cavity larger.', INSPIRATION),
            F('The lungs follow, because pleural fluid holds them to the chest wall. Their pressure falls and air flows in.', INSPIRATION, LUNGS_PASSIVE),
            F('Quiet expiration is passive: the diaphragm relaxes and the elastic lungs recoil.', EXPIRATION),
        ],
        'simpler': F('Tighten it and air comes in. Relax it and air goes out by itself.', INSPIRATION, EXPIRATION),
    },
    relations={
        'items': [
            REL('muscle', 'External intercostals', 'Work with the diaphragm in quiet inspiration, lifting the ribs up and out.', INSPIRATION, QUIET),
            REL('muscle', 'Abdominal muscles', 'With the diaphragm, they raise abdominal pressure in defecation, urination and childbirth.', VALSALVA),
            REL('nerve', 'Phrenic nerve', 'It comes from the cervical plexus in the neck and reaches the diaphragm at the base of the thorax.', PLEXUS),
            REL('vessel', 'Inferior vena cava and aorta', 'Pass through the caval opening and the aortic hiatus.', DIA_OPENINGS),
            REL('organ', 'Oesophagus', 'Enters the abdomen through the oesophageal hiatus.', OESOPHAGUS, DIA_OPENINGS),
        ],
        'simpler': F('The heart and lungs sit on it and the liver and stomach lie under it. A nerve from the neck works it.', DIA, PLEXUS,
                     check=f'{NOT_IN} That the liver and stomach lie directly under the diaphragm.'),
    },
    development={
        'facts': [
            F('The phrenic nerve comes from the neck (cervical plexus), a sign that the diaphragm’s muscle starts in the neck region.', PLEXUS,
              check=f'{NOT_IN} The development of the diaphragm and why its nerve comes from the neck.'),
        ],
    },
    variations={
        'facts': [
            F('A deep breath is mainly diaphragmatic; a shallow breath relies more on the intercostals (costal breathing).', DEEP_BREATH),
        ],
    },
    clinical={
        'items': [
            CLIN('Damage to the pons or medulla, after a stroke or from drugs such as morphine.', 'The respiratory centres that drive the diaphragm.',
                 'Breathe regularly in sleep: breathing stops for short periods (central sleep apnoea).', 'Without signals from the centres, the diaphragm and intercostals do not contract.', APNOEA, RHYTHM),
            CLIN('Part of the stomach slides up through the oesophageal hiatus (a hiatus hernia).', 'The oesophageal hiatus, which has widened.',
                 'Keep stomach acid out of the oesophagus: heartburn is worse lying down.', 'The hiatus no longer holds the junction of the oesophagus and stomach below the diaphragm.', OESOPHAGUS, DIA_OPENINGS,
                 check=f'{NOT_IN} Hiatus hernia and its symptoms.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how contraction of the diaphragm draws air into the lungs.',
                ['The diaphragm moves down and the thoracic cavity enlarges.', 'Pleural fluid makes the lungs follow the chest wall.',
                 'Lung volume rises, so pressure in the alveoli falls below atmospheric.', 'Air flows down this pressure gradient into the lungs.'], INSPIRATION, LUNGS_PASSIVE),
            TUT('compare', 'Compare quiet and forced breathing.',
                ['Quiet breathing: the diaphragm and external intercostals contract; expiration is passive.', 'Forced breathing: inspiration and expiration both use muscles.',
                 'Neck muscles such as the scalenes help forced inspiration.', 'Abdominal muscles and internal intercostals drive forced expiration.'], QUIET, FORCED, EXPIRATION),
            TUT('predict', 'Predict what happens to breathing if the phrenic nerve is cut on one side.',
                ['The phrenic nerve is the diaphragm’s motor nerve.', 'That half of the diaphragm cannot contract.',
                 'Inspiration on that side weakens.', 'The intercostals and accessory muscles must do more of the work.'], PLEXUS, INSPIRATION,
                check=f'{NOT_IN} The effects of cutting one phrenic nerve.'),
        ],
    },
    check=[
        MCQ('What passes through the aortic hiatus?', ['Inferior vena cava', 'Oesophagus', 'Aorta, thoracic duct and azygos vein', 'Phrenic nerve'], 2,
            'The aorta, thoracic duct and azygos vein pass through the aortic hiatus at the back.', DIA_OPENINGS),
        MCQ('Which nerve supplies the diaphragm?', ['Vagus nerve', 'Phrenic nerve', 'Intercostal nerve', 'Accessory nerve'], 1,
            'The phrenic nerve, from the cervical plexus, connects to the diaphragm.', PLEXUS),
        MCQ('What happens when the diaphragm contracts?', ['It moves inferiorly and the thoracic cavity enlarges', 'It moves superiorly and air is forced out',
                                                           'The lungs actively expand themselves', 'Intra-alveolar pressure rises above atmospheric'], 0,
            'It moves down towards the abdomen, enlarging the thoracic cavity.', INSPIRATION),
    ],
)

scm = lesson(
    id='sternocleidomastoid', title='Sternocleidomastoid', part='sternocleidomastoid_muscle_left', parts=SIDES('sternocleidomastoid_muscle'),
    topic='muscles', source='OpenStax A&P 2e: 11.2 Naming Skeletal Muscles; 11.3 Axial Muscles of the Head, Neck, and Back; 13.4',
    oneLine={
        'main': F('The neck muscle from the sternum and clavicle to the mastoid process that turns and tilts the head.', NAMES, NECK),
        'simpler': F('It is the long muscle on each side of your neck that turns your head.', NECK),
        'deeper': F('Acting alone it turns the head to the opposite side; both together flex the head.', NECK_TABLE),
    },
    where={
        'facts': [
            F('It runs up the side of the neck, from the sternum and clavicle to the skull behind the ear.', NAMES, NECK_TABLE),
            F('It inserts on the mastoid process of the temporal bone and on the occipital bone.', NECK_TABLE),
        ],
        'simpler': F('You can feel it on the side of your neck when you turn your head.', NECK),
        'deeper': F('Seen from the side, it divides the neck into anterior and posterior triangles.', NECK),
    },
    features={
        'items': [
            FEAT('Sternal head', 'Arises from the sternum (“sterno” in the name).', NAMES),
            FEAT('Clavicular head', 'Arises from the clavicle (“cleido” in the name).', NAMES),
            FEAT('Insertion', 'On the mastoid process of the temporal bone (“mastoid” in the name), and the occipital bone.', NAMES, NECK_TABLE),
            FEAT('Name', 'Named for its attachments, with the origin first: sterno, cleido, mastoid.', NAMES),
        ],
        'simpler': F('Its long name lists where it starts and ends: breastbone, collarbone, mastoid.', NAMES),
        'deeper': F('When a muscle is named for its attachments, the origin is always named first.', NAMES),
    },
    formFunction={
        'facts': [
            F('One muscle alone turns the head to the opposite side and tilts it to its own side.', NECK_TABLE, NECK,
              check=f'{NOT_IN} That one muscle tilts the head towards its own side (OpenStax says “to the side”).'),
            F('Both together flex the head forwards.', NECK, NECK_TABLE),
        ],
        'simpler': F('One side turns your head; both sides bend it forwards.', NECK, NECK_TABLE),
    },
    relations={
        'items': [
            REL('bone', 'Temporal bone (mastoid process)', 'Its insertion, behind the ear.', NAMES),
            REL('muscle', 'Splenius capitis', 'Tilts and turns the head to its own side; both together extend the head.', NECK_TABLE),
            REL('muscle', 'Semispinalis capitis', 'Extends the head when both sides act, opposing the sternocleidomastoids.', NECK_TABLE),
            REL('nerve', 'Accessory nerve (cranial nerve XI)', 'A purely motor cranial nerve to muscles of the neck.', CRANIAL_TABLE, 's13-4#fs-id1830197'),
            REL('region', 'Triangles of the neck', 'Its line separates the anterior and posterior triangles.', NECK),
        ],
        'simpler': F('It works with the muscles at the back of the neck to move the head. Its nerve is a cranial nerve.', NECK_TABLE, CRANIAL_TABLE),
    },
    development={
        'facts': [
            F('Skeletal muscle of the head develops from general mesoderm; trunk muscles come from somites.', SOMITES,
              check=f'{NOT_IN} Which embryonic tissue the sternocleidomastoid itself comes from.'),
        ],
    },
    variations={
        'facts': [
            F('Its two heads, sternal and clavicular, can be seen and felt separately low in the neck.', NAMES,
              check=f'{NOT_IN} That the two heads are visible separately.'),
        ],
    },
    clinical={
        'items': [
            CLIN('A baby born with a shortened sternocleidomastoid on one side.', 'The sternocleidomastoid (congenital torticollis, wry neck).',
                 'Hold the head straight: it tilts to the short side and turns away.', 'The short muscle pulls constantly, tilting to its own side and turning to the opposite.', NECK_TABLE,
                 check=f'{NOT_IN} Congenital torticollis.'),
            CLIN('Injury to the accessory nerve in the neck.', 'The nerve to the sternocleidomastoid and trapezius.',
                 'Turn the head strongly to the opposite side, or shrug that shoulder.', 'Both muscles lose their motor supply from cranial nerve XI.', CRANIAL_TABLE, 's11-5#tbl-ch11_08',
                 check=f'{NOT_IN} The accessory nerve’s supply to the sternocleidomastoid and trapezius, and the signs of its injury.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the left sternocleidomastoid turns the face to the right.',
                ['It runs from the front (sternum, clavicle) to the back of the skull (mastoid).', 'Pulling the mastoid down and forwards rotates the head.',
                 'The face turns to the opposite side.', 'So the left muscle turns the face to the right.'], NECK_TABLE, NAMES,
                check=f'{NOT_IN} How the line of pull from sternum to mastoid rotates the head.'),
            TUT('compare', 'Compare the actions of the sternocleidomastoids and the semispinalis capitis acting on both sides.',
                ['Both sternocleidomastoids together flex the head.', 'Both semispinalis capitis muscles together extend it.',
                 'So the two pairs are antagonists.', 'Acting on one side, each pair turns and tilts the head.'], NECK_TABLE, ANTAGONIST),
            TUT('predict', 'Predict the head position in a baby whose right sternocleidomastoid is short.',
                ['The short muscle pulls constantly.', 'The head tilts to the right.', 'The face turns to the left.',
                 'This is congenital torticollis.'], NECK_TABLE, check=f'{NOT_IN} Congenital torticollis.'),
        ],
    },
    check=[
        MCQ('Where does the sternocleidomastoid insert?', ['Sternum', 'Clavicle', 'Mastoid process of the temporal bone', 'Spinous process of C7'], 2,
            'It inserts on the mastoid process of the temporal bone, named last in its name.', NAMES),
        MCQ('What does one sternocleidomastoid do on its own?', ['Extends the head', 'Rotates the head to the opposite side', 'Elevates the scapula', 'Depresses the mandible'], 1,
            'Individually it rotates the head to the opposite side.', NECK_TABLE),
        MCQ('Which neck regions does it separate?', ['Anterior and posterior triangles', 'Thorax and abdomen', 'Pharynx and larynx', 'Left and right carotid sheaths'], 0,
            'Seen from the side, it divides the neck into anterior and posterior triangles.', NECK),
    ],
)

quadriceps = lesson(
    id='quadriceps-femoris', title='Quadriceps femoris', part='rectus_femoris_muscle_left',
    parts=SIDES('rectus_femoris_muscle', 'vastus_lateralis_muscle', 'vastus_medialis_muscle', 'vastus_intermedius_muscle'),
    topic='muscles', source='OpenStax A&P 2e: 11.6 Appendicular Muscles of the Pelvic Girdle and Lower Limbs; 11.1; 13.4; 14.3; 16.4',
    oneLine={
        'main': F('The group of four muscles at the front of the thigh that extend and stabilise the knee.', QUADS),
        'simpler': F('The quadriceps are the big muscles on the front of your thigh. They straighten your knee.', QUADS),
        'deeper': F('All four join one tendon to the patella, which continues as the patellar ligament to the tibial tuberosity.', QUADS),
    },
    where={
        'facts': [
            F('They fill the anterior compartment of the thigh.', QUADS),
            F('Rectus femoris lies in front, vastus lateralis on the outer side and vastus medialis on the inner side. Vastus intermedius lies between them, deep.', QUADS),
        ],
        'simpler': F('They cover the front and sides of your thigh, above the kneecap.', QUADS),
        'deeper': F('Only the rectus femoris arises from the hip bone; the three vasti arise from the femur.', THIGH_TABLE),
    },
    features={
        'items': [
            FEAT('Rectus femoris', 'Arises from the anterior inferior iliac spine and above the acetabulum. It also helps raise the knee.', THIGH_TABLE),
            FEAT('Vastus lateralis', 'Arises from the greater trochanter, the intertrochanteric line and the linea aspera.', THIGH_TABLE),
            FEAT('Vastus medialis', 'Arises from the linea aspera and the intertrochanteric line.', THIGH_TABLE),
            FEAT('Vastus intermedius', 'Arises from the upper shaft of the femur, deep to the rectus femoris.', THIGH_TABLE, QUADS),
            FEAT('Quadriceps tendon', 'The tendon common to all four. It inserts into the patella.', QUADS),
        ],
        'simpler': F('Four muscles, one shared tendon, one kneecap.', QUADS),
        'deeper': F('Their motor units are large, up to about 1,000 fibres each, suited to force rather than fine control.', UNITS),
    },
    formFunction={
        'facts': [
            F('Pulling through the patella and patellar ligament, they extend the leg at the knee, as in kicking.', QUADS, THIGH_TABLE),
            F('The rectus femoris crosses the hip too, so it also flexes the thigh.', THIGH_TABLE, QUADS),
            F('The hamstrings, behind, are their antagonists.', PAIRS),
        ],
        'simpler': F('They straighten the knee; the front one also lifts the thigh.', QUADS, THIGH_TABLE),
    },
    relations={
        'items': [
            REL('bone', 'Patella', 'Lies in the quadriceps tendon. The tendon continues below it as the patellar ligament.', QUADS),
            REL('bone', 'Tibial tuberosity', 'Where the patellar ligament attaches.', QUADS),
            REL('muscle', 'Hamstrings', 'In the posterior compartment. They flex the knee, opposing the quadriceps.', PAIRS, HAMS),
            REL('muscle', 'Sartorius', 'A band-like muscle crossing the front of the thigh, also in the anterior compartment.', QUADS),
            REL('nerve', 'Femoral nerve', 'A major nerve of the lumbar plexus, to the front of the thigh.', PLEXUS,
                check=f'{NOT_IN} That the femoral nerve supplies the quadriceps.'),
        ],
        'simpler': F('They pull on the kneecap and are opposed by the hamstrings.', QUADS, PAIRS),
    },
    development={
        'facts': [
            F('Limb muscles develop from general mesoderm. Satellite cells later repair the fibres.', SOMITES, SATELLITE),
        ],
    },
    variations={
        'facts': [
            F('Without use, they waste quickly (disuse atrophy), for example after a leg fracture.', DISUSE),
            F('Age-related loss (sarcopenia) is slowed, though not stopped, by exercise.', 's10-6#fs-id2267886', 's10-6#fs-id1425445'),
        ],
    },
    clinical={
        'items': [
            CLIN('Damage to the quadriceps’ reflex arc: its sensory fibres, the spinal cord or its lower motor neurons.', 'The knee-jerk (stretch) reflex of the quadriceps.',
                 'Kick the leg forwards when the patellar ligament is tapped.', 'The tap normally stretches the muscle, and its spindles excite its motor neurons directly.', REFLEXES),
            CLIN('A leg kept in plaster for weeks.', 'The quadriceps, through disuse.',
                 'Straighten the knee strongly when the plaster comes off.', 'Unused muscle loses structural proteins and shrinks.', DISUSE, ATROPHY),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the quadriceps extend the knee though none of them attaches to the tibia directly.',
                ['All four join the quadriceps tendon.', 'The tendon inserts into the patella.',
                 'Below the patella it continues as the patellar ligament.', 'The ligament attaches to the tibial tuberosity, so pulling it straightens the knee.'], QUADS),
            TUT('compare', 'Compare the rectus femoris and the vastus lateralis.',
                ['Both extend the knee through the quadriceps tendon.', 'The rectus femoris arises from the hip bone, so it also flexes the thigh.',
                 'The vastus lateralis arises from the femur and acts on the knee only.', 'The rectus femoris lies in front; the vastus lateralis on the outer side.'], THIGH_TABLE, QUADS),
            TUT('predict', 'Predict what a knee-jerk test shows if the reflex arc is intact.',
                ['The tap stretches the quadriceps.', 'Muscle spindles signal into the spinal cord.',
                 'Their fibres excite the motor neuron directly.', 'The quadriceps contract and the leg kicks forwards.'], REFLEXES),
        ],
    },
    check=[
        MCQ('Which quadriceps muscle also flexes the thigh at the hip?', ['Vastus lateralis', 'Vastus medialis', 'Vastus intermedius', 'Rectus femoris'], 3,
            'The rectus femoris arises from the hip bone, so it also helps raise the knee (flex the thigh).', THIGH_TABLE),
        MCQ('Where does the patellar ligament attach?', ['Tibial tuberosity', 'Head of the fibula', 'Medial malleolus', 'Linea aspera'], 0,
            'The patellar ligament attaches to the tibial tuberosity.', QUADS),
        MCQ('Which group opposes the quadriceps at the knee?', ['Adductors', 'Hamstrings', 'Gluteal muscles', 'Fibular muscles'], 1,
            'The hamstrings flex the leg, whereas the quadriceps extend it.', PAIRS),
    ],
)

hamstrings = lesson(
    id='hamstrings', title='Hamstrings', part='long_head_of_biceps_femoris_left',
    parts=SIDES('long_head_of_biceps_femoris', 'short_head_of_biceps_femoris', 'semitendinosus_muscle', 'semimembranosus_muscle'),
    topic='muscles', source='OpenStax A&P 2e: 11.6 Appendicular Muscles of the Pelvic Girdle and Lower Limbs; 11.1; 13.4',
    oneLine={
        'main': F('The three long muscles at the back of the thigh that bend the knee and extend the hip.', HAMS, 'glossary:hamstring group'),
        'simpler': F('The hamstrings are the muscles at the back of your thigh. They bend your knee.', HAMS),
        'deeper': F('They are the biceps femoris, semitendinosus and semimembranosus, in the posterior compartment of the thigh.', HAMS),
    },
    where={
        'facts': [
            F('The hamstrings fill the posterior compartment of the thigh.', HAMS),
            F('All three arise from the ischial tuberosity; the biceps femoris also from the linea aspera and distal femur.', THIGH_TABLE),
        ],
        'simpler': F('They run from the bone you sit on to the back of the knee.', THIGH_TABLE, HAMS),
        'deeper': F('Their tendons form the borders of the popliteal fossa, the diamond-shaped space behind the knee.', HAMS),
    },
    features={
        'items': [
            FEAT('Biceps femoris', 'The lateral hamstring. Besides flexing the knee, it turns the thigh outwards.', THIGH_TABLE,
                 check=f'{NOT_IN} Which hamstrings lie laterally and which medially (OpenStax gives their rotations, not their positions).'),
            FEAT('Semitendinosus', 'A medial hamstring with a long tendon. It turns the thigh inwards.', THIGH_TABLE,
                 check=f'{NOT_IN} The long tendon of the semitendinosus, and which hamstrings lie medially.'),
            FEAT('Semimembranosus', 'A medial hamstring, deep to the semitendinosus. It turns the thigh inwards.', THIGH_TABLE,
                 check=f'{NOT_IN} That the semimembranosus lies deep to the semitendinosus, and which hamstrings lie medially.'),
            FEAT('Popliteal fossa', 'The diamond-shaped space behind the knee, bordered by their tendons.', HAMS),
        ],
        'simpler': F('One hamstring is on the outer side; two are on the inner side.', THIGH_TABLE,
              check=f'{NOT_IN} Which hamstrings lie laterally and which medially (OpenStax gives their rotations, not their positions).'),
        'deeper': F('The biceps femoris inserts on the head of the fibula; the other two on the medial side of the tibia.',
                    check=f'{NOT_IN} The insertions of the hamstrings.'),
    },
    formFunction={
        'facts': [
            F('Crossing the back of the knee, they flex the leg, as when kneeling.', HAMS, THIGH_TABLE),
            F('Crossing the back of the hip, they also extend the thigh: they move it down and back.', HAMS, THIGH_TABLE),
            F('They oppose the quadriceps, which extend the knee.', PAIRS),
        ],
        'simpler': F('They bend the knee and swing the thigh backwards.', HAMS, THIGH_TABLE),
    },
    relations={
        'items': [
            REL('bone', 'Ischial tuberosity', 'Their common origin, on the hip bone.', THIGH_TABLE),
            REL('muscle', 'Quadriceps femoris', 'Their antagonists at the knee.', PAIRS),
            REL('nerve', 'Sciatic nerve', 'Runs down the back of the thigh. It is the tibial and fibular nerves combined.', PLEXUS,
                check=f'{NOT_IN} That the sciatic nerve supplies the hamstrings and runs among them.'),
            REL('muscle', 'Gastrocnemius', 'Arises from the femoral condyles, so it too crosses the back of the knee and helps flex it.', LEG_TABLE),
            REL('muscle', 'Gracilis', 'In the medial compartment. Like the hamstrings, it moves the leg back at the knee, as when kneeling.', THIGH_TABLE),
        ],
        'simpler': F('They sit behind the thigh, opposite the quadriceps, with the sciatic nerve close by.', PAIRS, PLEXUS),
    },
    development={
        'facts': [
            F('Like all limb muscles, they develop from general mesoderm, and each fibre forms from many fused myoblasts.', SOMITES),
        ],
    },
    variations={
        'facts': [
            F('Sprinters’ muscles have a high share of fast glycolytic fibres for powerful bursts.', 's10-6#fs-id2264056',
              check=f'{NOT_IN} Fibre types of the hamstrings specifically.'),
        ],
    },
    clinical={
        'items': [
            CLIN('A sudden sprint, with the hip flexed and the knee straightening.', 'The hamstrings, which tear (a hamstring strain).',
                 'Run or bend the knee against resistance without pain.', 'They are stretched across two joints while contracting hard to slow the leg.', HAMS,
                 check=f'{NOT_IN} Hamstring strains.'),
            CLIN('Compression of the sciatic nerve or the spinal nerves that form it.', 'The sciatic nerve (sciatica).',
                 'Move the hip and leg without pain.', 'Compression or irritation of the nerve, or of the spinal nerves forming it, causes sciatica.', PLEXUS),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the hamstrings act on both the hip and the knee.',
                ['They arise from the ischial tuberosity, behind the hip joint.', 'They cross the back of the knee to the leg.',
                 'So they extend the thigh at the hip.', 'And they flex the leg at the knee.'], THIGH_TABLE, HAMS),
            TUT('compare', 'Compare the biceps femoris with the semitendinosus and semimembranosus.',
                ['All three flex the knee and extend the thigh.', 'The biceps femoris lies laterally and turns the thigh outwards.',
                 'The other two lie medially and turn it inwards.', 'Only the biceps femoris also arises from the femur.'], THIGH_TABLE,
                check=f'{NOT_IN} Which hamstrings lie laterally and which medially (OpenStax gives their rotations, not their positions).'),
            TUT('predict', 'Predict which movement is hard after a hamstring strain.',
                ['Bending the knee against resistance.', 'Swinging the thigh back while running.',
                 'Both stretch or load the torn muscle.', 'So running and climbing hurt most.'], HAMS, THIGH_TABLE,
                check=f'{NOT_IN} Hamstring strains.'),
        ],
    },
    check=[
        MCQ('Where do all three hamstrings arise?', ['Ischial tuberosity', 'Anterior inferior iliac spine', 'Greater trochanter', 'Pubic symphysis'], 0,
            'All three arise from the ischial tuberosity.', THIGH_TABLE),
        MCQ('What space do the hamstring tendons help to form?', ['Femoral triangle', 'Popliteal fossa', 'Inguinal canal', 'Tarsal tunnel'], 1,
            'Their tendons form the popliteal fossa behind the knee.', HAMS),
        MCQ('Which hamstring turns the thigh outwards?', ['Semitendinosus', 'Semimembranosus', 'Gracilis', 'Biceps femoris'], 3,
            'The biceps femoris twists the thigh outwards; the other two twist it inwards.', THIGH_TABLE),
    ],
)

calf = lesson(
    id='calf-muscles', title='Calf muscles: gastrocnemius and soleus', part='medial_head_of_gastrocnemius_left',
    parts=SIDES('medial_head_of_gastrocnemius', 'lateral_head_of_gastrocnemius', 'soleus_muscle', 'plantaris_muscle', 'calcaneal_tendon'),
    topic='muscles', source='OpenStax A&P 2e: 11.6 Appendicular Muscles of the Pelvic Girdle and Lower Limbs; 14.3; 16.4; 20.2',
    oneLine={
        'main': F('The gastrocnemius and soleus form the calf and pull on the calcaneal tendon to point the foot down.', CALF, LEG_TABLE),
        'simpler': F('The calf muscles point your foot down, as when you jump or tap your foot.', CALF, LEG_TABLE),
        'deeper': F('They lie in the superficial posterior compartment of the leg and help keep us upright.', CALF),
    },
    where={
        'facts': [
            F('The gastrocnemius is the most superficial and visible muscle of the calf; the wide, flat soleus lies deep to it.', CALF),
            F('Both insert through the calcaneal (Achilles) tendon into the calcaneus.', CALF),
        ],
        'simpler': F('They form the bulge at the back of your lower leg, ending in the tendon above your heel.', CALF),
        'deeper': F('The small plantaris runs obliquely between them to the same tendon.', CALF),
    },
    features={
        'items': [
            FEAT('Gastrocnemius', 'Two heads from the medial and lateral condyles of the femur.', LEG_TABLE),
            FEAT('Soleus', 'Wide and flat, from the upper tibia, fibula and interosseous membrane.', CALF, LEG_TABLE),
            FEAT('Calcaneal (Achilles) tendon', 'A strong tendon into the calcaneus, shared by the superficial calf muscles.', CALF, 'glossary:calcaneal tendon'),
            FEAT('Plantaris', 'A small muscle between the two. Some people have two; about 7 percent of cadavers have none.', CALF),
        ],
        'simpler': F('Two big muscles, one tendon to the heel.', CALF),
        'deeper': F('Surgeons use the plantaris tendon in tendon transplants and ligament repairs.', CALF),
    },
    formFunction={
        'facts': [
            F('Pulling the heel up, they plantar flex the foot, as in jumping or tapping the foot.', LEG_TABLE),
            F('The gastrocnemius crosses the knee, so it also helps flex the leg.', LEG_TABLE),
            F('The soleus, crossing the ankle only, helps maintain posture while walking.', LEG_TABLE),
        ],
        'simpler': F('They push the front of the foot down and lift the heel.', LEG_TABLE),
    },
    relations={
        'items': [
            REL('bone', 'Calcaneus', 'The heel bone, where the calcaneal tendon inserts.', CALF),
            REL('muscle', 'Tibialis anterior', 'At the front of the leg. It dorsiflexes the foot, opposing the calf.', STEP, LEG_TABLE),
            REL('vein', 'Veins of the leg', 'Contracting leg muscles squeeze nearby veins, pushing blood towards the heart.', MUSCLE_PUMP),
            REL('muscle', 'Deep posterior muscles', 'Popliteus, flexor digitorum longus, flexor hallucis longus and tibialis posterior lie beneath.', CALF),
            REL('nerve', 'Tibial nerve', 'One of the two nerves in the sciatic nerve. It supplies the back of the leg.', PLEXUS,
                check=f'{NOT_IN} That the tibial nerve supplies the calf muscles.'),
        ],
        'simpler': F('They pull on the heel and work against the muscles at the front of the shin.', CALF, STEP),
    },
    development={
        'facts': [
            F('They develop from general mesoderm, like all limb muscles.', SOMITES),
        ],
    },
    variations={
        'facts': [
            F('The plantaris varies most: some people have two, and about 7 percent of cadavers have none.', CALF),
        ],
    },
    clinical={
        'items': [
            CLIN('Damage to the calf muscles’ reflex arc: their sensory fibres, the spinal cord or their lower motor neurons.', 'The ankle reflex of the gastrocnemius and soleus.',
                 'Point the foot down when the calcaneal tendon is tapped.', 'The tap normally stretches the muscles, and their spindles excite their motor neurons through the spinal cord.', REFLEXES),
            CLIN('A sudden push-off that ruptures the calcaneal tendon.', 'The calcaneal (Achilles) tendon.',
                 'Stand on tiptoe on that leg or push off when walking.', 'The calf muscles can no longer pull on the calcaneus.', CALF,
                 check=f'{NOT_IN} Rupture of the calcaneal tendon and its signs.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how walking helps blood return from the legs.',
                ['Leg muscles, including the calf, contract during walking.', 'They squeeze the nearby veins.',
                 'The veins’ one-way valves let blood move only upwards.', 'So the skeletal muscle pump moves blood towards the heart.'], MUSCLE_PUMP),
            TUT('compare', 'Compare the gastrocnemius and the soleus.',
                ['Both plantar flex the foot through the calcaneal tendon.', 'The gastrocnemius arises from the femur and crosses the knee.',
                 'So it also flexes the leg; the soleus does not.', 'The soleus lies deep and helps posture while walking.'], LEG_TABLE, CALF),
            TUT('predict', 'Predict what happens to the calf muscles when you step on a tack.',
                ['Pain fibres excite the motor neurons of the tibialis anterior.', 'The foot dorsiflexes.',
                 'An interneuron inhibits the gastrocnemius and soleus.', 'Plantar flexion stops, so the foot lifts off the tack.'], STEP),
        ],
    },
    check=[
        MCQ('Which calf muscle also flexes the knee?', ['Soleus', 'Gastrocnemius', 'Tibialis posterior', 'Fibularis longus'], 1,
            'The gastrocnemius arises from the femoral condyles, so it crosses and flexes the knee.', LEG_TABLE),
        MCQ('Where does the calcaneal tendon insert?', ['Navicular', 'Talus', 'Calcaneus', 'Base of the fifth metatarsal'], 2,
            'It inserts into the calcaneal bone of the ankle.', CALF),
        MCQ('Which muscle lies deep to the gastrocnemius?', ['Soleus', 'Tibialis anterior', 'Sartorius', 'Extensor digitorum longus'], 0,
            'Deep to the gastrocnemius is the wide, flat soleus.', CALF),
    ],
)

if __name__ == '__main__':
    write(deltoid, rotator_cuff, biceps, diaphragm, scm, quadriceps, hamstrings, calf)
