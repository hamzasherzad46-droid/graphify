"""MakeHuman (CC0 assets) in plain numpy: the base body, macro shape targets and the default rig.

Only the body itself is used (no helper geometry). Units in MakeHuman files are decimetres, Y up, facing +Z.
"""
import json
import numpy as np

MH_ETHNICITIES = ('african', 'asian', 'caucasian')  # MakeHuman's default: an even mix


def load_obj(path):
    """Base mesh: vertices, UVs and the faces of the 'body' group only (quads kept as quads)."""
    V, VT, faces, ftex = [], [], [], []
    group = None
    for line in open(path):
        if line.startswith('v '):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            group = line.split()[1]
        elif line.startswith('f ') and group == 'body':
            ids = [p.split('/') for p in line.split()[1:]]
            faces.append([int(p[0]) - 1 for p in ids])
            ftex.append([int(p[1]) - 1 for p in ids])
    return np.array(V), np.array(VT), faces, ftex


def load_target(path, n):
    d = np.zeros((n, 3))
    for line in open(path):
        if line[0] in '#\n':
            continue
        p = line.split()
        d[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return d


def three_way(v):
    """MakeHuman's min / average / max weights for a 0–1 slider (0.5 = average)."""
    if v < 0.5:
        return {'min': 1 - v / 0.5, 'average': v / 0.5, 'max': 0.0}
    return {'min': 0.0, 'average': 1 - (v - 0.5) / 0.5, 'max': (v - 0.5) / 0.5}


def body(base_V, tdir, sex, muscle, weight):
    """A young adult (25) of one sex with the given muscle and weight sliders (0–1, 0.5 = average)."""
    n = len(base_V)
    V = base_V.copy()
    for e in MH_ETHNICITIES:
        V += load_target(f'{tdir}/{e}-{sex}-young.target', n) / len(MH_ETHNICITIES)
    mw, ww = three_way(muscle), three_way(weight)
    for m, a in mw.items():
        for w, b in ww.items():
            if a * b > 1e-6:
                V += a * b * load_target(f'{tdir}/universal-{sex}-young-{m}muscle-{w}weight.target', n)
    return V


def load_rig(skel_path, weights_path):
    skel = json.load(open(skel_path))
    weights = json.load(open(weights_path))['weights']
    return skel, weights


def joints(skel, V):
    """Joint positions: the mean of each joint's reference vertices."""
    return {k: V[idx].mean(axis=0) for k, idx in skel['joints'].items()}
