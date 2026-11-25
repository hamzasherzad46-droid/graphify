"""Builds the skin shells: a slim female and a lean male MakeHuman body (CC0), re-posed and fitted to the Atlas
skeletons.

    python3 scripts/model/build_skin.py <makehuman data dir> <bones dir> <out dir>

<makehuman data dir> holds base.obj, default.mhskel, default_weights.mhw and targets/ (macrodetails), downloaded from
github.com/makehumancommunity/makehuman (makehuman/data). <bones dir> holds male.{bin,json} and female.{bin,json}
from export-bones.mjs (the Atlas skeleton GLBs). Writes skin-<sex>.npz (positions, UVs, triangles) for the GLB step.
"""
import sys
import numpy as np
import mh
import fit

BUILDS = {
    # Slim, lean female: weight below average (not underweight), muscle just above average (toned).
    'female': dict(muscle=0.55, weight=0.38),
    # Lean, athletic male: weight below average, muscle well above average (defined, not a bodybuilder).
    'male': dict(muscle=0.72, weight=0.38),
}

SKIN_OVER_BONE = 0.003  # m: the thinnest soft tissue over bone (shin, skull, knuckles)
SOLE = 0.010  # m: heel pad under the calcaneus


def joint_targets(skel, P):
    """MakeHuman joints → points on the Atlas skeleton."""
    T = {}
    jb = lambda b, end: skel['bones'][b][end]
    for S in ('L', 'R'):
        def put(b, end, p):
            T[jb(f'{b}.{S}', end)] = p
        put('clavicle', 'head', P[f'clav_med.{S}'])
        put('clavicle', 'tail', P[f'clav_lat.{S}'])
        put('shoulder01', 'tail', P[f'shoulder.{S}'])
        put('upperarm01', 'head', P[f'shoulder.{S}'])
        put('upperarm02', 'tail', P[f'elbow.{S}'])
        put('lowerarm01', 'head', P[f'elbow.{S}'])
        put('lowerarm02', 'tail', P[f'wrist.{S}'])
        put('wrist', 'head', P[f'wrist.{S}'])
        put('wrist', 'tail', P[f'mc3_base.{S}'])
        # Thumb: finger1-1 is the first metacarpal; then the proximal and distal phalanges.
        put('finger1-1', 'head', P[f'mc1_base.{S}'])
        put('finger1-1', 'tail', P[f'f1_1.{S}'])
        put('finger1-2', 'head', P[f'f1_1.{S}'])
        put('finger1-2', 'tail', P[f'f1_3.{S}'])
        put('finger1-3', 'head', P[f'f1_3.{S}'])
        put('finger1-3', 'tail', P[f'f1_tip.{S}'])
        for k in range(2, 6):  # index … little: metacarpal(k-1) in MakeHuman, then finger k
            put(f'metacarpal{k - 1}', 'head', P[f'mc{k}_base.{S}'])
            put(f'metacarpal{k - 1}', 'tail', P[f'f{k}_1.{S}'])
            put(f'finger{k}-1', 'head', P[f'f{k}_1.{S}'])
            put(f'finger{k}-1', 'tail', P[f'f{k}_2.{S}'])
            put(f'finger{k}-2', 'head', P[f'f{k}_2.{S}'])
            put(f'finger{k}-2', 'tail', P[f'f{k}_3.{S}'])
            put(f'finger{k}-3', 'head', P[f'f{k}_3.{S}'])
            put(f'finger{k}-3', 'tail', P[f'f{k}_tip.{S}'])
        put('pelvis', 'tail', P[f'hip.{S}'])
        put('upperleg01', 'head', P[f'hip.{S}'])
        put('upperleg02', 'tail', P[f'knee.{S}'])
        put('lowerleg01', 'head', P[f'knee.{S}'])
        put('lowerleg02', 'tail', P[f'ankle.{S}'])
        put('foot', 'head', P[f'ankle.{S}'])
        put('foot', 'tail', (P[f'mt2_head.{S}'] + P[f'mt3_head.{S}']) / 2)
        # Toes follow the foot; the enclosure step then covers each toe bone.
    return T


