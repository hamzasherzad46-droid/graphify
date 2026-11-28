# Structure lessons, Organs (male organ model): heart, lungs, stomach, small intestine, liver, pancreas, kidneys,
# thyroid gland. Same standard as the bone lessons: every statement carries its sources (OpenStax A&P 2e paragraphs or
# glossary entries); anything OpenStax does not confirm carries `check` and shows a †. Nothing is marked reviewed.
#   python3 scripts/content/structures_organs.py
import json
import os
from structures_lib import F, FEAT, REL, CLIN, TUT, MCQ, lesson, write

NOT_IN = 'Not in OpenStax A&P 2e (chapters 6–17, 19–23 and 25).'
PARTS = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'content', 'parts', 'male.json')))['parts']
of_kind = lambda kind: sorted(k for k, v in PARTS.items() if v['kind'] == kind)

# Heart (19.1, 19.5)
H_PLACE = 's19-1#fs-id1892589'
H_SHAPE = 's19-1#fs-id2694723'
H_CHAMBERS = 's19-1#fs-id1478856'
H_CIRCUITS = 's19-1#fs-id2767147'
H_PULMONARY = 's19-1#fs-id1236860'
H_PERICARDIUM = 's19-1#fs-id2418328'
H_TAMPONADE = 's19-1#fs-id2988974'
H_WALL = 's19-1#fs-id2122250'
H_MYOCARDIUM = 's19-1#fs-id2062267'
H_LV_THICK = 's19-1#fs-id2183171'
H_IAS = 's19-1#fs-id2301176'
H_IVS = 's19-1#fs-id1422157'
H_AV_SEPTUM = 's19-1#fs-id2268819'
H_PFO = 's19-1#fs-id2587120'
H_CHORDAE = 's19-1#fs-id1534517'
H_PAPILLARY = 's19-1#fs-id2765308'
H_LA = 's19-1#fs-id2769216'
H_LV = 's19-1#fs-id2663012'
H_VALVES = 's19-1#fs-id2718087'
H_MITRAL = 's19-1#fs-id2326948'
H_SEMILUNAR = 's19-1#fs-id2541385'
H_PROLAPSE = 's19-1#fs-id2266265'
H_STENOSIS = 's19-1#fs-id1932336'
H_CORONARY = 's19-1#fs-id1247110'
H_LCA = 's19-1#fs-id2516174'
H_RCA = 's19-1#fs-id2757402'
H_MI = 's19-1#fs-id1289761'
H_ANGINA = 's19-1#fs-id2351428'
H_FIRST = 's19-5#fs-id2058606'
H_MESODERM = 's19-5#fs-id2485730'
H_TUBE = 's19-5#fs-id2343117'
H_FOLD = 's19-5#fs-id1364320'

# Lungs (22.1, 22.2, 22.3, 22.7)
L_MAIN = 's22-2#fs-id1401100'
L_GROSS = 's22-2#fs-id2627237'
L_LOBES = 's22-2#fs-id2717313'
L_BLOOD = 's22-2#fs-id2144132'
L_NERVES = 's22-2#fs-id2292208'
L_PLEURA = 's22-2#fs-id2346435'
L_PLEURAL_FLUID = 's22-2#fs-id2078585'
L_SMOKE = 's22-2#fs-id2573116'
L_ALVEOLUS = 's22-1#fs-id2594216'
L_CELLS = 's22-1#fs-id2201617'
L_MEMBRANE = 's22-1#fs-id2488371'
L_SURFACTANT = 's22-3#fs-id1862104'
L_INTRAPLEURAL = 's22-3#fs-id1469752'
L_INSPIRATION = 's22-3#fs-id1882180'
L_DEV = 's22-7#fs-id2486303'
L_DEV_TIME = 's22-7#fs-id2287234'
L_BUD = 's22-7#fs-id2485319'
L_LATE = 's22-7#fs-id1910265'

# Stomach (23.4, 23.3)
S_INTRO = 's23-4#fs-id2151539'
S_HOLD = 's23-4#fs-id1477027'
S_ROLES = 's23-4#fs-id1899671'
S_REGIONS = 's23-4#fs-id2052808'
S_CURVES = 's23-4#fs-id1386858'
S_WALL = 's23-4#fs-id1990056'
S_PITS = 's23-4#fs-id1701706'
S_PARIETAL = 's23-4#fs-id1959017'
S_CHIEF = 's23-4#fs-id1905668'
S_GASTRIN = 's23-4#fs-id1388512'
S_HORMONES = 's23-4#tbl-ch24_06'
S_GASTRIC_PHASE = 's23-4#fs-id1895143'
S_INTESTINAL_PHASE = 's23-4#fs-id1352023'
S_BARRIER = 's23-4#fs-id1896856'
S_EROSIONS = 's23-4#fs-id1632870'
S_ULCER_CAUSES = 's23-4#fs-id2023452'
S_ULCER_TREAT = 's23-4#fs-id1070208'
S_PERFORATION = 's23-4#fs-id2071941'
S_MIXING = 's23-4#fs-id1890948'
OESOPHAGUS = 's23-3#fs-id1984077'

# Small intestine (23.5)
SI_INTRO = 's23-5#fs-id2142144'
SI_REGIONS = 's23-5#fs-id2142277'
SI_DUODENUM = 's23-5#fs-id2271264'
SI_AMPULLA = 's23-5#fs-id2227124'
SI_JEJUNUM = 's23-5#fs-id2311182'
SI_ILEUM = 's23-5#fs-id1921294'
SI_SUPPLY = 's23-5#fs-id2240902'
SI_AREA = 's23-5#fs-id2020227'
SI_FOLDS = 's23-5#fs-id1377788'
SI_VILLI = 's23-5#fs-id1272744'
SI_MICROVILLI = 's23-5#fs-id810619'
SI_GLANDS = 's23-5#fs-id1644865'
SI_BRUNNER = 's23-5#fs-id2041977'
SI_PEYER = 's23-5#fs-id1482787'
SI_SEGMENTATION = 's23-5#fs-id1837941'
SI_VALVE = 's23-5#fs-id1764904'
SI_LACTOSE = 's23-5#fs-id1632981'
SI_LACTOSE_SIGNS = 's23-5#fs-id1485386'

# Liver and pancreas (23.6, 17.9)
ACCESSORY = 's23-6#fs-id2279526'
LV_PLACE = 's23-6#fs-id1907412'
LV_LOBES = 's23-6#fs-id1479465'
LV_PORTA = 's23-6#fs-id1842507'
LV_CELLS = 's23-6#fs-id1257384'
LV_DUCTS = 's23-6#fs-id1356003'
LV_SINUSOIDS = 's23-6#fs-id1966736'
LV_BILE = 's23-6#fs-id1390455'
LV_BILE_MAKE = 's23-6#fs-id1386125'
LV_ENTEROHEPATIC = 's23-6#fs-id1216217'
LV_BILIRUBIN = 's23-6#fs-id1884700'
LV_BETWEEN_MEALS = 's23-6#fs-id1379189'
P_PLACE = 's23-6#fs-id2094509'
P_ACINI = 's23-6#fs-id1836151'
P_ISLETS = 's23-6#fs-id2022250'
P_JUICE = 's23-6#fs-id1364084'
P_INACTIVE = 's23-6#fs-id1895555'
P_ACTIVE = 's23-6#fs-id2365034'
P_ENDOCRINE = 's17-9#fs-id1907359'
P_CELLS = 's17-9#fs-id1977301'
P_INSULIN = 's17-9#fs-id1489225'
P_INSULIN_MORE = 's17-9#fs-id1886347'
P_GLUCAGON = 's17-9#fs-id1751772'
P_TYPE1 = 's17-9#fs-id1200718'
P_TYPE2 = 's17-9#fs-id1641299'
P_TABLE = 's17-9#tbl-ch18_07'
SI_HORMONE_CELLS = 's23-5#tbl-ch24_07'

