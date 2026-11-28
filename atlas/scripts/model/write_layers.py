"""Writes layers-male.glb from layers-male.npz: one node per muscle, tendon, connective sheet, eye part and nose
cartilage (extras {layer, kind, side, za}; baked occlusion as COLOR_0; fibre direction as _FIBRE), and the skin
(extras {layer: 'skin', hidden: true}: shown only from the layer control).

    python3 scripts/model/write_layers.py <work dir> <out.glb> [lod: 0 detailed (default) | 1 phones]
"""
import sys
import numpy as np
import fit
import layers
from glb import write_glb, split_uv_seams

EYE_BACK = 0.002  # m: a presentation choice (the Z-Anatomy eye is about 2 mm proud of where it reads naturally)


def main(work, out, lod=0):
    d = np.load(f'{work}/layers-male.npz')
    names = list(d['names'])
    layers.KNOWN.update(names + ['Retinal', 'Retinar'])
    vh = dict(zip(names, d['hits']))
    base = lambda n: layers.atlas_id(n).removesuffix('_left').removesuffix('_right')
    best = {}
    for n in names:
        best[base(n)] = max(best.get(base(n), 0), int(vh.get(n, 0)))
    meshes, count = [], {}
    for i, n in enumerate(names):
        pre = '' if lod == 0 else '1_'
        v, f = d[f'v{pre}{i}'], d[f'f{pre}{i}'].astype(np.int64)
        if str(d[f'kind{i}']) == 'eye':
            v = v - np.array([0, 0, EYE_BACK])  # eyes a little back in the orbits, framed by orbicularis oculi
        stored = str(d[f'kind{i}'])
        kind = stored if stored in ('eye', 'cartilage') else layers.kind_of(n)  # always today's rules
        layer = layers.layer_of(n, best[base(n)]) if kind not in ('eye', 'cartilage') else 'superficial'
        count[layer] = count.get(layer, 0) + 1
        # Occlusion: smoothed over the mesh (no speckle) and kept between 0.42 and 1, so creases darken but nothing
        # goes black (surfaces buried inside a neighbour would otherwise read as fully hidden).
        ao = fit.smooth_field(d[f'ao{pre}{i}'][:, None].astype(np.float64), fit.neighbours(f, len(v)), 3)[:, 0]
        ao = 0.42 + 0.58 * np.clip(ao, 0, 1) ** 0.8
        meshes.append({'name': layers.atlas_id(n), 'pos': v, 'nrm': fit.vertex_normals(v, f), 'uv': None, 'idx': f,
                       'color': ao, 'fibre': d[f'fib{pre}{i}'] if kind in ('muscle', 'tendon', 'aponeurosis', 'ligament') else None,
                       'extras': {'layer': layer, 'kind': kind, 'side': layers.side_of(n), 'za': n}})
    # The retina (Z-Anatomy nervous system): the dark back of the eye that the pupil shows.
    off = layers.za_offset(f'{work}/zaskel', f'{work}/male')
    nerv = fit.load_bones(f'{work}/nervous')
    for n in ('Retinal', 'Retinar'):
        v, f = nerv[n][0] + off - np.array([0, 0, EYE_BACK]), nerv[n][1].astype(np.int64)
        meshes.append({'name': layers.atlas_id(n), 'pos': v, 'nrm': fit.vertex_normals(v, f), 'uv': None, 'idx': f, 'color': np.ones(len(v)),
                       'extras': {'layer': 'superficial', 'kind': 'eye', 'side': layers.side_of(n), 'za': n}})
    S, tris = d['skin_pos'], d['skin_tris'].astype(np.int64)
    N = fit.vertex_normals(S, tris)
    p, uv, t, src = split_uv_seams(S, d['skin_uv'], tris, d['skin_ttex'])
    meshes.append({'name': 'skin', 'pos': p, 'nrm': N[src], 'uv': uv, 'idx': t, 'extras': {'layer': 'skin', 'kind': 'skin', 'hidden': True}})
    write_glb(out, meshes)
    print(count, sum(len(x['idx']) for x in meshes), 'triangles')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 0)
