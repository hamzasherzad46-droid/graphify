"""Builds the male organs (step 3) from Z-Anatomy (CC BY-SA 4.0), in the male skeleton's space.

    python3 scripts/model/organs.py <work dir> <out prefix>

Reads, from the work dir (export-za.mjs with error 0: the full-resolution meshes): visceral-orig (VisceralSystem100),
cardio-orig (CardioVascular41), lymph-orig (LymphoidOrgans100) and nervous (NervousSystem100), plus zaskel / male for
the measured offset. Writes <out prefix>.glb (detailed level) and <out prefix>-lod1.glb (phones), one node per organ
part with extras {layer: 'organs', kind, system, side, za} (genitals also {modesty: true}; the membranes that wrap
the organs, pleura and peritoneal folds, {hidden: true}), and <out prefix>-check.tsv.

Every mesh is the Z-Anatomy original, lightly smoothed (Taubin) and decimated to a triangle budget proportional to
its surface area; each level stays within MAX_P95 (95th percentile of the two-sided surface distance) of the
original (for thin parts, a fifth of their thickness), given more triangles until it does. The brain, coarse in the
source, is rounded by subdivision (brain_source). Nothing is reshaped, moved or guessed.
"""
import sys
from multiprocessing import Pool
import numpy as np
from collections import defaultdict
from scipy import sparse
from scipy.sparse.linalg import spsolve
import igl
from scipy.spatial import cKDTree
import fit
import layers
import remesh
from glb import write_glb

LOD0_TRIS = 420_000
LOD1_TRIS = 160_000
MAX_P95 = 0.0008  # m (organs are smooth, so a tighter limit than the muscles' costs little)
MAX_P95_LOD1 = 0.0012
MIN_TRIS = 80
BRAIN_P95 = 0.002  # m: the subdivided brain against the coarse original (see brain_source)
MAX_STRAY = 0.005  # m
BRAIN_P95_LOD1 = 0.0026  # m (phones)
BRAIN_SHARE = 2.5
TUBES = {'artery', 'vein', 'airway', 'urinary', 'bile'}
TUBE_P95 = 0.00015  # m  # the rounded brain needs more triangles than its area share

HEART = {
    'Left_atrium', 'Right_atrium', 'Left_ventricle', 'Right_ventricle',
    'Anterior_papillary_muscle_of_right_ventricle', 'Inferior_papillary_muscle_of_left_ventricle',
    'Inferior_papillary_muscle_of_right_ventricle', 'Septal_papillary_muscle_of_right_ventricle',
    'Anterior_semilunar_leaflet_of_pulmonary_valve', 'Left_semilunar_leaflet_of_pulmonary_valve',
    'Right_semilunar_leaflet_of_pulmonary_valve', 'Left_coronary_leaflet', 'Right_coronary_leaflet',
    'Non-coronary_leaflet', 'Inferior_leaflet_of_right_atrioventricular_valve',
    'Septal_leaflet_of_right_atrioventricular_valve', 'Posterior_leaflet_of_left_atrioventricular_valve',
}
ARTERIES = {
    'Ascending_aorta', 'Aortic_arch', 'Thoracic_aorta', 'Abdominal_aorta', 'Brachiocephalic_trunk',
    'Pulmonary_trunk', 'Bifurcation_of_pulmonary_trunk', 'Left_pulmonary_artery', 'Right_pulmonary_artery',
    'Left_coronary_artery', 'Right_coronary_artery', 'Anterior_interventricular_artery', 'Circumflex_artery_of_heart',
    'Septal_branches_of_anterior_interventricular_artery', 'Right_inferolateral_branch_of_right_coronary_artery',
}
VEINS = {
    'Superior_vena_cava', 'Inferior_vena_cava_(thoracic_part)', 'Inferior_vena_cava_(abdominal_part)',
    'Left_superior_pulmonary_vein', 'Left_inferior_pulmonary_vein', 'Right_superior_pulmonary_vein',
    'Right_inferior_pulmonary_vein', 'Coronary_sinus', 'Great_cardiac_vein', 'Middle_cardiac_vein',
    'Inferior_vein_of_left_ventricle', "Inferior_vein_of_left_ventricle_(Posterior_'')",
}
LYMPHOID = {'Spleen': 'spleen', 'Left_lobe_of_thymus': 'gland', 'Right_lobe_of_thymus': 'gland',
            'Palatine_tonsill': 'mouth', 'Palatine_tonsilr': 'mouth'}
