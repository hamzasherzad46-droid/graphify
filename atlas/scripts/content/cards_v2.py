# Layered flashcards for every Skull and Upper limb structure lesson, in the approved format (after the review of
# 25 November 2026). Each card is built from its lesson's own statements, so every source and every † carries over
# unchanged; only the front, the answer and the exam trap are written here, each with its own sources.
# The ten reviewed sample cards are kept as they are.
#   python3 scripts/content/cards_v2.py
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
REVIEWER = 'reviewer:2026-11-25'


def load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


BONES = {}
for name in os.listdir(os.path.join(ROOT, 'content', 'bones')):
    b = load(f'content/bones/{name}')
    BONES[b['id']] = b['name']

sentences = lambda t: [s for s in re.split(r'(?<=[.!?])\s+(?=[A-Z“"(])', t.strip()) if s]


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


def fact(f, text=None):
    out = {'t': text or f['t'], 'src': list(f['src'])}
    if f.get('check'):
        out['check'] = f['check']
    return out


def feature_line(item):
    """A key feature as one Go deeper line ("Glabella: a slight hollow …"), if it reads as one short sentence."""
    t = item['t']
    if len(sentences(t)) != 1:
        return None
    line = f"{item['name']}: {t[0].lower() + t[1:]}"
    return fact(item, line) if len(line) <= 115 else None


def clinical(c):
    """The lesson's first clinical case, as injury and reason (at most three sentences)."""
    # Injury, structure damaged, reason, as whole sentences: a bare noun phrase ("The stapes.") becomes "It affects the stapes."
    damaged = c['damaged']
    head = re.split(r'[;:,(]', damaged)[0].strip().rstrip('.').lower().removeprefix('the ')
    if head and head in c['injury'].lower():
        damaged = ''  # the injury already names it ("…fixes the stapes…"; "…across the surgical neck")
    elif damaged.startswith(('Possibly', 'Nothing')):
        pass
    elif not re.search(r'\b(is|are|was|may|can|breaks?|tears?|dislocates?|fuses?|swells?|collects?|chips?|leaves?|wears?)\b', damaged):
        damaged = f'It affects {damaged[0].lower() + damaged[1:]}' if damaged.startswith('The ') else f'There is {damaged[0].lower() + damaged[1:]}'
    for t in (' '.join(x for x in (c['injury'], damaged, c['why']) if x), ' '.join(x for x in (c['injury'], damaged) if x)):
        if len(sentences(t)) <= 3:
            return fact(c, t)
    return fact(c, ' '.join(sentences(f"{c['injury']} {damaged}")[:3]))


