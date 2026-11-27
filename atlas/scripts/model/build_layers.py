"""The male layered model: muscles, tendons and connective tissue, eyes and nose cartilages from Z-Anatomy
(CC BY-SA 4.0), on the Atlas male skeleton, with the skin shrink-wrapped onto them.

    python3 scripts/model/build_layers.py <work dir>

<work dir> holds (see README): male.{bin,json} (Atlas male skeleton, export-bones.mjs); zaskel, muscles-male,
muscles-orig, nervous ({bin,json}, export-za.mjs); skin-male.npz (build_skin.py). Writes layers-male.npz.

Only the male is built. The female skeleton is partly derived from the male and no free female muscle set exists, so
the female model shows the skeleton only until real female anatomy is available.
"""
import os
import sys
import time
import numpy as np
import igl
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve
from scipy.spatial import cKDTree
import fit
import layers

T0 = time.time()
FAT = 0.0025  # m: lean subcutaneous tissue between the deep fascia / muscles and the skin
FAT_THIN = 0.0012  # m: face, hands and feet
EYE = ('Sclera', 'Cornea', 'Iris')  # the visible parts of the eyeball (lens and retina are inside it)
NOSE = ('Major_alar_cartilage', 'Nasal_septal_cartilage', 'Lateral_process_of_nasal_septal_cartilage')
# Inside the eye socket and mouth (the skin is open there): not used to fit the skin.
INTERIOR = ('tarsus', 'palpebral', 'rectus_muscle', 'oblique_muscle', 'levator_palpebrae', 'glossus', 'tongue', 'arytenoid', 'palat',
            'pharyn', 'laryn', 'crico', 'vocal', 'uvula', 'stapedius', 'tensor_tympani', 'common_tendinous_ring', 'trochlea')


def log(*a):
    print(f'[{time.time() - T0:5.0f} s]', *a, flush=True)


def bone_mesh(B):
    vs, fs, o = [], [], 0
    for n, (v, f) in B.items():
        if n.startswith('ctx_'):
            continue
        vs.append(v)
        fs.append(f + o)
        o += len(v)
    return np.vstack(vs), np.vstack(fs).astype(np.int64)


def merged(parts):
    vs, fs, o = [], [], 0
    for v, f in parts:
        vs.append(v)
        fs.append(f.astype(np.int64) + o)
        o += len(v)
    return np.vstack(vs), np.vstack(fs)


def coverage(B, cover, names):
    """Share of each bone's surface with nothing over it (walking 25 mm out along the bone's normal)."""
    tree = cKDTree(cover)
    out = {}
    for n in names:
        v, f = B[n]
        N = fit.vertex_normals(v, f.astype(np.int64))
        open_ = np.ones(len(v), bool)
        for d in np.arange(0.0015, 0.025, 0.0015):
            dist, _ = tree.query(v + N * d, distance_upper_bound=0.0022)
            open_ &= ~np.isfinite(dist)
        out[n] = float(open_.mean())
    return out


def envelope(inner, gap, voxel=0.003, close=0.004, box=None):
    """The outer surface of everything under the skin, offset by `gap`: a watertight mesh with no internal walls
    (where muscles overlap). Built on a voxel grid: inside/outside by winding number, creases narrower than
    2 × `close` sealed (the skin bridges them in life), then the surface at distance `gap`."""
    from scipy import ndimage
    from skimage import measure
    IV, IF = inner
    lo = IV.min(0) - 0.03 if box is None else np.asarray(box[0], float)
    hi = IV.max(0) + 0.03 if box is None else np.asarray(box[1], float)
    shape = np.ceil((hi - lo) / voxel).astype(int) + 1
    occ = np.zeros(shape, bool)
    xs = lo[0] + np.arange(shape[0]) * voxel
    ys = lo[1] + np.arange(shape[1]) * voxel
    zs = lo[2] + np.arange(shape[2]) * voxel
    Y, Z = np.meshgrid(ys, zs, indexing='ij')
    for i, x in enumerate(xs):  # one slab at a time keeps memory small
        P = np.column_stack([np.full(Y.size, x), Y.ravel(), Z.ravel()])
        occ[i] = (igl.fast_winding_number(IV, IF, P) > 0.5).reshape(Y.shape)
    r = max(1, int(round(close / voxel)))
    ball = np.linalg.norm(np.mgrid[-r:r + 1, -r:r + 1, -r:r + 1], axis=0) <= r
    occ = ndimage.binary_closing(occ, structure=ball)
    occ = ndimage.binary_fill_holes(occ)
    dist_out = ndimage.distance_transform_edt(~occ) * voxel
    dist_in = ndimage.distance_transform_edt(occ) * voxel
    sdf = dist_out - dist_in
    verts, faces, _, _ = measure.marching_cubes(sdf, level=gap, spacing=(voxel, voxel, voxel))
    return verts + lo, faces.astype(np.int64)


