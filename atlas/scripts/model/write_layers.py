"""Writes layers-male.glb from layers-male.npz: one node per muscle, tendon, connective sheet, eye part and nose
cartilage (extras {layer, kind, side, za}; baked occlusion as COLOR_0; fibre direction as _FIBRE), and the skin
(extras {layer: 'skin', hidden: true}: shown only from the layer control).

    python3 scripts/model/write_layers.py <work dir> <out.glb>
"""
import sys
import numpy as np
import fit
import layers
from glb import write_glb, split_uv_seams


def main(work, out):
    d = np.load(f'{work}/layers-male.npz')
    names = list(d['names'])
    vh = dict(zip(names, d['hits']))
    base = lambda n: layers.atlas_id(n).removesuffix('_left').removesuffix('_right')
    best = {}
    for n in names:
        best[base(n)] = max(best.get(base(n), 0), int(vh.get(n, 0)))
    meshes, count = [], {}
    for i, n in enumerate(names):
        v, f = d[f'v{i}'], d[f'f{i}'].astype(np.int64)
        stored = str(d[f'kind{i}'])
        kind = stored if stored in ('eye', 'cartilage') else layers.kind_of(n)  # always today's rules
        layer = layers.layer_of(n, best[base(n)]) if kind not in ('eye', 'cartilage') else 'superficial'
        count[layer] = count.get(layer, 0) + 1
        # Occlusion: smoothed over the mesh (no speckle) and kept between 0.42 and 1, so creases darken but nothing
        # goes black (surfaces buried inside a neighbour would otherwise read as fully hidden).
        ao = fit.smooth_field(d[f'ao{i}'][:, None].astype(np.float64), fit.neighbours(f, len(v)), 3)[:, 0]
        ao = 0.42 + 0.58 * np.clip(ao, 0, 1) ** 0.8
        meshes.append({'name': layers.atlas_id(n), 'pos': v, 'nrm': fit.vertex_normals(v, f), 'uv': None, 'idx': f,
                       'color': ao, 'fibre': d[f'fib{i}'] if kind in ('muscle', 'tendon', 'aponeurosis', 'ligament') else None,
                       'extras': {'layer': layer, 'kind': kind, 'side': layers.side_of(n), 'za': n}})
    S, tris = d['skin_pos'], d['skin_tris'].astype(np.int64)
    N = fit.vertex_normals(S, tris)
    p, uv, t, src = split_uv_seams(S, d['skin_uv'], tris, d['skin_ttex'])
    meshes.append({'name': 'skin', 'pos': p, 'nrm': N[src], 'uv': uv, 'idx': t, 'extras': {'layer': 'skin', 'kind': 'skin', 'hidden': True}})
    write_glb(out, meshes)
    print(count, sum(len(x['idx']) for x in meshes), 'triangles')


if __name__ == '__main__':
    main(*sys.argv[1:3])