# Kidneys (25.2, 25.3, 25.10, 17.10)
K_PLACE = 's25-3#fs-id1542887'
K_EXTERNAL = 's25-3#fs-id1592078'
K_ADRENAL = 's25-3#fs-id2488605'
K_INTERNAL = 's25-3#fs-id2303293'
K_HILUM = 's25-3#fs-id1764618'
K_ARTERIES = 's25-3#fs-id2718604'
K_NEPHRON = 's25-3#fs-id2532837'
K_CORTEX = 's25-3#fs-id2506359'
K_URETERS = 's25-2#fs-id2338701'
K_URETER_WALL = 's25-2#fs-id2140392'
K_VITAMIN_D = 's25-10#fs-id1586933'
K_FAILURE = 's25-10#fs-id2844948'
K_HORMONES = 's17-10#fs-id1389903'
K_EPO = 's17-10#fs-id1918548'

# Thyroid (17.4)
T_PLACE = 's17-4#fs-id1219750'
T_ASSEMBLY = 's17-4#fs-id1217036'
T_RELEASE = 's17-4#fs-id1354718'
T_REGULATION = 's17-4#fs-id1073276'
T_FUNCTION = 's17-4#fs-id1241366'
T_GROWTH = 's17-4#fs-id1243032'
T_IODINE = 's17-4#fs-id768548'
T_GOITRE = 's17-4#fs-id1081468'
T_HYPO = 's17-4#fs-id1374729'
T_CALCITONIN = 's17-4#fs-id555341'
T_STEPS = 's17-4#fs-id805721'
T_CALCITONIN_ROLE = 's17-4#fs-id1411228'

heart = lesson(
    id='heart', title='Heart', part='left_ventricle', parts=of_kind('heart'),
    topic='heart', source='OpenStax A&P 2e: 19.1 Heart Anatomy; 19.5 Development of the Heart',
    oneLine={
        'main': F('The four-chambered muscular pump in the middle of the chest that drives blood round the lungs and the body.', H_PLACE, H_CHAMBERS, H_CIRCUITS),
        'simpler': F('The heart is a pump about the size of your fist. It pushes blood all round your body.', H_SHAPE, H_CHAMBERS),
        'deeper': F('The right side of the heart feeds the pulmonary circuit; the left side feeds the systemic circuit.', H_CIRCUITS, H_PULMONARY),
    },
    where={
        'facts': [
            F('It lies in the mediastinum, between the lungs, inside the pericardial sac.', H_PLACE),
            F('Its base, where the great vessels attach, is at the level of the third costal cartilage.', H_PLACE),
            F('Its apex lies just left of the sternum, between the fourth and fifth ribs near their cartilages.', H_PLACE),
        ],
        'simpler': F('It sits behind your breastbone, pointing down and to the left.', H_PLACE),
        'deeper': F('Its right side is turned forwards and its left side backwards. The left lung has a notch for it.', H_PLACE, L_GROSS),
    },
    features={
        'items': [
            FEAT('Atria', 'The two upper chambers. They receive blood and push it into the ventricles.', H_CHAMBERS),
            FEAT('Ventricles', 'The two lower chambers, the main pumps: right to the lungs, left to the body.', H_CHAMBERS),
            FEAT('Valves', 'Tricuspid and mitral between atria and ventricles; pulmonary and aortic at the exits.', H_VALVES, H_MITRAL, H_AV_SEPTUM),
            FEAT('Septa', 'Walls between the chambers: interatrial, interventricular and atrioventricular.', H_IAS, H_IVS, H_AV_SEPTUM),
            FEAT('Myocardium', 'The thick middle layer of the wall, made of cardiac muscle that pumps the blood.', H_MYOCARDIUM, H_WALL),
        ],
        'simpler': F('Four chambers, four one-way valves and a thick muscle wall.', H_CHAMBERS, H_VALVES),
        'deeper': F('Its muscle cells swirl round the chambers in figure-of-eight patterns, which helps it pump efficiently.', H_MYOCARDIUM),
    },
    formFunction={
        'facts': [
            F('The left ventricle’s wall is much thicker than the right’s, to pump against the higher resistance of the systemic circuit.', H_LV_THICK),
            F('Papillary muscles tighten the chordae tendineae as the ventricles contract, so the valve flaps cannot blow back.', H_PAPILLARY, H_CHORDAE),
            F('The semilunar valves are pockets that fill with blood flowing back, sealing the exits.', H_SEMILUNAR),
        ],
        'simpler': F('Thick walls for pumping hard, and valves that let blood go only one way.', H_LV_THICK, H_VALVES),
    },
    relations={
        'items': [
            REL('membrane', 'Pericardium', 'A tough fibrous sac with a serous lining that protects the heart and holds it in place.', H_PERICARDIUM),
            REL('artery', 'Aorta', 'Leaves the left ventricle through the aortic valve, carrying blood to the body.', H_LV, H_PULMONARY),
            REL('artery', 'Pulmonary trunk', 'Leaves the right ventricle and divides into the right and left pulmonary arteries.', H_PULMONARY),
            REL('artery', 'Coronary arteries', 'The first branches of the aorta. They supply the heart muscle itself.', H_CORONARY),
            REL('vein', 'Pulmonary veins', 'Bring oxygen-rich blood from the lungs into the left atrium.', H_PULMONARY, H_LA),
        ],
        'simpler': F('Big vessels leave from its top, and its own arteries wrap round its surface.', H_PLACE, H_CORONARY),
    },
    development={
        'facts': [
            F('It is the first organ to work, beating from about day 21 or 22 after fertilisation.', H_FIRST),
            F('It forms from mesoderm as a tube, which folds into an S shape between days 23 and 28.', H_MESODERM, H_FOLD),
            F('In the fetus, the foramen ovale lets blood pass from the right atrium to the left. It closes at birth.', H_IAS),
        ],
    },
    variations={
        'facts': [
            F('As many as 20–25 percent of people have a patent foramen ovale, mostly without symptoms.', H_PFO),
            F('An endurance athlete’s heart can be much larger than average, as exercise adds myofilaments.', H_SHAPE),
        ],
    },
    clinical={
        'items': [
            CLIN('A coronary artery blocked by atherosclerotic plaque.', 'The heart muscle the artery supplies, which dies (myocardial infarction).',
                 'Pump normally with the damaged region.', 'Without blood and oxygen, the cardiac muscle cells die; there is often sudden pain beneath the sternum.', H_MI, H_ANGINA),
            CLIN('Fluid or blood building up quickly in the pericardial cavity.', 'The heart’s filling (cardiac tamponade).',
                 'Fill and empty the heart fully: less blood is pumped with each beat.', 'The fluid presses on the heart and stops it relaxing fully between beats.', H_TAMPONADE),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the left ventricle’s wall is thicker than the right’s.',
                ['Both ventricles pump the same amount of blood per beat.', 'The left pumps into the long systemic circuit, with high resistance.',
                 'The right pumps into the short pulmonary circuit, with low resistance.', 'So the left must generate much more pressure.'], H_LV_THICK),
            TUT('compare', 'Compare the atrioventricular and semilunar valves.',
                ['Atrioventricular valves lie between atria and ventricles: tricuspid on the right, mitral on the left.', 'They are held by chordae tendineae and papillary muscles.',
                 'Semilunar valves guard the pulmonary trunk and aorta.', 'They are pocket-like, with no chordae tendineae or papillary muscles.'], H_VALVES, H_SEMILUNAR, H_MITRAL),
            TUT('predict', 'Predict what happens if chordae tendineae on the mitral valve break.',
                ['The cusps are no longer held as the ventricle contracts.', 'A cusp is forced backwards into the atrium (prolapse).',
                 'Blood flows back into the left atrium (regurgitation).', 'A heart murmur is heard with a stethoscope.'], H_PROLAPSE, H_STENOSIS),
        ],
    },
    check=[
        MCQ('Which chamber pumps blood into the aorta?', ['Right atrium', 'Right ventricle', 'Left atrium', 'Left ventricle'], 3,
            'The left ventricle ejects blood into the aorta through the aortic semilunar valve.', H_LV),
        MCQ('Which valve lies between the left atrium and the left ventricle?', ['Mitral valve', 'Tricuspid valve', 'Pulmonary valve', 'Aortic valve'], 0,
            'The mitral (bicuspid) valve guards the opening between the left atrium and ventricle.', H_MITRAL),
        MCQ('Which vessels carry oxygen-rich blood into the heart?', ['Venae cavae', 'Pulmonary veins', 'Pulmonary arteries', 'Coronary sinus'], 1,
            'The pulmonary veins return highly oxygenated blood from the lungs to the left atrium.', H_PULMONARY),
    ],
)