def skin_regions(S, parts):
    """Head and feet on fine (1.5 mm) envelopes over their own boxes; the rest on a 3 mm envelope."""
    head = parts == 'head'
    feet = np.isin(parts, ['foot.L', 'foot.R'])
    pad = 0.03
    box = lambda m: (S[m].min(0) - pad, S[m].max(0) + pad)
    return [(head, 0.0015, box(head)), (feet, 0.0015, box(feet)), (~head & ~feet, 0.003, None)]


def shrink_wrap(S, tris, inner, gap, parts, B, regions, rounds=8):
    """Skin onto the outer envelope of the tissue (plus fat): alternately project every skin point onto it and relax
    it sideways towards its neighbours (removing folds, evening out triangles), ending on the surface.

    `regions`: (mask of skin points, envelope voxel size, bounding box or None). The head and feet use a fine voxel
    for the lips, eyelids and toes. Each skin point only goes onto envelope surface over its own body part's bones
    (forearm skin onto the forearm, never onto the hip beside it). Head points deep in a cavity (mouth, nostrils: more
    than 20 mm from any tissue) stay where they are. A last check makes sure no tissue is outside the skin."""
    IV, IF = inner
    bone_names = [n for n in B if not n.startswith('ctx_')]
    bpts = np.vstack([B[n][0] for n in bone_names])
    bown = np.concatenate([np.full(len(B[n][0]), i) for i, n in enumerate(bone_names)])
    btree = cKDTree(bpts)
    d0 = np.sqrt(igl.point_mesh_squared_distance(S, IV, IF)[0])
    move = ~((parts == 'head') & (d0 >= 0.02))  # only the head has cavities (mouth, nostrils)
    targets = []  # (mask of skin points, envelope vertices, faces)
    for mask, voxel, box in regions:
        for g in sorted(set(gap[mask])):
            EV, EF = envelope(inner, g, voxel=voxel, close=max(voxel, 0.002) * 1.3, box=box)
            _, j = btree.query(EV[EF].mean(1))
            fparts = [fit.bone_part(bone_names[bown[k]]) for k in j]
            for p in set(parts[mask]):
                sel = np.array([p in fp for fp in fparts])
                m = mask & (gap == g) & (parts == p) & move
                if sel.any() and m.any():
                    targets.append((m, EV, EF[sel]))
    nb = fit.neighbours(tris, len(S))
    S2 = S.copy()

    def project(P):
        out = P.copy()
        for m, EV, EF in targets:
            _, _, C = igl.point_mesh_squared_distance(P[m], EV, EF)
            out[m] = C
        return out

    for _ in range(rounds):
        S2 = project(S2)
        N = fit.vertex_normals(S2, tris)
        for _ in range(3):
            avg = np.array([S2[nb[i]].mean(0) if len(nb[i]) else S2[i] for i in range(len(S2))])
            step = avg - S2
            step -= (step * N).sum(1, keepdims=True) * N  # sideways only
            S2 = np.where(move[:, None], S2 + 0.5 * step, S2)
    S2 = project(S2)
    # The face keeps its own shape (lips, eyelids, nostrils): its move onto the tissue is smoothed strongly across the
    # head, so the face as a whole sits on the tissue while its small features keep their form.
    head = parts == 'head'
    if head.any():
        D = S2 - S
        hidx = np.where(head & move)[0]
        for _ in range(40):
            D[hidx] = 0.5 * D[hidx] + 0.5 * np.array([D[nb[i]].mean(0) if len(nb[i]) else D[i] for i in hidx])
        S2 = np.where((head & move)[:, None], S + D, S2)
    # Points that stayed (the ears, which have no tissue under them in the source, and the mouth's inside) move with
    # the skin around them, so they stay attached: their offset is the smooth continuation of their neighbours'.
    if (~move).any():
        D = np.where(move[:, None], S2 - S, 0.0)
        kept = np.where(~move)[0]
        for _ in range(300):  # fitted points stay exactly where they are; only the kept ones are filled in
            D[kept] = np.array([D[nb[i]].mean(0) if len(nb[i]) else D[i] for i in kept])
        S2 = S + D
    S2, rep = fit.enclose(S2, tris, IV[np.unique(IF)], float(gap.min()), stiffness=0.05)
    return S2, rep