# Visceral system: the liver whole (its segments in the source are the same surface cut into pieces), no ducts
# inside the pancreas, no nasal mucosa (inside the nose).
SKIP_VISCERAL = ('segment_of_liver', 'Pancreatic_duct', 'Accessory_pancreatic_duct', 'Mucosa_of_nasal_cavity')
MEMBRANE = ('Pleura', 'Greater_omentum', 'Lesser_omentum', 'Mesocolon', 'Meso-appendix')
GENITAL = ('penis', 'Glans', 'Testis', 'Epididymis', 'Ductus_deferens', 'Ejaculatory_duct', 'Seminal_gland',
           'Prostate')


def unsided(n):
    return n[:-1] if n[-1:] in ('l', 'r') else n


def visceral_kind(n):
    low = n.lower()
    if n in MEMBRANE:
        return 'membrane', 'digestive' if 'Pleura' not in n else 'respiratory'
    if any(k.lower() in low for k in GENITAL):
        return 'genital', 'genital'
    if 'lobe_of' in low and 'lung' in low:
        return 'lung', 'respiratory'
    if 'bronch' in low or n in ('Trachea', 'Epiglottis'):
        return 'airway', 'respiratory'
    if n == 'Liver':
        return 'liver', 'digestive'
    if n in ('Gallbladder', 'Bile_duct'):
        return 'bile', 'digestive'
    if unsided(n) == 'Kidney':
        return 'kidney', 'urinary'
    if unsided(n) in ('Renal_pelvis', 'Ureter') or n in ('Urinary_bladder', 'Urethra'):
        return 'urinary', 'urinary'
    if any(k in n for k in ('thyroid', 'Thyroid', 'Suprarenal', 'hypophysis', 'Pineal')):
        return 'gland', 'endocrine'
    if any(k in n for k in ('Parotid', 'Submandibular', 'Sublingual')):
        return 'gland', 'digestive'
    if n == 'Pancreas':
        return 'gland', 'digestive'
    if any(k in n for k in ('Tongue', 'Gingiva', 'palate', 'Uvula', 'pharynx')):
        return 'mouth', 'digestive'
    return 'gut', 'digestive'  # oesophagus, stomach, intestines, appendix, taeniae coli


def brain_part(n):
    """The brain (cerebrum, its deep structures, cerebellum, brainstem); no nerves, nuclei, tracts, dura, and nothing
    of the eye, the ear or the tear apparatus."""
    low = n.lower()
    if any(k in low for k in ('nerve', 'nucleus', 'nuclei', 'tract', 'fasciculus', 'ganglion', 'ganglia', 'plexus',
                              'branch', 'root', 'dura', 'falx', 'tentorium', 'retina', 'sclera', 'cornea', 'iris',
                              'lens', 'chorda', 'trunk', 'cord_of', 'division_of', 'horn_of', 'canal', 'substance',
                              'process', 'lamina', 'chiasm', 'optic', 'eyeball', 'vitreous', 'zonular', 'cochlea',
                              'vestibule', 'tympanic', 'auditory', 'lacrimal')):
        return False
    return True


