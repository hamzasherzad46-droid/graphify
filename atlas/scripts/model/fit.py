"""Fitting helpers: reading Atlas bones, measuring joints, re-posing a MakeHuman body with its own rig.

Atlas skeleton space: metres, Y up, feet at y = 0, the body faces +Z, its left at +X (same axes as MakeHuman).
"""
import json
import numpy as np
from scipy.spatial import cKDTree


# ---------------- Atlas bones ----------------

def load_bones(prefix):
    """Bone vertices and triangles exported from an Atlas skeleton GLB (export-bones.mjs)."""
    idx = json.load(open(prefix + '.json'))
    raw = np.fromfile(prefix + '.bin', dtype=np.float32)
    out = {}
    for name, r in idx.items():
        v = raw[r['off']:r['off'] + r['n'] * 3].reshape(-1, 3).astype(np.float64)
        f = raw[r['ioff']:r['ioff'] + r['ni']].astype(np.int64).reshape(-1, 3)
        out[name] = (v, f)
    return out


def axis_ends(v, frac=0.05):
    """The two ends of a long bone along its main axis (mean of the extreme `frac` of vertices), top end first."""
    c = v.mean(0)
    _, _, vt = np.linalg.svd(v - c, full_matrices=False)
    a = vt[0]
    t = (v - c) @ a
    lo, hi = np.quantile(t, [frac, 1 - frac])
    e1, e2 = v[t <= lo].mean(0), v[t >= hi].mean(0)
    return (e1, e2) if e1[1] >= e2[1] else (e2, e1)


def far_end(v, toward):
    """The end of a small bone farthest along a direction (e.g. a phalanx tip)."""
    t = v @ toward
    return v[t >= np.quantile(t, 0.95)].mean(0)


def near_end(v, toward):
    t = v @ toward
    return v[t <= np.quantile(t, 0.05)].mean(0)