lungs = lesson(
    id='lungs', title='Lungs', part='superior_lobe_of_right_lung', parts=of_kind('lung'),
    topic='respiratory', source='OpenStax A&P 2e: 22.1 Organs and Structures of the Respiratory System; 22.2 The Lungs; 22.3; 22.7',
    oneLine={
        'main': F('The paired, pyramid-shaped organs of gas exchange in the chest, enclosed by the pleurae.', L_GROSS, L_MAIN),
        'simpler': F('Your lungs take oxygen from the air into your blood and pass carbon dioxide out.', L_MAIN),
        'deeper': F('They exchange gases across about 70 square metres of very thin, highly permeable epithelium.', L_MAIN),
    },
    where={
        'facts': [
            F('They fill the thoracic cavity on either side of the mediastinum, and rest on the diaphragm.', L_GROSS, L_PLEURA),
            F('Each connects to the trachea by its main bronchus.', L_GROSS),
        ],
        'simpler': F('They fill most of your chest, either side of your heart.', L_GROSS),
        'deeper': F('The apex is at the top; the base rests on the diaphragm. The costal surface faces the ribs.', L_GROSS),
    },
    features={
        'items': [
            FEAT('Lobes', 'The right lung has three lobes; the left lung has two. Fissures separate them.', L_LOBES),
            FEAT('Cardiac notch', 'An indentation in the left lung that makes room for the heart.', L_GROSS),
            FEAT('Bronchopulmonary segments', 'Divisions of a lobe, each with its own tertiary bronchus and artery.', L_LOBES),
            FEAT('Alveoli', 'Tiny grape-like air sacs, about 200 micrometres across, with elastic walls.', L_ALVEOLUS),
            FEAT('Hilum', 'Where the nerves enter the lung root and the two layers of pleura meet.', L_NERVES, L_PLEURA),
        ],
        'simpler': F('Three lobes on the right, two on the left, branching down to tiny air sacs.', L_LOBES, L_ALVEOLUS),
        'deeper': F('The right lung is shorter and wider; the left holds a smaller volume, sharing space with the heart.', L_GROSS),
    },
    formFunction={
        'facts': [
            F('Alveolar and capillary walls together form a respiratory membrane about 0.5 micrometres thick.', L_MEMBRANE),
            F('Type II alveolar cells secrete surfactant, which lowers surface tension, so the alveoli do not collapse.', L_CELLS, L_SURFACTANT),
            F('The lungs are passive in breathing: pleural fluid makes them follow the chest wall as it moves.', L_PLEURAL_FLUID, L_INSPIRATION),
        ],
        'simpler': F('Very thin walls let gases pass quickly; a slippery film keeps the air sacs open.', L_MEMBRANE, L_SURFACTANT),
    },
    relations={
        'items': [
            REL('membrane', 'Pleura', 'Visceral pleura covers the lung; parietal pleura lines the chest wall. Pleural fluid lies between.', L_PLEURA, L_PLEURAL_FLUID),
            REL('muscle', 'Diaphragm', 'Borders the lungs below; its contraction enlarges the chest and draws air in.', L_GROSS, L_INSPIRATION),
            REL('artery', 'Pulmonary arteries', 'Bring deoxygenated blood from the pulmonary trunk to the alveoli.', L_BLOOD),
            REL('nerve', 'Autonomic nerves', 'Parasympathetic nerves constrict the airways; sympathetic nerves dilate them.', L_NERVES),
            REL('airway', 'Bronchi', 'Connect each lung to the trachea and branch within it.', L_GROSS, L_LOBES),
        ],
        'simpler': F('They sit on the diaphragm, wrapped in pleura, fed by the pulmonary arteries.', L_GROSS, L_PLEURA, L_BLOOD),
    },
    development={
        'facts': [
            F('The lung bud grows from the foregut at about week 4; most respiratory structures arise from endoderm.', L_BUD, L_DEV),
            F('By week 28 enough alveoli have matured that a premature baby can usually breathe alone.', L_DEV_TIME),
            F('Surfactant is usually not adequate until about the eighth month of pregnancy.', L_LATE),
        ],
    },
    variations={
        'facts': [
            F('Living with a smoker raises a non-smoker’s risk of lung cancer by up to 30 percent.', L_SMOKE),
        ],
    },
    clinical={
        'items': [
            CLIN('A baby born before enough surfactant is made.', 'The alveoli, whose surface tension is too high.',
                 'Keep the alveoli open when breathing out.', 'Without surfactant, the alveoli collapse during expiration.', L_SURFACTANT, L_LATE),
            CLIN('A disease confined to one bronchopulmonary segment.', 'That segment only.',
                 'Use that segment for gas exchange.', 'Each segment has its own bronchus and artery, so it can be removed with little effect on its neighbours.', L_LOBES),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how the lungs expand though they have no muscle to move them.',
                ['The diaphragm and intercostals enlarge the thoracic cavity.', 'Pleural fluid holds the lungs to the chest wall by surface tension.',
                 'So the lungs are pulled outwards and stretch.', 'Their pressure falls, and air flows in.'], L_PLEURAL_FLUID, L_INSPIRATION),
            TUT('compare', 'Compare the right and left lungs.',
                ['Right: three lobes (superior, middle, inferior).', 'Left: two lobes (superior, inferior).',
                 'The right is shorter and wider.', 'The left is smaller, with a cardiac notch for the heart.'], L_LOBES, L_GROSS),
            TUT('predict', 'Predict what happens to a baby born at 26 weeks without treatment.',
                ['Its type II cells make little surfactant.', 'Surface tension in the alveoli stays high.',
                 'The alveoli collapse when it breathes out.', 'So each breath takes great effort.'], L_LATE, L_SURFACTANT, L_DEV_TIME,
                check=f'{NOT_IN} The effort of breathing without surfactant (respiratory distress in premature babies).'),
        ],
    },
    check=[
        MCQ('How many lobes does the left lung have?', ['One', 'Two', 'Three', 'Four'], 1,
            'The left lung has two lobes, superior and inferior; the right has three.', L_LOBES),
        MCQ('Which cells secrete pulmonary surfactant?', ['Type I alveolar cells', 'Alveolar macrophages', 'Type II alveolar cells', 'Goblet cells'], 2,
            'Type II alveolar cells secrete surfactant.', L_CELLS),
        MCQ('What is the cardiac notch?', ['An indentation of the left lung for the heart', 'A fissure of the right lung', 'The hilum of the left lung', 'A groove for the aorta'], 0,
            'It is an indentation on the left lung that allows space for the heart.', L_GROSS),
    ],
)