# Exam traps: written for the cards, each with its own source.
TRAPS = {
    'humerus': ('The surgical neck, not the anatomical neck, is the common fracture site.', ['s8-2#fs-id2110691']),
    'scapula': ('The acromion forms the tip of the shoulder; the coracoid process is the hook at the front.', ['s8-1#fs-id1475196']),
    'scaphoid': ('Only the scaphoid and lunate meet the radius directly; the triquetrum meets the articular disc.', ['s8-2#fs-id1882937', REVIEWER]),
    'mandible': ('The condyle forms the jaw joint; the coronoid process is the front projection, for a biting muscle.', ['s7-2#fs-id1370107']),
    'clavicle': ('The clavicle forms from membrane, not cartilage: the only limb or girdle bone to do so.', ['s8-5#fs-id1375181']),
    'radius': ('The radius is lateral (thumb side), and its head is at the elbow, not the wrist.', ['s8-2#fs-id1415448', 's8-2#fs-id1411842']),
    'ulna': ('The ulna’s head is at the wrist; the bony point of the elbow is the olecranon.', ['s8-2#fs-id1266017', 's8-2#fs-id2080518']),
    'lunate': ('The lunate meets the radius directly; the triquetrum beside it meets the articular disc instead.', ['s8-2#fs-id1882937', REVIEWER]),
    'triquetrum': ('The bump you feel at the base of the palm is the pisiform, which sits on the triquetrum.', ['s8-2#fs-id1977414']),
    'pisiform': ('The pisiform sits on the triquetrum, not on the hamate, though both are on the little-finger side.', ['s8-2#fs-id1977414']),
    'trapezium': ('The trapezium is next to the thumb; the trapezoid is beside it, towards the index finger.', ['glossary:trapezium', 'glossary:trapezoid']),
    'trapezoid': ('The trapezoid meets only the second metacarpal; the trapezium meets the first and second.', ['glossary:trapezoid', 'glossary:trapezium']),
    'capitate': ('The capitate is third in the distal row from the thumb side, between the trapezoid and the hamate.', ['glossary:capitate']),
    'hamate': ('The hamate carries the fourth and fifth metacarpals; the capitate carries mainly the third.', ['glossary:hamate', 'glossary:capitate']),
    'metacarpals': ('The metacarpals are numbered from the thumb: the first is at the base of the thumb.', ['s8-2#fs-id1242304']),
    'hand-phalanges': ('The thumb has two phalanges, with no middle phalanx; each finger has three.', ['s8-2#fs-id2002490']),
    'frontal': ('The frontal bone forms the roof of the orbit; the floor is mainly the maxilla.', ['s7-2#fs-id1887927']),
    'parietal': ('The sagittal suture joins the two parietal bones; the coronal suture joins them to the frontal bone.', ['s7-2#fs-id1248497']),
    'temporal': ('The mastoid process is the bump behind the ear; the styloid process is a separate, pen-like spike.', ['s7-2#fs-id2010718', 's7-2#fs-id1882965']),
    'occipital': ('The occipital condyles meet the first cervical vertebra (atlas), not the second (axis).', ['s7-2#fs-id1478275', 's7-3#fs-id2228247']),
    'ethmoid': ('The inferior nasal concha is a separate bone; only the superior and middle conchae belong to the ethmoid.', ['s7-2#fs-id1475747']),
    'ossicles': ('The malleus is attached to the eardrum; it is the stapes that meets the oval window.', ['s14-1#fs-id2744243', 's14-1#fs-id2479589']),
    'maxilla': ('The maxillae form the front three-quarters of the hard palate; the palatine bones form the back quarter.', ['s7-2#fs-id2307253', 's7-2#fs-id1965938']),
    'zygomatic': ('The zygomatic arch has two parts: the front from the zygomatic bone, the back from the temporal bone.', ['s7-2#fs-id1285208']),
    'nasal': ('The nasal bones form only the bridge of the nose; cartilage, missing from the dry skull, shapes the rest.', ['s7-2#fs-id1899580', 's7-2#fs-id2125356']),
    'lacrimal': ('The nasolacrimal duct opens into the nasal cavity, behind the inferior concha, not into the mouth.', ['s7-2#fs-id886176']),
    'palatine': ('The palatine bones form only the back quarter of the hard palate.', ['s7-2#fs-id1965938']),
    'vomer': ('The vomer forms the lower and back septum; the ethmoid’s perpendicular plate forms the upper part.', ['s7-2#fs-id2125356']),
    'inferior-nasal-concha': ('The inferior concha is a separate bone, unlike the superior and middle conchae of the ethmoid.', ['s7-2#fs-id1475747']),
    'hyoid': ('The hyoid is not a skull bone: it touches no other bone at all.', ['s7-2#fs-id1399933']),
}

# Group lessons: a feature card instead of "name the highlighted bone" (front, answer, objective, level, sources).
GROUP_FRONTS = {
    'metacarpals': ('Which metacarpals are firmly anchored and do not move?', 'The second and third', 'State which metacarpals are immobile.', 'higher', ['s8-2#fs-id1436751']),
    'hand-phalanges': ('How many phalanges does the thumb have?', 'Two: proximal and distal', 'State the phalanges of the thumb.', 'core', ['s8-2#fs-id2002490']),
    'ossicles': ('Which auditory ossicle is attached to the oval window?', 'The stapes', 'Name the ossicle at the oval window.', 'core', ['s14-1#fs-id2479589']),
}

# Group cards: the statements that answer the front.
GROUP_WHY = {
    'metacarpals': ['formFunction.facts.1', 'formFunction.facts.2'],
    'hand-phalanges': ['where.facts.0', 'where.facts.1'],
    'ossicles': ['where.facts.2', 'formFunction.facts.1'],
}