def atlas_points(B):
    """Named points on an Atlas skeleton: joints of the limbs, hands and feet, the spine curve, the head."""
    P = {}
    for side, s in (('left', 1), ('right', -1)):
        S = 'L' if side == 'left' else 'R'
        g = lambda n: B[f'{n}_{side}'][0]
        # Clavicle: medial end is the one nearer the midline.
        e1, e2 = axis_ends(g('clavicle'))
        med, lat = (e1, e2) if abs(e1[0]) < abs(e2[0]) else (e2, e1)
        P[f'clav_med.{S}'], P[f'clav_lat.{S}'] = med, lat
        hum_top, hum_bot = axis_ends(g('humerus'))
        # Shoulder joint: the medial half of the top of the humerus (the head, not the greater tubercle).
        hv = g('humerus')
        top = hv[hv[:, 1] > hum_top[1] - 0.05]
        P[f'shoulder.{S}'] = top[np.abs(top[:, 0]) <= np.median(np.abs(top[:, 0]))].mean(0)
        P[f'elbow.{S}'] = hum_bot
        P[f'wrist.{S}'] = (axis_ends(g('radius'))[1] + axis_ends(g('ulna'))[1]) / 2
        down = np.array([0, -1.0, 0])
        for k in range(1, 6):
            mc = g(f'metacarpal_{k}')
            P[f'mc{k}_base.{S}'] = near_end(mc, down) if k > 1 else axis_ends(mc)[0]
            P[f'mc{k}_head.{S}'] = far_end(mc, down) if k > 1 else axis_ends(mc)[1]
            prox = B[f'hand_proximal_phalanx_{k}_{side}'][0]
            dist = B[f'hand_distal_phalanx_{k}_{side}'][0]
            P[f'f{k}_1.{S}'] = axis_ends(prox)[0]
            if k > 1:
                P[f'f{k}_2.{S}'] = axis_ends(B[f'hand_middle_phalanx_{k}_{side}'][0])[0]
            P[f'f{k}_3.{S}'] = axis_ends(dist)[0]
            P[f'f{k}_tip.{S}'] = axis_ends(dist)[1]
        fv = g('femur')
        f_top, f_bot = axis_ends(fv)
        top = fv[fv[:, 1] > f_top[1] - 0.06]
        P[f'hip.{S}'] = top[np.abs(top[:, 0]) <= np.quantile(np.abs(top[:, 0]), 0.4)].mean(0)
        P[f'knee.{S}'] = f_bot
        P[f'ankle.{S}'] = g('talus').mean(0)
        fwd = np.array([0, 0, 1.0])
        for k in range(1, 6):
            mt = g(f'metatarsal_{k}')
            P[f'mt{k}_base.{S}'] = near_end(mt, fwd)
            P[f'mt{k}_head.{S}'] = far_end(mt, fwd)
            P[f't{k}_1.{S}'] = near_end(B[f'foot_proximal_phalanx_{k}_{side}'][0], fwd)
            if k > 1:
                P[f't{k}_2.{S}'] = near_end(B[f'foot_middle_phalanx_{k}_{side}'][0], fwd)
            dist = B[f'foot_distal_phalanx_{k}_{side}'][0]
            P[f't{k}_3.{S}'] = near_end(dist, fwd)
            P[f't{k}_tip.{S}'] = far_end(dist, fwd)
    # Spine curve: the sacrum's top, each vertebral body (lumbar to cervical), then the top of the skull.
    sac = B['sacrum'][0]
    curve = [sac[sac[:, 1] > np.quantile(sac[:, 1], 0.85)].mean(0)]
    names = [f'vertebra_l{i}' for i in range(5, 0, -1)] + [f'vertebra_t{i}' for i in range(12, 0, -1)] + [f'vertebra_c{i}' for i in range(7, 0, -1)]
    for n in names:
        v = B[n][0]
        # The body of a vertebra lies in front of its arch: the anterior half of its vertices.
        curve.append(v[v[:, 2] >= np.median(v[:, 2])].mean(0))
    skull = np.vstack([B[n][0] for n in ('frontal_bone', 'parietal_bone_left', 'parietal_bone_right', 'occipital_bone')])
    P['skull_top'] = skull[skull[:, 1] >= skull[:, 1].max() - 0.01].mean(0)
    P['skull_centre'] = skull.mean(0)
    P['chin'] = B['mandible'][0][np.argmin(B['mandible'][0][:, 1])]
    P['spine_curve'] = np.array(curve)
    return P


def all_bone_points(B):
    pts = [v for n, (v, f) in B.items() if not n.startswith('ctx_')]
    return np.vstack(pts)


# ---------------- rotations ----------------

def rot_between(a, b):
    """The smallest rotation taking direction a to direction b."""
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(a @ b)
    if c < -0.999999:
        p = np.cross(a, [1, 0, 0]) if abs(a[0]) < 0.9 else np.cross(a, [0, 1, 0])
        p /= np.linalg.norm(p)
        return 2 * np.outer(p, p) - np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx / (1 + c)


def frame_rot(u0, s0, u1, s1):
    """Rotation taking direction u0 to u1 exactly, and the secondary direction s0 as close as possible to s1."""
    def basis(u, s):
        u = u / np.linalg.norm(u)
        s = s - (s @ u) * u
        s /= np.linalg.norm(s)
        return np.column_stack([u, s, np.cross(u, s)])
    return basis(u1, s1) @ basis(u0, s0).T


# ---------------- posing ----------------