stomach = lesson(
    id='stomach', title='Stomach', part='stomach', parts=['stomach'],
    topic='digestive', source='OpenStax A&P 2e: 23.4 The Stomach; 23.3',
    oneLine={
        'main': F('The J-shaped bag between the oesophagus and the duodenum that holds food, churns it and starts digesting protein.', S_INTRO, S_ROLES,
                  check=f'{NOT_IN} The stomach’s J shape.'),
        'simpler': F('Your stomach stores a meal and mixes it with acid juices before passing it on.', S_HOLD, S_MIXING),
        'deeper': F('It turns food into chyme and releases it into the small intestine a little at a time.', S_HOLD),
    },
    where={
        'facts': [
            F('It lies just below the oesophagus and links it to the duodenum.', S_INTRO),
            F('Its two ends are fixed; the part between them can move and change size.', S_INTRO),
        ],
        'simpler': F('It sits in the upper abdomen, under the diaphragm, mostly on the left.', S_REGIONS,
                     check=f'{NOT_IN} That the stomach lies mostly on the left.'),
        'deeper': F('The lesser omentum ties it to the liver; the greater omentum hangs from its greater curvature.', S_CURVES),
    },
    features={
        'items': [
            FEAT('Cardia', 'Where the oesophagus joins and food enters.', S_REGIONS),
            FEAT('Fundus', 'The dome above and to the left of the cardia, under the diaphragm.', S_REGIONS),
            FEAT('Body', 'The main part of the stomach.', S_REGIONS),
            FEAT('Pylorus', 'The funnel to the duodenum, ending at the pyloric sphincter, which controls emptying.', S_REGIONS),
            FEAT('Rugae', 'Large folds of mucosa and submucosa that form when the stomach is empty.', S_REGIONS),
        ],
        'simpler': F('Four regions: the cardia, fundus, body and pylorus.', S_REGIONS),
        'deeper': F('It has an extra, inner oblique layer of smooth muscle, so it can churn food vigorously.', S_WALL),
    },
    formFunction={
        'facts': [
            F('Empty it is about the size of a fist, yet it can stretch to hold about 4 litres.', S_INTRO),
            F('Parietal cells make hydrochloric acid and intrinsic factor; chief cells make pepsinogen.', S_PARIETAL, S_CHIEF),
            F('Mucus rich in bicarbonate, tight junctions and fast cell renewal protect the stomach from digesting itself.', S_BARRIER),
        ],
        'simpler': F('It stretches to hold a meal, makes strong acid, and protects itself with a mucus lining.', S_INTRO, S_PARIETAL, S_BARRIER),
    },
    relations={
        'items': [
            REL('organ', 'Oesophagus', 'Enters through the oesophageal hiatus of the diaphragm and joins at the cardia.', OESOPHAGUS, S_REGIONS),
            REL('organ', 'Duodenum', 'Receives chyme through the pyloric sphincter.', S_REGIONS),
            REL('organ', 'Liver', 'Joined to the lesser curvature by the lesser omentum.', S_CURVES),
            REL('membrane', 'Greater omentum', 'Runs from the greater curvature to the posterior abdominal wall.', S_CURVES),
            REL('hormone', 'Gastrin', 'Made mainly by G cells of the pyloric antrum. It increases gastric secretion and emptying.', S_GASTRIN, S_HORMONES),
        ],
        'simpler': F('Food comes in from the oesophagus and goes on to the duodenum.', S_REGIONS),
    },
    development={
        'facts': [
            F('It develops as a widening of the foregut, the same tube that also gives rise to the lung bud.', L_BUD,
              check=f'{NOT_IN} The development of the stomach from the foregut.'),
        ],
    },
    variations={
        'facts': [
            F('Its size and position change with every meal, as it fills, churns and empties.', S_INTRO),
        ],
    },
    clinical={
        'items': [
            CLIN('Long use of non-steroidal anti-inflammatory drugs (NSAIDs) such as aspirin, or Helicobacter pylori infection.', 'The mucosal barrier, letting acid erode the lining (a peptic ulcer).',
                 'Eat without “burning” pain and indigestion.', 'Gastric juice eats deeper into the unprotected mucosa.', S_ULCER_CAUSES, S_EROSIONS, S_ULCER_TREAT),
            CLIN('An ulcer that erodes right through the stomach wall.', 'The whole wall, now perforated, and the peritoneum.',
                 'Recover without surgery.', 'Stomach contents leak through the hole and inflame the peritoneum (peritonitis).', S_PERFORATION),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the stomach does not digest itself.',
                ['A thick mucus coat rich in bicarbonate neutralises acid.', 'Tight junctions stop gastric juice getting between the cells.',
                 'Stem cells replace damaged surface cells quickly.', 'Together these form the mucosal barrier.'], S_BARRIER),
            TUT('compare', 'Compare parietal cells and chief cells.',
                ['Both lie in the gastric glands.', 'Parietal cells make hydrochloric acid and intrinsic factor.',
                 'Chief cells make pepsinogen.', 'The acid converts pepsinogen into active pepsin.'], S_PARIETAL, S_CHIEF),
            TUT('predict', 'Predict the effect of the enterogastric reflex when the duodenum fills with chyme.',
                ['Distension of the duodenum triggers the reflex.', 'Gastric secretion is inhibited.',
                 'The pyloric sphincter closes.', 'So no more chyme enters until the duodenum is ready.'], S_INTESTINAL_PHASE),
        ],
    },
    check=[
        MCQ('Which cells secrete hydrochloric acid?', ['Chief cells', 'Parietal cells', 'G cells', 'Mucous neck cells'], 1,
            'Parietal cells produce hydrochloric acid and intrinsic factor.', S_PARIETAL),
        MCQ('Which region of the stomach connects to the duodenum?', ['Pylorus', 'Fundus', 'Cardia', 'Body'], 0,
            'The funnel-shaped pylorus connects the stomach to the duodenum.', S_REGIONS),
        MCQ('What causes most peptic ulcers?', ['Too much mucus', 'Gastrin deficiency', 'Lack of intrinsic factor', 'NSAIDs or Helicobacter pylori infection'], 3,
            'The majority of ulcers are caused by NSAIDs or Helicobacter pylori infection.', S_ULCER_CAUSES),
    ],
)

