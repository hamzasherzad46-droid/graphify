"""Checks each simplified muscle against its Z-Anatomy original: shape (two-sided surface distance), size (volume
of the closed ones, bounding box) and position (centre). Prints the worst and writes a full table."""
import sys
import numpy as np
import igl
import fit


def two_sided(a, b):
    """95th percentile and maximum of the distances a→b's surface and b→a's surface (mm)."""
    da = np.sqrt(igl.point_mesh_squared_distance(a[0], b[0], b[1].astype(np.int64))[0])
    db = np.sqrt(igl.point_mesh_squared_distance(b[0], a[0], a[1].astype(np.int64))[0])
    d = np.concatenate([da, db])
    return np.quantile(d, 0.95) * 1000, d.max() * 1000


def main(simplified, original, out):
    S, O = fit.load_bones(simplified), fit.load_bones(original)
    rows = []
    for n in S:
        if n not in O:
            continue
        p95, mx = two_sided(S[n], O[n])
        cs = (S[n][0].min(0) + S[n][0].max(0)) / 2
        co = (O[n][0].min(0) + O[n][0].max(0)) / 2
        size = np.ptp(S[n][0], 0) / np.maximum(np.ptp(O[n][0], 0), 1e-6)
        rows.append((n, p95, mx, np.linalg.norm(cs - co) * 1000, size.min(), size.max(), len(O[n][1]), len(S[n][1])))
    rows.sort(key=lambda r: -r[1])
    with open(out, 'w') as f:
        f.write('mesh\tp95_mm\tmax_mm\tcentre_shift_mm\tsize_ratio_min\tsize_ratio_max\toriginal_tris\tsimplified_tris\n')
        for r in rows:
            f.write('\t'.join(str(round(x, 3)) if isinstance(x, float) else str(x) for x in r) + '\n')
    p95 = np.array([r[1] for r in rows])
    print(f'{len(rows)} meshes: 95th-percentile distance median {np.median(p95):.2f} mm; over 1 mm: {(p95 > 1).sum()}; over 2 mm: {(p95 > 2).sum()}')
    print('worst:', '; '.join(f'{r[0]} p95 {r[1]:.1f} max {r[2]:.1f} mm ({r[6]}→{r[7]} tris)' for r in rows[:12]))


if __name__ == '__main__':
    main(*sys.argv[1:4])