def select(work):
    vis = fit.load_bones(f'{work}/visceral-orig')
    car = fit.load_bones(f'{work}/cardio-orig')
    lym = fit.load_bones(f'{work}/lymph-orig')
    ner = fit.load_bones(f'{work}/nervous')
    out = {}
    for n, (v, f) in vis.items():
        if n.endswith('j') or any(k in n for k in SKIP_VISCERAL) or len(f) == 0:
            continue
        kind, system = visceral_kind(n)
        out[n] = (v, f, kind, system)
    for n, (v, f) in car.items():
        if n in HEART:
            out[n] = (v, f, 'heart', 'cardiovascular')
        elif n in ARTERIES:
            out[n] = (v, f, 'artery', 'cardiovascular')
        elif n in VEINS:
            out[n] = (v, f, 'vein', 'cardiovascular')
    for n, k in LYMPHOID.items():
        out[n] = (lym[n][0], lym[n][1], k, 'lymphoid')
    # The brain: everything of the nervous system inside the skull above the foramen magnum, minus the exclusions
    # above; the spinal cord by its white matter (the cord's outer surface).
    skull_floor = ner['Medulla_oblongatal'][0][:, 1].min() if 'Medulla_oblongatal' in ner else None
    for n, (v, f) in ner.items():
        if n.endswith('j') or len(f) == 0:
            continue
        if n == 'White_matter_of_spinal_cord':
            out[n] = (v, f, 'cord', 'nervous')
        elif skull_floor is not None and v[:, 1].min() >= skull_floor - 0.002 and brain_part(n):
            out[n] = (v, f, 'brain', 'nervous')
    return out


# Openings: where a tube meets the next part (stomach to duodenum, chamber to chamber, bronchus to lung) the source
# leaves the ends open, and that stays. An opening no such part meets is a hole in the source mesh (one in the
# stomach's front wall, small ones in the small intestine) and is closed with a smooth patch that continues the
# surrounding wall's curvature. The cut ends of the great vessels, where the model stops, are left open.
JOINS = {'gut', 'airway', 'artery', 'vein', 'heart', 'urinary', 'bile', 'lung', 'kidney', 'gland', 'mouth', 'genital'}
FILL_KINDS = {'gut', 'airway', 'urinary', 'bile', 'lung', 'kidney', 'liver', 'spleen', 'gland', 'mouth', 'genital'}
JOIN_GAP = 0.003  # m


def boundary_loops(f):
    """Each open boundary as an ordered loop, oriented as the edges run in the faces."""
    e = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]])
    key = np.sort(e, axis=1)
    _, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    b = e[cnt[inv.ravel()] == 1]
    nxt = {a: z for a, z in b}
    loops, seen = [], set()
    for a in nxt:
        if a in seen:
            continue
        loop, x = [], a
        while x not in seen and x in nxt:
            seen.add(x)
            loop.append(x)
            x = nxt[x]
        if len(loop) >= 3 and x == a:
            loops.append(loop)
    return loops


def fill_hole(v, f, loop):
    """A patch of concentric rings over the hole, its inner points placed so the surface bends smoothly
    (bilaplacian, everything else fixed)."""
    p = v[loop]
    c = p.mean(0)
    edge = np.linalg.norm(np.roll(p, -1, 0) - p, axis=1).mean()
    k = int(max(2, np.ceil(np.linalg.norm(p - c, axis=1).mean() / max(edge, 1e-6))))
    n0, m = len(v), len(loop)
    rings = [np.array(loop)]
    newv = []
    for j in range(1, k):
        newv.append(c + (p - c) * (1 - j / k))
        rings.append(n0 + (j - 1) * m + np.arange(m))
    centre = n0 + (k - 1) * m
    newv.append(c[None])
    V = np.vstack([v] + newv)
    tris = []
    for j in range(k - 1):
        a, b = rings[j], rings[j + 1]
        for i in range(m):
            i2 = (i + 1) % m
            # the hole's edge runs loop[i] -> loop[i+1] in the faces, so the patch runs the other way
            tris += [(a[i2], a[i], b[i]), (a[i2], b[i], b[i2])]
    last = rings[-1]
    tris += [(last[(i + 1) % m], last[i], centre) for i in range(m)]
    F = np.vstack([f, np.array(tris, np.int64)])
    free = np.arange(n0, len(V))
    nb = fit.neighbours(F, len(V))
    rows = np.repeat(np.arange(len(V)), [len(x) for x in nb])
    cols = np.concatenate([np.asarray(x, np.int64) for x in nb])
    deg = np.array([len(x) for x in nb], np.float64)
    L = sparse.csr_matrix((np.ones(len(rows)) / deg[rows], (rows, cols)), shape=(len(V), len(V))) - sparse.eye(len(V))
    Q = (L.T @ L).tocsr()
    fixed = np.setdiff1d(np.arange(len(V)), free)
    A = Q[free][:, free]
    rhs = -(Q[free][:, fixed] @ V[fixed])
    V[free] = np.column_stack([spsolve(A.tocsc(), rhs[:, d]) for d in range(3)])
    return V, F


