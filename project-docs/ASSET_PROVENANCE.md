# Asset Provenance

Chakravarti uses original procedural art, project-original generated assets, and
redistributable open-source assets whose licenses permit inclusion in the public
repository, GitHub Pages build, and Android APK.

## Included open-source assets

### Kenney Nature Kit

- Source: <https://kenney.nl/assets/nature-kit>
- Creator: Kenney
- License: Creative Commons Zero 1.0 Universal
- Included files:
  - `public/models/cc0/kenney-nature/tree_oak.glb`
  - `public/models/cc0/kenney-nature/plant_bushLarge.glb`
- Use: lightweight generic broadleaf and courtyard vegetation. These assets are
  environmental shorthand, not claims about exact ancient Magadhan plant species.

The upstream license text is retained beside the model files.

## Hugging Face generated assets

### Mauryan storage jar

- Concept: project-original illustration drawn by
  `tooling/generate_3d_assets.py`
- Model used in this release:
  `dcharlot65-aurasense/triposr-onnx-web`
- Model: <https://huggingface.co/dcharlot65-aurasense/triposr-onnx-web>
- Preferred authenticated GPU path:
  <https://huggingface.co/spaces/trellis-community/TRELLIS>
- Output: `public/models/nanda/mauryan-storage-jar.glb`
- Historical boundary: an original vessel inspired by broad ancient South Asian
  ceramic forms. It does not reproduce a specific museum object or claim an exact
  Nanda-period typology.

Generation settings, backend, checksum, and source paths are recorded in
`tooling/nanda-asset-manifest.json`.

## Rejected uses

Generic CC0 European castle walls, fantasy clothing, Viking shields, and stone
crenellations are not used as final historical assets. They may provide temporary
rigs or neutral animation references, but period-specific silhouettes are built
as original assets instead.
