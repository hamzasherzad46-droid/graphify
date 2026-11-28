# Layered flashcards for the muscle and organ lessons (male model), in the approved format. As for the bones
# (cards_v2.py), each card is built from its lesson's own statements, so every source and every † carries over
# unchanged; only the front, the answer, the objective and the exam trap are written here, each with its own sources.
# There is no 3D front: the small 3D view on a card shows bones only. "See in 3D" opens the part in the male model.
#   python3 scripts/content/cards_soft.py
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
sentences = lambda t: [s for s in re.split(r'(?<=[.!?])\s+(?=[A-Z“"(])', t.strip()) if s]


def load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


def fact(f, text=None):
    out = {'t': text or f['t'], 'src': list(f['src'])}
    if f.get('check'):
        out['check'] = f['check']
    return out


def join(*facts):
    """Facts read one after another, as one statement; their sources and checks are combined."""
    src, checks = [], []
    for f in facts:
        src += [s for s in f['src'] if s not in src]
        if f.get('check') and f['check'] not in checks:
            checks.append(f['check'])
    out = {'t': ' '.join(f['t'] for f in facts), 'src': src}
    if checks:
        out['check'] = ' '.join(checks)
    return out


def pick(s, path):
    v = s
    for k in path.split('.'):
        v = v[int(k)] if k.isdigit() else v[k]
    return v


def depth_lines(s):
    """Three to five one-line points from the key features ("Name: what it is."), first sentences where needed."""
    out = []
    for i in s['features']['items']:
        first = sentences(i['t'])[0]
        line = f"{i['name']}: {first[0].lower() + first[1:]}"
        if len(line) <= 115:
            out.append(fact(i, line))
    for f in s['formFunction']['facts']:
        if len(out) < 3 and len(sentences(f['t'])) == 1 and len(f['t']) <= 115:
            out.append(fact(f))
    return out[:5]


def clinical(c):
    """The lesson's first clinical case as one short statement: what happens, and why."""
    for t in (f"{c['injury']} {c['why']}", c['injury']):
        if len(sentences(t)) <= 3:
            return fact(c, t)
    return fact(c, ' '.join(sentences(c['injury'])[:3]))