def pose(V, skel, weights, targets, frames=None):
    """Re-pose a MakeHuman body with its rig (linear blend skinning).

    targets: {joint name: Atlas position} for joints that must land on the skeleton. A bone whose tail joint has a
    target is turned and stretched along its axis to reach it; other bones follow their parent rigidly.
    frames: {bone: (rest secondary direction, target secondary direction)} for bones whose roll matters
    (the forearm and hand, palms forward; the foot).
    """
    frames = frames or {}
    J = {k: V[idx].mean(0) for k, idx in skel['joints'].items()}
    bones = skel['bones']
    order, seen = [], set()

    def visit(b):
        if b in seen:
            return
        p = bones[b]['parent']
        if p:
            visit(p)
        seen.add(b)
        order.append(b)
    for b in bones:
        visit(b)

    M = {}
    for b in order:
        bd = bones[b]
        h, t = J[bd['head']], J[bd['tail']]
        par = M.get(bd['parent'])
        Rp = par[1] if par else np.eye(3)
        if bd['head'] in targets:
            hp = targets[bd['head']]
        elif par:
            hp = par[0] + par[1] @ (par[2] @ (h - par[3]))
        else:
            hp = h
        u = (t - h) / max(np.linalg.norm(t - h), 1e-9)
        if bd['tail'] in targets:
            d = targets[bd['tail']] - hp
            Rmin = rot_between(Rp @ u, d) @ Rp
            if b in frames:
                s0, s1, frac = (frames[b] + (1.0,))[:3]
                Rfull = frame_rot(u, s0, d, s1)
                # Both take the bone's axis onto d; the difference is a twist about d. Apply `frac` of it, so a
                # twist shared along a limb never collapses one segment.
                Dl = Rfull @ Rmin.T
                dn = d / np.linalg.norm(d)
                c = (np.trace(Dl) - 1) / 2
                ang = np.arctan2(dn @ np.array([Dl[2, 1] - Dl[1, 2], Dl[0, 2] - Dl[2, 0], Dl[1, 0] - Dl[0, 1]]) / 2, c)
                k = np.array([[0, -dn[2], dn[1]], [dn[2], 0, -dn[0]], [-dn[1], dn[0], 0]])
                a = frac * ang
                R = (np.eye(3) + np.sin(a) * k + (1 - np.cos(a)) * k @ k) @ Rmin
            else:
                R = Rmin
            s = np.linalg.norm(d) / max(np.linalg.norm(t - h), 1e-9)
            S = np.eye(3) + (s - 1) * np.outer(u, u)
        else:
            R, S = Rp, np.eye(3)
        M[b] = (hp, R, S, h)

    out = np.zeros_like(V)
    wsum = np.zeros(len(V))
    for b, pairs in weights.items():
        if b not in M or not pairs:
            continue
        hp, R, S, h = M[b]
        idx = np.array([p[0] for p in pairs])
        w = np.array([p[1] for p in pairs])
        moved = hp + (V[idx] - h) @ (R @ S).T
        out[idx] += w[:, None] * moved
        wsum[idx] += w
    ok = wsum > 1e-9
    out[ok] /= wsum[ok, None]
    out[~ok] = V[~ok]
    return out


# ---------------- surface fitting ----------------

def vertex_normals(V, tris):
    n = np.zeros_like(V)
    fn = np.cross(V[tris[:, 1]] - V[tris[:, 0]], V[tris[:, 2]] - V[tris[:, 0]])
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def neighbours(tris, n):
    nb = [set() for _ in range(n)]
    for a, b, c in tris:
        nb[a] |= {b, c}
        nb[b] |= {a, c}
        nb[c] |= {a, b}
    return [np.array(sorted(s)) for s in nb]


def smooth_field(D, nb, iters):
    for _ in range(iters):
        D = np.array([D[i] * 0.5 + D[nb[i]].mean(0) * 0.5 if len(nb[i]) else D[i] for i in range(len(D))])
    return D


