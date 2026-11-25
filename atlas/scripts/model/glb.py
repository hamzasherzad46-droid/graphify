"""Minimal GLB writer: one node per mesh (positions, normals, optional UVs, indices), uncompressed."""
import json
import struct
import numpy as np


def write_glb(path, meshes):
    """meshes: list of dicts {name, pos (n,3), nrm (n,3), uv (n,2) or None, idx (m,3), extras}."""
    js = {'asset': {'version': '2.0', 'generator': 'atlas scripts/model'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'accessors': [], 'bufferViews': [], 'buffers': []}
    blob = bytearray()

    def view(arr, target):
        b = np.ascontiguousarray(arr).tobytes()
        js['bufferViews'].append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(b), 'target': target})
        blob.extend(b)
        blob.extend(b'\0' * ((4 - len(blob) % 4) % 4))
        return len(js['bufferViews']) - 1

    def acc(arr, comp, typ, target, minmax=False):
        a = {'bufferView': view(arr, target), 'componentType': comp, 'count': len(arr), 'type': typ}
        if minmax:
            a['min'] = arr.min(0).tolist()
            a['max'] = arr.max(0).tolist()
        js['accessors'].append(a)
        return len(js['accessors']) - 1

    for m in meshes:
        attrs = {'POSITION': acc(m['pos'].astype(np.float32), 5126, 'VEC3', 34962, True), 'NORMAL': acc(m['nrm'].astype(np.float32), 5126, 'VEC3', 34962)}
        if m.get('uv') is not None:
            attrs['TEXCOORD_0'] = acc(m['uv'].astype(np.float32), 5126, 'VEC2', 34962)
        idx = m['idx'].reshape(-1)
        idx = idx.astype(np.uint16) if len(m['pos']) < 65536 else idx.astype(np.uint32)
        i = acc(idx, 5123 if idx.dtype == np.uint16 else 5125, 'SCALAR', 34963)
        js['meshes'].append({'name': m['name'], 'primitives': [{'attributes': attrs, 'indices': i}]})
        node = {'name': m['name'], 'mesh': len(js['meshes']) - 1}
        if m.get('extras'):
            node['extras'] = m['extras']
        js['nodes'].append(node)
        js['scenes'][0]['nodes'].append(len(js['nodes']) - 1)
    js['buffers'].append({'byteLength': len(blob)})
    jb = json.dumps(js, separators=(',', ':')).encode()
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(blob)))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A) + jb)
        f.write(struct.pack('<II', len(blob), 0x004E4942) + bytes(blob))


def split_uv_seams(pos, uv, tris, ttex):
    """glTF needs one UV per vertex: duplicate vertices where a seam gives them two."""
    key = np.stack([tris.reshape(-1), ttex.reshape(-1)], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    return pos[uniq[:, 0]], uv[uniq[:, 1]], inv.reshape(-1, 3), uniq[:, 0]