# Per lesson: front, answer, objective, level, type, the statements that answer the front, and the exam trap.
CARDS = {
    'deltoid': ('Which muscle is the major abductor of the arm?', 'Deltoid', 'Name the major abductor of the arm.', 'core', 'function',
                ['oneLine.main', 'formFunction.facts.0'],
                ('The supraspinatus also abducts the arm, but the deltoid is the major abductor.', ['s11-5#fs-id2501482'])),
    'rotator-cuff': ('Which four muscles form the rotator cuff?', 'Supraspinatus, infraspinatus, teres minor, subscapularis',
                     'List the four rotator cuff muscles.', 'core', 'feature', ['where.facts.0', 'oneLine.deeper'],
                     ('The teres minor is a rotator cuff muscle; the teres major is not.', ['s11-5#fs-id2421860', 's11-5#fs-id2501482'])),
    'biceps-brachii': ('Besides flexing the elbow, what does the biceps brachii do to the forearm?', 'Supinates it (turns the palm up)',
                       'State the second action of the biceps brachii at the forearm.', 'core', 'function', ['formFunction.facts.0', 'oneLine.deeper'],
                       ('The brachialis, deep to the biceps, flexes the elbow but does not supinate.', ['s11-5#fs-id2831016'])),
    'diaphragm': ('Which nerve supplies the diaphragm?', 'Phrenic nerve', 'Name the nerve of the diaphragm.', 'core', 'supply',
                  ['relations.items.2'],
                  ('The phrenic nerve comes from the cervical plexus in the neck, not from the thoracic nerves.', ['s13-4#fs-id1472046'])),
    'sternocleidomastoid': ('Which way does the left sternocleidomastoid turn the face?', 'To the right (the opposite side)',
                            'State the direction of head rotation by one sternocleidomastoid.', 'higher', 'function',
                            ['formFunction.facts.0', 'formFunction.facts.1'],
                            ('Acting alone, it turns the face away from its own side but tilts the head towards it.', ['s11-3#tbl-ch11_05', 's11-3#fs-id2455581'])),
    'quadriceps-femoris': ('Which quadriceps muscle also flexes the thigh at the hip?', 'Rectus femoris', 'Name the quadriceps muscle that crosses the hip.',
                           'higher', 'function', ['formFunction.facts.0', 'formFunction.facts.1'],
                           ('Only the rectus femoris arises from the hip bone; the three vasti arise from the femur.', ['s11-6#fig-ch11_06_03'])),
    'hamstrings': ('Where do the hamstrings arise?', 'Ischial tuberosity', 'State the common origin of the hamstrings.', 'core', 'relation',
                   ['where.facts.1', 'formFunction.facts.1'],
                   ('The hamstrings flex the knee and extend the hip; the quadriceps extend the knee.', ['s11-1#tbl-ch11_01', 's11-6#fs-id2012638'])),
    'calf-muscles': ('Which calf muscle crosses the knee as well as the ankle?', 'Gastrocnemius', 'Name the calf muscle that also acts on the knee.',
                     'higher', 'compare', ['where.facts.0', 'formFunction.facts.1'],
                     ('The soleus lies deep to the gastrocnemius and arises below the knee, so it does not flex it.', ['s11-6#fs-id2421915', 's11-6#fig-ch11_06_05'])),
    'heart': ('Why is the wall of the left ventricle thicker than the right’s?', 'It pumps against the systemic circuit’s resistance',
              'Explain the thickness of the left ventricular wall.', 'higher', 'function', ['formFunction.facts.0', 'oneLine.deeper'],
              ('Both ventricles pump the same volume per beat; the left must generate more pressure.', ['s19-1#fs-id2183171'])),
    'lungs': ('How many lobes does the right lung have?', 'Three: superior, middle and inferior', 'State the lobes of the right lung.', 'core', 'feature',
              ['features.items.0', 'features.deeper'],
              ('The left lung has two lobes and the cardiac notch; the right has three.', ['s22-2#fs-id2717313', 's22-2#fs-id2627237'])),
    'stomach': ('Which cells of the gastric glands secrete hydrochloric acid?', 'Parietal cells', 'Name the gastric cells that secrete acid.', 'core', 'function',
                ['formFunction.facts.1', 'formFunction.facts.2'],
                ('Chief cells make pepsinogen; the parietal cells’ acid converts it into pepsin.', ['s23-4#fs-id1905668', 's23-4#fs-id1959017'])),
    'small-intestine': ('Which three features enlarge the absorptive surface of the small intestine?', 'Circular folds, villi and microvilli',
                        'List the features that enlarge the absorptive surface of the small intestine.', 'core', 'feature',
                        ['features.deeper', 'formFunction.facts.0'],
                        ('Villi are projections of the mucosa; microvilli are extensions of single cells (the brush border).', ['s23-5#fs-id1272744', 's23-5#fs-id810619'])),
    'liver': ('Which vessel brings nutrient-rich blood from the gut to the liver?', 'Hepatic portal vein', 'Name the vessel bringing absorbed nutrients to the liver.',
              'core', 'supply', ['relations.items.0', 'formFunction.facts.0'],
              ('The portal vein, not the smaller hepatic artery, supplies most of the liver’s oxygen.', ['s23-6#fs-id1842507'])),
    'pancreas': ('Which pancreatic islet cells make glucagon?', 'Alpha cells', 'Name the islet cells that make glucagon.', 'core', 'function',
                 ['features.deeper', 'formFunction.facts.2'],
                 ('Beta cells make insulin, which lowers blood glucose; alpha cells make glucagon, which raises it.', ['s17-9#fs-id1977301', 's17-9#tbl-ch18_07'])),
    'kidneys': ('Why does the right kidney lie lower than the left?', 'The liver pushes it down', 'Explain the lower position of the right kidney.', 'higher', 'relation',
                ['where.facts.1', 'where.facts.0'],
                ('The kidneys are retroperitoneal: behind the peritoneum, not inside the peritoneal cavity.', ['s25-3#fs-id1542887', 's25-2#fs-id2338701'])),
    'thyroid-gland': ('Which pituitary hormone stimulates the thyroid gland?', 'Thyroid-stimulating hormone (TSH)', 'Name the pituitary hormone that controls the thyroid.',
                      'core', 'function', ['formFunction.facts.2', 'formFunction.facts.0'],
                      ('The hypothalamus makes thyrotropin-releasing hormone (TRH); the anterior pituitary makes TSH.', ['s17-4#fs-id1073276'])),
}

DECKS = {'muscles': 'mu', 'heart': 'or', 'respiratory': 'or', 'digestive': 'or', 'urinary': 'or', 'endocrine': 'or'}


def card_for(s):
    front, answer, objective, level, ctype, why_paths, (trap_t, trap_src) = CARDS[s['id']]
    hook = next((fact(f) for f in [*s['features']['items'], s['features']['deeper']] if ' means ' in f['t'] and len(sentences(f['t'])) == 1), None)
    if s['id'] == 'rotator-cuff':
        hook = fact(s['features']['deeper'])  # the SITS memory aid
    card = {
        'reviewStatus': 'draft',
        'id': f"{DECKS[s['topic']]}-{s['id']}-{ctype}",
        'topic': s['topic'],
        'type': ctype,
        'level': level,
        'structureId': s['id'],
        'part': s['part'],
        'frontView': False,
        'objective': objective,
        'front': front,
        'answer': answer,
        'why': join(*[pick(s, p) for p in why_paths]),
        'simpler': fact(s['oneLine']['simpler']),
        'depth': depth_lines(s),
        'clinical': clinical(s['clinical']['items'][0]),
        'trap': {'t': trap_t, 'src': trap_src},
        'source': s['source'],
    }
    if hook:
        card['hook'] = hook
    return card


lessons = [load(f'content/structures/{f}') for f in sorted(os.listdir(os.path.join(ROOT, 'content', 'structures')))]
for topic in DECKS:
    cards = [card_for(s) for s in lessons if s['topic'] == topic and s.get('part')]
    with open(os.path.join(ROOT, 'content', 'cards', f'{topic}.json'), 'w') as f:
        json.dump({'topic': topic, 'cards': cards}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{topic}: {len(cards)} cards')
