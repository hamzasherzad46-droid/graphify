"""Step 2: muscles, tendons and fascia from Z-Anatomy (CC BY-SA 4.0), fitted between the skeleton and the skin.

    python3 scripts/model/build_muscles.py <work dir>

<work dir> holds: male.{bin,json} and female.{bin,json} (export-bones.mjs, the Atlas skeletons), zaskel.{bin,json}
and muscles-male.{bin,json} (export-za.mjs: SkeletalSystem100 and MuscularSystem100), skin-<sex>.npz (build_skin.py).
Writes muscles-<sex>.npz and skin2-<sex>.npz (the skin refitted over the muscles).

Male: the Z-Anatomy muscles are made for the Z-Anatomy skeleton that the Atlas male is built from, so they only need
the measured alignment. Female: no free female muscle set exists, so the male muscles are carried onto the female
skeleton: each bone gets a male → female transform (exact for the 170 bones derived from the male; fitted by iterative
closest points for the 36 real female bones), and every muscle point moves by a smooth blend of its nearest bones'
transforms, so a muscle that crosses a joint follows both bones.
"""
import sys
import time
import numpy as np
import igl
from scipy.spatial import cKDTree
import fit
import layers

MUSCLE_ON_BONE = 0.0002  # m: muscle points that dip into bone (attachments) are moved onto its surface
FAT = {'female': 0.004, 'male': 0.003}  # m: lean subcutaneous tissue between muscle and skin (trunk and limbs)
FAT_THIN = 0.0015  # m: over the face, hands and feet
# Muscles inside the eye socket and mouth: the skin there is open (eyes, lips), so they are not used to fit it.
INTERIOR = ('tarsus', 'palpebral', 'rectus_muscle', 'oblique_muscle_of_eye', 'levator_palpebrae', 'glossus', 'tongue',
            'arytenoid', 'palat', 'pharyn', 'laryn', 'crico', 'vocal', 'uvula', 'stapedius', 'tensor_tympani', 'orbital_part_of_orbicularis_oculi')


def bone_mesh(B):
    vs, fs, o = [], [], 0
    for n, (v, f) in B.items():
        if n.startswith('ctx_'):
            continue
        vs.append(v)
        fs.append(f + o)
        o += len(v)
    return np.vstack(vs), np.vstack(fs).astype(np.int64)


def affine_icp(src, dst, iters=40):
    """A 3×4 affine taking src (male bone) onto dst (female bone): similarity first, then a light affine refinement."""
    def similarity(a, b):
        ca, cb = a.mean(0), b.mean(0)
        A, Bm = a - ca, b - cb
        U, s, Vt = np.linalg.svd(Bm.T @ A)
        D = np.eye(3)
        D[2, 2] = np.sign(np.linalg.det(U @ Vt))
        R = U @ D @ Vt
        sc = (s * np.diag(D)).sum() / (A ** 2).sum()
        return sc * R, cb - sc * R @ ca
    tree = cKDTree(dst)
    M, t = np.eye(3), dst.mean(0) - src.mean(0)
    for k in range(iters):
        cur = src @ M.T + t
        _, j = tree.query(cur)
        _, i2 = cKDTree(cur).query(dst)  # both directions, so the fit cannot shrink into part of the bone
        a = np.vstack([src, src[i2]])
        b = np.vstack([dst[j], dst])
        if k < iters // 2:
            M, t = similarity(a, b)
        else:
            X, *_ = np.linalg.lstsq(np.c_[a, np.ones(len(a))], b, rcond=None)
            # Keep it close to a similarity: blend the free affine with the similarity fit.
            Ms, ts = similarity(a, b)
            M, t = 0.5 * X[:3].T + 0.5 * Ms, 0.5 * X[3] + 0.5 * ts
    res = np.sqrt(cKDTree(dst).query(src @ M.T + t)[0] ** 2).mean()
    return M, t, res


def bone_transforms(Bm, Bf):
    T, report = {}, []
    for n, (v, f) in Bm.items():
        if n.startswith('ctx_'):
            continue
        w = Bf[n][0]
        if len(v) == len(w):
            X, *_ = np.linalg.lstsq(np.c_[v, np.ones(len(v))], w, rcond=None)
            T[n] = (X[:3].T, X[3])
        else:
            M, t, res = affine_icp(v, w)
            T[n] = (M, t)
            report.append((n, res))
    return T, report


