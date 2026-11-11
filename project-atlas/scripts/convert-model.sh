#!/usr/bin/env bash
# Convert a Z-Anatomy export into a compressed GLB for /public/models.
#
# Usage:
#   scripts/convert-model.sh <input.(fbx|blend|glb|gltf)> <output-name>   # e.g. skeleton
#
# Requirements (all free / open source):
#   - Blender 3.6+ on PATH (only for .fbx / .blend input)
#   - npx (Node 18+); @gltf-transform/cli is fetched on demand (MIT)
#
# What it does:
#   1. Blender → glTF binary, keeping object names (they become mesh names).
#   2. gltf-transform: dedupe, weld, simplify lightly, Draco-compress geometry,
#      resize textures. Node names are preserved, so `meshName` in
#      /content/*.json still matches.
set -euo pipefail

in="${1:?input file}"
name="${2:?output name, e.g. skeleton}"
out_dir="$(cd "$(dirname "$0")/.." && pwd)/public/models"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

case "$in" in
  *.fbx|*.blend)
    blender -b --python-expr "
import bpy, sys
src = sys.argv[-1]
if src.endswith('.fbx'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=src)
else:
    bpy.ops.wm.open_mainfile(filepath=src)
# Export meshes only (no Z-Anatomy label text, cameras or lights).
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH' and o.visible_get():
        o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath='$tmp/raw.glb', export_format='GLB', use_selection=True,
    export_apply=True, export_yup=True, export_materials='NONE')
" -- "$in"
    raw="$tmp/raw.glb" ;;
  *.glb|*.gltf) raw="$in" ;;
  *) echo "Unsupported input: $in" >&2; exit 1 ;;
esac

npx --yes @gltf-transform/cli dedup "$raw" "$tmp/a.glb"
npx --yes @gltf-transform/cli weld "$tmp/a.glb" "$tmp/b.glb"
# Light simplification keeps silhouettes; raise --ratio if bones look faceted.
npx --yes @gltf-transform/cli simplify "$tmp/b.glb" "$tmp/c.glb" --ratio 0.5 --error 0.0005
npx --yes @gltf-transform/cli draco "$tmp/c.glb" "$out_dir/$name.glb"

ls -lh "$out_dir/$name.glb"
echo "Mesh names in $name.glb (use these in /content/*.json meshName):"
npx --yes @gltf-transform/cli inspect "$out_dir/$name.glb" --format md 2>/dev/null | sed -n '/MESHES/,/^$/p' | head -60 || true