def repair(sel):
    """Closes holes no joining part meets; returns {name: holes closed}."""
    names = list(sel)
    P = np.vstack([sel[n][0] for n in names])
    owner = np.repeat(np.arange(len(names)), [len(sel[n][0]) for n in names])
    tree = cKDTree(P)
    closed = {}
    for i, n in enumerate(names):
        v, f, kind, system = sel[n]
        if kind not in FILL_KINDS:
            continue
        f = f.astype(np.int64)
        count = 0
        for loop in boundary_loops(f):
            near = tree.query_ball_point(v[loop], JOIN_GAP)
            met = {owner[j] for js in near for j in js if owner[j] != i and sel[names[owner[j]]][2] in JOINS}
            if met:
                continue
            v, f = fill_hole(v, f, loop)
            count += 1
        if count:
            sel[n] = (v, f, kind, system)
            closed[n] = count
    return closed


def relative_limit(v, f, limit):
    """Thin parts (coronary vessels, ducts, valve leaflets) need a limit set by their own thickness: 0.8 mm is
    nothing on the liver but half the width of a coronary artery."""
    if not remesh.is_closed(f):  # a sheet (the pleura, the omenta): no thickness to measure
        return limit
    thickness = 2 * remesh.volume(v, f) / max(remesh.area(v, f), 1e-12)
    return float(min(limit, max(0.00012, 0.2 * thickness)))


def brain_source(v, f):
    """The Z-Anatomy brain is coarse (gyri about 6.5 mm between points), so its surfaces read as flat facets.
    Two rounds of Loop subdivision then light smoothing give the smooth surface those points describe; the result
    is measured against the original like everything else (BRAIN_P95)."""
    import trimesh.remesh as tr
    try:
        sv, sf = tr.subdivide_loop(v, f, iterations=2)
        it = 2
    except ValueError:  # a non-manifold edge in the source: split each triangle in four, then smooth more
        sv, sf = tr.subdivide(*tr.subdivide(v, f))
        it = 6
    sf = np.asarray(sf, np.int64)
    return remesh.taubin(np.asarray(sv, np.float64), sf, it), sf


def level(args):
    name, v, f, budget, limit, kind = args
    f = f.astype(np.int64)
    orig = (v, f)
    if kind == 'brain':
        s = brain_source(v, f)
        limit = BRAIN_P95 if limit == MAX_P95 else BRAIN_P95_LOD1
    else:
        s = (remesh.taubin(v, f, 2), f)
        if kind in TUBES:  # vessels, ducts, airways: often open tubes in the source, crumpled by any coarse limit
            limit = min(limit, TUBE_P95)
        elif kind != 'membrane':  # membranes: thin by nature, and hidden
            limit = relative_limit(v, f, limit)
    # A spike (smoothing can throw a point of a tiny or broken mesh far out) would slip past a 95th percentile:
    # any point more than MAX_STRAY from the original and the part keeps its original surface.
    if np.sqrt(igl.point_mesh_squared_distance(s[0], v, f)[0].max()) > MAX_STRAY:
        return name, orig, 0.0
    target = max(budget, MIN_TRIS)
    while True:
        lv = remesh.decimate(*s, target)
        err = remesh.p95_two_sided(lv, orig)
        if err <= limit:
            return name, lv, err
        if target >= len(s[1]):
            break
        target = min(int(target * 1.6), len(s[1]))
    if remesh.p95_two_sided(s, orig) > limit:  # smoothing alone moves it: keep the original
        return name, orig, 0.0
    return name, s, remesh.p95_two_sided(s, orig)