def bone_residuals(Bm, Bf, T, real):
    """For bones with their own female mesh: how the female surface differs from the transformed male surface,
    point by point (smoothed over the bone), so muscles near the bone can follow its real shape."""
    out = []
    for n in real:
        v, f = Bm[n]
        p = v @ T[n][0].T + T[n][1]
        tree = cKDTree(Bf[n][0])
        _, j = tree.query(p)
        r = Bf[n][0][j] - p
        # Both directions: the female points' nearest transformed-male points pull too, so no part is missed.
        _, i2 = cKDTree(p).query(Bf[n][0])
        acc = np.zeros_like(p)
        cnt = np.zeros(len(p))
        np.add.at(acc, i2, Bf[n][0] - p[i2])
        np.add.at(cnt, i2, 1)
        r = np.where(cnt[:, None] > 0, (r + acc / np.maximum(cnt, 1)[:, None]) / 2, r)
        nb = fit.neighbours(f.astype(np.int64), len(p))
        r = fit.smooth_field(r, nb, 4)
        out.append((p, r))
    return out


def apply_residuals(points, residuals, sigma=0.012, reach=0.04):
    """Add the bones' local shape differences to points near them: full at the bone, fading out by `reach`."""
    P = np.vstack([p for p, r in residuals])
    R = np.vstack([r for p, r in residuals])
    tree = cKDTree(P)
    d, _ = tree.query(points)
    near = np.where(d < reach)[0]
    out = points.copy()
    for i, nb in zip(near, tree.query_ball_point(points[near], 3 * sigma)):
        if not nb:
            continue
        w = np.exp(-0.5 * (np.linalg.norm(P[nb] - points[i], axis=1) / sigma) ** 2)
        fade = np.clip(1 - (d[i] - 0.01) / (reach - 0.01), 0, 1)
        out[i] += fade * (w[:, None] * R[nb]).sum(0) / max(w.sum(), 1e-12)
    return out


def warp(points, Bm, T, k=8, tau=0.015):
    """Move points by a blend of their nearest bones' transforms: a soft minimum over distance, so a point follows
    its nearest bone fully and only mixes in another bone that is nearly as close (smooth at joints and across sheets
    of muscle such as the abdominal wall), without bones far away pulling it."""
    names = [n for n in T]
    dists = np.stack([cKDTree(Bm[n][0]).query(points)[0] for n in names], axis=1)
    near = np.argsort(dists, axis=1)[:, :k]
    dmin = dists[np.arange(len(points)), near[:, 0]]
    out = np.zeros_like(points)
    wsum = np.zeros(len(points))
    for c in range(k):
        idx = near[:, c]
        d = dists[np.arange(len(points)), idx]
        w = np.exp(-(d - dmin) / tau)
        for bi in np.unique(idx):
            sel = idx == bi
            M, t = T[names[bi]]
            out[sel] += w[sel, None] * (points[sel] @ M.T + t)
        wsum += w
    return out / wsum[:, None]


def off_bone_smooth(mus, BV, BF, gap=MUSCLE_ON_BONE, rounds=3):
    """Move muscle surface out of bone as smooth patches (each muscle's mesh moves together), not point by point."""
    names = list(mus)
    sizes = [len(mus[n][0]) for n in names]
    total = 0
    for r in range(rounds):
        allp = np.vstack([mus[n][0] for n in names])
        wn = igl.fast_winding_number(BV, BF, allp)
        inside = wn > 0.5
        if not inside.any():
            break
        idx = np.where(inside)[0]
        S, I, C = igl.signed_distance(allp[idx], BV, BF)[:3]
        n_ = allp[idx] - C
        n_ /= np.maximum(np.linalg.norm(n_, axis=1, keepdims=True), 1e-12)
        D = np.zeros_like(allp)
        D[idx] = (C - n_ * gap) - allp[idx]
        total = max(total, len(idx))
        k = 0
        for n, sz in zip(names, sizes):
            sl = slice(k, k + sz)
            k += sz
            if inside[sl].any():
                v, f = mus[n]
                mus[n] = (v + fit.smooth_offsets(f.astype(np.int64), D[sl], inside[sl], 0.05), f)
    return mus, total


def off_bone(P, BV, BF, gap=MUSCLE_ON_BONE):
    """Points inside bone move to the bone surface (plus `gap`)."""
    wn = igl.fast_winding_number(BV, BF, P)
    inside = np.where(wn > 0.5)[0]
    if len(inside):
        S, I, C = igl.signed_distance(P[inside], BV, BF)[:3]
        n = P[inside] - C
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        P = P.copy()
        P[inside] = C - n * gap  # the inside point lies opposite the outward normal
    return P, len(inside)