def spine_targets(skel, J, P):
    """The spine, neck and head joints, placed along the Atlas spinal curve at the same fraction of its length."""
    chain = ['spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head']
    pts = [J[skel['bones'][chain[0]]['head']]] + [J[skel['bones'][b]['tail']] for b in chain]
    mh_len = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
    curve = np.vstack([P['spine_curve'], P['skull_top']])
    at_len = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(curve, axis=0), axis=1))])
    at = lambda f: np.array([np.interp(f * at_len[-1], at_len, curve[:, k]) for k in range(3)])
    T = {}
    for i, b in enumerate(chain):
        T[skel['bones'][b]['head']] = at(mh_len[i] / mh_len[-1])
        T[skel['bones'][b]['tail']] = at(mh_len[i + 1] / mh_len[-1])
    return T


# Soft tissue over the skull (m): scalp on the vault, the face's thicker tissue over the jaw and chin.
SCALP = 0.006
CHIN = 0.011


def fit_head(S, parts, B, P, tris):
    """Scale the head to the Atlas skull: its width, depth and height become the skull's plus soft tissue.

    The change is blended in smoothly below the jaw so the neck joins without a step.
    """
    skull = np.vstack([B[n][0] for n in B if fit.bone_part(n) == {'head'} and not n.startswith('ctx_') and n not in ('incus_left', 'incus_right', 'malleus_left', 'malleus_right', 'stapes_left', 'stapes_right')])
    head = parts == 'head'
    chin_y = P['chin'][1]
    hv = S[head & (S[:, 1] > chin_y - 0.01)]
    lo, hi = hv.min(0), hv.max(0)
    tlo = skull.min(0) - [SCALP, CHIN, SCALP]
    thi = skull.max(0) + [SCALP, SCALP, CHIN]  # the face (front, +Z) has thicker tissue than the scalp
    scale = (thi - tlo) / (hi - lo)
    out = S.copy()
    w = np.clip((S[:, 1] - (chin_y - 0.06)) / 0.06, 0, 1)  # full from the chin up, fading out over 6 cm of neck
    w = np.where(head | (S[:, 1] > chin_y - 0.06) & (np.abs(S[:, 0]) < 0.12), w, 0)
    mapped = tlo + (S - lo) * scale
    out += (mapped - S) * w[:, None]
    return out


# Soft tissue outside the ribcage and pelvis in a lean adult (m): at the sides, over the sternum, over the spinous
# processes. Only ever used to widen the torso, never to narrow it.
TORSO_CLEAR = {'side': 0.012, 'front': 0.008, 'back': 0.006}
TORSO_BONES = ('rib_', 'sternum', 'vertebra_', 'sacrum', 'coccyx', 'hip_bone')  # the shoulder girdle is left to the local step