def mh_regions(weights, n):
    """Each body vertex's part (head, torso, arm/hand/leg/foot by side), from its strongest rig bone."""
    best = np.full(n, -1.0)
    owner = np.array([''] * n, dtype=object)
    for b, pairs in weights.items():
        for i, w in pairs:
            if i < n and w > best[i]:
                best[i], owner[i] = w, b
    def part(b):
        side = b[-1] if b.endswith(('.L', '.R')) else ''
        if any(k in b for k in ('wrist', 'metacarpal', 'finger')):
            return 'hand.' + side
        if any(k in b for k in ('upperarm', 'lowerarm', 'shoulder01')):
            return 'arm.' + side
        if 'clavicle' in b:
            return 'shoulder.' + side
        if 'upperleg' in b or 'lowerleg' in b:
            return 'leg.' + side
        if 'foot' in b or 'toe' in b:
            return 'foot.' + side
        if b.startswith('pelvis'):
            return 'hip.' + side
        if b.startswith(('spine', 'root', 'breast')):
            return 'torso'
        return 'head'
    return np.array([part(b) for b in owner])


def bone_part(name):
    """Which body parts' skin an Atlas bone lies under (a bone at a joint belongs to both sides of it)."""
    side = 'L' if name.endswith('_left') else 'R' if name.endswith('_right') else ''
    base = name.rsplit('_', 1)[0] if side else name
    if base in ('humerus',):
        return {f'arm.{side}', f'shoulder.{side}'}
    if base in ('radius', 'ulna'):
        return {f'arm.{side}', f'hand.{side}'}
    if base in ('scapula', 'clavicle'):
        return {f'shoulder.{side}', f'arm.{side}', 'torso'}
    if base.startswith(('metacarpal', 'hand_')) or base in ('scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate'):
        return {f'hand.{side}'}
    if base in ('femur',):
        return {f'leg.{side}', f'hip.{side}'}
    if base in ('patella',):
        return {f'leg.{side}'}
    if base in ('tibia', 'fibula'):
        return {f'leg.{side}', f'foot.{side}'}
    if base.startswith(('metatarsal', 'foot_')) or base in ('talus', 'calcaneus', 'navicular', 'cuboid', 'medial_cuneiform', 'intermediate_cuneiform', 'lateral_cuneiform'):
        return {f'foot.{side}'}
    if base in ('hip_bone',):
        return {f'hip.{side}', 'torso', f'leg.{side}'}
    if base.startswith('vertebra_c') or base == 'hyoid_bone':
        return {'head', 'torso'}
    if base.startswith(('vertebra', 'rib')) or base in ('sternum', 'sacrum', 'coccyx'):
        return {'torso', 'hip.L', 'hip.R', 'shoulder.L', 'shoulder.R'}
    return {'head'}


def clear_inner_by_part(V, tris, parts, bones, gap, **kw):
    """clear_inner, but each part of the skin only answers to the bones beneath it (not a hand beside a thigh)."""
    nb = neighbours(tris, len(V))
    N = vertex_normals(V, tris)
    push = np.zeros(len(V))
    by_part = {}
    for name, (v, f) in bones.items():
        if name.startswith('ctx_'):
            continue
        for p in bone_part(name):
            by_part.setdefault(p, []).append(v)
    radius = kw.get('radius', 0.025)
    for p, vs in by_part.items():
        sel = np.where(parts == p)[0]
        if not len(sel):
            continue
        pts = np.vstack(vs)
        tree = cKDTree(pts)
        for i, nbrs in zip(sel, tree.query_ball_point(V[sel], radius)):
            if not nbrs:
                continue
            q = pts[nbrs] - V[i]
            along = q @ N[i]
            lateral = np.linalg.norm(q - np.outer(along, N[i]), axis=1)
            m = lateral < radius * 0.5
            if m.any():
                push[i] = max(push[i], along[m].max() + gap)
    return V + smooth_offsets(tris, N * push[:, None], push > 0), push


def enclose(S, tris, inner, gap, rounds=10, stiffness=0.05, tol=0.0005):
    """(stiffness may be one value or one per vertex: lower spreads a correction wider.)"""
    return _enclose(S, tris, inner, gap, rounds, stiffness, tol)


