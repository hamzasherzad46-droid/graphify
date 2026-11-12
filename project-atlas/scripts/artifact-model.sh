#!/usr/bin/env bash
# Prepare models for the artifact build (sandboxed hosts such as claude.ai artifacts):
#  - quantize instead of Draco: three.js decodes it itself, no WebAssembly (often blocked);
#  - ship each model as a JS module (`export default "<base64>"`), because those hosts
#    don't serve .glb files; see src/viewer/embeddedModel.ts.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rm -rf dist-artifact/draco dist-artifact/icons dist-artifact/models
mkdir -p dist-artifact/models
for f in public/models/*.glb; do
  name="$(basename "$f")"
  npx --yes @gltf-transform/cli quantize "$f" "$tmp/$name"
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2],"export default \""+fs.readFileSync(process.argv[1]).toString("base64")+"\"\n")' "$tmp/$name" "dist-artifact/models/$name.js"
done
ls -lh dist-artifact/models