def fit_torso(S, parts, B, P):
    """Widen and deepen the torso, slice by slice, wherever the ribcage or pelvis needs more room.

    The whole cross-section scales (breasts and all), so the chest keeps its shape instead of being pushed out
    under the breasts.
    """
    bones = np.vstack([v for n, (v, f) in B.items() if n.startswith(TORSO_BONES)])
    # Everything but the arms and hands: at hip level the rig gives the flanks to the thighs.
    torso = ~np.array([p.startswith(('arm.', 'hand.')) for p in parts])
    # From just above the hip joints (where the thighs part) to the clavicles.
    y0 = max(P['hip.L'][1], P['hip.R'][1]) + 0.04
    y1 = (P['clav_med.L'][1] + P['clav_med.R'][1]) / 2 - 0.03  # below the shoulders
    ys = np.arange(y0, y1, 0.01)
    sx, front, back, cx = [], [], [], []
    for y in ys:
        sk = S[torso & (np.abs(S[:, 1] - y) < 0.03)]  # wider than the spacing of the body's rings of vertices
        bn = bones[np.abs(bones[:, 1] - y) < 0.012]
        if len(sk) < 8 or len(bn) < 8:
            sx.append(1), front.append(0), back.append(0), cx.append(0)
            continue
        # Ignore the arms' neighbourhood: only the body within the shoulders' width.
        c = (sk[:, 0].max() + sk[:, 0].min()) / 2
        half_s = (sk[:, 0].max() - sk[:, 0].min()) / 2
        half_b = max(bn[:, 0].max() - c, c - bn[:, 0].min())
        sx.append(max(1.0, (half_b + TORSO_CLEAR['side']) / half_s))
        front.append(max(0.0, bn[:, 2].max() + TORSO_CLEAR['front'] - sk[:, 2].max()))
        back.append(max(0.0, sk[:, 2].min() - (bn[:, 2].min() - TORSO_CLEAR['back'])))
        cx.append(c)
    k = np.exp(-0.5 * (np.arange(-6, 7) / 3.0) ** 2)
    k /= k.sum()
    sm = lambda a: np.convolve(np.pad(a, 6, mode='edge'), k, mode='valid')
    sx, front, back = sm(np.array(sx, float)), sm(np.array(front)), sm(np.array(back))
    out = S.copy()
    # Fade in above the hips and out above the clavicles; arms and legs are left alone.
    fade = np.clip((S[:, 1] - (y0 - 0.06)) / 0.06, 0, 1) * np.clip(((y1 + 0.04) - S[:, 1]) / 0.04, 0, 1)
    w = np.where(torso, fade, 0)
    fy = lambda arr: np.interp(S[:, 1], ys, arr)
    c = np.interp(S[:, 1], ys, np.array(cx) if any(cx) else np.zeros_like(ys))
    zf, zb = S[torso][:, 2].max(), S[torso][:, 2].min()
    out[:, 0] = S[:, 0] + w * (c + (S[:, 0] - c) * fy(sx) - S[:, 0])
    # Depth: the front moves forward and the back moves back, each in proportion to the distance from the middle.
    zmid = (zf + zb) / 2
    tz = np.clip((S[:, 2] - zmid) / ((zf - zb) / 2), -1, 1)
    out[:, 2] = S[:, 2] + w * (np.where(tz > 0, tz * fy(front), -tz * fy(back)) * 1.0)
    if np.max(sx) > 1.25:
        print('   warning: large torso widening; check the slices')
    print(f'   torso widened up to {np.max(sx):.2f}×, front up to {np.max(front) * 1000:.0f} mm, back up to {np.max(back) * 1000:.0f} mm')
    return out


def smooth_groin(S, tris, P):
    """A smooth, simplified external genital area (clinical, not anatomical detail): relax the skin on the
    midline between the thighs, which also fills the crease where the lower pubic bone would show."""
    hip_y = (P['hip.L'][1] + P['hip.R'][1]) / 2
    region = (np.abs(S[:, 0]) < 0.045) & (S[:, 1] < hip_y + 0.04) & (S[:, 1] > hip_y - 0.14)
    nb = fit.neighbours(tris, len(S))
    out = S.copy()
    w = np.clip(1 - np.abs(S[:, 0]) / 0.045, 0, 1) * region
    for _ in range(25):
        avg = np.array([out[n].mean(0) if len(n) else out[i] for i, n in enumerate(nb)])
        out = out + (avg - out) * (0.6 * w)[:, None]
    return out