small_intestine = lesson(
    id='small-intestine', title='Small intestine', part='jejunum', parts=['duodenum', 'jejunum'],
    topic='digestive', source='OpenStax A&P 2e: 23.5 The Small and Large Intestines',
    oneLine={
        'main': F('The longest part of the digestive tract, where most digestion and practically all absorption take place.', SI_INTRO),
        'simpler': F('Your small intestine is a long, coiled tube that absorbs the nutrients from your food.', SI_INTRO),
        'deeper': F('It is “small” only in diameter: about 2.5 cm, against 7.6 cm for the large intestine.', SI_INTRO),
    },
    where={
        'facts': [
            F('It runs from the pyloric sphincter of the stomach to the caecum of the large intestine.', SI_DUODENUM, SI_ILEUM),
            F('The jejunum and ileum hang from the posterior abdominal wall by the mesentery, framed by the large intestine.', SI_ILEUM),
        ],
        'simpler': F('It is coiled up in the middle of your abdomen, ringed by the large intestine.', SI_ILEUM),
        'deeper': F('The duodenum curves behind the peritoneum (retroperitoneal) round the head of the pancreas.', SI_DUODENUM),
    },
    features={
        'items': [
            FEAT('Duodenum', 'The shortest part, about 25 cm. It receives bile and pancreatic juice.', SI_DUODENUM, SI_AMPULLA),
            FEAT('Jejunum', 'About 0.9 m in life. Its name means “empty”.', SI_JEJUNUM),
            FEAT('Ileum', 'The longest part, about 1.8 m. It joins the caecum at the ileocaecal valve.', SI_ILEUM),
            FEAT('Circular folds', 'Deep ridges of mucosa and submucosa that make chyme spiral and slow down.', SI_FOLDS),
            FEAT('Villi and microvilli', 'Finger-like projections and their tiny surface extensions, the brush border.', SI_VILLI, SI_MICROVILLI),
        ],
        'simpler': F('Three parts, the duodenum, jejunum and ileum, lined with folds and tiny finger-like villi.', SI_REGIONS, SI_VILLI),
        'deeper': F('Circular folds, villi and microvilli increase its absorptive surface more than 600-fold.', SI_AREA),
    },
    formFunction={
        'facts': [
            F('Each villus holds a capillary bed and a lacteal, so absorbed nutrients pass straight into blood or lymph.', SI_VILLI),
            F('Enzymes fixed to the microvilli finish digesting carbohydrates and proteins.', SI_MICROVILLI),
            F('Segmentation mixes chyme with digestive juices and presses it against the mucosa.', SI_SEGMENTATION),
        ],
        'simpler': F('A huge, finger-covered surface and churning movements help it absorb food.', SI_AREA, SI_SEGMENTATION),
    },
    relations={
        'items': [
            REL('organ', 'Stomach', 'Releases chyme into the duodenum through the pyloric sphincter.', SI_DUODENUM),
            REL('duct', 'Bile duct and pancreatic duct', 'Join at the hepatopancreatic ampulla and open into the duodenum.', SI_AMPULLA),
            REL('organ', 'Large intestine (caecum)', 'Receives food residue from the ileum through the ileocaecal valve.', SI_ILEUM, SI_VALVE),
            REL('artery', 'Superior mesenteric artery', 'Its main arterial supply.', SI_SUPPLY),
            REL('vein', 'Hepatic portal vein', 'Carries nutrient-rich blood from it to the liver.', SI_SUPPLY),
        ],
        'simpler': F('It starts at the stomach and ends at the large intestine, and its blood goes to the liver.', SI_DUODENUM, SI_ILEUM, SI_SUPPLY),
    },
    development={
        'facts': [
            F('It develops from the midgut of the embryo.', check=f'{NOT_IN} The development of the small intestine.'),
        ],
    },
    variations={
        'facts': [
            F('Peyer’s patches in the ileum are most prominent in young people and fade with age.', SI_PEYER),
            F('Some human populations keep making lactase as adults; in others, lactose intolerance is common.', SI_LACTOSE),
        ],
    },
    clinical={
        'items': [
            CLIN('Too little lactase made by the absorptive cells.', 'Digestion of lactose, the milk sugar (lactose intolerance).',
                 'Eat dairy without gas, cramps, bloating and diarrhoea.', 'Bacteria in the large intestine ferment the undigested lactose, making gas.', SI_LACTOSE, SI_LACTOSE_SIGNS),
            CLIN('Damage that flattens the villi.', 'The absorptive surface of the small intestine.',
                 'Absorb nutrients normally.', 'The surface area for absorption falls sharply.', SI_AREA, SI_VILLI,
                 check=f'{NOT_IN} Conditions that flatten the villi and their effects.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the small intestine has such a large absorptive surface.',
                ['Circular folds make chyme spiral and slow down.', 'Villi cover the folds, about 20–40 per square millimetre.',
                 'Microvilli cover the cells of each villus.', 'Together they increase the surface more than 600-fold.'], SI_FOLDS, SI_VILLI, SI_AREA),
            TUT('compare', 'Compare the duodenum and the ileum.',
                ['Duodenum: shortest, about 25 cm, partly retroperitoneal.', 'It receives bile and pancreatic juice and has Brunner’s glands.',
                 'Ileum: longest, about 1.8 m, on the mesentery.', 'It has Peyer’s patches and ends at the ileocaecal valve.'], SI_DUODENUM, SI_BRUNNER, SI_ILEUM, SI_PEYER),
            TUT('predict', 'Predict what happens in the colon of someone with lactose intolerance after drinking milk.',
                ['Lactose passes undigested through the small intestine.', 'Bacteria in the large intestine ferment it.',
                 'This produces gas, including hydrogen.', 'Cramps, bloating and diarrhoea follow.'], SI_LACTOSE_SIGNS, 's23-5#fs-id1761464'),
        ],
    },
    check=[
        MCQ('Which is the longest part of the small intestine?', ['Duodenum', 'Jejunum', 'Ileum', 'Caecum'], 2,
            'The ileum, about 1.8 m long, is the longest part.', SI_ILEUM),
        MCQ('What is a lacteal?', ['A lymphatic capillary in a villus', 'A gland in the duodenum', 'A fold of the mucosa', 'An enzyme for lactose'], 0,
            'Each villus contains a lymphatic capillary called a lacteal.', SI_VILLI),
        MCQ('Where do bile and pancreatic juice enter the small intestine?', ['Ileum', 'Duodenum', 'Jejunum', 'Ileocaecal valve'], 1,
            'Both reach the duodenum through the hepatopancreatic ampulla.', SI_AMPULLA),
    ],
)