def harmonic_fibres(v, f):
    """Fibre direction at each vertex: the gradient of a harmonic function that is 0 at one end of the muscle and 1
    at the other (along its main axis), so fibres run end to end and converge on a narrow tendon."""
    f = f.astype(np.int64)
    n = len(v)
    c = v.mean(0)
    _, _, vt = np.linalg.svd(v - c, full_matrices=False)
    t = (v - c) @ vt[0]
    lo, hi = np.quantile(t, [0.04, 0.96])
    fixed = (t <= lo) | (t >= hi)
    if fixed.sum() < 2 or n < 8:
        g = np.tile(vt[0], (n, 1))
    else:
        e = np.unique(np.sort(np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]]), axis=1), axis=0)
        A = coo_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
        A.data[:] = 1
        L = diags(np.asarray(A.sum(1)).ravel()) - A
        w = np.where(fixed, 1e6, 1e-6)
        u = spsolve((L + diags(w)).tocsc(), w * np.where(t >= hi, 1.0, 0.0))
        # Per-face gradient, averaged to the vertices.
        a, b, cc = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
        nrm = np.cross(b - a, cc - a)
        area2 = np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
        nhat = nrm / area2
        grad = (np.cross(nhat, cc - b) * u[f[:, 0], None] + np.cross(nhat, a - cc) * u[f[:, 1], None] + np.cross(nhat, b - a) * u[f[:, 2], None]) / area2
        g = np.zeros_like(v)
        for k in range(3):
            np.add.at(g, f[:, k], grad)
        weak = np.linalg.norm(g, axis=1) < 1e-9
        g[weak] = vt[0]
    N = fit.vertex_normals(v, f)
    g = g - (g * N).sum(1, keepdims=True) * N  # in the surface
    return g / np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-12)


def visible_counts(S, tris, mus, depth=0.045, step=0.001, tol=0.0025):
    """For each skin point, walk inward along the normal; count the first muscle met (what you see there)."""
    N = fit.vertex_normals(S, tris)
    names = list(mus)
    pts = np.vstack([mus[n][0] for n in names])
    owner = np.concatenate([np.full(len(mus[n][0]), i) for i, n in enumerate(names)])
    tree = cKDTree(pts)
    hits = np.zeros(len(names), int)
    alive = np.ones(len(S), bool)
    for d in np.arange(step, depth, step):
        dist, j = tree.query((S - N * d)[alive], distance_upper_bound=tol)
        found = np.isfinite(dist)
        np.add.at(hits, owner[j[found]], 1)
        alive[np.where(alive)[0][found]] = False
    return dict(zip(names, hits))