def front_fit(S, parts, B, P):
    """Bring the front of the chest and abdomen forward where the ribcage or sternum needs room, as a smooth field
    over height and width (the chest wall under the breasts moves forward and carries the breasts with it)."""
    bones = np.vstack([v for n, (v, f) in B.items() if n.startswith(TORSO_BONES)])
    torso = ~np.array([p.startswith(('arm.', 'hand.')) for p in parts])
    y0 = max(P['hip.L'][1], P['hip.R'][1]) + 0.04
    y1 = (P['clav_med.L'][1] + P['clav_med.R'][1]) / 2
    ys, xs = np.arange(y0, y1, 0.01), np.arange(-0.16, 0.161, 0.01)
    need = np.zeros((len(ys), len(xs)))
    front = S[torso & (S[:, 2] > -0.02)]
    for a, y in enumerate(ys):
        sk = front[np.abs(front[:, 1] - y) < 0.008]
        bn = bones[np.abs(bones[:, 1] - y) < 0.006]
        for b, x in enumerate(xs):
            bz = bn[np.abs(bn[:, 0] - x) < 0.006][:, 2]
            kz = sk[np.abs(sk[:, 0] - x) < 0.01][:, 2]
            if len(bz) and len(kz):
                need[a, b] = max(0.0, bz.max() + TORSO_CLEAR['front'] - kz.max())
    from scipy.ndimage import gaussian_filter, maximum_filter
    field = gaussian_filter(maximum_filter(need, size=3), sigma=3)
    from scipy.interpolate import RegularGridInterpolator
    f = RegularGridInterpolator((ys, xs), field, bounds_error=False, fill_value=0)
    zf = S[torso, 2].max()
    zmid = np.median(S[torso, 2])
    tz = np.clip((S[:, 2] - zmid) / (zf - zmid), 0, 1)  # front surface 1, the middle of the body 0
    dz = f(np.column_stack([S[:, 1], np.clip(S[:, 0], -0.16, 0.16)])) * tz * torso
    out = S.copy()
    out[:, 2] += dz
    print(f'   front brought forward up to {dz.max() * 1000:.0f} mm')
    return out


