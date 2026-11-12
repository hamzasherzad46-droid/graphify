"""
Turns the compact structure lists in scripts/content-src/<module>.py into content/<module>.json.
Cameras start as a viewing direction only; `import-module.mjs --fit-cameras` frames them on the real meshes.

  python3 scripts/content-src/build.py muscles
"""
import importlib.util, json, re, sys, pathlib

VIEWS = {  # direction from the target to the camera, and which side to frame
    'front': ([0, 0.05, 1], 'c'), 'back': ([0, 0.05, -1], 'c'),
    'fr': ([-0.55, 0.1, 0.85], 'r'), 'br': ([-0.55, 0.1, -0.85], 'r'),
    'rl': ([-1, 0.08, 0.15], 'r'), 'rm': ([0.85, 0.05, 0.55], 'r'),
    'frl': ([-0.5, -0.35, 0.8], 'r'), 'top': ([0, 1, 0.35], 'c'), 'below': ([0, -0.6, 0.8], 'c'),
    'fc': ([-0.35, 0.1, 0.95], 'c'), 'bc': ([-0.35, 0.1, -0.95], 'c'), 'lc': ([-1, 0.05, 0.1], 'c'),
}

def compact(value):
    text = json.dumps(value, indent=2, ensure_ascii=False)
    text = re.sub(r'\[\n\s*([^\[\]{}]*?)\n\s*\]', lambda m: '[' + re.sub(r',\n\s*', ', ', m.group(1)) + ']', text)
    text = re.sub(r'"camera": \{\n\s*("position": \[[^\]]*\]),\n\s*("target": \[[^\]]*\])\n\s*\}', r'"camera": { \1, \2 }', text)
    text = re.sub(r'\{\n\s*("id": "[^"]*"),\n\s*("name": "[^"]*")\n\s*\}', r'{ \1, \2 }', text)
    return text + '\n'

def main(module):
    here = pathlib.Path(__file__).parent
    spec = importlib.util.spec_from_file_location(module, here / f'{module}.py')
    src = importlib.util.module_from_spec(spec); spec.loader.exec_module(src)
    out = []
    for s in src.STRUCTURES:
        d, side = VIEWS[s['view']]
        target = [-1 if side == 'r' else 0, 0, 0]
        out.append({
            'id': s['id'], 'name': s['name'], 'synonyms': s.get('synonyms', []), 'latinName': s['latin'],
            'definition': s['definition'], 'function': s['function'], 'why': s['why'], 'notes': s['notes'],
            'region': s['region'], 'modelFile': src.MODEL, 'meshName': s['mesh'],
            'camera': {'position': [t + v for t, v in zip(target, d)], 'target': target},
            'difficulty': s['difficulty'],
        })
    doc = {'module': module, 'regions': [{'id': i, 'name': n} for i, n in src.REGIONS], 'structures': out}
    path = here.parent.parent / 'content' / f'{module}.json'
    path.write_text(compact(doc))
    print(f'wrote {path}: {len(out)} structures')

if __name__ == '__main__':
    main(sys.argv[1])