def main(work):
    off = layers.za_offset(f'{work}/zaskel', f'{work}/male')
    B = fit.load_bones(f'{work}/male')
    BV, BF = bone_mesh(B)
    raw = fit.load_bones(f'{work}/muscles-male')
    nerv = fit.load_bones(f'{work}/nervous')
    zsk = fit.load_bones(f'{work}/zaskel')

    # The Z-Anatomy muscles unchanged (aligned and simplified only). Where they meet bone (attachments) they dip into
    # it, as modelled in the source; that part is hidden inside the opaque bone.
    mus = {n: (v + off, f) for n, (v, f) in raw.items()}
    mus1 = mus
    source = 'unchanged from Z-Anatomy'
    if os.path.exists(f'{work}/remeshed-male.npz'):
        # The muscles from remesh.py: smoothed, checked against the originals; two levels of detail.
        r = np.load(f'{work}/remeshed-male.npz')
        rn = list(r['names'])
        mus = {n: (r[f'v{i}'], r[f'f{i}'].astype(np.int64)) for i, n in enumerate(rn)}
        mus1 = {n: (r[f'v1_{i}'], r[f'f1_{i}'].astype(np.int64)) for i, n in enumerate(rn)}
        source = 'smoothed and simplified (remesh.py), within 1.2 mm of Z-Anatomy'
        log('using the rebuilt muscles (remeshed-male.npz): two levels of detail')
    inside0 = int((igl.fast_winding_number(BV, BF, np.vstack([v for v, f in mus.values()])) > 0.5).sum())
    log(f'{len(mus)} muscle meshes, {source}; {inside0} of their points lie inside bone (attachments)')
    extra = {}
    for n, (v, f) in nerv.items():
        if n.rstrip('lr') in EYE and n[-1] in 'lr':
            extra[n] = (v + off, f, 'eye')
    for n, (v, f) in zsk.items():
        if n.rstrip('lr') in NOSE:
            extra[n] = (v + off, f, 'cartilage')
    log('eyes and nose:', ', '.join(sorted(extra)))

    # Coverage: bone with nothing over it (hands, feet, skull, the rest).
    cover = np.vstack([v for v, f in mus.values()] + [v for v, f, k in extra.values()])
    groups = {
        'skull': [n for n in B if fit.bone_part(n) == {'head'} and not n.startswith('ctx_')],
        'hand': [n for n in B if any(p.startswith('hand') for p in fit.bone_part(n)) and not n.startswith(('radius', 'ulna'))],
        'foot': [n for n in B if any(p.startswith('foot') for p in fit.bone_part(n)) and not n.startswith(('tibia', 'fibula'))],
    }
    cov = {}
    for g, names in groups.items():
        cov.update(coverage(B, cover, names))
        worst = sorted(((cov[n], n) for n in names), reverse=True)[:8]
        log(f'{g}: bone surface with nothing over it, worst:', ', '.join(f'{n} {s * 100:.0f}%' for s, n in worst))

    # Skin: shrink-wrapped onto everything under it.
    d = np.load(f'{work}/skin-male.npz')
    S, tris = d['pos'], d['tris'].astype(np.int64)
    fitted = [n for n in mus if not any(k in n.lower() for k in INTERIOR)]
    # The eyelids rest on the eye: the eyes are not tissue the skin must cover (the nose cartilages are).
    inner = merged([mus1[n] for n in fitted] + [(v, f) for v, f, k in extra.values() if k != 'eye'] + [(BV, BF)])
    head_y = B['mandible'][0][:, 1].min() - 0.02
    ankle_y = max(B['talus_left'][0][:, 1].max(), B['talus_right'][0][:, 1].max()) + 0.02
    wrist_y = max(B['capitate_left'][0][:, 1].max(), B['capitate_right'][0][:, 1].max()) + 0.01
    thin = (S[:, 1] > head_y) | (S[:, 1] < ankle_y) | ((S[:, 1] < wrist_y) & (np.abs(S[:, 0]) > 0.17))
    import mh
    _, _, faces, _ = mh.load_obj(f'{work}/mhd/base.obj')
    _, weights = mh.load_rig(f'{work}/mhd/default.mhskel', f'{work}/mhd/default_weights.mhw')
    used = np.array(sorted({i for f in faces for i in f}))
    parts = fit.mh_regions(weights, used.max() + 1)[used]
    S2, rep = shrink_wrap(S, tris, inner, np.where(thin, FAT_THIN, FAT), parts, B, skin_regions(S, parts))
    gapd = np.sqrt(igl.point_mesh_squared_distance(S2, inner[0], inner[1])[0])
    log(f'skin shrink-wrapped: enclosure rounds {[r[0] for r in rep]}; skin to the surface under it: median {np.median(gapd) * 1000:.1f} mm, '
        f'95% within {np.quantile(gapd, 0.95) * 1000:.1f} mm, max {gapd.max() * 1000:.1f} mm')

    # Ambient occlusion (creases between muscles darken), baked on the lighter level of detail and carried to the
    # detailed one (nearest point); fibre directions on each level.
    allv, allf = merged([mus1[n] for n in mus1] + [(v, f) for v, f, k in extra.values()] + [(BV, BF)])
    names = list(mus) + list(extra)
    hits = visible_counts(S2, tris, {n: mus1[n] for n in mus1 if layers.kind_of(n) != 'fascia'})
    out = {'names': np.array(names), 'skin_pos': S2, 'skin_uv': d['uv'], 'skin_tris': d['tris'], 'skin_ttex': d['ttex'],
           'hits': np.array([hits.get(n, 0) for n in names])}
    for i, n in enumerate(names):
        v, f = mus[n] if n in mus else extra[n][:2]
        v1, f1 = mus1[n] if n in mus1 else extra[n][:2]
        f, f1 = f.astype(np.int64), f1.astype(np.int64)
        N1 = fit.vertex_normals(v1, f1)
        ao1 = (1 - igl.ambient_occlusion(allv, allf, v1 + N1 * 0.0004, N1, 48)).astype(np.float32)
        ao = ao1[cKDTree(v1).query(v)[1]]
        out[f'v{i}'], out[f'f{i}'], out[f'ao{i}'] = v, f, ao
        out[f'v1_{i}'], out[f'f1_{i}'], out[f'ao1_{i}'] = v1, f1, ao1
        ism = n in mus
        out[f'fib{i}'] = harmonic_fibres(v, f).astype(np.float32) if ism else np.zeros_like(v, dtype=np.float32)
        out[f'fib1_{i}'] = harmonic_fibres(v1, f1).astype(np.float32) if ism else np.zeros_like(v1, dtype=np.float32)
        out[f'kind{i}'] = np.array(layers.kind_of(n) if ism else extra[n][2])
        if i % 100 == 0:
            log(f'   occlusion and fibres: {i}/{len(names)}')
    np.savez(f'{work}/layers-male.npz', **out)
    log('written layers-male.npz')


if __name__ == '__main__':
    main(sys.argv[1])