def build(sex, mhdir, bonedir):
    V0, VT, faces, ftex = mh.load_obj(f'{mhdir}/base.obj')
    skel, weights = mh.load_rig(f'{mhdir}/default.mhskel', f'{mhdir}/default_weights.mhw')
    V = mh.body(V0, f'{mhdir}/targets', sex, **BUILDS[sex]) * 0.1  # decimetres → metres
    used = np.array(sorted({i for f in faces for i in f}))
    B = fit.load_bones(f'{bonedir}/{sex}')
    P = fit.atlas_points(B)

    # Overall size and place: the body's height is the skeleton's plus scalp and heel pad; soles just below y = 0.
    top_bone = P['skull_top'][1]
    h_mh = V[used, 1].max() - V[used, 1].min()
    s = (top_bone + 0.006 + SOLE) / h_mh
    V = V * s
    V[:, 1] += -SOLE - V[used, 1].min()
    V[:, 0] -= V[used, 0].mean()

    J = {k: V[idx].mean(0) for k, idx in skel['joints'].items()}
    targets = joint_targets(skel, P)
    targets.update(spine_targets(skel, J, P))
    # Limbs split into two rig bones (upper arm, forearm, thigh, leg): the joint between them goes on the line
    # between the two ends, at the same fraction of the length as in MakeHuman.
    for S in ('L', 'R'):
        for a, b in (('upperarm01', 'upperarm02'), ('lowerarm01', 'lowerarm02'), ('upperleg01', 'upperleg02'), ('lowerleg01', 'lowerleg02')):
            ba, bb = skel['bones'][f'{a}.{S}'], skel['bones'][f'{b}.{S}']
            h, m, t = J[ba['head']], J[ba['tail']], J[bb['tail']]
            f = np.linalg.norm(m - h) / (np.linalg.norm(m - h) + np.linalg.norm(t - m))
            mid = targets[ba['head']] + f * (targets[bb['tail']] - targets[ba['head']])
            targets[ba['tail']] = mid
            targets[bb['head']] = mid
    # Roll: the forearm and hand turn so the palm faces forward, as in the Atlas skeleton; the foot keeps its arch.
    frames = {}
    for S in ('L', 'R'):
        mc = lambda k: J[skel['bones'][f'metacarpal{k}.{S}']['tail']]
        across_rest = mc(4) - mc(1)
        across_atlas = P[f'mc5_head.{S}'] - P[f'mc2_head.{S}']
        # The turn to palms-forward is shared along the arm, as in life: the shoulder rotates the arm outwards and
        # the forearm supinates.
        for b, frac in (('upperarm01', 0.3), ('upperarm02', 0.35), ('lowerarm01', 0.65), ('lowerarm02', 1.0), ('wrist', 1.0)):
            frames[f'{b}.{S}'] = (across_rest, across_atlas, frac)
        toe = lambda k: J[skel['bones'][f'toe{k}-1.{S}']['head']]
        frames[f'foot.{S}'] = (toe(5) - toe(1), P[f'mt5_head.{S}'] - P[f'mt1_head.{S}'])
    Vp = fit.pose(V, skel, weights, targets, frames)

    # Body surface only, as triangles (quads split along their shorter diagonal).
    remap = -np.ones(len(V), dtype=np.int64)
    remap[used] = np.arange(len(used))
    tris, ttex = [], []
    for f, t in zip(faces, ftex):
        f = [remap[i] for i in f]
        if len(f) == 4:
            a = (0, 1, 2, 0, 2, 3) if np.linalg.norm(Vp[used][f[0]] - Vp[used][f[2]]) <= np.linalg.norm(Vp[used][f[1]] - Vp[used][f[3]]) else (0, 1, 3, 1, 2, 3)
            tris += [[f[a[0]], f[a[1]], f[a[2]]], [f[a[3]], f[a[4]], f[a[5]]]]
            ttex += [[t[a[0]], t[a[1]], t[a[2]]], [t[a[3]], t[a[4]], t[a[5]]]]
        else:
            tris.append(f)
            ttex.append(t)
    tris, ttex = np.array(tris), np.array(ttex)
    S = Vp[used]

    # No bone may show through: keep the skin at least SKIN_OVER_BONE above every bone surface.
    parts = fit.mh_regions(weights, len(V))[used]
    S = smooth_groin(S, tris, P)
    S = fit_torso(S, parts, B, P)
    S = front_fit(S, parts, B, P)
    before = S.copy()
    # Corrections on the trunk spread wider (the chest wall under a breast lifts the breast with it); on the
    # limbs, hands and feet they stay tight.
    trunk = np.isin(parts, ['torso', 'hip.L', 'hip.R', 'shoulder.L', 'shoulder.R'])
    S, report = fit.enclose(S, tris, fit.all_bone_points(B), SKIN_OVER_BONE, stiffness=np.where(trunk, 0.004, 0.05))
    moved = np.linalg.norm(S - before, axis=1)
    print(f'{sex}: {len(S)} vertices, {len(tris)} triangles, height {S[:, 1].max() - S[:, 1].min():.3f} m; '
          f'bone points outside per round {[r[0] for r in report]}; skin moved >1 mm at {(moved > 0.001).sum()} vertices '
          f'(median {np.median(moved[moved > 0.001]) * 1000:.1f} mm, max {moved.max() * 1000:.1f} mm)')
    import igl
    wn = igl.fast_winding_number(S, tris.astype(np.int64), fit.all_bone_points(B))
    names = np.concatenate([[n] * len(v) for n, (v, f) in B.items() if not n.startswith('ctx_')])
    out = names[wn < 0.5]
    if len(out):
        u, c = np.unique(out, return_counts=True)
        print('   still outside:', ', '.join(f'{a} {b}' for a, b in sorted(zip(u, c), key=lambda t: -t[1])[:8]))
    return S, VT, tris, ttex, P


if __name__ == '__main__':
    mhdir, bonedir, out = sys.argv[1:4]
    for sex in ('female', 'male'):
        S, VT, tris, ttex, P = build(sex, mhdir, bonedir)
        np.savez(f'{out}/skin-{sex}.npz', pos=S, uv=VT, tris=tris, ttex=ttex)