def pick(s, path):
    v = s
    for k in path.split('.'):
        v = v[int(k)] if k.isdigit() else v[k]
    return v


# Cards already reviewed in the sample set that already name these bones on a 3D front.
HAS_IDENTIFY = {'sphenoid'}

SAMPLE_IDS = {'sk-sphenoid-identify', 'sk-foramen-magnum', 'sk-pterion-artery', 'sk-cribriform-reverse', 'ul-scaphoid-foosh', 'ul-ulnar-nerve-epicondyle',
              'ul-clavicle-strut', 'ul-radius-lateral', 'ul-axillary-surgical-neck', 'ul-carpal-tunnel-roof'}


def own_case(s):
    """The lesson's first clinical case that no other lesson shares (the carpal tunnel case appears in several)."""
    shared = {c['injury'] for other in lessons if other['id'] != s['id'] for c in other['clinical']['items']}
    return next((c for c in s['clinical']['items'] if c['injury'] not in shared), s['clinical']['items'][0])


def card_for(s):
    sid = s['id']
    prefix = 'sk' if s['topic'] == 'skull' else 'ul'
    group = sid in GROUP_FRONTS
    name = s.get('title') or BONES[s['bone']]
    hook = next((fact(i) for i in s['features']['items'] if i['t'].startswith('“') and ' means ' in i['t'] and len(sentences(i['t'])) == 1), None)
    depth = [l for l in (feature_line(i) for i in s['features']['items'] if not (hook and i['t'] == hook['t'])) if l][:5]
    if len(depth) < 3:
        depth += [fact(f) for f in s['where']['facts'][1:] if len(sentences(f['t'])) == 1 and len(f['t']) <= 115][: 3 - len(depth)]
    if len(depth) < 3:
        # A two-sentence feature: its first sentence alone ("Head: the large, smooth, round top.").
        for i in s['features']['items']:
            first = sentences(i['t'])[0]
            line = f"{i['name']}: {first[0].lower() + first[1:]}"
            if len(depth) < 3 and len(line) <= 115 and not any(d['t'].startswith(i['name'] + ':') for d in depth):
                depth.append(fact(i, line))
    trap_t, trap_src = TRAPS[sid]
    card = {
        'reviewStatus': 'draft',
        'id': f'{prefix}-{sid}-{"feature" if group else "identify"}',
        'topic': s['topic'],
        'type': 'feature' if group else 'identify',
        'level': GROUP_FRONTS[sid][3] if group else 'core',
        'structureId': sid,
        'bone': s['bone'],
        'frontView': not group,
        'objective': GROUP_FRONTS[sid][2] if group else f'Identify the {name if name[0].isupper() and name.split()[0] in ("Auditory",) else name.lower()} on the skeleton.',
        'front': GROUP_FRONTS[sid][0] if group else 'Name the highlighted bone.',
        'answer': GROUP_FRONTS[sid][1] if group else BONES[s['bone']],
        'why': join(s['oneLine']['main'], s['oneLine']['deeper']),
        'simpler': fact(s['oneLine']['simpler']),
        'depth': depth,
        'clinical': clinical(own_case(s)),
        'trap': {'t': trap_t, 'src': trap_src},
        'source': s['source'],
    }
    if hook:
        card['hook'] = hook
    if group:
        card['why'] = join(*[pick(s, path) for path in GROUP_WHY[sid]])
    return card


lessons = [load(f'content/structures/{f}') for f in sorted(os.listdir(os.path.join(ROOT, 'content', 'structures')))]
for topic in ('skull', 'upper-limb'):
    path = f'content/cards/{topic}.json'
    deck = load(path)
    kept = [c for c in deck['cards'] if c['id'] in SAMPLE_IDS]
    new = [card_for(s) for s in lessons if s['topic'] == topic and s['id'] not in HAS_IDENTIFY]
    deck['cards'] = kept + new
    with open(os.path.join(ROOT, path), 'w') as f:
        json.dump(deck, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{topic}: {len(kept)} reviewed samples kept, {len(new)} new')