liver = lesson(
    id='liver', title='Liver', part='liver', parts=['liver'],
    topic='digestive', source='OpenStax A&P 2e: 23.6 Accessory Organs in Digestion: The Liver, Pancreas, and Gallbladder',
    oneLine={
        'main': F('The largest gland in the body: it makes bile and processes the nutrients and toxins absorbed from the gut.', LV_PLACE, LV_SINUSOIDS, 'glossary:liver'),
        'simpler': F('Your liver is a big organ under your right ribs. It makes bile and cleans your blood.', LV_PLACE, LV_SINUSOIDS),
        'deeper': F('Besides digestion, it has many roles in metabolism and regulation.', LV_PLACE),
    },
    where={
        'facts': [
            F('It lies below the diaphragm in the right upper quadrant of the abdomen, protected by the ribs.', LV_PLACE),
            F('Peritoneal folds called ligaments attach it to the diaphragm and the abdominal wall.', LV_LOBES),
        ],
        'simpler': F('It sits high on the right side of your abdomen, under your ribs.', LV_PLACE),
        'deeper': F('The lesser omentum tethers it to the lesser curvature of the stomach.', LV_LOBES),
    },
    features={
        'items': [
            FEAT('Right and left lobes', 'A large right lobe and a much smaller left lobe.', LV_LOBES),
            FEAT('Quadrate and caudate lobes', 'Smaller lobes some anatomists identify within the right lobe.', LV_LOBES),
            FEAT('Falciform ligament', 'A remnant of the umbilical vein that separates the right and left lobes in front.', LV_LOBES),
            FEAT('Porta hepatis', 'The “gate” where the hepatic artery and hepatic portal vein enter.', LV_PORTA),
        ],
        'simpler': F('Two main lobes, with vessels entering at a “gate”, the porta hepatis.', LV_LOBES, LV_PORTA),
        'deeper': F('It weighs about three pounds (about 1.4 kg) in an adult.', LV_PLACE),
    },
    formFunction={
        'facts': [
            F('Hepatocytes, about 80 percent of its volume, line porous sinusoids and process what the blood brings.', LV_CELLS, LV_SINUSOIDS),
            F('It makes about one litre of bile a day; bile salts emulsify fats.', LV_BILE_MAKE, LV_BILE),
            F('Bile salts are reclaimed in the ileum and recycled (the enterohepatic circulation).', LV_ENTEROHEPATIC),
        ],
        'simpler': F('Its cells sit right against the blood, clean it, and make bile to break up fats.', LV_SINUSOIDS, LV_BILE),
    },
    relations={
        'items': [
            REL('vein', 'Hepatic portal vein', 'It brings nutrient-rich blood from the gut, and supplies more oxygen than the hepatic artery.', LV_PORTA),
            REL('artery', 'Hepatic artery', 'Brings oxygenated blood from the heart.', LV_PORTA),
            REL('organ', 'Gallbladder', 'Stores and concentrates the bile between meals.', LV_BETWEEN_MEALS, ACCESSORY),
            REL('duct', 'Common bile duct', 'Formed by the common hepatic and cystic ducts; carries bile to the duodenum.', LV_DUCTS),
            REL('muscle', 'Diaphragm', 'Lies directly above it.', LV_PLACE),
        ],
        'simpler': F('Blood comes in from the gut and the heart; bile goes out to the gallbladder and duodenum.', LV_PORTA, LV_DUCTS),
    },
    development={
        'facts': [
            F('The falciform ligament and the ligamentum teres hepatis are remnants of the fetal umbilical vein.', LV_LOBES),
        ],
    },
    variations={
        'facts': [
            F('Some anatomists divide the right lobe further into quadrate and caudate lobes.', LV_LOBES),
        ],
    },
    clinical={
        'items': [
            CLIN('A blockage that stops bile reaching the intestine.', 'The flow of bile into the duodenum.',
                 'Digest fats normally: the stool is pale (acholic) and fatty.', 'Without bile, fats are not emulsified and bilirubin does not colour the stool.', LV_BILIRUBIN, LV_BILE),
            CLIN('A build-up of bilirubin when red cell breakdown or bile flow goes wrong.', 'The liver’s excretion of bilirubin into bile.',
                 'Clear bilirubin: the skin and eyes turn yellow (jaundice).', 'Bilirubin is a waste of old red cells that the liver normally excretes in bile.', LV_BILIRUBIN,
                 check=f'{NOT_IN} Jaundice and its causes.'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain how bile helps digest fats.',
                ['Fats do not dissolve in the watery chyme.', 'Bile salts have a water-loving and a fat-loving region.',
                 'They pull large fat globules apart into droplets about 1 micrometre across.', 'This emulsification gives lipase a larger surface to act on.'], LV_BILE, LV_BILE_MAKE),
            TUT('compare', 'Compare the blood the liver receives from the hepatic artery and the hepatic portal vein.',
                ['The hepatic artery brings oxygenated blood from the heart.', 'The portal vein brings partly deoxygenated, nutrient-rich blood from the gut.',
                 'The portal vein also carries absorbed drugs and toxins.', 'It actually supplies more oxygen than the smaller hepatic arteries.'], LV_PORTA),
            TUT('predict', 'Predict what happens to bile between meals.',
                ['The liver keeps making bile.', 'The hepatopancreatic ampulla closes.',
                 'Bile is diverted into the gallbladder.', 'There it is concentrated and stored until the next meal.'], LV_BETWEEN_MEALS),
        ],
    },
    check=[
        MCQ('Where is the liver?', ['Left upper quadrant', 'Right upper quadrant', 'Behind the stomach in the retroperitoneum', 'In the pelvis'], 1,
            'It lies inferior to the diaphragm in the right upper quadrant.', LV_PLACE),
        MCQ('What enters the liver at the porta hepatis?', ['Hepatic artery and hepatic portal vein', 'Hepatic veins', 'Inferior vena cava', 'Cystic duct'], 0,
            'The hepatic artery and hepatic portal vein enter at the porta hepatis.', LV_PORTA),
        MCQ('What gives faeces their brown colour?', ['Bile salts', 'Cholesterol', 'Lecithin', 'Stercobilin, from bilirubin'], 3,
            'Intestinal bacteria turn bilirubin into stercobilin, a brown pigment.', LV_BILIRUBIN),
    ],
)

pancreas = lesson(
    id='pancreas', title='Pancreas', part='pancreas', parts=['pancreas'],
    topic='digestive', source='OpenStax A&P 2e: 23.6 Accessory Organs in Digestion; 17.9 The Endocrine Pancreas',
    oneLine={
        'main': F('A gland behind the stomach that makes digestive juice for the duodenum and hormones that control blood glucose.', P_PLACE, P_ENDOCRINE),
        'simpler': F('Your pancreas makes juices to digest food and insulin to manage sugar in your blood.', P_JUICE, P_CELLS),
        'deeper': F('It is both exocrine (enzymes into ducts) and endocrine (hormones into the blood).', P_PLACE),
    },
    where={
        'facts': [
            F('It lies across the back of the abdomen, behind the stomach, in the retroperitoneum.', P_PLACE),
            F('Its head sits in the C-shaped curve of the duodenum; its tail reaches the spleen.', P_PLACE),
        ],
        'simpler': F('It lies flat behind your stomach, from the duodenum across to the spleen.', P_PLACE),
        'deeper': F('Its body extends about 15 cm to the left of the head.', P_PLACE),
    },
    features={
        'items': [
            FEAT('Head, body and tail', 'Head in the duodenal curve, body extending left, tail at the hilum of the spleen.', P_PLACE),
            FEAT('Acini', 'Grape-like clusters of cells that make pancreatic juice.', P_ACINI),
            FEAT('Pancreatic islets', 'Islands of endocrine cells among the acini (formerly the islets of Langerhans).', P_ISLETS, P_ENDOCRINE),
            FEAT('Pancreatic ducts', 'The main duct joins the bile duct at the hepatopancreatic ampulla. A smaller accessory duct may open separately.', P_ACINI),
        ],
        'simpler': F('Mostly juice-making cells, with small islands of hormone-making cells.', P_ACINI, P_ISLETS),
        'deeper': F('In each islet, beta cells (insulin) make up about 75 percent and alpha cells (glucagon) about 20 percent.', P_CELLS),
    },
    formFunction={
        'facts': [
            F('It makes over a litre of pancreatic juice a day; its bicarbonate buffers the acidic chyme.', P_JUICE),
            F('Protein-digesting enzymes are made inactive, so they cannot digest the pancreas itself.', P_INACTIVE),
            F('Insulin lowers blood glucose; glucagon raises it.', P_TABLE),
        ],
        'simpler': F('Its juice neutralises stomach acid and digests food; its hormones balance blood sugar.', P_JUICE, P_TABLE),
    },
    relations={
        'items': [
            REL('organ', 'Duodenum', 'Curves round the head of the pancreas and receives its juice.', SI_DUODENUM, P_ACINI),
            REL('duct', 'Common bile duct', 'Joins the main pancreatic duct just before the duodenum.', P_ACINI),
            REL('organ', 'Stomach', 'Lies in front of the pancreas.', P_PLACE),
            REL('organ', 'Spleen', 'The tail of the pancreas ends at its hilum.', P_PLACE),
            REL('hormone', 'Cholecystokinin', 'From I cells of the duodenum; stimulates the release of pancreatic juices and bile.', SI_HORMONE_CELLS),
        ],
        'simpler': F('It is wrapped by the duodenum and shares a duct with the liver.', SI_DUODENUM, P_ACINI),
    },
    development={
        'facts': [
            F('It develops from buds of the embryonic gut tube that later fuse.', check=f'{NOT_IN} The development of the pancreas.'),
        ],
    },
    variations={
        'facts': [
            F('A smaller accessory duct, when present, opens into the duodenum about 2.5 cm (1 inch) above the main opening.', P_ACINI),
        ],
    },
    clinical={
        'items': [
            CLIN('Protein-digesting enzymes activated inside the pancreas.', 'The pancreas itself (pancreatitis).',
                 'Digest food normally, while the inflamed gland is painful.', 'Active enzymes digest the pancreatic tissue.', P_INACTIVE,
                 check=f'{NOT_IN} The symptoms of pancreatitis.'),
            CLIN('An autoimmune attack on the beta cells.', 'The beta cells of the islets (type 1 diabetes).',
                 'Make insulin: they need insulin by injection or infusion.', 'Without insulin, glucose cannot enter most body cells.', P_TYPE1, P_INSULIN),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the pancreas makes its protein-digesting enzymes in inactive forms.',
                ['Active enzymes would digest the pancreas.', 'They are released as trypsinogen and other inactive forms.',
                 'Enteropeptidase in the duodenum activates trypsin.', 'Trypsin then activates the other enzymes.'], P_INACTIVE),
            TUT('compare', 'Compare insulin and glucagon.',
                ['Insulin comes from beta cells; glucagon from alpha cells.', 'High blood glucose releases insulin; low glucose releases glucagon.',
                 'Insulin lowers blood glucose; glucagon raises it.', 'Both are controlled by negative feedback.'], P_CELLS, P_TABLE, P_GLUCAGON, P_INSULIN_MORE),
            TUT('predict', 'Predict what happens to the beta cells in long-standing type 2 diabetes.',
                ['Body cells become resistant to insulin.', 'The pancreas makes more insulin to compensate.',
                 'Over time the beta cells become exhausted.', 'Blood glucose then rises further.'], P_TYPE2),
        ],
    },
    check=[
        MCQ('Which islet cells make insulin?', ['Alpha cells', 'Delta cells', 'Beta cells', 'PP cells'], 2,
            'Beta cells, about 75 percent of each islet, produce insulin.', P_CELLS),
        MCQ('What makes pancreatic juice slightly alkaline?', ['Sodium bicarbonate', 'Hydrochloric acid', 'Bile salts', 'Insulin'], 0,
            'Sodium bicarbonate gives pancreatic juice its alkalinity.', P_JUICE),
        MCQ('Where does the head of the pancreas lie?', ['At the hilum of the spleen', 'In the C-shaped curve of the duodenum', 'Behind the liver', 'In front of the stomach'], 1,
            'Its head nestles in the C-shaped curve of the duodenum.', P_PLACE),
    ],
)