def _enclose(S, tris, inner, gap, rounds, stiffness, tol):
    """Move the skin out just enough that every inner point (bone, later muscle) is inside it by at least `gap`.

    Inside/outside is decided exactly (generalised winding number, which tolerates the eye and mouth openings).
    Each offending point asks its nearest skin vertex to move out along the normal; the moves are spread smoothly
    (a local bump, not a balloon) and the check repeats until nothing is left outside.
    """
    import igl
    from scipy.spatial import cKDTree
    S = S.copy()
    tris = tris.astype(np.int64)
    report = []
    for r in range(rounds):
        N = vertex_normals(S, tris)
        wn = igl.fast_winding_number(S, tris, inner)
        d, j = cKDTree(S).query(inner)
        out = wn < 0.5
        depth = ((inner - S[j]) * N[j]).sum(1)  # >0: beyond the skin along its normal
        need = np.where(out, np.maximum(depth, 0) + gap, np.where(d < gap, gap - d, 0))
        bad = need > tol
        report.append((int(out.sum()), float(need.max()) if len(need) else 0.0))
        if not bad.any():
            break
        push = np.zeros(len(S))
        np.maximum.at(push, j[bad], need[bad])
        S = S + smooth_offsets(tris, N * push[:, None], push > 0, stiffness)
    return S, report


def smooth_offsets(tris, P, fixed, stiffness=1e-3):
    """A smooth offset field that matches the required offsets P where `fixed`, and fades to zero elsewhere.

    Minimises the bending of the offset field (its Laplacian) plus how far it strays from the targets: a localised,
    smooth bump instead of a crude average, so a 10 mm correction at the elbow stays at the elbow.
    """
    from scipy.sparse import coo_matrix, diags
    from scipy.sparse.linalg import spsolve
    n = len(P)
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    e = np.unique(np.sort(e, axis=1), axis=0)
    A = coo_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
    A.data[:] = 1
    deg = np.asarray(A.sum(1)).ravel()
    L = diags(deg) - A
    w = np.where(fixed, 1.0, stiffness)  # stiffness: a number or one value per vertex
    M = (L.T @ L + diags(w)).tocsc()
    return np.column_stack([spsolve(M, w * P[:, k]) for k in range(3)])


def clear_inner_iter(V, tris, parts, bones, gap, rounds=3):
    """Push out, then check again: a smooth push can leave a bone just under the surface nearby."""
    total = np.zeros(len(V))
    for _ in range(rounds):
        V, push = clear_inner_by_part(V, tris, parts, bones, gap)
        total = np.maximum(total, push)
        if push.max() < 0.0005:
            break
    return V, total


def clear_inner(V, tris, inner, gap, radius=0.025, nb=None, iters=6):
    """Push the skin out wherever inner surface points (bone, muscle) come closer than `gap` beneath it.

    For each skin vertex, the inner points within `radius` that lie close to its normal line give the depth needed;
    the outward push is smoothed over the surface so it never makes a bump.
    """
    N = vertex_normals(V, tris)
    tree = cKDTree(inner)
    push = np.zeros(len(V))
    for i, nbrs in enumerate(tree.query_ball_point(V, radius)):
        if not nbrs:
            continue
        q = inner[nbrs] - V[i]
        along = q @ N[i]
        lateral = np.linalg.norm(q - np.outer(along, N[i]), axis=1)
        sel = lateral < radius * 0.5
        if sel.any():
            need = along[sel].max() + gap
            if need > 0:
                push[i] = need
    nb = nb or neighbours(tris, len(V))
    D = smooth_field(N * push[:, None], nb, iters)
    # Smoothing spreads the push but lowers its peak: keep at least the push each vertex needed.
    mag = np.linalg.norm(D, axis=1)
    scale = np.where(mag > 1e-9, np.maximum(1, push / np.maximum(mag, 1e-9)), 1)
    return V + D * scale[:, None], push