def main(work, out):
    off = layers.za_offset(f'{work}/zaskel', f'{work}/male')
    sel = select(work)
    closed = repair(sel)
    print('holes closed:', ', '.join(f'{n} {c}' for n, c in sorted(closed.items())) or 'none', flush=True)
    names = sorted(sel)
    areas = np.array([remesh.area(sel[n][0], sel[n][1].astype(np.int64)) for n in names])
    share = areas / areas.sum()
    res = {}
    for lod, (total, limit) in enumerate(((LOD0_TRIS, MAX_P95), (LOD1_TRIS, MAX_P95_LOD1))):
        jobs = [(n, sel[n][0] + off, sel[n][1], int(total * s * (BRAIN_SHARE if sel[n][2] == 'brain' else 1)), limit,
                 sel[n][2]) for n, s in zip(names, share)]
        jobs.sort(key=lambda j: -len(j[2]))
        with Pool(4) as pool:
            for n, lv, err in pool.imap_unordered(level, jobs):
                res[(n, lod)] = (lv, err)
        print(f'level {lod}: {sum(len(res[(n, lod)][0][1]) for n in names):,} triangles', flush=True)
    # Baked occlusion among the organs (on the phone level, carried to the detailed level by nearest point): creases and contact between organs darken.
    allv = np.vstack([res[(n, 1)][0][0] for n in names])
    starts = np.cumsum([0] + [len(res[(n, 1)][0][0]) for n in names])
    allf = np.vstack([res[(n, 1)][0][1] + starts[i] for i, n in enumerate(names)])
    ao1 = {}
    for n in names:
        v, f = res[(n, 1)][0]
        N = fit.vertex_normals(v, f)
        a = (1 - igl.ambient_occlusion(allv, allf, v + N * 0.0004, N, 32)).astype(np.float64)
        ao1[n] = fit.smooth_field(a[:, None], fit.neighbours(f, len(v)), 3)[:, 0]
    print('occlusion baked', flush=True)
    rows = []
    for lod in (1, 0):
        meshes = []
        for i, n in enumerate(names):
            (v, f), err = res[(n, lod)]
            N = fit.vertex_normals(v, f)
            ao = ao1[n] if lod == 1 else ao1[n][cKDTree(res[(n, 1)][0][0]).query(v)[1]]  # detailed: nearest
            ao = 0.5 + 0.5 * np.clip(ao, 0, 1) ** 0.8
            kind, system = sel[n][2], sel[n][3]
            extras = {'layer': 'organs', 'kind': kind, 'system': system, 'side': layers.side_of(n), 'za': n}
            if kind == 'genital' or n == 'Urethra':  # the male urethra runs through the penis
                extras['modesty'] = True
            if kind == 'membrane':
                extras['hidden'] = True
            meshes.append({'name': layers.atlas_id(n), 'pos': v, 'nrm': N, 'uv': None, 'idx': f, 'color': ao,
                           'extras': extras})
            if lod == 0:
                rows.append((n, kind, system, res[(n, 0)][1] * 1000, res[(n, 1)][1] * 1000, len(f), len(res[(n, 1)][0][1])))
        write_glb(f'{out}.glb' if lod == 0 else f'{out}-lod1.glb', meshes)
        print(f'wrote level {lod}: {len(meshes)} meshes, {sum(len(m["idx"]) for m in meshes):,} triangles', flush=True)
    with open(f'{out}-check.tsv', 'w') as fh:
        fh.write('za_name\tkind\tsystem\tlod0_p95_mm\tlod1_p95_mm\tlod0_tris\tlod1_tris\n')
        for r in rows:
            fh.write(f'{r[0]}\t{r[1]}\t{r[2]}\t{r[3]:.3f}\t{r[4]:.3f}\t{r[5]}\t{r[6]}\n')
    kinds = {}
    for r in rows:
        kinds[r[1]] = kinds.get(r[1], 0) + 1
    print(kinds)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