kidneys = lesson(
    id='kidneys', title='Kidneys', part='kidney_left', parts=['kidney_left', 'kidney_right', 'renal_pelvis_left', 'renal_pelvis_right'],
    topic='urinary', source='OpenStax A&P 2e: 25.2 Gross Anatomy of Urine Transport; 25.3 Gross Anatomy of the Kidney; 25.10; 17.10',
    oneLine={
        'main': F('Two bean-shaped organs at the back of the abdomen that filter the blood and make urine.', K_PLACE, K_NEPHRON,
                  check=f'{NOT_IN} The kidneys’ bean shape.'),
        'simpler': F('Your kidneys clean your blood and turn the waste into urine.', K_NEPHRON),
        'deeper': F('They also help control blood pressure, make erythropoietin and activate vitamin D.', K_FAILURE, K_HORMONES),
    },
    where={
        'facts': [
            F('They lie either side of the spine, behind the peritoneum, protected by muscle, fat and ribs.', K_PLACE),
            F('The left kidney is at about T12 to L3; the right is lower, pushed down by the liver.', K_EXTERNAL),
        ],
        'simpler': F('They sit at the back of your abdomen, partly tucked under your lowest ribs.', K_EXTERNAL),
        'deeper': F('The eleventh and twelfth ribs partly protect their upper portions.', K_EXTERNAL),
    },
    features={
        'items': [
            FEAT('Cortex', 'The lighter outer region, holding all the renal corpuscles and convoluted tubules.', K_INTERNAL, K_CORTEX),
            FEAT('Medulla', 'The inner region, with renal pyramids and papillae.', K_INTERNAL),
            FEAT('Renal pelvis', 'The funnel formed from the calyces; it narrows into the ureter.', K_HILUM, K_URETERS),
            FEAT('Hilum', 'Where vessels, nerves, lymphatics and the ureter enter and leave.', K_HILUM),
            FEAT('Capsule and fat', 'A fibrous capsule, a cushioning fat pad and renal fascia surround each kidney.', K_EXTERNAL),
        ],
        'simpler': F('An outer cortex, an inner medulla and a funnel that collects the urine.', K_INTERNAL, K_HILUM),
        'deeper': F('About 1.3 million nephrons in each kidney do the filtering.', K_ARTERIES),
    },
    formFunction={
        'facts': [
            F('Each nephron starts with a glomerulus, a tuft of high-pressure capillaries inside Bowman’s capsule.', K_NEPHRON),
            F('They receive about 25 percent of the cardiac output at rest.', K_PLACE),
            F('Smooth muscle in the renal pelvis and ureter moves urine on by peristalsis.', K_HILUM, K_URETER_WALL),
        ],
        'simpler': F('Lots of blood flows through tiny filters, and muscle squeezes the urine down to the bladder.', K_PLACE, K_NEPHRON, K_URETER_WALL),
    },
    relations={
        'items': [
            REL('gland', 'Adrenal gland', 'Sits on top of each kidney; its aldosterone makes the kidney keep sodium.', K_ADRENAL),
            REL('artery', 'Renal artery', 'Comes straight from the aorta.', K_HILUM),
            REL('vein', 'Renal vein', 'Returns cleansed blood straight to the inferior vena cava.', K_HILUM),
            REL('duct', 'Ureter', 'About 30 cm long; carries urine from the renal pelvis to the bladder.', K_URETER_WALL, K_URETERS),
            REL('organ', 'Liver', 'Pushes the right kidney a little lower than the left.', K_EXTERNAL),
        ],
        'simpler': F('Blood comes from the aorta and goes back to the vena cava; urine goes down the ureter.', K_HILUM),
    },
    development={
        'facts': [
            F('They develop in the pelvis and rise to their adult position in the abdomen.', check=f'{NOT_IN} The development of the kidneys.'),
        ],
    },
    variations={
        'facts': [
            F('The male kidney is usually a little larger than the female.', K_PLACE),
        ],
    },
    clinical={
        'items': [
            CLIN('Kidney failure.', 'The kidneys’ filtering and their hormone roles.',
                 'Keep enough red blood cells, or absorb calcium normally.', 'Failing kidneys make too little erythropoietin and active vitamin D.', K_FAILURE, K_VITAMIN_D),
            CLIN('Glomeruli damaged by an autoimmune illness.', 'The glomerular filter, which lets protein through.',
                 'Keep protein in the blood: it is lost in the urine, and oedema spreads.', 'Low plasma protein lets water move out of the blood into the tissues.', 's25-10#fs-id2096572'),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why the right kidney lies lower than the left.',
                ['Both lie behind the peritoneum either side of the spine.', 'The liver lies on the right, in the upper abdomen.',
                 'It displaces the right kidney slightly downwards.', 'So the left is at about T12 to L3 and the right a little lower.'], K_EXTERNAL, LV_PLACE),
            TUT('compare', 'Compare the renal cortex and medulla.',
                ['The cortex is outer and lighter.', 'It holds the renal corpuscles and convoluted tubules.',
                 'The medulla is inner, with pyramids and papillae.', 'Its papillae carry urine to the calyces.'], K_INTERNAL, K_CORTEX),
            TUT('predict', 'Predict a blood change in long-term kidney failure.',
                ['The kidneys make erythropoietin.', 'Erythropoietin stimulates red blood cell formation.',
                 'Failing kidneys make too little of it.', 'So red blood cells fall (anaemia).'], K_EPO, K_FAILURE,
                check=f'{NOT_IN} Anaemia in kidney failure.'),
        ],
    },
    check=[
        MCQ('At about which vertebral levels is the left kidney?', ['T12 to L3', 'T6 to T9', 'L4 to S1', 'C7 to T2'], 0,
            'The left kidney is at about T12 to L3; the right is lower.', K_EXTERNAL),
        MCQ('Which hormone do the kidneys make that stimulates red blood cell formation?', ['Renin', 'Aldosterone', 'Calcitonin', 'Erythropoietin'], 3,
            'The kidneys produce erythropoietin (EPO).', K_EPO),
        MCQ('Where are the renal corpuscles?', ['Medulla', 'Renal pelvis', 'Cortex', 'Papillae'], 2,
            'All renal corpuscles lie in the cortex.', K_CORTEX),
    ],
)

