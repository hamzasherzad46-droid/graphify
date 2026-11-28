"""Re-derives node names and sides in built layer and organ GLBs from their Z-Anatomy names (extras.za), with the
pair rule of layers.side_of, without rebuilding the meshes. Rewrites only the JSON chunk.

    python3 scripts/model/fix_ids.py public/models/tissue/layers-male.glb public/models/tissue/layers-male-phone.glb ...
"""
import json
import struct
import sys
import layers


def read(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    return json.loads(b[20:20 + n]), b[20 + n:]


def write(path, j, rest):
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    body = struct.pack('<I', len(js)) + b'JSON' + js + rest
    open(path, 'wb').write(b'glTF' + struct.pack('<II', 2, 12 + len(body)) + body)


def main(paths):
    for path in paths:
        j, rest = read(path)
        names = [(n.get('extras') or {}).get('za') for n in j['nodes']]
        layers.KNOWN.clear()
        layers.KNOWN.update(x for x in names if x)
        changed = []
        for node in j['nodes']:
            e = node.get('extras') or {}
            za = e.get('za')
            if not za:
                continue
            new, side = layers.atlas_id(za), layers.side_of(za)
            if new != node['name'] or side != e.get('side'):
                changed.append(f"{node['name']} → {new} ({side})")
                node['name'], e['side'] = new, side
        ids = [n['name'] for n in j['nodes']]
        assert len(ids) == len(set(ids)), 'duplicate ids'
        write(path, j, rest)
        print(path, len(changed), 'renamed:', '; '.join(changed))


if __name__ == '__main__':
    main(sys.argv[1:])