def visible_muscles(S, tris, muscles, depth=0.045, step=0.001, tol=0.0025):
    """For each skin vertex, walk inward along the normal; the first muscle met is the one you see there."""
    N = fit.vertex_normals(S, tris)
    pts, owner = [], []
    for i, (n, (v, f)) in enumerate(muscles.items()):
        pts.append(v)
        owner.append(np.full(len(v), i))
    pts, owner = np.vstack(pts), np.concatenate(owner)
    tree = cKDTree(pts)
    names = list(muscles)
    hits = np.zeros(len(names), int)
    alive = np.ones(len(S), bool)
    for d in np.arange(step, depth, step):
        q = S - N * d
        dist, j = tree.query(q[alive], distance_upper_bound=tol)
        found = np.isfinite(dist)
        ids = np.where(alive)[0][found]
        np.add.at(hits, owner[j[found]], 1)
        alive[ids] = False
    return dict(zip(names, hits))


T0 = time.time()


def log(*a):
    print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)


def main(work):
    off = layers.za_offset(f'{work}/zaskel', f'{work}/male')
    raw = fit.load_bones(f'{work}/muscles-male')
    Bm, Bf = fit.load_bones(f'{work}/male'), fit.load_bones(f'{work}/female')
    names = list(raw)
    T, report = bone_transforms(Bm, Bf)
    log('real female bones fitted (mean distance after fit, mm):', ', '.join(f'{n} {r * 1000:.1f}' for n, r in report))

    out = {}
    for sex, B in (('male', Bm), ('female', Bf)):
        BV, BF = bone_mesh(B)
        mus = {}
        moved_total = 0
        allp = np.vstack([raw[n][0] + off for n in names])
        if sex == 'female':
            allp = warp(allp, Bm, T)
            allp = apply_residuals(allp, bone_residuals(Bm, Bf, T, [n for n, r in report]))
        k = 0
        for n in names:
            v, f = raw[n]
            mus[n] = (allp[k:k + len(v)], f)
            k += len(v)
        mus, moved_total = off_bone_smooth(mus, BV, BF)
        log(f'{sex}: {len(mus)} meshes; {moved_total} muscle points were inside bone (moved out as smooth patches)')

        # Refit the skin over the muscles (lean subcutaneous tissue), from the step-1 skin.
        d = np.load(f'{work}/skin-{sex}.npz')
        S, tris = d['pos'], d['tris'].astype(np.int64)
        fitted = [n for n in names if not any(k in n.lower() for k in INTERIOR)]
        inner = np.vstack([mus[n][0] for n in fitted] + [fit.all_bone_points(B)])
        # Thin tissue over face, hands and feet; the usual lean layer elsewhere.
        head_y = B['mandible'][0][:, 1].min() - 0.02
        ankle_y = max(B['talus_left'][0][:, 1].max(), B['talus_right'][0][:, 1].max()) + 0.02
        hand = np.vstack([B[f'{x}_{s}'][0] for s in ('left', 'right') for x in ('scaphoid', 'lunate', 'capitate', 'hamate')])
        hand_y = hand[:, 1].max() + 0.01
        gap = np.where((S[:, 1] > head_y) | (S[:, 1] < ankle_y) | ((S[:, 1] < hand_y) & (np.abs(S[:, 0]) > 0.17)), FAT_THIN, FAT[sex])
        S2, rep = fit.enclose(S, tris, inner, float(np.median(gap)), stiffness=np.where(gap > FAT_THIN, 0.004, 0.05))
        moved = np.linalg.norm(S2 - S, axis=1)
        wn = igl.fast_winding_number(S2, tris, np.vstack([mus[n][0] for n in fitted]))
        log(f'   skin refitted over the muscles: rounds {[r[0] for r in rep]}, moved >1 mm at {(moved > 0.001).sum()} vertices '
              f'(median {np.median(moved[moved > 0.001]) * 1000 if (moved > 0.001).any() else 0:.1f} mm); muscle points still outside: {(wn < 0.5).sum()}')
        np.savez(f'{work}/skin2-{sex}.npz', pos=S2, uv=d['uv'], tris=d['tris'], ttex=d['ttex'])
        out[sex] = (mus, S2, tris)

    # Superficial or deep: measured on the male (the same muscles in the female).
    mus, S2, tris = out['male']
    only_muscles = {n: mus[n] for n in names if layers.kind_of(n) in ('muscle', 'aponeurosis', 'fascia', 'tendon')}
    hits = visible_muscles(S2, tris, only_muscles)
    for sex, (mus, S2, tris) in out.items():
        np.savez(f'{work}/muscles-{sex}.npz', names=np.array(names), **{f'v{i}': mus[n][0] for i, n in enumerate(names)}, **{f'f{i}': mus[n][1] for i, n in enumerate(names)},
                 hits=np.array([hits.get(n, 0) for n in names]))
    sup = sorted(((h, n) for n, h in hits.items()), reverse=True)
    log('most visible from the skin:', ', '.join(f'{n} {h}' for h, n in sup[:20]))
    return hits


if __name__ == '__main__':
    main(sys.argv[1])
