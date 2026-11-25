# Shared helpers for the structure lesson authoring scripts (structures_v1.py, structures_upper_limb.py, …).
# A lesson is plain data: every statement is F(text, *sources, check=…). Sources are OpenStax A&P 2e paragraphs
# ("<section>#<paragraph id>"), OpenStax glossary entries ("glossary:<term>") or the academic reviewer
# (REVIEWER). `check` says exactly what still needs an approved source: the statement shows a † until it is signed off.
import json, os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'content', 'structures')
NOT_IN = 'Not in OpenStax A&P 2e (chapters 6–9, 12–16, 20).'
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


def lesson(**k):
    base = {'reviewStatus': 'draft'}
    base.update(k)
    return base


def write(*lessons):
    os.makedirs(OUT, exist_ok=True)
    for s in lessons:
        with open(os.path.join(OUT, f"{s['id']}.json"), 'w') as f:
            json.dump(s, f, ensure_ascii=False, indent=1)
            f.write('\n')
    print(f'written {len(lessons)}')
