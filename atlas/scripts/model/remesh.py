"""Smooths every Z-Anatomy muscle into a clean surface, true to the original, at two levels of detail.

    python3 scripts/model/remesh.py <work dir>

Reads muscles-orig ({bin,json}: the full-resolution Z-Anatomy meshes, export-za.mjs with error 0) and zaskel / male
(for the measured offset). Writes remeshed-male.npz: per mesh, two levels of detail (lod0 for tablets and desktop,
lod1 for phones) and the check against the original.

Closed meshes (the muscles and tendons): voxelised at a size set by the mesh's own thickness (0.3–1.0 mm), inside or
outside decided exactly (generalised winding number), lightly blurred so edges are rounded rather than stepped,
surfaced (marching cubes), then decimated to a triangle budget proportional to the mesh's surface area. Open meshes
(fasciae, sheaths: sheets) keep their original triangles, gently smoothed. Any rebuilt mesh that strays from its
original by more than MAX_P95 (95th percentile of the two-sided surface distance) is replaced by the smoothed
original (as is any rebuild with a hole worn through a thin part: a sheet thinner than its voxel), given more
triangles until it is within the limit, or (coarse sheets that shrink when smoothed) kept as the
original itself, so the anatomy never changes.
"""
import sys
import time
from multiprocessing import Pool
import numpy as np
import igl
import fast_simplification
from scipy import ndimage
from skimage import measure
import fit
import layers

LOD0_TRIS = 1_300_000
LOD1_TRIS = 450_000
MAX_P95 = 0.0012  # m (detailed level and rebuild acceptance)
MAX_P95_LOD1 = 0.0015  # m (phone level)
MIN_TRIS = 120
HOLE_GAP = 0.0008  # m
MAX_HOLE_POINTS = 3


def area(v, f):
    return 0.5 * np.linalg.norm(np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]]), axis=1).sum()


def volume(v, f):
    return abs(np.einsum('ij,ij->i', v[f[:, 0]], np.cross(v[f[:, 1]], v[f[:, 2]])).sum() / 6)


def is_closed(f):
    e = np.sort(np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]]), axis=1)
    _, c = np.unique(e, axis=0, return_counts=True)
    return not (c == 1).any()


def taubin(v, f, it=4, lam=0.5, mu=-0.53):
    nb = fit.neighbours(f, len(v))
    v = v.copy()
    for _ in range(it):
        for w in (lam, mu):
            avg = np.array([v[n].mean(0) if len(n) else v[i] for i, n in enumerate(nb)])
            v = v + w * (avg - v)
    return v


def p95_two_sided(a, b):
    da = np.sqrt(igl.point_mesh_squared_distance(a[0], b[0], b[1])[0])
    db = np.sqrt(igl.point_mesh_squared_distance(b[0], a[0], a[1])[0])
    return float(np.quantile(np.concatenate([da, db]), 0.95))


def holes(orig, new):
    """Points just inside the original that the new surface leaves outside, well away from it: holes worn through thin
    sheets (a rim within HOLE_GAP of the original passes the distance check, so this looks for them directly)."""
    v, f = orig
    n = fit.vertex_normals(v, f)
    P = np.vstack([v + n * d for d in (-0.0006, -0.0003, -0.00015, 0.00015, 0.0003, 0.0006)])  # either winding
    P = P[igl.fast_winding_number(v, f, P) > 0.5]
    if not len(P):
        return 0
    out = P[igl.fast_winding_number(new[0], new[1], P) < 0.5]
    if not len(out):
        return 0
    far = np.sqrt(igl.point_mesh_squared_distance(out, new[0], new[1])[0]) > HOLE_GAP
    return int(far.sum())


def voxel_surface(v, f):
    """A clean surface for a closed mesh: voxelise, blur slightly, marching cubes."""
    a, vol = area(v, f), volume(v, f)
    thickness = 2 * vol / max(a, 1e-12)
    voxel = float(np.clip(thickness / 4, 0.0003, 0.001))
    lo, hi = v.min(0) - 3 * voxel, v.max(0) + 3 * voxel
    shape = np.ceil((hi - lo) / voxel).astype(int) + 1
    while np.prod(shape) > 30_000_000:  # keep the grid in memory
        voxel *= 1.2
        shape = np.ceil((hi - lo) / voxel).astype(int) + 1
    xs = [lo[k] + np.arange(shape[k]) * voxel for k in range(3)]
    occ = np.zeros(shape, np.float32)
    Y, Z = np.meshgrid(xs[1], xs[2], indexing='ij')
    for i, x in enumerate(xs[0]):
        P = np.column_stack([np.full(Y.size, x), Y.ravel(), Z.ravel()])
        occ[i] = (igl.fast_winding_number(v, f, P) > 0.5).reshape(Y.shape)
    occ = ndimage.gaussian_filter(occ, sigma=0.7)
    if occ.max() < 0.5:
        return None
    sv, sf, _, _ = measure.marching_cubes(occ, level=0.5, spacing=(voxel, voxel, voxel))
    return sv + lo, sf.astype(np.int64)[:, ::-1].copy()  # outward winding


def decimate(v, f, target):
    if len(f) <= target:
        return v, f
    reduction = 1 - target / len(f)
    dv, df = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=reduction)
    return dv.astype(np.float64), df.astype(np.int64)


