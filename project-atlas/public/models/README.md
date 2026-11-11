# Models

Compressed GLB files, named as in `content/catalog.json` (`model.file`).

- `skeleton.glb`: BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0. Modified
  (bones selected and renamed, epicondyles split, approximate coccyx added, Draco-compressed) by
  `scripts/import-bodyparts3d.mjs`.

If a module's GLB is missing, the app renders primitive placeholders from
`content/<module>.placeholder.json`, so the quiz still works.

See "3D models" in the project README for converting Z-Anatomy files.
Models from Z-Anatomy / BodyParts3D are CC BY-SA: keep the Credits screen attribution.