thyroid = lesson(
    id='thyroid-gland', title='Thyroid gland', part='thyroid_gland', parts=['thyroid_gland'],
    topic='endocrine', source='OpenStax A&P 2e: 17.4 The Thyroid Gland',
    oneLine={
        'main': F('A butterfly-shaped gland in front of the trachea that makes the hormones that set the metabolic rate.', T_PLACE, T_FUNCTION),
        'simpler': F('Your thyroid is a small gland in your neck. Its hormones control how fast your body uses energy.', T_PLACE, T_FUNCTION),
        'deeper': F('It makes triiodothyronine (T₃) and thyroxine (T₄) from iodine, and calcitonin from its parafollicular cells.', T_ASSEMBLY, T_STEPS, T_CALCITONIN),
    },
    where={
        'facts': [
            F('It lies in front of the trachea, just below the larynx.', T_PLACE),
            F('The parathyroid glands are embedded in the back of its lobes.', T_PLACE),
        ],
        'simpler': F('It sits low in the front of your neck, below your voice box.', T_PLACE),
        'deeper': F('Its two lobes wrap round the sides of the trachea, joined by the isthmus in front.', T_PLACE,
                    check=f'{NOT_IN} That the lobes wrap round the sides of the trachea.'),
    },
    features={
        'items': [
            FEAT('Isthmus', 'The narrow middle part that joins the two lobes.', T_PLACE),
            FEAT('Lobes', 'Wing-shaped right and left lobes either side of the isthmus.', T_PLACE),
            FEAT('Follicles', 'Hollow spheres of follicle cells filled with colloid, where the hormones are made.', T_PLACE, T_ASSEMBLY),
            FEAT('Parafollicular (C) cells', 'Cells between the follicles that make calcitonin.', T_CALCITONIN),
        ],
        'simpler': F('Two wings joined in the middle, full of tiny hormone-making sacs.', T_PLACE),
        'deeper': F('Iodine attaches to thyroglobulin in the colloid to build the hormones.', T_ASSEMBLY),
    },
    formFunction={
        'facts': [
            F('Triiodothyronine (T₃) and thyroxine (T₄) raise the basal metabolic rate, the energy the body uses at rest.', T_FUNCTION, T_STEPS),
            F('They are needed for growth, and especially for the developing nervous system.', T_GROWTH),
            F('Thyroid hormone release is controlled by thyroid-stimulating hormone (TSH) from the pituitary, by negative feedback.', T_REGULATION),
        ],
        'simpler': F('Its hormones turn up the body’s energy use and help children grow.', T_FUNCTION, T_GROWTH),
    },
    relations={
        'items': [
            REL('airway', 'Trachea', 'Lies directly behind the gland.', T_PLACE),
            REL('airway', 'Larynx', 'Lies just above it.', T_PLACE),
            REL('gland', 'Parathyroid glands', 'Embedded in the back of its lobes.', T_PLACE),
            REL('gland', 'Anterior pituitary', 'Releases TSH, which stimulates the thyroid.', T_REGULATION),
            REL('brain', 'Hypothalamus', 'Releases thyrotropin-releasing hormone (TRH), which triggers TSH secretion.', T_REGULATION),
        ],
        'simpler': F('It sits on the windpipe, below the voice box, and is controlled by the pituitary.', T_PLACE, T_REGULATION),
    },
    development={
        'facts': [
            F('Its hormones are critical for normal development of the nervous system before birth and in early childhood.', T_GROWTH),
        ],
    },
    variations={
        'facts': [
            F('Where diets lack iodine, iodised salt is the main source in many countries.', T_IODINE),
        ],
    },
    clinical={
        'items': [
            CLIN('Too little iodine in the diet.', 'Hormone production in the thyroid follicles.',
                 'Make T₃ and T₄: the gland swells into a goitre.', 'TSH rises, and colloid builds up in the overstimulated follicles.', T_GOITRE),
            CLIN('Inflammation of the thyroid gland.', 'The thyroid’s hormone output (hypothyroidism).',
                 'Keep a normal metabolic rate: they gain weight, and their hands and feet are cold.', 'Low T₃ and T₄ slow the use of energy throughout the body.', T_HYPO, T_FUNCTION),
        ],
    },
    tutorial={
        'items': [
            TUT('explain', 'Explain why iodine deficiency causes a goitre.',
                ['Without iodine, T₃ and T₄ cannot be made.', 'Low T₃ and T₄ remove negative feedback.',
                 'TSH secretion increases.', 'Overstimulated follicles store more colloid, and the gland enlarges.'], T_GOITRE, T_REGULATION),
            TUT('compare', 'Compare follicle cells and parafollicular cells.',
                ['Follicle cells surround the colloid and make T₃ and T₄.', 'Their hormones raise the metabolic rate.',
                 'Parafollicular cells lie between follicles and make calcitonin.', 'Calcitonin tends to lower blood calcium.'], T_PLACE, T_ASSEMBLY, T_CALCITONIN),
            TUT('predict', 'Predict the TSH level in someone with low T₃ and T₄ from thyroid inflammation.',
                ['Low T₃ and T₄ reduce negative feedback.', 'The hypothalamus releases more TRH.',
                 'The pituitary releases more TSH.', 'So TSH is high.'], T_REGULATION, T_HYPO),
        ],
    },
    check=[
        MCQ('Which cells make calcitonin?', ['Follicle cells', 'Parafollicular cells', 'Chief cells', 'Beta cells'], 1,
            'Parafollicular (C) cells between the follicles make calcitonin.', T_CALCITONIN),
        MCQ('Which hormone stimulates the thyroid to release T₃ and T₄?', ['TRH', 'Growth hormone', 'TSH', 'Calcitonin'], 2,
            'Thyroid-stimulating hormone (TSH) from the anterior pituitary stimulates release.', T_REGULATION),
        MCQ('Where is the thyroid gland?', ['In front of the trachea, below the larynx', 'Behind the oesophagus', 'On top of the kidneys', 'In the mediastinum'], 0,
            'It lies anterior to the trachea, just inferior to the larynx.', T_PLACE),
    ],
)

if __name__ == '__main__':
    write(heart, lungs, stomach, small_intestine, liver, pancreas, kidneys, thyroid)
