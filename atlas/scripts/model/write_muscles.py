"""Writes muscles-<sex>.glb: one node per muscle, tendon or fascia, named by its Atlas id, with extras
{layer: superficial | deep, kind, side, za: Z-Anatomy name}; and the refitted skin as skin-<sex>.glb.

    python3 scripts/model/write_muscles.py <work dir> <out dir> [min hits for superficial]
"""
import sys
import numpy as np
import fit
import layers
from glb import write_glb, split_uv_seams


def main(work, out, threshold=5):
    for sex in ('female', 'male'):
        d = np.load(f'{work}/muscles-{sex}.npz')
        names = list(d['names'])
        hits = d['hits'].copy()
        # Left and right are one muscle: both sides take the higher count, so they always share a layer.
        base = [layers.atlas_id(n).removesuffix('_left').removesuffix('_right') for n in names]
        best = {}
        for b, h in zip(base, hits):
            best[b] = max(best.get(b, 0), h)
        hits = np.array([best[b] for b in base])
        meshes, counts = [], {'superficial': 0, 'deep': 0}
        for i, n in enumerate(names):
            v, f = d[f'v{i}'], d[f'f{i}'].astype(np.int64)
            kind = layers.kind_of(n)
            layer = layers.layer_of(n, hits[i], threshold)
            counts[layer] = counts.get(layer, 0) + 1
            meshes.append({'name': layers.atlas_id(n), 'pos': v, 'nrm': fit.vertex_normals(v, f), 'uv': None, 'idx': f,
                           'extras': {'layer': layer, 'kind': kind, 'side': layers.side_of(n), 'za': n}})
        write_glb(f'{out}/muscles-{sex}.glb', meshes)
        s = np.load(f'{work}/skin2-{sex}.npz')
        N = fit.vertex_normals(s['pos'], s['tris'])
        p, uv, t, src = split_uv_seams(s['pos'], s['uv'], s['tris'], s['ttex'])
        write_glb(f'{out}/skin-{sex}.glb', [{'name': 'skin', 'pos': p, 'nrm': N[src], 'uv': uv, 'idx': t, 'extras': {'layer': 'skin'}}])
        if sex == 'male':
            with open(f'{out}/muscle-layers.md', 'w') as fh:
                fh.write('# Muscle layers (3D model)\n\nSuperficial: seen from the skin (at least 5 of the skin-side checks) and not placed in a deep layer by standard anatomy (`DEEP` in scripts/model/layers.py). Tendons, fascia, aponeuroses, sheaths and bursae are connective tissue.\n\n')
                for lay in ('superficial', 'deep', 'connective'):
                    ids = sorted({layers.atlas_id(n).rsplit('_left', 1)[0].rsplit('_right', 1)[0] for k, n in enumerate(names) if layers.layer_of(n, hits[k], threshold) == lay})
                    fh.write(f'## {lay.capitalize()} ({len(ids)})\n\n' + ', '.join(ids) + '\n\n')
        print(sex, counts, sum(len(d[f'f{i}']) for i in range(len(names))), 'triangles')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 5)
