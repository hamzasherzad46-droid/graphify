"""Writes content/parts/male.json: every muscle, connective part and organ of the male layered and organ models, by its
Atlas id, with its display name (from the Z-Anatomy name: underscores become spaces, the side letter and Z-Anatomy's
markers go, the side is shown separately), kind, layer, body system, side and display flags. The app reads names
from here; the text check checks them.

    python3 scripts/model/part_names.py public/models/tissue/layers-male-phone.glb public/models/tissue/organs-male-phone.glb
"""
import json
import os
import re
import struct
import sys
import layers

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'content', 'parts', 'male.json')

# Roman numerals in segmental bronchus names (Z-Anatomy writes "(BVIII)"): kept, with a space ("B VIII").
ROMAN = re.compile(r'\(B([IVX]+)\)')


# Names that Z-Anatomy abbreviates, misspells or orders unusually, in their Terminologia Anatomica English form (the
# Destrieux atlas labels of the cerebral cortex written out). Keyed by the name as first derived.
FIX = {
    'Lat Fis-ant-Horizont': 'Anterior horizontal ramus of lateral sulcus',
    'Lat Fis-ant-Vertical': 'Anterior ascending ramus of lateral sulcus',
    'Lat Fis-post': 'Posterior ramus of lateral sulcus',
    'Sulcus interm prim-Jensen': 'Intermediate sulcus of Jensen',
    'Insula (subcentral gyrus and ant and post sulci)': 'Subcentral gyrus and sulci',
    'Lateral occipital gyrus (middle occipital gyrus)': 'Middle occipital gyrus',
    'Medial occipitotemporal gyrus (parahippocampal)': 'Parahippocampal gyrus',
    'Occipitotemporal sulcus (lateral part)': 'Lateral occipitotemporal sulcus',
    'Orbital gyri (frontomarginal gyrus and sulcus)': 'Frontomarginal gyrus and sulcus',
    'Orbital sulci (H-shaped orbital sulci)': 'Orbital sulci (H-shaped)',
    'Orbital sulci (lateral Orbital sulcus)': 'Lateral orbital sulcus',
    'Inferior vein of left ventricle (posterior)': 'Inferior vein of left ventricle',
    'Bucinator': 'Buccinator',
    'Levator nasolabialis': 'Levator labii superioris alaeque nasi',
    'Pubo-analis muscle': 'Puboanalis muscle',
    'Meso-appendix': 'Mesoappendix',
    'Seminal gland': 'Seminal gland (seminal vesicle)',
    'Suprarenal gland': 'Suprarenal gland (adrenal gland)',
    'Tendon sheath - abd pollicis longus - ext pollicis brevis': 'Tendon sheath of abductor pollicis longus and extensor pollicis brevis',
    'Tendon sheath of extensors carpi radialis': 'Tendon sheath of extensores carpi radiales',
    'Tendon sheath of extensor digiti minimi manus': 'Tendon sheath of extensor digiti minimi',
    'Rectus posterior major capitis muscle': 'Rectus capitis posterior major muscle',
    'Rectus posterior minor capitis muscle': 'Rectus capitis posterior minor muscle',
    'Rectus anterior capitis muscle': 'Rectus capitis anterior muscle',
    'Rectus lateralis capitis muscle': 'Rectus capitis lateralis muscle',
    'Obliquus inferior capitis muscle': 'Obliquus capitis inferior muscle',
    'Obliquus superior capitis muscle': 'Obliquus capitis superior muscle',
    'Lateral crico-arytenoid muscle': 'Lateral cricoarytenoid muscle',
    'Posterior crico-arytenoid muscle': 'Posterior cricoarytenoid muscle',
    'Ary-epiglottic part of oblique arytenoid muscle': 'Aryepiglottic part of oblique arytenoid muscle',
    'Thyro-epiglottic part of thyro-arytenoid muscle': 'Thyroepiglottic part of thyroarytenoid muscle',
    'External part of thyro-arytenoid muscle': 'External part of thyroarytenoid muscle',
    'Humero-ulnar head of flexor digitorum superficialis': 'Humeroulnar head of flexor digitorum superficialis',
}


def display(za):
    n = za.rstrip('+')
    if layers._lettered(n):
        n = n[:-1]
    n = n.rstrip('*_')
    n = re.sub(r'\(B([IVX]+)\+B([IVX]+)\)', r'(B \1 and B \2)', n)
    n = ROMAN.sub(lambda m: f'(B {m.group(1)})', n)
    # A name wholly in brackets is one Z-Anatomy hides by default ("(Accessory_parotid_gland)"): keep the words only.
    if n.startswith('(') and n.endswith(')') and n.count('(') == 1:
        n = n[1:-1]
    n = n.replace('_', ' ')
    n = re.sub(r'\s+', ' ', n).strip()
    n = re.sub(r'\(\s+', '(', n)
    # A Latin name in brackets starts lower case, as running text ("Straight gyrus (gyrus rectus)").
    n = re.sub(r'\(([A-Z])([a-z])', lambda m: '(' + m.group(1).lower() + m.group(2), n)
    n = re.sub(r"\s*''", '', n.replace('*', ''))
    n = n[0].upper() + n[1:]
    return FIX.get(n, n)


def read(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    return json.loads(b[20:20 + n])['nodes']


def main(paths):
    nodes = [node for p in paths for node in read(p)]
    layers.KNOWN.update((n.get('extras') or {}).get('za', '') for n in nodes)
    parts = {}
    for node in nodes:
        e = node.get('extras') or {}
        if e.get('layer') == 'skin':
            continue
        p = {'name': display(e['za']), 'kind': e['kind'], 'layer': e['layer'], 'side': e['side']}
        if e.get('system'):
            p['system'] = e['system']
        if e.get('modesty'):
            p['modesty'] = True
        if e.get('hidden'):
            p['hidden'] = True
        parts[node['name']] = p
    out = {
        'description': 'Every part of the male layered and organ models (Z-Anatomy, CC BY-SA 4.0), by Atlas id: the name as Z-Anatomy '
                 'gives it, and the part’s kind, layer, body system and side. Generated by scripts/model/part_names.py.',
        'parts': dict(sorted(parts.items())),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(len(parts), 'parts')


if __name__ == '__main__':
    main(sys.argv[1:])