def work(args):
    name, v, f, budget0, budget1 = args
    f = f.astype(np.int64)
    orig = (v, f)
    method = 'smoothed original'
    if is_closed(f):
        s = voxel_surface(v, f)
        if s is not None:
            v0, f0 = decimate(*s, budget0)
            v0 = taubin(v0, f0, 2)
            err = p95_two_sided((v0, f0), orig)
            if err <= MAX_P95 and holes(orig, (v0, f0)) <= MAX_HOLE_POINTS:
                method = 'rebuilt'
                v1, f1 = decimate(v0, f0, budget1)
                if holes(orig, (v1, f1)) > MAX_HOLE_POINTS:
                    v1, f1 = decimate(taubin(v, f, 3), f, budget1)
                return name, method, (v0, f0), (v1, f1), err, p95_two_sided((v1, f1), orig)
    v0 = taubin(v, f, 3)
    v0, f0 = decimate(v0, f, budget0)
    v1, f1 = decimate(v0, f0, budget1)
    return name, method, (v0, f0), (v1, f1), p95_two_sided((v0, f0), orig), p95_two_sided((v1, f1), orig)


def tighten(name, orig, lod, limit, start):
    """Raise a level's triangle budget until it is within `limit` of the original (or uses the source's own)."""
    v, f = lod
    target = max(len(f), MIN_TRIS)
    src = (taubin(orig[0], orig[1], 3), orig[1])
    while p95_two_sided((v, f), orig) > limit and target < len(src[1]):
        target = min(int(target * 1.6), len(src[1]))
        v, f = decimate(*start, target) if start is not None else decimate(*src, target)
        if p95_two_sided((v, f), orig) > limit and start is not None:
            v, f = decimate(*src, target)
    return v, f


def fix(args):
    name, method, l0, l1, orig = args
    if p95_two_sided(l0, orig) > MAX_P95:
        l0 = tighten(name, orig, l0, MAX_P95, None)
    if p95_two_sided(l1, orig) > MAX_P95_LOD1:
        l1 = tighten(name, orig, l1, MAX_P95_LOD1, l0)
    # Coarse sheets shrink when smoothed: keep the original itself (and the detailed level for the phone if needed).
    if p95_two_sided(l0, orig) > MAX_P95:
        l0, method = orig, 'original'
    if p95_two_sided(l1, orig) > MAX_P95_LOD1:
        l1 = l0
    return name, method, l0, l1, p95_two_sided(l0, orig), p95_two_sided(l1, orig)


def main(work_dir):
    t0 = time.time()
    off = layers.za_offset(f'{work_dir}/zaskel', f'{work_dir}/male')
    O = fit.load_bones(f'{work_dir}/muscles-orig')
    names = list(O)
    areas = np.array([area(O[n][0], O[n][1].astype(np.int64)) for n in names])
    share = areas / areas.sum()
    jobs = [(n, O[n][0] + off, O[n][1], max(MIN_TRIS, int(LOD0_TRIS * s)), max(MIN_TRIS // 2, int(LOD1_TRIS * s))) for n, s in zip(names, share)]
    jobs.sort(key=lambda j: -len(j[2]))  # biggest first, for even load
    out = {}
    with Pool(4) as pool:
        for k, r in enumerate(pool.imap_unordered(work, jobs)):
            out[r[0]] = r
            if k % 100 == 0:
                print(f'[{time.time() - t0:5.0f} s] {k}/{len(jobs)}', flush=True)
    # Any level still too far from its original gets more triangles until it is not.
    redo = [(n, out[n][1], out[n][2], out[n][3], (O[n][0] + off, O[n][1].astype(np.int64))) for n in names if out[n][4] > MAX_P95 or out[n][5] > MAX_P95_LOD1]
    print(f'tightening {len(redo)} meshes', flush=True)
    with Pool(4) as pool:
        for r in pool.imap_unordered(fix, redo):
            out[r[0]] = r
    data = {'names': np.array(names)}
    rows = []
    for i, n in enumerate(names):
        _, method, l0, l1, e0, e1 = out[n]
        data[f'v{i}'], data[f'f{i}'] = l0[0], l0[1]
        data[f'v1_{i}'], data[f'f1_{i}'] = l1[0], l1[1]
        data[f'method{i}'] = np.array(method)
        rows.append((n, method, e0 * 1000, e1 * 1000, len(l0[1]), len(l1[1])))
    np.savez(f'{work_dir}/remeshed-male.npz', **data)
    e0 = np.array([r[2] for r in rows])
    e1 = np.array([r[3] for r in rows])
    print(f'rebuilt {sum(r[1] == "rebuilt" for r in rows)} of {len(rows)}; LOD0 {sum(r[4] for r in rows):,} triangles, LOD1 {sum(r[5] for r in rows):,}')
    print(f'difference from the originals (95th percentile): LOD0 median {np.median(e0):.2f} mm, max {e0.max():.2f} mm; LOD1 median {np.median(e1):.2f} mm, max {e1.max():.2f} mm')
    with open(f'{work_dir}/remesh-check.tsv', 'w') as fh:
        fh.write('za_name\tmethod\tlod0_p95_mm\tlod1_p95_mm\tlod0_tris\tlod1_tris\n')
        for r in sorted(rows):
            fh.write(f'{r[0]}\t{r[1]}\t{r[2]:.3f}\t{r[3]:.3f}\t{r[4]}\t{r[5]}\n')


if __name__ == '__main__':
    main(sys.argv[1])
